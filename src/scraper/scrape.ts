/**
 * MÓDULO 1 — Scraper (EL BUSCADOR)
 * --------------------------------
 * Estrategia principal: camchi.org.pa/directorio (Cámara de Comercio de Chiriquí).
 *   1) Descubre listings vía REST API de WordPress (wpbdp_listing).
 *   2) Por cada listing, lee su página individual y extrae el JSON-LD
 *      LocalBusiness (telephone, name, address) — datos estructurados.
 *   3) Filtra sin teléfono válido, normaliza a +507 y fusiona en prospectos.json.
 *
 * Fallback genérico (cheerio sobre HTML) si la URL no es camchi.
 *
 * Uso: PROSPECTO_DIR_URL="https://camchi.org.pa/directorio/" bun run src/scraper/scrape.ts
 */
import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Prospecto } from "../types.ts";
import { normalizarTelefonoPA } from "../lib/telefono.ts";
import { normalizarNombre, esWebPropia } from "../lib/dedupe.ts";
import { accentParaTipo } from "../lib/accent.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_FILE = join(ROOT, "data", "prospectos.json");

const AGENT = "Mozilla/5.0 (X11; Linux x86_64) ProspectorDavid/0.1";
const CENTRO_DAVID = { lat: 8.427, lng: -82.431 };
const MAX_CONCURRENCIA = 6;

const url = process.env.PROSPECTO_DIR_URL || "";
if (!url) {
  console.error("[scraper] Falta PROSPECTO_DIR_URL en .env");
  process.exit(1);
}

// Regla estricta de "a ciegas digitales": solo prospectar negocios SIN web propia.
const SOLO_SIN_WEB = process.env.SOLO_SIN_WEB !== "false";

const extraidos: Prospecto[] = [];
let descartados = 0;
let descartadosSinWeb = 0;

async function pool<T, R>(items: T[], limite: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: limite }, worker));
  return out;
}

// ---------------------------------------------------------------
// ESTRATEGIA CAMCHI (Business Directory Plugin + REST API)
// ---------------------------------------------------------------
async function scrapeCamchi(base: string): Promise<void> {
  // La API REST de WordPress vive en la raíz del sitio, no bajo /directorio/.
  const api = new URL(base).origin;
  console.log(`[scraper] Fuente: camchi (API REST en ${api})`);

  // 1. Categorías: id -> nombre.
  const catRes = await axios.get(`${api}/wp-json/wp/v2/wpbdp_category?per_page=100`, { headers: { "User-Agent": AGENT }, timeout: 20000 });
  const cats = new Map<number, string>((catRes.data as any[]).map((c) => [c.id, c.name]));

  // 2. Descubrir todos los listings (paginado).
  const first = await axios.get(`${api}/wp-json/wp/v2/wpbdp_listing?per_page=100`, { headers: { "User-Agent": AGENT }, timeout: 20000 });
  const totalPages = Number(first.headers["x-wp-totalpages"] || 1);
  const listings: any[] = first.data;
  for (let p = 2; p <= totalPages; p++) {
    const r = await axios.get(`${api}/wp-json/wp/v2/wpbdp_listing?per_page=100&page=${p}`, { headers: { "User-Agent": AGENT }, timeout: 20000 });
    listings.push(...r.data);
  }
  console.log(`[scraper] Listings descubiertos vía API: ${listings.length} (páginas: ${totalPages})`);

  // 3. Por cada listing, leer página individual y extraer JSON-LD LocalBusiness.
  const resultados = await pool(listings, MAX_CONCURRENCIA, async (l) => {
    try {
      const res = await axios.get(l.link, { headers: { "User-Agent": AGENT }, timeout: 20000 });
      const $ = cheerio.load(res.data);
      let jsonLd: any = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        const t = $(el).text().trim();
        if (!t || jsonLd) return;
        try {
          const d = JSON.parse(t);
          if (d?.["@type"] === "LocalBusiness" || d?.["@type"] === "Organization") jsonLd = d;
        } catch { /* ignorar */ }
      });
      return { l, jsonLd, html: res.data };
    } catch {
      return { l, jsonLd: null, html: "" };
    }
  });

  for (const { l, jsonLd, html } of resultados) {
    const nombre = jsonLd?.name || l.title?.rendered || "";
    const telefonoRaw = jsonLd?.telephone || "";
    const direccion = (jsonLd?.address?.streetAddress || "") + (jsonLd?.address?.addressLocality ? `, ${jsonLd.address.addressLocality}` : "");

    const whatsapp = normalizarTelefonoPA(telefonoRaw);
    if (!nombre || !whatsapp) {
      descartados++;
      continue;
    }

    // Filtro "a ciegas digitales": detectar si el negocio revela web propia.
    const web = detectarWeb(html, jsonLd, api);
    const tieneWeb = Boolean(web);
    if (SOLO_SIN_WEB && tieneWeb) {
      descartadosSinWeb++;
      continue;
    }

    const tipo =
      (l.wpbdp_category || [])
        .map((id: number) => cats.get(id))
        .filter(Boolean)
        .join(", ") || "Negocio local";

    extraidos.push({
      id: String(l.slug || `camchi-${l.id}`),
      nombre_negocio: nombre,
      tipo,
      direccion: direccion.trim() || "David, Chiriquí",
      // Si el listing no trae coordenadas, se usa el centro de David (el humano afina).
      coordenadas: { ...CENTRO_DAVID },
      whatsapp,
      color_accent: accentParaTipo(tipo),
      tiene_web: tieneWeb,
      creado_en: new Date().toISOString(),
    });
  }
}

/** Detecta si el listing revela un sitio web propio (dominio externo, no red social).
 *  Solo se consideran los enlaces DENTRO del contenido del listing (no el sidebar/footer). */
function detectarWeb(html: string, jsonLd: any, origen: string): string | null {
  const desdeLd = jsonLd?.url;
  if (esWebPropia(desdeLd, origen)) return desdeLd;

  const $ = cheerio.load(html);
  let encontrada: string | null = null;
  // Contenedor del listing: clase del plugin Business Directory.
  const contenedor = $(".wpbdp-single, #wpbdp-listing, .wpbdp-listing-single");
  const objetivo = contenedor.length ? contenedor : $(".post-content");
  objetivo.find('a[href]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!encontrada && esWebPropia(href, origen)) encontrada = href;
  });
  return encontrada;
}

// ---------------------------------------------------------------
// FALLBACK GENÉRICO (cheerio sobre HTML, para otros directorios)
// ---------------------------------------------------------------
async function scrapeGenerico(url: string): Promise<void> {
  console.log("[scraper] Fuente: genérica (cheerio sobre HTML)");
  const res = await axios.get(url, { headers: { "User-Agent": AGENT }, timeout: 20000 });
  const $ = cheerio.load(res.data);
  const SEL = ["article", ".business", ".company", ".negocio", "li"];

  $(SEL.join(",")).each((_, el) => {
    const $el = $(el);
    const nombre = ($el.find("h2,h3,.name,.title").first().text().trim());
    const telefonoRaw = ($el.find("[href*='tel:'],.phone,.tel").first().text().trim());
    const direccion = ($el.find(".address,.adr,address").first().text().trim());
    const whatsapp = normalizarTelefonoPA(telefonoRaw);
    if (!nombre || !whatsapp) {
      descartados++;
      return;
    }
    const id = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
    extraidos.push({
      id: id || `prospecto-${extraidos.length + 1}`,
      nombre_negocio: nombre,
      tipo: "Negocio local",
      direccion: direccion || "David, Chiriquí",
      coordenadas: { ...CENTRO_DAVID },
      whatsapp,
      color_accent: accentParaTipo(tipo),
      creado_en: new Date().toISOString(),
    });
  });
}

// ---------------------------------------------------------------
// EJECUCIÓN
// ---------------------------------------------------------------
if (/camchi\.org\.pa/i.test(url)) {
  await scrapeCamchi(url);
} else {
  await scrapeGenerico(url);
}

console.log(
  `[scraper] Extraídos: ${extraidos.length} · Sin teléfono/nombre: ${descartados} · Con web propia (filtrados): ${descartadosSinWeb}`
);

// Fusionar con existentes: sin duplicar por id, por teléfono NI por nombre normalizado.
const previos: Prospecto[] = await readFile(DATA_FILE, "utf-8").then((t) => JSON.parse(t)).catch(() => []);
const mapa = new Map(previos.map((p) => [p.id, p]));
const porTelefono = new Set(previos.map((p) => p.whatsapp));
const porNombre = new Set(previos.map((p) => normalizarNombre(p.nombre_negocio)));
for (const p of extraidos) {
  if (porTelefono.has(p.whatsapp)) continue; // ya existe un negocio con ese teléfono
  const nombreN = normalizarNombre(p.nombre_negocio);
  if (porNombre.has(nombreN)) continue; // ya existe con ese nombre (huella digital)
  mapa.set(p.id, p);
  porTelefono.add(p.whatsapp);
  porNombre.add(nombreN);
}
const final = [...mapa.values()];

await mkdir(dirname(DATA_FILE), { recursive: true });
await writeFile(DATA_FILE, JSON.stringify(final, null, 2), "utf-8");
console.log(`[scraper] Total en prospectos.json: ${final.length}`);

/**
 * Scraper de Google Maps (David, Chiriquí)
 * ---------------------------------------
 * Usa navegador real (puppeteer-core) porque Maps es una SPA.
 * - Abre búsquedas de Maps, hace scroll en el panel de resultados.
 * - Hace clic en cada negocio y lee el panel de detalle:
 *   teléfono, web, dirección, categoría y COORDENADAS reales (del URL).
 * - Filtra teléfonos válidos (+507) y fusiona en prospectos.json.
 *
 * Config (.env):
 *   GMAP_QUERIES  = "restaurantes en David Chiriquí, salones de belleza en David"
 *   GMAP_LIMITE   = cuántos negocios por búsqueda (por defecto 10)
 *   SOLO_SIN_WEB  = true → solo los sin web propia
 *
 * Uso: bun run gmaps
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "puppeteer-core";
import type { Prospecto } from "../types.ts";
import { normalizarTelefonoPA } from "../lib/telefono.ts";
import { accentParaTipo } from "../lib/accent.ts";
import { normalizarNombre, esWebPropia } from "../lib/dedupe.ts";
import { calcularScore, esGiroTradicional } from "../lib/lead-scoring.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_FILE = join(ROOT, "data", "prospectos.json");

const CH =
  process.env.CHROMIUM_PATH ||
  "/nix/store/rxf83sv2x0ja1hi6vdli6ijll5v15x9j-chromium-151.0.7922.173/bin/chromium";
const QUERIES = (process.env.GMAP_QUERIES || "restaurantes en David Chiriquí, salones de belleza en David Chiriquí")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LIMITE = Number(process.env.GMAP_LIMITE || 10);
const SOLO_SIN_WEB = process.env.SOLO_SIN_WEB !== "false";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function aceptarConsentimiento(page: any) {
  try {
    const b = await page.$("button[aria-label*='Aceptar'] , button:has-text('Aceptar todo')");
    if (b) { await b.click().catch(() => {}); await sleep(1200); }
  } catch { /* sin consentimiento */ }
}

async function scrollResultados(page: any, limite: number) {
  const panel = await page.$("div[role='feed']").catch(() => null);
  if (!panel) return;
  for (let i = 0; i < Math.min(8, limite); i++) {
    await panel.evaluate((el: any) => el.scrollBy(0, 900)).catch(() => {});
    await sleep(900);
  }
}

async function leerDetalle(page: any): Promise<{ nombre: string; tipo: string; direccion: string; telefono: string; web: string; rating: number; reseñas: number }> {
  return page.evaluate(() => {
    const txt = (sels: string[]) => {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el && el.textContent?.trim()) return el.textContent.trim();
      }
      return "";
    };
    const href = (sels: string[]) => {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el && (el as HTMLAnchorElement).href) return (el as HTMLAnchorElement).href;
      }
      return "";
    };
    // Rating y nº de reseñas vienen en el bloque de estrellas del panel de detalle.
    const ratingTxt = txt(["[role='main'] .F7nice", "[role='main'] .qTYCNe", "div.fontBodyMedium > span > span[aria-hidden='true']"]);
    const rating = Number.parseFloat(ratingTxt.replace(",", "."));
    const reseniasTxt = txt(["[role='main'] span[aria-label*='reseña']", "[role='main'] .UY7F9", "[role='main'] a[aria-label*='reseña']"]);
    const resenias = Number.parseInt((reseniasTxt.match(/\d[\d.,]*/) || ["0"])[0].replace(/\./g, "").replace(",", ""), 10) || 0;
    return {
      nombre: txt(["h1.DUwDvf", "h1", "[role='main'] h1"]),
      tipo: txt(["[role='main'] button[jsaction*='category']", "[role='main'] .DkEaL", "button[jsaction*='category']"]),
      direccion: txt(["button[data-item-id='address']", "[data-item-id='address']"]),
      telefono: txt(["[data-item-id^='phone']", "a[href^='tel:']"]),
      web: href(["a[data-item-id='authority']", "[data-item-id='authority'] a", "a[aria-label*='Sitio web']"]),
      rating: Number.isFinite(rating) ? rating : 0,
      reseñas: resenias,
    };
  });
}

async function extraer(): Promise<Prospecto[]> {
  const browser = await launch({
    executablePath: CH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(UA);

  const encontrados: Prospecto[] = [];
  let captcha = false;

  for (const q of QUERIES) {
    console.log(`[gmaps] Buscando: ${q}`);
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}/`, {
      waitUntil: "networkidle2",
      timeout: 40000,
    }).catch(() => {});
    await sleep(2000);
    await aceptarConsentimiento(page);
    if (page.url().includes("/sorry/")) { captcha = true; break; }
    await scrollResultados(page, LIMITE);

    // Tarjetas reales de negocios (los enlaces de "reserva"/búsqueda se descartan).
    const conLinks = await page.$$eval("div[role='feed'] a", (as) =>
      as
        .map((a) => ({ href: (a as HTMLAnchorElement).href }))
        .filter((x) => x.href.includes("/place/") && !x.href.includes("/reserve/"))
    );
    console.log(`[gmaps] ${conLinks.length} negocios visibles`);
    for (let i = 0; i < Math.min(conLinks.length, LIMITE); i++) {
      try {
        // Coordenadas reales vienen en el href: ...!3dLAT!4dLNG...
        const m = conLinks[i].href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        const coords = m
          ? { lat: Number(m[1]), lng: Number(m[2]) }
          : { lat: 8.427, lng: -82.431 };

        // Clic en la tarjeta i-ésima buscando por su href (los nodos se re-renderizan).
        const anchors = await page.$$("div[role='feed'] a").catch(() => []);
        let clicked = false;
        for (const a of anchors) {
          const href = await a.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => "");
          if (href === conLinks[i].href) {
            await a.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
            clicked = true;
            break;
          }
        }
        if (!clicked) continue;
        await sleep(2300);
        const detalle = await leerDetalle(page);

        const whatsapp = normalizarTelefonoPA(detalle.telefono);
        if (!detalle.nombre || !whatsapp) continue;

        const tieneWeb = Boolean(detalle.web) && esWebPropia(detalle.web, "https://www.google.com/maps");
        if (SOLO_SIN_WEB && tieneWeb) continue;

        const id = normalizarNombre(detalle.nombre).replace(/\s+/g, "-").slice(0, 60) || `gmaps-${encontrados.length}`;
        const sc = calcularScore({
          rating: detalle.rating,
          reseñas: detalle.reseñas,
          tiene_web: tieneWeb,
          web_deficiente: false,
          giro_tradicional: esGiroTradicional(detalle.tipo || ""),
        });
        encontrados.push({
          id,
          nombre_negocio: detalle.nombre,
          tipo: detalle.tipo || "Negocio local",
          direccion: detalle.direccion || "David, Chiriquí",
          coordenadas: coords,
          whatsapp,
          color_accent: accentParaTipo(detalle.tipo || ""),
          tiene_web: tieneWeb,
          web: detalle.web || undefined,
          rating: detalle.rating || undefined,
          reseñas: detalle.reseñas || undefined,
          lead_score: sc.pasa_filtro ? sc.score : undefined,
          tier_lead: sc.pasa_filtro ? sc.tier : undefined,
          scoring_motivo: sc.motivo,
          creado_en: new Date().toISOString(),
        });
        console.log(`  + ${detalle.nombre.slice(0, 40)} · ${whatsapp} · ${tieneWeb ? "con web" : "sin web"} · ${detalle.rating || "-"}★(${detalle.reseñas || 0}) · score ${sc.pasa_filtro ? sc.score : "—"}`);
        await sleep(1600 + Math.random() * 1200);
      } catch {
        /* tarjeta inválida o panel que se cerró */
      }
    }
  }

  await browser.close();
  if (captcha) console.warn("[gmaps] Google pidió captcha — detén un rato y vuelve a intentar.");
  return encontrados;
}

// ---- Fusión con dedup ----
const extraidos = await extraer();
const previos: Prospecto[] = await readFile(DATA_FILE, "utf-8").then((t) => JSON.parse(t)).catch(() => []);
const mapa = new Map(previos.map((p) => [p.id, p]));
const porTelefono = new Set(previos.map((p) => p.whatsapp));
const porNombre = new Set(previos.map((p) => normalizarNombre(p.nombre_negocio)));
let agregados = 0;
for (const p of extraidos) {
  if (porTelefono.has(p.whatsapp) || porNombre.has(normalizarNombre(p.nombre_negocio))) continue;
  mapa.set(p.id, p);
  porTelefono.add(p.whatsapp);
  porNombre.add(normalizarNombre(p.nombre_negocio));
  agregados++;
}
await writeFile(DATA_FILE, JSON.stringify([...mapa.values()], null, 2), "utf-8");
console.log(`[gmaps] Extraídos: ${extraidos.length} · Agregados nuevos: ${agregados} · Total en prospectos.json: ${mapa.size}`);

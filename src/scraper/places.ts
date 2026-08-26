/**
 * Scraper de GOOGLE PLACES API (New) — la vía oficial, sin captchas.
 * Busca negocios por texto, devuelve teléfono, web, coordenadas y tipo reales.
 *
 * Config (.env):
 *   GOOGLE_PLACES_API_KEY = tu API key de Google Cloud (Places API habilitada + billing)
 *   PLACES_QUERIES        = "restaurantes en David Chiriquí, salones en David Chiriquí"
 *   PLACES_LIMITE         = máx resultados por búsqueda (la API da hasta 20)
 *   SOLO_SIN_WEB          = true → solo negocios sin web propia
 *
 * Uso: bun run places
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, fileURLToPath } from "node:url";
import type { Prospecto } from "../types.ts";
import { normalizarTelefonoPA } from "../lib/telefono.ts";
import { accentParaTipo } from "../lib/accent.ts";
import { normalizarNombre, esWebPropia } from "../lib/dedupe.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_FILE = join(ROOT, "data", "prospectos.json");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const QUERIES = (process.env.PLACES_QUERIES || "restaurantes en David Chiriquí, salones de belleza en David Chiriquí, barberías en David Chiriquí")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LIMITE = Number(process.env.PLACES_LIMITE || 20);
const SOLO_SIN_WEB = process.env.SOLO_SIN_WEB !== "false";

if (!API_KEY) {
  console.error("[places] Falta GOOGLE_PLACES_API_KEY en .env");
  process.exit(1);
}

const FIELDS = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.location",
  "places.types",
].join(",");

/** Devuelve un nombre legible desde el arreglo de tipos de Places. */
function tipoLegible(types: string[]): string {
  const orden = [
    "restaurant", "cafe", "bar", "beauty_salon", "hair_care", "gym", "health",
    "doctor", "veterinary_care", "car_repair", "auto_parts_store", "store",
    "supermarket", "lawyer", "travel_agency", "lodging", "dentist", "pharmacy",
  ];
  const mapa: Record<string, string> = {
    restaurant: "Restaurante", cafe: "Cafetería", bar: "Bar", beauty_salon: "Salón de belleza",
    hair_care: "Peluquería", gym: "Gimnasio", health: "Salud", doctor: "Médico",
    veterinary_care: "Veterinaria", car_repair: "Taller automotriz", auto_parts_store: "Repuestos",
    store: "Tienda", supermarket: "Supermercado", lawyer: "Abogado", travel_agency: "Agencia de viajes",
    lodging: "Hotel", dentist: "Clínica dental", pharmacy: "Farmacia",
  };
  for (const t of orden) if (types.includes(t)) return mapa[t] || t.replace(/_/g, " ");
  return types[0]?.replace(/_/g, " ") || "Negocio local";
}

const extraidos: Prospecto[] = [];
let descartados = 0;
let conWeb = 0;

for (const q of QUERIES) {
  console.log(`[places] Buscando: ${q}`);
  const res = await fetch(`https://places.googleapis.com/v1/places:searchText?languageCode=es`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELDS,
    },
    body: JSON.stringify({ textQuery: q }),
  });
  if (!res.ok) {
    console.warn(`[places] Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    continue;
  }
  const data = await res.json();
  const lugares = data.places || [];
  console.log(`[places] ${lugares.length} resultados`);

  for (const l of lugares.slice(0, LIMITE)) {
    const nombre = l.displayName?.text || "";
    const telefono = l.nationalPhoneNumber || "";
    const whatsapp = normalizarTelefonoPA(telefono);
    if (!nombre || !whatsapp) {
      descartados++;
      continue;
    }
    const tieneWeb = Boolean(l.websiteUri) && esWebPropia(l.websiteUri, "https://www.google.com/maps");
    if (SOLO_SIN_WEB && tieneWeb) {
      conWeb++;
      continue;
    }
    const tipo = tipoLegible(l.types || []);
    extraidos.push({
      id: normalizarNombre(nombre).replace(/\s+/g, "-").slice(0, 60) || `places-${extraidos.length}`,
      nombre_negocio: nombre,
      tipo,
      direccion: l.formattedAddress || "David, Chiriquí",
      coordenadas: {
        lat: l.location?.latitude ?? 8.427,
        lng: l.location?.longitude ?? -82.431,
      },
      whatsapp,
      color_accent: accentParaTipo(tipo),
      tiene_web: tieneWeb,
      creado_en: new Date().toISOString(),
    });
    console.log(`  + ${nombre.slice(0, 40)} · ${whatsapp} · ${tieneWeb ? "web" : "sin web"} · ${tipo.slice(0, 20)}`);
  }
  await new Promise((r) => setTimeout(r, 600)); // límite de cuota suave
}

// Fusión con dedup
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
console.log(`[places] Extraídos: ${extraidos.length} · Sin teléfono: ${descartados} · Con web (filtrados): ${conWeb} · Agregados: ${agregados} · Total: ${mapa.size}`);

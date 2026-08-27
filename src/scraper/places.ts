/**
 * Scraper de GOOGLE PLACES API (New) con LEAD SCORING — la vía oficial, sin captchas.
 * Busca negocios por texto, devuelve teléfono, web, coordenadas, rating y reseñas.
 * Luego puntúa cada lead (ver src/lib/lead-scoring.ts) y solo guarda los que pasan:
 *   negocios tradicionales (agro, logística, construcción, servicios) con buena
 *   reputación (+4.0★ y +50 reseñas) y SIN web propia (o con web deficiente).
 *
 * Config (.env):
 *   GOOGLE_PLACES_API_KEY = tu API key de Google Cloud (Places API habilitada + billing)
 *   PLACES_QUERIES        = "restaurantes en David Chiriquí, salones en David Chiriquí"
 *   PLACES_LIMITE         = máx resultados por búsqueda (la API da hasta 20)
 *   SOLO_SIN_WEB          = true → solo negocios sin web propia
 *   ANALIZAR_WEB          = true → chequea la calidad de la web propia (la "deficiente" sigue siendo lead)
 *   SCORE_RATING_MIN / SCORE_RESENAS_MIN / SCORE_MINIMO → umbrales del scoring
 *   SCORE_TOPN            = 0 → guarda todos los que pasan; N → solo los N mejores por corrida
 *
 * Uso: bun run places
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Prospecto } from "../types.ts";
import { normalizarTelefonoPA } from "../lib/telefono.ts";
import { accentParaTipo } from "../lib/accent.ts";
import { normalizarNombre, esWebPropia } from "../lib/dedupe.ts";
import { calcularScore, esGiroTradicional, ordenarPorScore } from "../lib/lead-scoring.ts";
import { analizarWeb } from "../lib/web-quality.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_FILE = join(ROOT, "data", "prospectos.json");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Lista curada de giros de David, Chiriquí (por defecto, sin configurar nada).
// Incluye los giros tradicionales de la estrategia (agro, logística, construcción, servicios).
const GIROS = [
  "agropecuarias en David Chiriquí", "ferreterías en David Chiriquí",
  "empresas de transporte en David Chiriquí", "encomiendas en David Chiriquí",
  "empresas de construcción en David Chiriquí", "servicios de ingeniería en David Chiriquí",
  "tiendas de maquinaria en David Chiriquí", "servicios de topografía en David Chiriquí",
  "restaurantes en David Chiriquí", "cafeterías en David Chiriquí",
  "salones de belleza en David Chiriquí", "barberías en David Chiriquí",
  "gimnasios en David Chiriquí", "veterinarias en David Chiriquí",
  "farmacias en David Chiriquí", "clínicas médicas en David Chiriquí",
  "clínicas dentales en David Chiriquí", "talleres mecánicos en David Chiriquí",
  "tiendas de repuestos en David Chiriquí", "tiendas de ropa en David Chiriquí",
  "supermercados en David Chiriquí", "abogados en David Chiriquí",
  "agencias de viajes en David Chiriquí", "hoteles en David Chiriquí",
  "panaderías en David Chiriquí", "ópticas en David Chiriquí",
  "electrónicos en David Chiriquí",
];

// Si no configuraste PLACES_QUERIES, corre toda la lista curada.
const QUERIES = (process.env.PLACES_QUERIES || "").split(",").map((s) => s.trim()).filter(Boolean);
const queriesFinales = QUERIES.length ? QUERIES : GIROS;
const LIMITE = Number(process.env.PLACES_LIMITE || 20);
const SOLO_SIN_WEB = process.env.SOLO_SIN_WEB !== "false";
const ANALIZAR_WEB = process.env.ANALIZAR_WEB !== "false";
const TOPN = Number(process.env.SCORE_TOPN || 0);

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
  "places.rating",
  "places.userRatingCount",
].join(",");

/** Devuelve un nombre legible desde el arreglo de tipos de Places. */
function tipoLegible(types: string[]): string {
  const orden = [
    "restaurant", "cafe", "bar", "beauty_salon", "hair_care", "gym", "health",
    "doctor", "veterinary_care", "car_repair", "auto_parts_store", "store",
    "supermarket", "lawyer", "travel_agency", "lodging", "dentist", "pharmacy",
    "agricultural_supplier", "farm", "bus_station", "transit_station", "general_contractor",
    "electrician", "plumber", "building_material_store", "locksmith",
  ];
  const mapa: Record<string, string> = {
    restaurant: "Restaurante", cafe: "Cafetería", bar: "Bar", beauty_salon: "Salón de belleza",
    hair_care: "Peluquería", gym: "Gimnasio", health: "Salud", doctor: "Médico",
    veterinary_care: "Veterinaria", car_repair: "Taller automotriz", auto_parts_store: "Repuestos",
    store: "Tienda", supermarket: "Supermercado", lawyer: "Abogado", travel_agency: "Agencia de viajes",
    lodging: "Hotel", dentist: "Clínica dental", pharmacy: "Farmacia",
    agricultural_supplier: "Insumos agro", farm: "Agro", general_contractor: "Construcción",
    electrician: "Servicios eléctricos", plumber: "Plomería", building_material_store: "Materiales de construcción",
  };
  for (const t of orden) if (types.includes(t)) return mapa[t] || t.replace(/_/g, " ");
  return types[0]?.replace(/_/g, " ") || "Negocio local";
}

const extraidos: Prospecto[] = [];
let descartados = 0;        // sin nombre/teléfono
let sinReputacion = 0;      // rating o reseñas bajo el umbral
let conWebBuena = 0;        // web propia en buen estado
let fallaScoring = 0;       // no pasa el puntaje mínimo

for (const q of queriesFinales) {
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
    const tipo = tipoLegible(l.types || []);
    const tieneWebRaw = l.websiteUri && esWebPropia(l.websiteUri, "https://www.google.com/maps");
    const tieneWeb = Boolean(tieneWebRaw);
    if (SOLO_SIN_WEB && tieneWeb) {
      conWebBuena++;
      continue;
    }

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
      web: tieneWebRaw || undefined,
      web_deficiente: tieneWeb, // provisional: se afina abajo analizando la URL
      rating: typeof l.rating === "number" ? l.rating : undefined,
      reseñas: typeof l.userRatingCount === "number" ? l.userRatingCount : undefined,
      creado_en: new Date().toISOString(),
    });
  }
  await new Promise((r) => setTimeout(r, 600)); // límite de cuota suave
}

// ---- Análisis de calidad de la web propia (paralelo, ligero) ----
if (ANALIZAR_WEB) {
  const conWeb = extraidos.filter((p) => p.tiene_web);
  console.log(`[places] Analizando calidad de ${conWeb.length} webs propias…`);
  const resultados = await Promise.all(conWeb.map((p) => analizarWeb(p.web as string).then((r) => [p.id, r] as const)));
  for (const [id, r] of resultados) {
    const p = extraidos.find((x) => x.id === id);
    if (!p) continue;
    p.web_deficiente = r.deficiente;
    if (!r.deficiente) {
      // Web en buen estado → pierde el estatus de lead (como antes).
      p.lead_score = 0;
    }
    console.log(`  · ${p.nombre_negocio.slice(0, 36)} → ${r.motivo} (${r.score}/100)`);
  }
}

// ---- LEAD SCORING + ranking ----
const puntuados: Prospecto[] = [];
for (const p of extraidos) {
  if (p.tiene_web && !p.web_deficiente) {
    conWebBuena++;
    continue;
  }
  const sc = calcularScore({
    rating: p.rating ?? 0,
    reseñas: p.reseñas ?? 0,
    tiene_web: Boolean(p.tiene_web),
    web_deficiente: Boolean(p.web_deficiente),
    giro_tradicional: esGiroTradicional(p.tipo),
  });
  if (sc.score === 0) {
    conWebBuena++;
    continue;
  }
  if (!sc.pasa_filtro) {
    const bajoRating = p.rating !== undefined && p.rating < Number(process.env.SCORE_RATING_MIN || 4);
    const bajasReseñas = (p.reseñas ?? 0) < Number(process.env.SCORE_RESENAS_MIN || 50);
    if (bajoRating || bajasReseñas) sinReputacion++;
    else fallaScoring++;
    continue;
  }
  p.lead_score = sc.score;
  p.tier_lead = sc.tier;
  p.scoring_motivo = sc.motivo;
  puntuados.push(p);
}

const ordenados = ordenarPorScore(puntuados);
const finales = TOPN > 0 ? ordenados.slice(0, TOPN) : ordenados;
const descartadosPorTop = ordenados.length - finales.length;

console.log(
  `[places] Sin nombre/teléfono: ${descartados} · Con web buena (filtrados): ${conWebBuena} · ` +
  `Sin reputación: ${sinReputacion} · No pasa score: ${fallaScoring} · Top descartado: ${descartadosPorTop}`
);

for (const p of finales) {
  console.log(`  + [${p.tier_lead}] ${p.nombre_negocio.slice(0, 36)} · score ${p.lead_score} · ${p.rating}★ (${p.reseñas}) · ${p.tiene_web ? "web deficiente" : "sin web"}`);
}

// ---- Fusión con dedup (los mejores leads entran primero) ----
const previos: Prospecto[] = await readFile(DATA_FILE, "utf-8").then((t) => JSON.parse(t)).catch(() => []);
const mapa = new Map(previos.map((p) => [p.id, p]));
const porTelefono = new Set(previos.map((p) => p.whatsapp));
const porNombre = new Set(previos.map((p) => normalizarNombre(p.nombre_negocio)));
let agregados = 0;
for (const p of finales) {
  if (porTelefono.has(p.whatsapp) || porNombre.has(normalizarNombre(p.nombre_negocio))) continue;
  mapa.set(p.id, p);
  porTelefono.add(p.whatsapp);
  porNombre.add(normalizarNombre(p.nombre_negocio));
  agregados++;
}
await writeFile(DATA_FILE, JSON.stringify([...mapa.values()], null, 2), "utf-8");
console.log(`[places] Leads: ${finales.length} · Agregados nuevos: ${agregados} · Total: ${mapa.size}`);

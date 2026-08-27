/**
 * Scraper de GOOGLE PLACES API (New) con LEAD SCORING — la vía oficial, sin captchas.
 * Busca negocios por texto en TODA Chiriquí (provincia + pueblos), devuelve teléfono,
 * web, coordenadas, rating y reseñas. Luego puntúa cada lead (src/lib/lead-scoring.ts):
 *   - Modo rank (default): el score solo ORDENA (mejores primero); no descarta a nadie
 *     con teléfono válido y sin web buena → maximiza el VOLUMEN de leads.
 *   - Modo filter: solo guarda los que pasan los umbrales.
 *
 * Config (.env):
 *   GOOGLE_PLACES_API_KEY = tu API key de Google Cloud (Places API habilitada + billing)
 *   PLACES_QUERIES        = override de búsquedas (vacío = lista curada de Chiriquí)
 *   PLACES_LIMITE         = máx resultados por búsqueda (paginado: 20 por página, hasta 60)
 *   SOLO_SIN_WEB          = true → solo negocios sin web propia
 *   SCORE_MODO            = "rank" (default) | "filter"
 *   SCORE_TOPN            = 0 → guarda todos; N → solo los N mejores por corrida
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
import { calcularScore, esGiroTradicional, ordenarPorScore, SCORE_UMBRALES } from "../lib/lead-scoring.ts";
import { analizarWebsParalelo } from "../lib/web-quality.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_FILE = join(ROOT, "data", "prospectos.json");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Lista curada de giros a lo largo de TODA LA PROVINCIA de Chiriquí (no solo David):
// cada giro se busca "en Chiriquí" (provincia entera) y los de mayor volumen también
// pueblo por pueblo. Incluye barridos genéricos ("negocios en X") que atrapan a
// negocios que ninguna categoría nombra.
const CATEGORIAS = [
  // Tradicionales (estrategia): agro, logística, construcción, servicios.
  "agropecuarias", "insumos agrícolas", "agroservicios", "plantaciones", "procesadoras de alimentos",
  "ferreterías", "materiales de construcción", "empresas de construcción", "servicios de ingeniería",
  "empresas de transporte", "encomiendas", "empresas de logística",
  // Gastronomía y consumo.
  "restaurantes", "cafeterías", "panaderías", "supermercados", "tiendas de abarrotes", "venta de carnes",
  // Salud y belleza.
  "salones de belleza", "barberías", "gimnasios", "veterinarias", "farmacias", "clínicas médicas",
  "clínicas dentales", "ópticas",
  // Automotriz.
  "talleres mecánicos", "tiendas de repuestos", "venta de llantas", "estética automotriz", "refrigeración y aire acondicionado",
  // Comercio y servicios.
  "tiendas de ropa", "tiendas de celulares", "tiendas de deportes", "papelerías", "mueblerías",
  "joyerías", "florerías", "lavanderías", "electrónicos",
  // Profesionales.
  "abogados", "notarías", "servicios contables", "agencias de seguros", "inmobiliarias", "consultorías",
  // Turismo y otros.
  "agencias de viajes", "hoteles", "imprentas", "eventos y publicidad", "seguridad privada",
];
// Categorías de mayor volumen que además se buscan pueblo por pueblo.
const CATEGORIAS_POR_PUEBLO = [
  "restaurantes", "farmacias", "salones de belleza", "barberías",
  "talleres mecánicos", "ferreterías", "agropecuarias", "gimnasios", "tiendas de ropa",
];
const PUEBLOS = ["Boquete", "Volcán", "Bugaba", "La Concepción", "Puerto Armuelles", "Alanje"];

const GIROS = [
  ...CATEGORIAS.map((c) => `${c} en Chiriquí`),
  ...CATEGORIAS_POR_PUEBLO.flatMap((c) => PUEBLOS.map((p) => `${c} en ${p}, Chiriquí`)),
  // Barridos genéricos: atrapan lo que ninguna categoría nombra.
  "negocios en Chiriquí",
  "empresas en Chiriquí",
  ...PUEBLOS.map((p) => `negocios en ${p}, Chiriquí`),
];

// Si no configuraste PLACES_QUERIES, corre toda la lista curada.
const QUERIES = (process.env.PLACES_QUERIES || "").split(",").map((s) => s.trim()).filter(Boolean);
const queriesFinales = QUERIES.length ? QUERIES : GIROS;
console.log(`[places] ${queriesFinales.length} búsquedas (${QUERIES.length ? "custom PLACES_QUERIES" : "lista curada de Chiriquí"})`);
const LIMITE = Number(process.env.PLACES_LIMITE || 60);
const SOLO_SIN_WEB = process.env.SOLO_SIN_WEB !== "false";
const ANALIZAR_WEB = process.env.ANALIZAR_WEB !== "false";
const TOPN = Number(process.env.SCORE_TOPN || 0);

if (!API_KEY) {
  console.error("[places] Falta GOOGLE_PLACES_API_KEY en .env");
  process.exit(1);
}
// Tipada como string tras el guard (TS no propaga el narrowing dentro de funciones).
const GOOGLE_KEY: string = API_KEY;

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

/**
 * Busca con PAGINACIÓN: la API devuelve máx 20 por petición pero permite seguir
 * con nextPageToken hasta 3 páginas (60/búsqueda). Sin esto perdíamos 2/3 del pool.
 */
async function buscarTexto(q: string): Promise<any[]> {
  const resultados: any[] = [];
  let nextPageToken: string | undefined;
  let paginas = 0;
  do {
    const body: Record<string, unknown> = { textQuery: q, pageSize: 20 };
    if (nextPageToken) body.pageToken = nextPageToken;
    const res = await fetch(`https://places.googleapis.com/v1/places:searchText?languageCode=es`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[places] Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      break;
    }
    const data = await res.json();
    resultados.push(...(data.places || []));
    nextPageToken = data.nextPageToken;
    paginas++;
    if (!nextPageToken) break;
    await new Promise((r) => setTimeout(r, 900)); // límite de cuota suave entre páginas
  } while (resultados.length < LIMITE && paginas < 3);
  return resultados.slice(0, LIMITE);
}

for (const q of queriesFinales) {
  console.log(`[places] Buscando: ${q}`);
  const lugares = await buscarTexto(q);
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

// ---- Análisis de calidad de la web propia (paralelo con límite) + captura de correos ----
const leadsEmail: { nombre: string; email: string; tipo: string; direccion: string; web: string; fuente: string }[] = [];
if (ANALIZAR_WEB) {
  const conWeb = extraidos.filter((p) => p.tiene_web).slice(0, Number(process.env.ANALIZAR_WEB_LIMITE || 200));
  console.log(`[places] Analizando calidad de ${conWeb.length} webs propias (pool 6)…`);
  const analizados = await analizarWebsParalelo(conWeb, 6);
  for (const p of conWeb) {
    const r = analizados.get(p.id);
    if (!r) continue;
    p.web_deficiente = r.deficiente;
    if (r.email) p.email = r.email;
    if (!r.deficiente) {
      // Web en buen estado → pierde el estatus de lead (como antes).
      p.lead_score = 0;
    }
    // Correo capturado → base de email-outreach (sirve también para negocios con web).
    if (r.email) {
      leadsEmail.push({
        nombre: p.nombre_negocio,
        email: r.email,
        tipo: p.tipo,
        direccion: p.direccion,
        web: p.web || "",
        fuente: "places",
      });
    }
    console.log(`  · ${p.nombre_negocio.slice(0, 36)} → ${r.motivo} (${r.score}/100)${r.email ? " · email ✓" : ""}`);
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
    const bajoRating = p.rating !== undefined && p.rating < SCORE_UMBRALES.RATING_MIN;
    const bajasReseñas = (p.reseñas ?? 0) < SCORE_UMBRALES.RESENAS_MIN;
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
  `[places] Modo: ${SCORE_UMBRALES.SCORE_MODO} · Sin nombre/teléfono: ${descartados} · ` +
  `Con web buena (filtrados): ${conWebBuena} · Sin reputación: ${sinReputacion} · ` +
  `No pasa score: ${fallaScoring} · Top descartado: ${descartadosPorTop}`
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

// ---- Base de EMAILS (para email-outreach: sirve aunque el negocio tenga web) ----
const EMAILS_FILE = join(ROOT, "data", "emails.json");
const emailsPrevios = await readFile(EMAILS_FILE, "utf-8").then((t) => JSON.parse(t)).catch(() => []);
const porEmail = new Set((emailsPrevios as any[]).map((e: any) => (e.email || "").toLowerCase()));
const emailsFinales = [...(emailsPrevios as any[])];
let emailsNuevos = 0;
for (const e of leadsEmail) {
  const k = e.email.toLowerCase();
  if (porEmail.has(k)) continue;
  porEmail.add(k);
  emailsFinales.push({ ...e, creado_en: new Date().toISOString() });
  emailsNuevos++;
}
await writeFile(EMAILS_FILE, JSON.stringify(emailsFinales, null, 2), "utf-8");
console.log(`[places] Emails: ${leadsEmail.length} capturados · Nuevos: ${emailsNuevos} · Total en data/emails.json: ${emailsFinales.length}`);

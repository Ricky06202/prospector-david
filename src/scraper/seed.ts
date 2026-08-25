/**
 * MÓDULO 1 — Semilla (SEED)
 * -------------------------
 * Genera `data/prospectos.json` con los negocios locales REALES ya trabajados,
 * para que el pipeline corra end-to-end hoy mismo. El scraper real (scrape.ts)
 * podrá ampliar esta base cuando se le indique la URL del directorio.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Prospecto } from "../types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

const prospectos: Prospecto[] = [
  {
    id: "vet-24h",
    nombre_negocio: "Clínica Veterinaria 24 Horas",
    tipo: "Veterinaria",
    direccion: "Calle G norte, entre avenidas 4ta y 5a Oeste, David, Chiriquí",
    coordenadas: { lat: 8.4403073, lng: -82.4259262 },
    whatsapp: "+50766298299",
    color_accent: "teal",
  },
  {
    id: "craft-cafe-david",
    nombre_negocio: "Craft Café David",
    tipo: "Cafetería",
    direccion: "Vía Boquete antigua, David, Chiriquí",
    coordenadas: { lat: 8.4476733, lng: -82.4220362 },
    whatsapp: "+50764665464",
    color_accent: "orange",
  },
  {
    id: "spartan-gym",
    nombre_negocio: "Spartan Gym Club",
    tipo: "Gimnasio",
    direccion: "Vía Rápida, frente a Plaza Mayorca, David, Chiriquí",
    coordenadas: { lat: 8.4278046, lng: -82.4317569 },
    whatsapp: "+50768473825",
    color_accent: "red",
  },
  {
    id: "acosta-collins-taller",
    nombre_negocio: "Taller de Mecánica y Servicios Acosta Collins",
    tipo: "Taller automotriz",
    direccion: "David, Chiriquí",
    coordenadas: { lat: 8.4095629, lng: -82.4298986 },
    whatsapp: "+50767033220",
    color_accent: "blue",
  },
  {
    id: "dra-chong-dental",
    nombre_negocio: "Clínica Dental & Especializada Dra. Chong",
    tipo: "Clínica dental",
    direccion: "Calle C Nte., frente a la Policlínica Gustavo A. Ros, David, Chiriquí",
    coordenadas: { lat: 8.4311295, lng: -82.427002 },
    whatsapp: "+50765414162",
    color_accent: "cyan",
  },
  {
    id: "rincon-espanol",
    nombre_negocio: "El Rincón Español",
    tipo: "Restaurante",
    direccion: "Av. Francisco Clark, David, Chiriquí",
    coordenadas: { lat: 8.447095, lng: -82.4205937 },
    whatsapp: "+50768616334",
    color_accent: "rose",
  },
  {
    id: "veronica-salon",
    nombre_negocio: "Verónica Salón",
    tipo: "Salón de belleza",
    direccion: "David, Chiriquí",
    coordenadas: { lat: 8.4093665, lng: -82.4316125 },
    whatsapp: "+50762327688",
    color_accent: "pink",
  },
  {
    id: "frio-baru",
    nombre_negocio: "Frío Barú",
    tipo: "Refrigeración y A/C",
    direccion: "Calle D Sur, David, Chiriquí",
    coordenadas: { lat: 8.4244291, lng: -82.4291516 },
    whatsapp: "+50766769427",
    color_accent: "sky",
  },
];

const ahora = new Date().toISOString();
const conFechas = prospectos.map((p) => ({ ...p, tiene_web: true, creado_en: ahora }));

// FUSIÓN (no sobrescribe): agrega/actualiza los 8 seeds sin borrar los scrapeados.
const previos: Prospecto[] = await readFile(join(DATA_DIR, "prospectos.json"), "utf-8")
  .then((t) => JSON.parse(t))
  .catch(() => []);
const mapa = new Map(previos.map((p) => [p.id, p]));
for (const p of conFechas) mapa.set(p.id, p);
const final = [...mapa.values()];

await mkdir(DATA_DIR, { recursive: true });
await writeFile(join(DATA_DIR, "prospectos.json"), JSON.stringify(final, null, 2), "utf-8");

console.log(`[seed] ${prospectos.length} seeds fusionados · total en prospectos.json: ${final.length}`);

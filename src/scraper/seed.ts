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
import { SEEDS } from "../lib/seeds.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const OUTPUT_DIR = join(__dirname, "..", "..", "output");

const ahora = new Date().toISOString();
const conFechas = SEEDS.map((p) => ({ ...p, tiene_web: true, creado_en: ahora }));

// RESET DE FÁBRICA: RESET=true → sobreescribe con solo los 8 seeds y limpia output.
const RESET = process.env.RESET === "true";

if (RESET) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, "prospectos.json"), JSON.stringify(conFechas, null, 2), "utf-8");
  const { rm } = await import("node:fs/promises");
  for (const f of ["lote_actual.json", "lista_envio.json", "reporte_envio.html", "pipeline_status.json"]) {
    await rm(join(OUTPUT_DIR, f), { force: true });
  }
  await rm(join(OUTPUT_DIR, "screenshots"), { recursive: true, force: true });
  console.log(`[reset] Base restaurada de fábrica: ${conFechas.length} seeds · output limpio`);
} else {
  // FUSIÓN (no sobrescribe): agrega/actualiza los 8 seeds sin borrar los scrapeados.
  const previos: Prospecto[] = await readFile(join(DATA_DIR, "prospectos.json"), "utf-8")
    .then((t) => JSON.parse(t))
    .catch(() => []);
  const mapa = new Map(previos.map((p) => [p.id, p]));
  for (const p of conFechas) mapa.set(p.id, p);
  const final = [...mapa.values()];

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, "prospectos.json"), JSON.stringify(final, null, 2), "utf-8");
  console.log(`[seed] ${conFechas.length} seeds fusionados · total en prospectos.json: ${final.length}`);
}

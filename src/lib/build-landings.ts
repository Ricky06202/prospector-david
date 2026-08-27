/**
 * BUILD INCREMENTAL DE LANDINGS
 * -----------------------------
 * Antes de lanzar `astro build` comprueba si TODAS las landings del lote activo
 * ya existen en generator/dist/ y son más recientes que data/prospectos.json.
 * Si están frescas → NO construye nada (ahorra segundos→minutos de Astro/Vite).
 * Si falta alguna → lanza astro build solo con los ids del lote (vía LOTE_IDS).
 *
 * Uso: bun run build:landings  (mismo comando de siempre, ahora con skip)
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { stat, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DIST = join(ROOT, "generator", "dist");
const LOTE_FILE = join(ROOT, "output", "lote_actual.json");
const DATA_FILE = join(ROOT, "data", "prospectos.json");

async function main() {
  const lote = JSON.parse(await readFile(LOTE_FILE, "utf-8").catch(() => "[]"));
  const ids: string[] = Array.isArray(lote) ? lote.filter(Boolean) : [];

  // Sin lote activo: reconstruye todo (comportamiento original).
  if (!ids.length) {
    console.log("[build] Sin lote activo → construyendo todas las landings…");
    return build();
  }

  const dataMtime = await stat(DATA_FILE).then((s) => s.mtimeMs).catch(() => 0);
  const faltantes: string[] = [];
  for (const id of ids) {
    const idx = join(DIST, id, "index.html");
    const st = await stat(idx).catch(() => null);
    if (!st || st.mtimeMs < dataMtime) faltantes.push(id);
  }

  if (!faltantes.length) {
    console.log(`[build] OK · ${ids.length} landings del lote ya frescas en dist/ → sin rebuild`);
    return;
  }

  console.log(`[build] Faltan ${faltantes.length}/${ids.length} landings → astro build (solo el lote)`);
  await build(ids);
}

function build(ids?: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (ids?.length) env.LOTE_IDS = JSON.stringify(ids);
    const child = spawn("bun", ["run", "build"], { cwd: join(ROOT, "generator"), env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`astro build falló (${code})`))));
    child.on("error", reject);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[build]", e);
    process.exit(1);
  });

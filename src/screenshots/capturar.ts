/**
 * MÓDULO 3 — Capturas (EL EMPAQUETADOR VISUAL)
 * --------------------------------------------
 * 1. Sirve el build estático del generador (generator/dist).
 * 2. Itera sobre los prospectos del lote.
 * 3. Toma N capturas por landing: móvil (390x844, x2) y PC (1440x900, x1).
 * 4. Guarda en output/screenshots/<id>/<dispositivo>_<seccion>.png
 *
 * OPTIMIZACIONES (menos recursos / más rápido):
 *  - UNA sola instancia de navegador para todo el lote (antes se lanzaba y
 *    cerraba Chromium por prospecto → cientos de arranques).
 *  - Se espera a que las fuentes terminen de cargar (document.fonts.ready) en
 *    lugar de sleeps fijos de 1.2 s; el scroll de sección se acorta a ~180 ms.
 *  - SS_SALTAR=true → omite prospectos cuyas capturas ya existen y son más
 *    recientes que data/prospectos.json (no recaptura lo ya hecho).
 *  - SS_FORMATO=png|jpeg|webp + SS_CALIDAD → JPEG/WebP son ~10x más livianos
 *    y se codifican más rápido (recomendado para WhatsApp).
 *
 * Config (.env):
 *   CHROMIUM_PATH, SECCIONES, SS_SALTAR, SS_FORZAR, SS_FORMATO, SS_CALIDAD, SS_REINICIAR
 */
import "dotenv/config";
import http from "node:http";
import { readFile, mkdir, stat, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { launch } from "puppeteer-core";
import { filtrarActivos, ROOT, DATA_FILE } from "../lib/prospectos-io.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "generator", "dist");
const OUT = join(ROOT, "output", "screenshots");

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  "/nix/store/rxf83sv2x0ja1hi6vdli6ijll5v15x9j-chromium-151.0.7922.173/bin/chromium";

const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

// Formato de salida de las capturas (JPEG por defecto: ~10x más livianas,
// cargan al instante en WhatsApp de David).
const FORMATO = (process.env.SS_FORMATO || "jpeg").toLowerCase();
const CALIDAD = Number(process.env.SS_CALIDAD || 80);
const EXT = FORMATO === "jpeg" ? "jpg" : FORMATO === "webp" ? "webp" : "png";
const SS_SALTAR = process.env.SS_SALTAR !== "false";   // omite lo ya capturado
const SS_FORZAR = process.env.SS_FORZAR === "true";    // recaptura todo
const REINICIAR_CADA = Number(process.env.SS_REINICIAR || 15); // reinicio de navegador preventivo

const prospectos = await filtrarActivos(
  JSON.parse(await readFile(join(ROOT, "data", "prospectos.json"), "utf-8")),
  process.env.NICHO
);

function servir(dir: string) {
  return http.createServer(async (req, res) => {
    let p = decodeURIComponent(req.url!.split("?")[0].split("#")[0]);
    if (p.endsWith("/")) p += "index.html";
    try {
      const data = await readFile(join(dir, p));
      res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
}

await mkdir(OUT, { recursive: true });
const server = servir(DIST);
await new Promise<void>((r) => server.listen(0, () => r()));
const puerto = (server.address() as any).port;

// Secciones a capturar por dispositivo (configurable con SECCIONES="hero,servicios,ubicacion").
const SECCIONES = (process.env.SECCIONES || "hero,servicios,ubicacion")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((nombre) => ({
    nombre,
    selector: nombre === "hero" ? "#inicio" : nombre === "ubicacion" ? "#ubicacion" : "#servicios",
  }));

console.log(`[capturas] localhost:${puerto} · ${prospectos.length} prospectos · ${SECCIONES.length} secciones × 2 dispositivos · formato ${EXT}${SS_SALTAR ? " (solo faltantes)" : ""}`);

// Fecha del data: si las capturas son más nuevas, no se recaptura.
const dataMtime = await stat(DATA_FILE).then((s) => s.mtimeMs).catch(() => 0);

async function capturasFrescas(id: string): Promise<boolean> {
  const dir = join(OUT, id);
  let ok = 0;
  for (const [disp] of [["movil"], ["pc"]] as const) {
    for (const sec of SECCIONES) {
      const f = join(dir, `${disp}_${sec.nombre}.${EXT}`);
      const st = await stat(f).catch(() => null);
      if (st && st.mtimeMs >= dataMtime) ok++;
    }
  }
  return ok === SECCIONES.length * 2;
}

async function esperarListo(page: any) {
  await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
  await new Promise((r) => setTimeout(r, 220));
}

/** Navegador único para todo el lote (anti fugas con reinicio preventivo). */
let browser: any = null;
async function obtenerBrowser() {
  if (browser) return browser;
  browser = await launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: [
      "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--hide-scrollbars", "--font-render-hinting=none",
      "--disable-lazy-loading", "--disable-background-timer-throttling",
    ],
  });
  return browser;
}
async function reiniciarBrowser() {
  if (browser) { await browser.close().catch(() => {}); browser = null; }
}

let capturados = 0;
let saltados = 0;

for (let i = 0; i < prospectos.length; i++) {
  const p = prospectos[i];
  const url = `http://localhost:${puerto}/${p.id}/`;

  // SS_SALTAR: no recapturar lo que ya está listo y fresco.
  if (SS_SALTAR && !SS_FORZAR && (await capturasFrescas(p.id))) {
    saltados++;
    console.log(`== ${p.id} (${p.nombre_negocio}) — ya capturado, omitido ==`);
    continue;
  }

  // Reinicio preventivo del navegador para acotar la memoria (solo cada N).
  if (REINICIAR_CADA > 0 && capturados > 0 && capturados % REINICIAR_CADA === 0) {
    await reiniciarBrowser();
  }
  const br = await obtenerBrowser();

  console.log(`== ${p.id} (${p.nombre_negocio}) ==`);
  // Limpia capturas viejas (PNG de versiones anteriores) para no mezclar formatos.
  await rm(join(OUT, p.id), { recursive: true, force: true }).catch(() => {});
  await mkdir(join(OUT, p.id), { recursive: true });

  for (const [dispositivo, vp] of [
    ["movil", { width: 390, height: 844, deviceScaleFactor: 2 }],
    ["pc", { width: 1440, height: 900, deviceScaleFactor: 1 }],
  ] as const) {
    const page = await br.newPage();
    await page.setViewport(vp);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await esperarListo(page);

    for (const sec of SECCIONES) {
      if (sec.nombre !== "hero") {
        await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          if (el) window.scrollTo(0, (el as HTMLElement).offsetTop - 72);
        }, sec.selector);
        await new Promise((r) => setTimeout(r, 180));
      }
      const path = join(OUT, p.id, `${dispositivo}_${sec.nombre}.${EXT}`);
      await page.screenshot({
        path,
        type: FORMATO as any,
        quality: FORMATO === "png" ? undefined : CALIDAD,
      });
      console.log(`  OK ${p.id}/${dispositivo}_${sec.nombre}.${EXT}`);
    }

    await page.close();
  }
  capturados++;
}

await reiniciarBrowser();
await new Promise((r) => server.close(r));
console.log(`[capturas] DONE · capturadas: ${capturados} · omitidas (ya frescas): ${saltados} -> ${OUT}`);

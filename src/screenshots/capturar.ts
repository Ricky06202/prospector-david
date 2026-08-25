/**
 * MÓDULO 3 — Capturas (EL EMPAQUETADOR VISUAL)
 * --------------------------------------------
 * 1. Sirve el build estático del generador (generator/dist).
 * 2. Itera sobre los prospectos de data/prospectos.json.
 * 3. Toma 2 capturas por cada landing: móvil (390x844) y PC (1440x900).
 * 4. Guarda en output/screenshots/[id]_movil.png y [id]_pc.png.
 * 5. Abre y cierra el navegador en cada iteración para evitar fugas de memoria.
 */
import "dotenv/config";
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { launch } from "puppeteer-core";
import { filtrarActivos, ROOT } from "../lib/prospectos-io.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "generator", "dist");
const OUT = join(ROOT, "output", "screenshots");

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  "/nix/store/rxf83sv2x0ja1hi6vdli6ijll5v15x9j-chromium-151.0.7922.173/bin/chromium";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

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
await new Promise((r) => server.listen(0, r));
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

console.log(`[capturas] Sirviendo build en localhost:${puerto} · ${prospectos.length} prospectos · secciones: ${SECCIONES.map((s) => s.nombre).join(", ")}`);

for (const p of prospectos) {
  console.log(`== ${p.id} (${p.nombre_negocio}) ==`);
  await mkdir(join(OUT, p.id), { recursive: true });
  const url = `http://localhost:${puerto}/${p.id}/`;

  // Se abre y se cierra el navegador en CADA iteración (anti fugas de memoria).
  const browser = await launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  for (const [dispositivo, vp] of [
    ["movil", { width: 390, height: 844, deviceScaleFactor: 2 }],
    ["pc", { width: 1440, height: 900, deviceScaleFactor: 1 }],
  ] as const) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200));

    for (const sec of SECCIONES) {
      if (sec.nombre !== "hero") {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) window.scrollTo(0, (el as HTMLElement).offsetTop - 72);
        }, sec.selector);
        await new Promise((r) => setTimeout(r, 600));
      }
      await page.screenshot({ path: join(OUT, p.id, `${dispositivo}_${sec.nombre}.png`) });
      console.log(`  OK ${p.id}/${dispositivo}_${sec.nombre}.png`);
    }

    await page.close();
  }

  await browser.close();
}

await new Promise((r) => server.close(r));
console.log(`[capturas] DONE -> ${OUT}`);

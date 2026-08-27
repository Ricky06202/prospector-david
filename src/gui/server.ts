/**
 * INTERFAZ VISUAL — Prospector David
 * Levanta un dashboard local para gestionar prospectos, lote diario,
 * generación de landings/capturas y marcado de envíos.
 *
 * Uso: bun run gui   ->  http://localhost:4877
 */
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { spawn } from "node:child_process";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import JSZip from "jszip";
import {
  cargarProspectos,
  guardarProspectos,
  setEstado,
  marcarEnviado,
  prepararLote,
  leerLote,
  guardarLote,
  ROOT,
} from "../lib/prospectos-io.ts";
import { generarEmail, generarSeguimiento, generarRespuesta, generarRetomaConDeepSeek, generarMuestraConDeepSeek } from "../envio/deepseek.ts";
import { PRECIOS, MATRIZ, cotizar, textoCotizacion, htmlCotizacion, cotizarEscalonada, textoCotizacionEscalonada, htmlCotizacionEscalonada } from "../lib/precios.ts";
import type { TipoProyecto } from "../lib/precios.ts";
import { configAntiBan, planDeRitmo, formatoMs, diasDesde, contieneEnlaces } from "../envio/anti-ban.ts";
import { waLink } from "../envio/deepseek.ts";
import { PLANES, sumaDias, diasRestantes, mensajeRenovacion } from "../lib/mantenimiento.ts";
import type { PlanMantenimiento } from "../lib/mantenimiento.ts";
import { launch } from "puppeteer-core";
import { escribirStatus, leerStatus } from "../lib/pipeline-status.ts";
import { DASHBOARD } from "./dashboard.ts";

const app = new Hono();

async function ejecutarScript(script: string): Promise<void> {
  await escribirStatus({ estado: "corriendo", inicio: new Date().toISOString() });
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("bun", ["run", script], { cwd: ROOT, stdio: "inherit" });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`script ${script} falló (${code})`))));
      child.on("error", reject);
    });
    await escribirStatus({ estado: "listo", fin: new Date().toISOString() });
  } catch (e) {
    await escribirStatus({ estado: "error", error: (e as Error).message, fin: new Date().toISOString() });
  }
}

async function ejecutarPipeline(): Promise<void> {
  const pasos = ["build:landings", "capturar", "envio"];
  for (const paso of pasos) {
    await ejecutarScript(paso);
    const s = await leerStatus();
    if (s.estado === "error") return;
  }
}

// ---------- API ----------
app.get("/api/prospectos", async (c) => {
  const lista = await cargarProspectos();
  const estado = c.req.query("estado");
  const nicho = c.req.query("nicho");
  const q = c.req.query("q");
  let out = lista;
  if (estado) out = out.filter((p) => (p.estado || "nuevo") === estado);
  if (nicho) out = out.filter((p) => p.tipo.toLowerCase().includes(nicho.toLowerCase()));
  if (q) out = out.filter((p) => p.nombre_negocio.toLowerCase().includes(q.toLowerCase()));
  const totales = {
    nuevo: lista.filter((p) => !p.estado || p.estado === "nuevo").length,
    en_cola: lista.filter((p) => p.estado === "en_cola").length,
    enviado: lista.filter((p) => p.estado === "enviado").length,
    interesado: lista.filter((p) => p.estado === "interesado").length,
    reagendar: lista.filter((p) => p.estado === "reagendar").length,
    no_interesado: lista.filter((p) => p.estado === "no_interesado").length,
    cliente: lista.filter((p) => p.estado === "cliente").length,
    total: lista.length,
  };
  return c.json({ prospectos: out, totales });
});

app.post("/api/lote/preparar", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const n = Math.max(1, Number(body.n) || 10);
  const r = await prepararLote(n);
  const msj = r.elegidos.length
    ? `Lote: ${r.elegidos.length} en cola`
    : r.enCola.length
      ? `Ya hay ${r.enCola.length} en cola (reutilizado)`
      : `No quedan prospectos nuevos (${r.nuevos ? "todos enviados" : "base vacía"}). Corre scrape/gmaps para ampliar.`;
  return c.json({ ok: true, mensaje: msj, lote: r.elegidos.map((p) => p.id), n: r.elegidos.length });
});

app.post("/api/lote/vaciar", async (c) => {
  const lista = await cargarProspectos();
  const lote = await leerLote();
  await guardarProspectos(lista.map((p) => (lote.includes(p.id) ? { ...p, estado: "nuevo" } : p)));
  await writeFile(join(ROOT, "output", "lote_actual.json"), "[]", "utf-8");
  return c.json({ ok: true });
});

// Marca TODOS los del lote como "enviado" de una vez (el humano ya mandó el mensaje 1).
app.post("/api/lote/enviar-todos", async (c) => {
  const lista = await cargarProspectos();
  const lote = await leerLote();
  const ahora = new Date().toISOString();
  const ids = new Set(lote);
  const act = lista.map((p) =>
    ids.has(p.id)
      ? { ...p, estado: "enviado", enviado_en: p.enviado_en || ahora, ultimo_contacto: ahora }
      : p
  );
  await guardarProspectos(act);
  await guardarLote([]);
  return c.json({ ok: true, enviados: ids.size });
});

app.post("/api/generar", async (c) => {
  await ejecutarPipeline();
  return c.json({ ok: true });
});

// Regenera (si falta) landing + capturas de UN prospecto y lo deja en /prototipo/<id>/
app.post("/api/prospectos/:id/prototipo", async (c) => {
  const id = c.req.param("id");
  const loteActual = await leerLote();
  await guardarLote([id]);
  try {
    for (const paso of ["build:landings", "capturar"]) {
      await new Promise<void>((resolve, reject) => {
        const ch = spawn("bun", ["run", paso], { cwd: ROOT, stdio: "inherit" });
        ch.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${paso} falló (${code})`))));
        ch.on("error", reject);
      });
    }
  } finally {
    await guardarLote(loteActual);
  }
  return c.json({ ok: true });
});

// Scrapear desde la GUI (ejecuta el script y reporta progreso en /api/estado)
app.post("/api/scrape", async (c) => {
  await ejecutarScript("scrape");
  return c.json({ ok: true });
});

app.post("/api/gmaps", async (c) => {
  await ejecutarScript("gmaps");
  return c.json({ ok: true });
});

app.post("/api/places", async (c) => {
  await ejecutarScript("places");
  return c.json({ ok: true });
});

app.get("/api/copys", async (c) => {
  try {
    const d = JSON.parse(await readFile(join(ROOT, "output", "lista_envio.json"), "utf-8"));
    // Back-compat: antes era un array; ahora es {generado_en, config_anti_ban, ritmo_sugerido, registros}.
    const registros = Array.isArray(d) ? d : d.registros || [];
    return c.json({ ok: true, copys: registros, config_anti_ban: !Array.isArray(d) ? d.config_anti_ban : undefined });
  } catch {
    return c.json({ ok: true, copys: [] });
  }
});

// Cotizador: precios configurables y generación de cotizaciones con desglose.
app.get("/api/cotizador/precios", (c) => c.json({ ok: true, precios: PRECIOS, matriz: MATRIZ, planes: PLANES }));

app.post("/api/cotizador", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const tipo = String(body.tipo || "escalonada");
  const productos = Math.max(0, Number(body.productos) || 0);
  const plan = String(body.plan || "sin");
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  const nombre = p ? p.nombre_negocio : "Negocio";

  // Modo por defecto: ESCALONADA (Nivel 1 $300 + Nivel 2 $1,200 bajo la matriz).
  if (tipo === "escalonada") {
    const cot = cotizarEscalonada(0, plan);
    return c.json({ ok: true, escalonada: true, cotizacion: cot, texto: textoCotizacionEscalonada(nombre, plan) });
  }

  // Modo legado (single nivel): landing/catalogo/ecommerce/mantenimiento.
  const cot = cotizar(tipo as TipoProyecto, productos, plan);
  return c.json({ ok: true, escalonada: false, cotizacion: cot, texto: textoCotizacion(nombre, tipo as TipoProyecto, productos, plan) });
});

// Anti-ban: config actual + plan de ritmo para N envíos (previsualización del humano).
app.get("/api/anti-ban", (c) => {
  const cfg = configAntiBan();
  const n = Math.max(1, Math.min(50, Number(c.req.query("n") || 10)));
  return c.json({
    ok: true,
    config: cfg,
    ritmo: planDeRitmo(n, cfg).map((r) => ({ ...r, delay_h: formatoMs(r.delay), pausa_h: r.pausa ? formatoMs(r.pausa) : null })),
    notas: {
      "mensaje 1": "Apertura sin enlaces/PDF/imágenes — espera la respuesta antes de enviar la muestra.",
      "pausa cada": `${cfg.pausaCada} envíos → detente ${formatoMs(cfg.pausaMin)}-${formatoMs(cfg.pausaMax)}`,
    },
  });
});

// Cotización en PDF (renderizada con Chromium).
app.post("/api/cotizador/pdf", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const tipo = String(body.tipo || "escalonada");
  const productos = Math.max(0, Number(body.productos) || 0);
  const plan = String(body.plan || "sin");
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  const nombre = p ? p.nombre_negocio : "Negocio";
  const fecha = new Date().toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" });

  const html = tipo === "escalonada"
    ? htmlCotizacionEscalonada(nombre, plan, fecha)
    : htmlCotizacion(nombre, tipo as TipoProyecto, productos, plan, fecha);

  const browser = await launch({
    executablePath: process.env.CHROMIUM_PATH || "/nix/store/rxf83sv2x0ja1hi6vdli6ijll5v15x9j-chromium-151.0.7922.173/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" as any });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();
    return c.body(pdf as any, 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cotizacion_${id || "prospecto"}.pdf"`,
    });
  } catch (e) {
    await browser.close().catch(() => {});
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ============ MANTENIMIENTO RECURRENTE ============
app.get("/api/mantenimiento", async (c) => {
  const lista = await cargarProspectos();
  const items = lista
    .filter((p) => p.mantenimiento)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre_negocio,
      whatsapp: p.whatsapp,
      plan: p.mantenimiento!.plan,
      vence: p.mantenimiento!.vence,
      dias: diasRestantes(p.mantenimiento!.vence),
      precio: PLANES[p.mantenimiento!.plan]?.precio || PRECIOS.mantenimiento,
    }))
    .sort((a, b) => a.dias - b.dias);
  const ingresoMes = items.reduce(
    (s, i) => s + (i.precio / ((PLANES[i.plan]?.dias || 30) / 30)),
    0
  );
  return c.json({ ok: true, items, ingresoMes: Math.round(ingresoMes * 100) / 100 });
});

app.post("/api/mantenimiento", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const plan = String(body.plan || "mensual") as PlanMantenimiento;
  if (!PLANES[plan]) return c.json({ ok: false });
  const lista = await cargarProspectos();
  if (!lista.some((p) => p.id === id)) return c.json({ ok: false });
  const vence = sumaDias(new Date().toISOString(), PLANES[plan].dias);
  await guardarProspectos(lista.map((p) => (p.id === id ? { ...p, mantenimiento: { plan, vence } } : p)));
  return c.json({ ok: true });
});

app.post("/api/mantenimiento/:id/renovar", async (c) => {
  const id = c.req.param("id");
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  if (!p?.mantenimiento) return c.json({ ok: false });
  const plan = p.mantenimiento.plan;
  const base = p.mantenimiento.vence && diasRestantes(p.mantenimiento.vence) > 0 ? p.mantenimiento.vence : new Date().toISOString();
  const vence = sumaDias(base, PLANES[plan].dias);
  await guardarProspectos(lista.map((x) => (x.id === id ? { ...x, mantenimiento: { ...x.mantenimiento!, vence } } : x)));
  return c.json({ ok: true });
});

app.post("/api/mantenimiento/:id/quitar", async (c) => {
  const id = c.req.param("id");
  const lista = await cargarProspectos();
  const act = lista.map((x) => {
    if (x.id !== id) return x;
    const { mantenimiento, ...rest } = x;
    return rest;
  });
  await guardarProspectos(act);
  return c.json({ ok: true });
});

// ============ MANTENIMIENTO (mensaje de renovación) ============
app.get("/api/mantenimiento/:id/mensaje", async (c) => {
  const id = c.req.param("id");
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  if (!p?.mantenimiento) return c.json({ ok: false });
  const precio = PLANES[p.mantenimiento.plan]?.precio || PRECIOS.mantenimiento;
  const texto = mensajeRenovacion(p.nombre_negocio, p.mantenimiento.plan, precio);
  return c.json({ ok: true, texto });
});

// Asistente de respuestas: sugerencia de respuesta al mensaje entrante de un cliente.
app.post("/api/respuesta", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const mensaje = String(body.mensaje || "").slice(0, 2000);
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  if (!p) return c.json({ ok: false, error: "prospecto no encontrado" });
  const texto = await generarRespuesta(p, mensaje);
  return c.json({ ok: true, texto });
});

// Generador de textos: email, seguimiento, RETOMA o MUESTRA (mensaje 2) para un prospecto.
app.post("/api/texto", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const tipo = String(body.tipo || "email");
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  if (!p) return c.json({ ok: false, error: "prospecto no encontrado" });
  let texto: string;
  if (tipo === "retoma") {
    const dias = diasDesde(p.ultimo_contacto || p.enviado_en || p.creado_en) ?? 0;
    texto = await generarRetomaConDeepSeek(p, dias);
  } else if (tipo === "muestra") {
    // Mensaje 2: acompaña las imágenes del prototipo (sin enlaces en David).
    texto = await generarMuestraConDeepSeek(p);
  } else if (tipo === "seguimiento") {
    texto = await generarSeguimiento(p);
  } else {
    texto = await generarEmail(p);
  }
  return c.json({ ok: true, texto, tipo });
});

// SEGUIMIENTOS: quienes fueron contactados pero no han cerrado, con días desde
// el último contacto y su mensaje de retoma listo (re-envío aun tras 1 mes).
// CACHÉ en memoria: la GUI refresca seguido y NO debe golpear a DeepSeek en cada
// refresco (podría congelarse). Se precarga desde output/seguimientos.json y solo
// se genera con IA lo que no está cacheado.
const cacheRetoma = new Map<string, string>();
const cacheMuestra = new Map<string, string>();
async function precargarCacheRetoma() {
  try {
    const d = JSON.parse(await readFile(join(ROOT, "output", "seguimientos.json"), "utf-8"));
    for (const s of d.seguimientos || []) if (s?.id && s?.retoma) cacheRetoma.set(s.id, s.retoma);
  } catch { /* sin cache todavía */ }
}
await precargarCacheRetoma();

app.get("/api/seguimientos", async (c) => {
  const lista = await cargarProspectos();
  const EN_SEGUIMIENTO = new Set(["enviado", "seguimiento", "reagendar", "interesado"]);
  const items = [];
  for (const p of lista) {
    if (!EN_SEGUIMIENTO.has(p.estado || "")) continue;
    const base = p.ultimo_contacto || p.enviado_en || p.creado_en;
    const dias = diasDesde(base) ?? 0;
    let retoma = cacheRetoma.get(p.id);
    if (!retoma) {
      retoma = await generarRetomaConDeepSeek(p, dias);
      cacheRetoma.set(p.id, retoma);
    }
    let muestra = cacheMuestra.get(p.id);
    if (!muestra) {
      muestra = await generarMuestraConDeepSeek(p);
      cacheMuestra.set(p.id, muestra);
    }
    items.push({
      id: p.id,
      nombre_negocio: p.nombre_negocio,
      tipo: p.tipo,
      estado: p.estado,
      dias_desde_contacto: dias,
      ultimo_contacto: p.ultimo_contacto || p.enviado_en,
      retoma,
      retoma_wa_link: waLink(p.whatsapp, retoma),
      muestra,
      muestra_wa_link: waLink(p.whatsapp, muestra),
      sin_enlaces: !contieneEnlaces(retoma) && !contieneEnlaces(muestra),
      whatsapp: p.whatsapp,
    });
  }
  items.sort((a, b) => b.dias_desde_contacto - a.dias_desde_contacto);
  return c.json({ ok: true, items });
});

app.get("/api/estado", async (c) => c.json(await leerStatus()));

app.post("/api/prospectos/:id/estado", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const estado = String(body.estado || "nuevo");
  if (estado === "enviado") {
    const p = await marcarEnviado(id);
    return c.json({ ok: true, prospecto: p });
  }
  const lista = await cargarProspectos();
  const actualizada = setEstado(lista, id, estado);
  await guardarProspectos(actualizada);
  return c.json({ ok: true, prospecto: actualizada.find((p) => p.id === id) });
});

app.get("/api/prospectos/:id/fotos", async (c) => {
  const id = c.req.param("id");
  try {
    const archivos = (await readdir(join(ROOT, "output", "screenshots", id))).filter((f) => f.endsWith(".png")).sort();
    return c.json({ ok: true, fotos: archivos.map((f) => `/fotos/${id}/${f}`) });
  } catch {
    return c.json({ ok: true, fotos: [] });
  }
});

app.get("/fotos/*", async (c) => {
  const rest = c.req.path.replace("/fotos/", "");
  try {
    const buf = await readFile(join(ROOT, "output", "screenshots", rest));
    return c.body(buf as any, 200, { "Content-Type": "image/png" });
  } catch {
    return c.body("no encontrado", 404);
  }
});

// Descarga COMPLETA de un prospecto: datos.json + landing + fotos (para seguir en local).
app.get("/api/prospectos/:id/descargar-todo", async (c) => {
  const id = c.req.param("id");
  const zip = new JSZip();

  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  if (p) zip.file(`${id}/datos.json`, JSON.stringify(p, null, 2));

  const fotosDir = join(ROOT, "output", "screenshots", id);
  try {
    for (const f of (await readdir(fotosDir)).filter((x) => x.endsWith(".png"))) {
      zip.file(`${id}/fotos/${f}`, await readFile(join(fotosDir, f)));
    }
  } catch { /* sin fotos */ }

  const landDir = join(DIST, id);
  try {
    const addDir = async (dir: string, prefix: string) => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) await addDir(full, `${prefix}/${e.name}`);
        else zip.file(`${prefix}/${e.name}`, await readFile(full));
      }
    };
    await addDir(landDir, `${id}/landing`);
  } catch { /* sin landing */ }

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return c.body(buf as any, 200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${id}_completo.zip"`,
  });
});

// Descarga las fotos de un prospecto en un .zip (sin SSH).
app.get("/api/prospectos/:id/descargar", async (c) => {
  const id = c.req.param("id");
  const dir = join(ROOT, "output", "screenshots", id);
  if (!existsSync(dir)) return c.body("sin fotos", 404);
  const archivos = (await readdir(dir)).filter((f) => f.endsWith(".png"));

  const zip = new JSZip();
  for (const f of archivos) {
    zip.file(`${id}/${f}`, await readFile(join(dir, f)));
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return c.body(buf as any, 200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${id}_fotos.zip"`,
  });
});

app.get("/", (c) => c.html(DASHBOARD));

// Assets de las landings (Astro los referencia como /_astro/* desde la raíz).
app.get("/_astro/*", async (c) => {
  const p = c.req.path.replace("/_astro/", "");
  const file = join(DIST, "_astro", p);
  try {
    const data = await readFile(file);
    return c.body(data as any, 200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
  } catch {
    return c.body("no", 404);
  }
});

// Prototipos generados (landings) — abre la landing real de un prospecto.
const DIST = join(ROOT, "generator", "dist");
const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json",
};
app.get("/prototipo/*", async (c) => {
  let p = c.req.path.replace("/prototipo/", "");
  if (p.endsWith("/")) p += "index.html"; // la landing vive en <id>/index.html
  const file = join(DIST, p);
  if (!file.startsWith(DIST)) return c.body("no", 400);
  try {
    const data = await readFile(file);
    return c.body(data as any, 200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
  } catch {
    return c.body("prototipo no generado aún", 404);
  }
});

const port = Number(process.env.PORT || 4877);
await mkdir(join(ROOT, "output"), { recursive: true });
await escribirStatus({ estado: "idle" });

console.log(`[gui] Prospector David en http://localhost:${port}`);
serve({ fetch: app.fetch, port });

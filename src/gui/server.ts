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
import { generarEmail, generarSeguimiento, generarRespuesta } from "../envio/deepseek.ts";
import { PRECIOS, cotizar, textoCotizacion } from "../lib/precios.ts";
import type { TipoProyecto } from "../lib/precios.ts";
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
    return c.json({ ok: true, copys: d });
  } catch {
    return c.json({ ok: true, copys: [] });
  }
});

// Cotizador: precios configurables y generación de cotizaciones con desglose.
app.get("/api/cotizador/precios", (c) => c.json({ ok: true, precios: PRECIOS }));

app.post("/api/cotizador", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const tipo = String(body.tipo || "landing") as TipoProyecto;
  const productos = Math.max(0, Number(body.productos) || 0);
  const mantenimiento = Boolean(body.mantenimiento);
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  const nombre = p ? p.nombre_negocio : "Negocio";
  const cot = cotizar(tipo, productos, mantenimiento);
  return c.json({ ok: true, cotizacion: cot, texto: textoCotizacion(nombre, tipo, productos, mantenimiento) });
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

// Generador de textos: email de presentación o seguimiento para un prospecto.
app.post("/api/texto", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = String(body.id || "");
  const tipo = String(body.tipo || "email");
  const lista = await cargarProspectos();
  const p = lista.find((x) => x.id === id);
  if (!p) return c.json({ ok: false, error: "prospecto no encontrado" });
  const texto = tipo === "seguimiento" ? await generarSeguimiento(p) : await generarEmail(p);
  return c.json({ ok: true, texto, tipo });
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
    return c.body(buf, 200, { "Content-Type": "image/png" });
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
  return c.body(buf, 200, {
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
  return c.body(buf, 200, {
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
    return c.body(data, 200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
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
    return c.body(data, 200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
  } catch {
    return c.body("prototipo no generado aún", 404);
  }
});

const port = Number(process.env.PORT || 4877);
await mkdir(join(ROOT, "output"), { recursive: true });
await escribirStatus({ estado: "idle" });

console.log(`[gui] Prospector David en http://localhost:${port}`);
serve({ fetch: app.fetch, port });

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
import { join } from "node:path";
import {
  cargarProspectos,
  guardarProspectos,
  setEstado,
  marcarEnviado,
  prepararLote,
  leerLote,
  ROOT,
} from "../lib/prospectos-io.ts";
import { escribirStatus, leerStatus } from "../lib/pipeline-status.ts";
import { DASHBOARD } from "./dashboard.ts";

const app = new Hono();

async function ejecutarPipeline(): Promise<void> {
  await escribirStatus({ estado: "corriendo", inicio: new Date().toISOString() });
  const pasos = ["build:landings", "capturar", "envio"];
  for (const paso of pasos) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("bun", ["run", paso], { cwd: ROOT, stdio: "inherit" });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`paso ${paso} falló (${code})`))));
        child.on("error", reject);
      });
    } catch (e) {
      await escribirStatus({ estado: "error", error: (e as Error).message, fin: new Date().toISOString() });
      return;
    }
  }
  await escribirStatus({ estado: "listo", fin: new Date().toISOString() });
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
    total: lista.length,
  };
  return c.json({ prospectos: out, totales });
});

app.post("/api/lote/preparar", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const n = Math.max(1, Number(body.n) || 10);
  const elegidos = await prepararLote(n);
  return c.json({ ok: true, lote: elegidos.map((p) => p.id), n: elegidos.length });
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

app.get("/api/copys", async (c) => {
  try {
    const d = JSON.parse(await readFile(join(ROOT, "output", "lista_envio.json"), "utf-8"));
    return c.json({ ok: true, copys: d });
  } catch {
    return c.json({ ok: true, copys: [] });
  }
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

app.get("/", (c) => c.html(DASHBOARD));

const port = Number(process.env.PORT || 4877);
await mkdir(join(ROOT, "output"), { recursive: true });
await escribirStatus({ estado: "idle" });

console.log(`[gui] Prospector David en http://localhost:${port}`);
serve({ fetch: app.fetch, port });

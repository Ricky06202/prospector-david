/**
 * IO central de prospectos + gestión de estado y lote diario.
 * Estado: nuevo | en_cola | enviado | no_interesado | reagendar
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Prospecto } from "../types.ts";
import { normalizarNombre } from "./dedupe.ts";
import { SEEDS } from "./seeds.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..", "..");
export const DATA_FILE = join(ROOT, "data", "prospectos.json");
export const LOTE_FILE = join(ROOT, "output", "lote_actual.json");

export async function cargarProspectos(): Promise<Prospecto[]> {
  return JSON.parse(await readFile(DATA_FILE, "utf-8"));
}

export async function guardarProspectos(lista: Prospecto[]): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(lista, null, 2), "utf-8");
}

export function setEstado(lista: Prospecto[], id: string, estado: string): Prospecto[] {
  const ahora = new Date().toISOString();
  return lista.map((p) =>
    p.id === id
      ? {
          ...p,
          estado,
          enviado_en: estado === "enviado" ? ahora : p.enviado_en,
          // Cada contacto (envío o seguimiento) actualiza la fecha base de la retoma.
          ultimo_contacto: estado === "enviado" || estado === "seguimiento" ? ahora : p.ultimo_contacto,
        }
      : p
  );
}

/** Marca como enviado y lo elimina del lote para que nunca se repita. */
export async function marcarEnviado(id: string): Promise<Prospecto | undefined> {
  const lista = await cargarProspectos();
  const actualizada = setEstado(lista, id, "enviado");
  await guardarProspectos(actualizada);
  const lote = await leerLote();
  if (lote.includes(id)) {
    await guardarLote(lote.filter((x) => x !== id));
  }
  return actualizada.find((p) => p.id === id);
}

// ---------- LOTE DIARIO ----------
export async function leerLote(): Promise<string[]> {
  try {
    const d = JSON.parse(await readFile(LOTE_FILE, "utf-8"));
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export async function guardarLote(ids: string[]): Promise<void> {
  await mkdir(dirname(LOTE_FILE), { recursive: true });
  await writeFile(LOTE_FILE, JSON.stringify(ids, null, 2), "utf-8");
}

/** Prepara (o reutiliza) un lote de N prospectos. Nunca repite los enviados. */
export async function prepararLote(n: number): Promise<{ elegidos: Prospecto[]; enCola: Prospecto[]; nuevos: number }> {
  const lista = await cargarProspectos();
  const enCola = lista.filter((p) => p.estado === "en_cola" && p.tipo_lead !== "upsell");
  // Disponibles: nuevos + reagendados (los pospuestos vuelven a salir en lotes futuros).
  // El track UPSELL queda FUERA del lote de $300.
  const pendientes = lista.filter(
    (p) => (!p.estado || p.estado === "nuevo" || p.estado === "reagendar") && p.tipo_lead !== "upsell"
  );

  // Si ya hay un lote activo, se mantiene (idempotente). Si no, se arma uno nuevo.
  const ids = enCola.map((p) => p.id);
  if (!ids.length) {
    for (const p of pendientes.slice(0, n)) ids.push(p.id);
  }
  await guardarLote(ids);
  if (ids.length) {
    await guardarProspectos(
      lista.map((p) => (ids.includes(p.id) ? { ...p, estado: "en_cola" } : p))
    );
  }
  return {
    elegidos: lista.filter((p) => ids.includes(p.id)),
    enCola,
    nuevos: pendientes.length,
  };
}

/** Prospectos activos para procesar: el lote actual si existe, si no NICHO, si no todos.
 *  Por defecto (lead="landing") el track de UPSELL queda fuera del pipeline de $300. */
export async function filtrarActivos(lista: Prospecto[], nicho?: string, lead: "landing" | "upsell" | "todos" = "landing"): Promise<Prospecto[]> {
  let base = lista;
  if (nicho) {
    const q = nicho.toLowerCase();
    base = base.filter((p) => p.tipo.toLowerCase().includes(q) || p.nombre_negocio.toLowerCase().includes(q));
  }
  if (lead === "upsell") base = base.filter((p) => p.tipo_lead === "upsell");
  else if (lead === "landing") base = base.filter((p) => p.tipo_lead !== "upsell");
  const lote = await leerLote();
  if (lote.length) {
    const enLote = base.filter((p) => lote.includes(p.id));
    if (enLote.length) return enLote;
  }
  return base;
}

export function normalizarClave(p: Prospecto): string {
  return `${normalizarNombre(p.nombre_negocio)}|${p.whatsapp}`;
}

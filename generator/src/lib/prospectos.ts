import raw from "../../../data/prospectos.json";
import type { Prospecto } from "../../../src/types";
import { filtrarPorNicho } from "../../../src/lib/filtrar";

const base = raw as Prospecto[];

// Lote diario (prioridad): se pasa por env LOTE_IDS (JSON array) para que
// funcione incluso cuando Astro empaqueta el módulo.
function loteDesdeEnv(): string[] {
  try {
    const d = JSON.parse(process.env.LOTE_IDS || "[]");
    return Array.isArray(d) ? d.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export const prospectos: Prospecto[] =
  loteDesdeEnv().length > 0
    ? base.filter((p) => loteDesdeEnv().includes(p.id))
    : filtrarPorNicho(base, process.env.NICHO);

export function whatsappLink(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeContacto(nombre: string): string {
  return `Hola ${nombre}, vi su sitio web y me gustaría información sobre sus servicios.`;
}

export function buscarPorId(id: string): Prospecto | undefined {
  return prospectos.find((p) => p.id === id);
}

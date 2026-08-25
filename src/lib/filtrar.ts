import type { Prospecto } from "../types.ts";

/**
 * Filtra prospectos por nicho (coincidencia en `tipo` o en el nombre).
 * Si no hay nicho, devuelve todos.
 */
export function filtrarPorNicho(prospectos: Prospecto[], nicho?: string): Prospecto[] {
  if (!nicho) return prospectos;
  const q = nicho.toLowerCase();
  return prospectos.filter(
    (p) => p.tipo.toLowerCase().includes(q) || p.nombre_negocio.toLowerCase().includes(q)
  );
}

import { PLANES, type PlanMantenimiento } from "./precios.ts";
export { PLANES, PlanMantenimiento };

export function sumaDias(fechaISO: string, dias: number): string {
  const d = new Date(fechaISO);
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

/** Días restantes hasta el vencimiento (negativo si ya venció). */
export function diasRestantes(venceISO: string): number {
  return Math.ceil((new Date(venceISO).getTime() - Date.now()) / 86400000);
}

/** Mensaje de cobro/renovación preescrito por WhatsApp (sin emojis para wa.me). */
export function mensajeRenovacion(nombre: string, plan: PlanMantenimiento, precio: number): string {
  return [
    `Hola ${nombre}:`,
    ``,
    `¿Renovamos el mantenimiento de tu página? Son B/. ${precio.toFixed(2)} (${PLANES[plan].label.toLowerCase()}) por Yappy o Sinpe Móvil.`,
    ``,
    `Incluye: contenido actualizado cuando lo pidas, soporte directo, respaldo y optimización. ¡Saludos!`,
  ].join("\n");
}

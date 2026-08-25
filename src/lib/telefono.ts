/**
 * Utilidades de normalización de teléfonos de Panamá.
 * Regla: todo número debe quedar con prefijo internacional +507 y 8 dígitos.
 */

/** Extrae solo dígitos de una cadena. */
export function soloDigitos(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/**
 * Valida y normaliza un teléfono panameño a formato "+507XXXXXXXX".
 * Acepta: "6629-8299", "+507 6629-8299", "50766298299", "66298299", etc.
 * Devuelve null si no es un número válido de Panamá (o sin dígitos suficientes).
 */
export function normalizarTelefonoPA(raw: string): string | null {
  const d = soloDigitos(raw);
  if (!d) return null;

  let local = d;
  if (local.startsWith("507")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);

  // Panamá: números móviles/teléfonos de 8 dígitos (inician con 6 para móvil, 2-4 fijos).
  if (!/^[2-9]\d{7}$/.test(local)) return null;

  return `+507${local}`;
}

/** ¿Es WhatsApp (número móvil panameño, inicia con 6)? */
export function esMovilPanama(tel: string): boolean {
  return /^\+5076\d{7}$/.test(tel);
}

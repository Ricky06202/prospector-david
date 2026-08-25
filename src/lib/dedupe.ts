/**
 * Utilidades de deduplicación y detección de "sitio web propio".
 */

/** Normaliza un nombre para usarlo como huella: minúsculas, sin tildes, sin espacios extra. */
export function normalizarNombre(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Hosts de redes sociales genéricas (no cuentan como "sitio propio"). */
const SOCIAL = /(facebook|instagram|twitter|x\.com|tiktok|youtube|linkedin|wa\.me|whatsapp)/i;
/** Dominios técnicos / CDN / terceros no comerciales. */
const NO_NEGOCIO = [
  "googleapis.com",
  "gstatic.com",
  "w3.org",
  "schema.org",
  "wordpress.org",
  "gravatar.com",
  "google.com",
  "googletagmanager.com",
  "clarity.ms",
  "ruedadenegocios.com.pa", // sitio del evento de la propia Cámara (sidebar de todos los listings)
];

/** ¿La URL es un sitio web PROPIO del negocio (fuera del directorio y de redes)? */
export function esWebPropia(urlRaw: string | undefined, origen: string): boolean {
  if (!urlRaw) return false;
  try {
    const host = new URL(urlRaw).hostname.toLowerCase();
    if (!host) return false;
    // Mismo dominio que el directorio -> es la ficha, no su web.
    if (host.includes(new URL(origen).hostname)) return false;
    if (SOCIAL.test(host)) return false;
    if (NO_NEGOCIO.some((d) => host === d || host.endsWith("." + d))) return false;
    return true;
  } catch {
    return false;
  }
}

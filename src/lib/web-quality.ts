/**
 * Análisis rápido de la calidad de un sitio web propio.
 * Sirve para el Lead Scoring: un negocio con web caída, sin viewport móvil
 * o casi vacía se considera "web deficiente" → sigue siendo un lead.
 *
 * Es un chequeo LIGERO (HTTP + heurísticas del HTML). No renderiza el navegador.
 */
import { esWebPropia } from "./dedupe.ts";

export interface ResultadoWeb {
  accesible: boolean;
  deficiente: boolean;
  score: number; // 0-100 (0 = pésima, 100 = buena)
  motivo: string;
  /** Correo de contacto extraído de la web del negocio (mailto: o patrón en el HTML). */
  email?: string | null;
}

const MARCADORES_VACIO = /(coming soon|pr[óo]ximamente|en construcci[óo]n|under construction|pagina en mantenimiento|sitio en construcci[óo]n|disponible pronto)/i;

/** Filtra correos falsos (archivos de imagen, genéricos del CMS, etc.). */
export function esEmailValido(raw: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw.trim());
}

/** Extrae el correo de contacto del HTML de la web (mailto: primero, luego patrón).
 *  Ignora scripts/styles (evita correos incrustados en JS) y archivos de imagen. */
function extraerEmail(html: string): string | null {
  const mailto = html.match(/href=["']mailto:([^"'?]+)/i);
  if (mailto && esEmailValido(mailto[1])) return mailto[1].trim();

  const limpio = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const matches = limpio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const bueno = matches.find(
    (m) =>
      esEmailValido(m) &&
      !/(\.png|\.jpe?g|\.webp|\.gif|\.svg|\.css|\.js|@2x|@3x|wordpress|example\.|sentry|wixpress|schema\.org|\.min\.)/i.test(m)
  );
  return bueno || null;
}

/**
 * Clasifica una URL. Devuelve { accesible:false, deficiente:true } si la web
 * no responde o responde con error (sigue siendo lead).
 */
export async function analizarWeb(
  url: string | undefined | null,
  timeoutMs = 8000
): Promise<ResultadoWeb> {
  if (!url) return { accesible: false, deficiente: true, score: 0, motivo: "Sin URL" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 ProspectorDavid/0.2" } });
    clearTimeout(t);

    if (!res.ok) {
      return { accesible: false, deficiente: true, score: 5, motivo: `HTTP ${res.status}` };
    }
    const html = await res.text().catch(() => "");
    if (!html.trim()) {
      return { accesible: true, deficiente: true, score: 15, motivo: "HTML vacío" };
    }

    // Meta viewport → móvil-friendly (crítico para landing en WhatsApp).
    const conViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    // Contenido mínimo legible.
    const cuerpo = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const palabras = cuerpo.length;

    let score = 100;
    const problemas: string[] = [];
    if (!conViewport) { score -= 40; problemas.push("Sin vista móvil"); }
    if (palabras < 60) { score -= 35; problemas.push("Contenido casi vacío"); }
    if (MARCADORES_VACIO.test(cuerpo)) { score -= 40; problemas.push("Página placeholder"); }
    try {
      if (new URL(url).pathname.split("/").filter(Boolean).length > 2) { score -= 5; problemas.push("Ruta profunda"); }
    } catch { /* URL no parseable: ya falló el fetch */ }

    const deficiente = score < 55;
    return {
      accesible: true,
      deficiente,
      score: Math.max(0, score),
      motivo: deficiente ? problemas.join(" · ") : "Web en buen estado",
      email: extraerEmail(html),
    };
  } catch {
    // Caída, timeout o DNS — tratada como deficiente (sigue siendo lead).
    return { accesible: false, deficiente: true, score: 5, motivo: "No responde" };
  }
}

/**
 * Analiza en paralelo (pool limitado) las webs propias de una lista.
 * Devuelve un Map<id, ResultadoWeb>.
 */
export async function analizarWebsParalelo<T extends { id: string; web?: string | null }>(
  items: T[],
  limite = 6,
  soloSi: (item: T) => boolean = () => true
): Promise<Map<string, ResultadoWeb>> {
  const resultados = new Map<string, ResultadoWeb>();
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const it = items[idx];
      if (!soloSi(it) || !it.web || !esWebPropia(it.web, "https://www.google.com/maps")) continue;
      resultados.set(it.id, await analizarWeb(it.web));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, Math.max(1, items.length)) }, worker));
  return resultados;
}

/**
 * Cliente DeepSeek para generar copys de venta personalizados.
 * Sin API key, se usa una plantilla local de calidad (fallback).
 *
 * ANTI-BAN: el mensaje de APERTURA jamás lleva enlaces/PDF/imágenes
 * (ver src/envio/anti-ban.ts). El material pesado va en el mensaje de MUESTRA,
 * que solo se envía tras la respuesta del contacto.
 */
import "dotenv/config";
import type { Prospecto } from "../types.ts";
import { mensajeApertura, mensajeMuestra, mensajeRetoma, esMensajeAperturaSeguro, contieneEnlaces } from "./anti-ban.ts";

/** Plantilla local (fallback) del MENSAJE 1 — APERTURA (sin enlaces). */
export function copyPlantilla(p: Prospecto): string {
  return mensajeApertura(p);
}

/** Mensaje de UPSELL para negocios que YA tienen web buena (track de dashboard). */
export function mensajeUpsellPlantilla(p: Prospecto): string {
  return [
    `Hola ${p.nombre_negocio}:`,
    ``,
    `Vi que ya tienen su página web, muy bien. Justamente por eso les escribo: nuestro equipo desarrolla paneles de control a la medida (pedidos, citas, inventario, reportes) para negocios que ya operan en internet.`,
    ``,
    `Les preparé una idea de cómo se vería su panel con su operación. ¿Se la comparto por aquí? Sin compromiso, solo 2 minutos.`,
  ].join("\n");
}

/** Genera el mensaje de upsell (DeepSeek o plantilla). Sin enlaces ni emojis. */
export async function generarUpsellConDeepSeek(p: Prospecto): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return mensajeUpsellPlantilla(p);
  const sist =
    "Eres un desarrollador de software de David, Chiriquí. Escribe un mensaje de WhatsApp de APERTURA (máx 80 palabras) para un negocio local que YA TIENE su página web en buen estado. NO ofrezcas landing ni 'muestra de página web' (ese no es su problema). Objetivo: 1) felicitar/notar que ya tienen web, 2) proponer el siguiente nivel: un PANEL DE CONTROL a la medida (pedidos, citas, inventario, reportes) para digitalizar su operación, 3) ofrecer una idea breve de cómo se vería y pedir permiso para compartirla, 4) cerrar sin compromiso. Español, sin placeholders, sin emojis, sin enlaces.";
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: `Negocio: ${p.nombre_negocio} (${p.tipo}). Web: ${p.web || "sí tiene"}.` },
      ],
      temperature: 0.7,
      max_tokens: 160,
    });
    if (!res.ok) return mensajeUpsellPlantilla(p);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    return texto && !contieneEnlaces(texto) ? texto : mensajeUpsellPlantilla(p);
  } catch {
    return mensajeUpsellPlantilla(p);
  }
}

/** Timeout a DeepSeek: si la API se cuelga, caemos a la plantilla (nunca colgar el pipeline). */
const TIMEOUT_LLM = Number(process.env.DEEPSEEK_TIMEOUT || 20000);

async function chatCompletions(key: string, body: unknown): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_LLM);
  try {
    return await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

const SISTEMA_APERTURA =
  "Eres un desarrollador web de David, Chiriquí, que escribe el PRIMER mensaje de prospección por WhatsApp a negocios locales. Hablas como parte de un equipo de desarrollo de software con oficinas en David. REGLA CRÍTICA: el mensaje NO puede contener NINGÚN enlace (ni http, ni www, ni wa.me), ni menciones de PDF, imágenes, adjuntos ni archivos. PROHIBIDO usar emojis (la gente de David los ve mal en el enlace de WhatsApp). Debe ser CORTO (máx 50 palabras), cálido, en español, sin placeholders ni corchetes. Objetivo: 1) mencionar que prepararon una MUESTRA GRATIS de cómo se vería el negocio en internet (con mapa de Google y botón de WhatsApp), 2) aclarar que es informal y sin compromiso, 3) pedir permiso para compartirla. No prometas fechas ni precios en este mensaje.";

/** MENSAJE 1 — APERTURA: corto, sin enlaces/PDF/imágenes. */
export async function generarAperturaConDeepSeek(p: Prospecto): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return copyPlantilla(p);

  const prompt = [
    `Negocio: ${p.nombre_negocio} (${p.tipo}).`,
    `Ubicación: ${p.direccion}.`,
    `Escribe el PRIMER mensaje de WhatsApp (máx 50 palabras) ofreciendo una muestra gratis de su futura página web, SIN enlaces ni archivos, y pidiendo permiso para compartirla.`,
  ].join("\n");

  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: SISTEMA_APERTURA },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 120,
    });
    if (!res.ok) return copyPlantilla(p);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    // Guardia anti-ban: si DeepSeek "se pasa" y mete un enlace, usamos la plantilla.
    return texto && esMensajeAperturaSeguro(texto) ? texto : copyPlantilla(p);
  } catch {
    return copyPlantilla(p);
  }
}

/** MENSAJE 2 — MUESTRA: acompaña las IMÁGENES del prototipo (sin enlaces por defecto). */
export async function generarMuestraConDeepSeek(p: Prospecto, urlPrototipo?: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return mensajeMuestra(p, urlPrototipo);
  const conEnlaces = urlPrototipo && process.env.ENVIAR_ENLACES === "true";
  const sist =
    "Eres un desarrollador web de David, Chiriquí. Escribe el SEGUNDO mensaje de WhatsApp (máx 100 palabras) para un negocio local que YA RESPONDIÓ el primer mensaje. REGLA CRÍTICA: NO incluyas NINGÚN enlace ni URL y PROHIBIDO usar emojis" +
    (conEnlaces ? "" : " — el material se entrega como IMÁGENES adjuntas en el chat, menciónalo") +
    ". Debe: 1) agradecer la respuesta, 2) decir que envías las vistas de su página (imágenes adjuntas)" + (conEnlaces ? " y el enlace al prototipo" : "") + ", 3) resumir qué incluye (mapa de Google, botón de WhatsApp, diseño móvil), 4) ofrecer el paquete completo (dominio propio, diseño a medida, soporte) y cerrar sin compromiso. Español, sin placeholders ni corchetes.";
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: `Negocio: ${p.nombre_negocio} (${p.tipo}).` },
      ],
      temperature: 0.8,
      max_tokens: 220,
    });
    if (!res.ok) return mensajeMuestra(p, urlPrototipo);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    return texto && !contieneEnlaces(texto) ? texto : mensajeMuestra(p, urlPrototipo);
  } catch {
    return mensajeMuestra(p, urlPrototipo);
  }
}

/** MENSAJE DE RETOMA — para quien no respondió ni leyó, adaptable a los días transcurridos. */
export async function generarRetomaConDeepSeek(p: Prospecto, dias: number): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return mensajeRetoma(p, dias);
  const sist =
    "Eres un desarrollador web de David, Chiriquí. Escribe un mensaje de WhatsApp de RETOMA (máx 90 palabras) para un negocio local que " +
    (dias > 30 ? "recibió tu primer mensaje hace MÁS DE UN MES y nunca respondió" : dias > 7 ? "no respondió hace unos días" : "no respondió aún al primer mensaje") +
    ". REGLA CRÍTICA: NO incluyas NINGÚN enlace ni URL y PROHIBIDO usar emojis — el material se entrega como IMÁGENES adjuntas en el chat. Debe: 1) retomar el tema con naturalidad" +
    (dias > 30 ? " (re-apertura en frío, como si fuera la primera vez)" : "") +
    ", 2) ofrecer de nuevo las vistas de su página (imágenes adjuntas), 3) mencionar que incluye mapa de Google, botón de WhatsApp y diseño móvil, 4) cerrar sin compromiso. Español, sin placeholders ni corchetes.";
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: `Negocio: ${p.nombre_negocio} (${p.tipo}). Días desde el primer contacto: ${dias}.` },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    if (!res.ok) return mensajeRetoma(p, dias);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    return texto && !contieneEnlaces(texto) ? texto : mensajeRetoma(p, dias);
  } catch {
    return mensajeRetoma(p, dias);
  }
}

/** Compat: el copy "principal" ahora es la apertura (mensaje seguro sin enlaces). */
export async function generarCopyWithDeepSeek(p: Prospecto): Promise<string> {
  return generarAperturaConDeepSeek(p);
}

export function waLink(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}

// ---------- GENERADOR DE TEXTOS (email y seguimiento) ----------

/** Email de presentación (fallback). */
export function emailPlantilla(p: Prospecto): string {
  return [
    `Asunto: Muestra gratis de presencia digital para ${p.nombre_negocio}`,
    ``,
    `Hola, mi nombre es Ricardo Sanjur, desarrollador web en David, Chiriquí. Les escribo en referencia al mensaje de WhatsApp que enviamos en nombre de nuestro equipo de desarrollo.`,
    ``,
    `Les preparamos una muestra gratis (nada formal) de cómo se vería su negocio en internet: con su ubicación en Google Maps y un botón directo de WhatsApp para que sus clientes los contacten al instante. Adjunto algunas vistas para que la revisen.`,
    ``,
    `Si les gusta, el sitio completo incluye dominio propio, diseño a medida y soporte continuo. Sin compromiso — con gusto respondo cualquier pregunta.`,
    ``,
    `Quedo atento. ¡Saludos!`,
    `Ricardo Sanjur · Desarrollador web · David, Chiriquí · WhatsApp 6510-4147`,
  ].join("\n");
}

/** Mensaje corto de seguimiento para quienes ya recibieron la muestra (fallback). */
export function seguimientoPlantilla(p: Prospecto): string {
  return [
    `Hola ${p.nombre_negocio}:`,
    ``,
    `¿Alcanzaron a revisar la muestra que les compartí de cómo se vería su negocio en internet? Me encantaría conocer su opinión.`,
    ``,
    `Si les parece, con gusto les muestro más detalles o la ajusto a lo que necesiten. Sin compromiso. ¡Saludos!`,
  ].join("\n");
}

async function llm(sistema: string, prompt: string): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 260,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/** Email de presentación con la muestra (DeepSeek si hay key, si no plantilla). */
export async function generarEmail(p: Prospecto): Promise<string> {
  const sist =
    "Eres un desarrollador web de David, Chiriquí. Escribe un CORREO profesional en español, sin placeholders ni corchetes y sin emojis, dirigido a un negocio local. Debe: presentarte brevemente como desarrollador web local; ofrecer una MUESTRA GRATIS (nada formal) de cómo se vería su negocio en internet con ubicación en Google Maps y botón de WhatsApp; pedir permiso para compartirla; sembrar que el sitio completo incluye dominio propio, diseño a medida y soporte continuo; cerrar sin presión y con datos de contacto genéricos del equipo. Máx 180 palabras.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}), ${p.direccion}.`);
  return llmTxt || emailPlantilla(p);
}

/** Mensaje corto de seguimiento/recordatorio para prospectos ya contactados. */
export async function generarSeguimiento(p: Prospecto): Promise<string> {
  const sist =
    "Eres un desarrollador web de David, Chiriquí. Escribe un mensaje de WhatsApp CORTO (máx 60 palabras), cálido y sin presión, en español, sin placeholders ni corchetes y sin emojis. Es un recordatorio amable a un negocio que ya recibió una muestra gratis de su futura página web: preguntar si la vieron, ofrecer mostrarla con más detalle y cerrar con 'sin compromiso'.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}).`);
  return llmTxt || seguimientoPlantilla(p);
}

/** Traducción de la intención del cliente + respuesta lista (asistente de respuestas v2). */
export interface InterpretacionRespuesta {
  intencion: "interesado" | "precio" | "tiempo" | "permiso" | "detalle" | "no_interesado" | "otro";
  quiereDecir: string;
  respuesta: string;
}

const INTENCIONES_VALIDAS = new Set([
  "interesado", "precio", "tiempo", "permiso", "detalle", "no_interesado", "otro",
]);

/** Extrae el primer objeto JSON de un texto (el LLM a veces lo envuelve en ``` o agrega prosa). */
function extraerJson(texto: string): Record<string, unknown> | null {
  if (!texto) return null;
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fin + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Respuesta de respaldo cuando la IA no está disponible o no devuelve JSON válido. */
function respuestaPlantilla(p: Prospecto): string {
  return [
    "¡Gracias por escribirnos! Claro, con gusto los ayudo.",
    "",
    "Lo que vieron es solo la muestra: el sitio completo incluye dominio propio, diseño a medida, botón de WhatsApp directo y ajustes, por una inversión única de $300. Si necesitan catálogo con pedidos, se cotiza aparte según la cantidad de productos.",
    "",
    "¿Les paso los detalles o preferís una llamada corta? Sin compromiso.",
  ].join("\n");
}

/**
 * Asistente de respuestas (v2): además de la respuesta sugerida, TRADUCE lo que el
 * cliente quiso decir. Devuelve intención clasificada + explicación literal + texto listo.
 */
export async function interpretarRespuesta(p: Prospecto, mensajeCliente: string): Promise<InterpretacionRespuesta> {
  const yaTieneSitio = p.tiene_web === true;
  const reglasSitio = yaTieneSitio
    ? "IMPORTANTE: este negocio YA tiene su página web (es cliente actual). NO ofrezcas la landing de $300 ni la muestra gratis: enfócate SOLO en el upgrade que pide (catálogo, pedidos por WhatsApp, reservas, panel) y preséntalo como proyecto aparte que se cotiza según el alcance."
    : "Este negocio es un prospecto nuevo que ya recibió una MUESTRA GRATIS de su futura web: si pide más que una presentación, recordá que la landing de $300 es la base y que el catálogo/pedidos se cotiza aparte.";
  const sist =
    "Eres un asesor de ventas y TRADUCTOR de mensajes para un desarrollador web local de David, Chiriquí.\n" +
    'El negocio se llama EXACTAMENTE "' + p.nombre_negocio + '" y su rubro es "' + p.tipo + '" — jamás lo llames de otra forma ni cambies su rubro.\n' +
    reglasSitio + "\n" +
    "Devuelve SOLO un objeto JSON válido (sin texto extra, sin bloques de código) con esta forma exacta:\n" +
    '{"intencion":"interesado|precio|tiempo|permiso|detalle|no_interesado|otro","quiere_decir":"...","respuesta":"..."}\n' +
    "- intencion: lo que el cliente REALMENTE quiere (tiempo = 'déjame pensarlo / después'; permiso = debe consultar con socio o familia; precio = pregunta cuánto o le parece caro; detalle = pide más información; no_interesado = rechazo claro).\n" +
    "- quiere_decir: 1 o 2 frases LITERALES, sin adornos, explicando qué está pidiendo o sintiendo el cliente.\n" +
    "- respuesta: máximo 120 palabras, español de Panamá, lista para copiar y pegar, sin placeholders ni corchetes, sin emojis, y ADAPTADA a la intención real (no el mismo guion para todos).";
  const prompt = 'Mensaje entrante del cliente: "' + mensajeCliente + '".\nClasifica la intención, explícala y escribe la respuesta.';

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return { intencion: "otro", quiereDecir: "(IA no configurada: falta DEEPSEEK_API_KEY)", respuesta: respuestaPlantilla(p) };
  }
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });
    if (!res.ok) throw new Error("llm no ok");
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content?.trim() || "";
    const parsed = extraerJson(raw);
    const intRaw = String(parsed?.intencion || "");
    const intencion = (INTENCIONES_VALIDAS.has(intRaw) ? intRaw : "otro") as InterpretacionRespuesta["intencion"];
    const quiereDecir = String(parsed?.quiere_decir || "").trim();
    const respuesta = String(parsed?.respuesta || "").trim();
    if (respuesta) return { intencion, quiereDecir: quiereDecir || "(sin descripción)", respuesta };
    return { intencion: "otro", quiereDecir: "(la IA no devolvió JSON válido)", respuesta: raw || respuestaPlantilla(p) };
  } catch {
    return { intencion: "otro", quiereDecir: "(error de conexión con la IA)", respuesta: respuestaPlantilla(p) };
  }
}

/** Respuesta sugerida al mensaje entrante de un cliente (compatibilidad: solo el texto). */
export async function generarRespuesta(p: Prospecto, mensajeCliente: string): Promise<string> {
  return (await interpretarRespuesta(p, mensajeCliente)).respuesta;
}

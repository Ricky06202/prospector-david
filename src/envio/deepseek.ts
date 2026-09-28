/**
 * Cliente DeepSeek para generar copys de venta personalizados.
 * Sin API key, se usa una plantilla local de calidad (fallback).
 *
 * PRODUCTO: nube privada cifrada, $50 pago único (setup + primer mes),
 * después $10/mes o export de datos gratis. Nichos de datos sensibles.
 *
 * ANTI-BAN: el mensaje de APERTURA jamás lleva enlaces/PDF/imágenes y
 * NUNCA menciona crypto/USDC/blockchain (regla 5 del objetivo). El tema
 * de formas de pago aparece recién en los DETALLES (mensaje 2), cuando
 * el contacto ya respondió.
 */
import "dotenv/config";
import type { Prospecto } from "../types.ts";
import {
  mensajeApertura,
  mensajeMuestra,
  mensajeCierre,
  mensajeRetoma,
  temaPorTipo,
  esMensajeAperturaSeguro,
  contieneEnlaces,
} from "./anti-ban.ts";

/** Plantilla local (fallback) del MENSAJE 1 — APERTURA (sin enlaces, sin crypto). */
export function copyPlantilla(p: Prospecto): string {
  return mensajeApertura(p);
}

/** Versión plantilla de los DETALLES (mensaje 2) — también sirve de "respuesta larga". */
export function mensajeUpsellPlantilla(p: Prospecto): string {
  return mensajeMuestra(p);
}

/** Compat: "upsell" del pipeline viejo ahora equivale a pasar los detalles del servicio. */
export async function generarUpsellConDeepSeek(p: Prospecto): Promise<string> {
  return generarMuestraConDeepSeek(p);
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
  "Eres un desarrollador de software de David, Chiriquí, que escribe el PRIMER mensaje de prospección por WhatsApp a negocios que manejan datos sensibles (abogados, contadores, clínicas, consultorios). Ofreces CONFIGURAR UNA NUBE PRIVADA CIFRADA por $50 de pago único, que incluye la configuración y el primer mes de hosting; después el cliente elige mantenerla por $10/mes o exportar sus datos gratis. REGLAS CRÍTICAS: sin NINGÚN enlace (http, www, wa.me), sin mencionar PDF/imágenes/adjuntos, SIN emojis, y PROHIBIDO escribir crypto, USDC, blockchain, bitcoin o token — siempre 'nube privada cifrada'. Máx 60 palabras, cálido, español de Panamá, sin placeholders ni corchetes. Debe: 1) notar que el negocio maneja información confidencial específica de su giro, 2) mencionar que colegas del área están migrando a nubes privadas cifradas sin suscripciones abusivas, 3) dar el precio $50 pago único con primer mes incluido, 4) cerrar preguntando si le pasan detalles. No prometas nada más.";

/** MENSAJE 1 — APERTURA: corto, sin enlaces/PDF/imágenes y sin mencionar crypto. */
export async function generarAperturaConDeepSeek(p: Prospecto): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return copyPlantilla(p);

  const prompt = [
    `Negocio: ${p.nombre_negocio} (${p.tipo}).`,
    `Datos sensibles que maneja: ${temaPorTipo(p.tipo)}.`,
    `Escribe el PRIMER mensaje de WhatsApp ofreciendo la nube privada cifrada de $50 (pago único con primer mes incluido), sin enlaces, sin emojis y sin mencionar crypto o USDC, cerrando con '¿Te paso detalles?'.`,
  ].join("\n");

  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: SISTEMA_APERTURA },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 140,
    });
    if (!res.ok) return copyPlantilla(p);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    // Guardia: si DeepSeek mete un enlace o menciona crypto, usamos la plantilla segura.
    return texto && esMensajeAperturaSeguro(texto) ? texto : copyPlantilla(p);
  } catch {
    return copyPlantilla(p);
  }
}

/** MENSAJE 2 — DETALLES: qué incluye, precio, permanencia cero y formas de pago. */
export async function generarMuestraConDeepSeek(p: Prospecto, _urlPrototipo?: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return mensajeMuestra(p);
  const sist =
    "Eres un desarrollador de software de David, Chiriquí. Escribe el SEGUNDO mensaje de WhatsApp (máx 120 palabras) para un negocio que YA RESPONDIÓ al primer mensaje sobre la nube privada cifrada. Sin enlaces, sin emojis, español de Panamá, sin placeholders. Debe explicar en 4 puntos breves: 1) espacio cifrado solo para ellos, acceso desde celular y computadora, sin escaneo de terceros; 2) $50 de pago único que incluye configuración, capacitación y primer mes de hosting; 3) después: $10/mes O exportar todos sus datos gratis y retirarse sin penalización; 4) formas de pago: USDC sin comisiones o transferencia bancaria con 10% adicional. Cerrar ofreciendo dejarlo configurado esta semana.";
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: `Negocio: ${p.nombre_negocio} (${p.tipo}). Datos que maneja: ${temaPorTipo(p.tipo)}.` },
      ],
      temperature: 0.8,
      max_tokens: 260,
    });
    if (!res.ok) return mensajeMuestra(p);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    return texto && !contieneEnlaces(texto) ? texto : mensajeMuestra(p);
  } catch {
    return mensajeMuestra(p);
  }
}

/** MENSAJE DE RETOMA — UN único seguimiento a las 48h; pasados 7 días se descarta. */
export async function generarRetomaConDeepSeek(p: Prospecto, dias: number): Promise<string> {
  if (dias > 7) return ""; // regla operativa: un solo seguimiento, después descartar
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return mensajeRetoma(p, dias);
  const sist =
    "Eres un desarrollador de software de David, Chiriquí. Escribe UN mensaje de WhatsApp de RETOMA (máx 55 palabras), amable y sin presión, en español de Panamá, sin enlaces, sin emojis, sin placeholders y sin mencionar crypto. Es el ÚNICO seguimiento a un negocio que no respondió la oferta de nube privada cifrada por $50. Debe: reconocer que la semana está ocupada, ofrecer detalles en dos minutos si le interesa, y dejar una salida elegante ('si no aplica, sin problema').";
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: `Negocio: ${p.nombre_negocio} (${p.tipo}). Días desde el primer contacto: ${dias}.` },
      ],
      temperature: 0.7,
      max_tokens: 140,
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
    `Asunto: Nube privada cifrada para ${p.nombre_negocio} — $50 pago único`,
    ``,
    `Hola, mi nombre es Ricardo Sanjur, desarrollador de software en David, Chiriquí.`,
    ``,
    `Les escribo porque ${temaPorTipo(p.tipo)} merece un espacio propio: una nube privada cifrada que solo ustedes controlan, sin que ningún tercero escanee sus archivos. La configuración cuesta $50 de pago único e incluye el montaje completo, una capacitación breve y el primer mes de hosting. Después ustedes deciden: mantenerla por $10 al mes o exportar todos sus datos gratis y quedarse con ellos.`,
    ``,
    `Si les interesa, responda este correo y coordinamos la configuración esta misma semana. Sin compromiso.`,
    ``,
    `Quedo atento. ¡Saludos!`,
    `Ricardo Sanjur · Desarrollador de software · David, Chiriquí · WhatsApp 6510-4147`,
  ].join("\n");
}

/** Mensaje corto de seguimiento (fallback) — mismo tono que la retoma. */
export function seguimientoPlantilla(p: Prospecto): string {
  return mensajeRetoma(p, 3);
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
      max_tokens: 300,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/** Email de presentación del servicio (DeepSeek si hay key, si no plantilla). */
export async function generarEmail(p: Prospecto): Promise<string> {
  const sist =
    "Eres un desarrollador de software de David, Chiriquí. Escribe un CORREO profesional en español de Panamá, sin placeholders, sin emojis y sin enlaces, dirigido a un negocio que maneja datos sensibles. Ofrece la nube privada cifrada: $50 pago único que incluye configuración, capacitación y primer mes de hosting; después $10/mes o export gratis de los datos. Destaca que a diferencia de los servicios compartidos, nadie escanea sus archivos. Pide respuesta para coordinar esta semana. Máx 180 palabras.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}), ${p.direccion}. Datos sensibles: ${temaPorTipo(p.tipo)}.`);
  return llmTxt || emailPlantilla(p);
}

/** Recordatorio amable para prospectos ya contactados (el ÚNICO seguimiento). */
export async function generarSeguimiento(p: Prospecto): Promise<string> {
  const sist =
    "Eres un desarrollador de software de David, Chiriquí. Escribe un mensaje de WhatsApp CORTO (máx 60 palabras), cálido y sin presión, en español de Panamá, sin placeholders, sin emojis y sin mencionar crypto. Es el único recordatorio a un negocio que no respondió a la oferta de nube privada cifrada por $50: ofrece los detalles en dos minutos y deja una salida elegante si no le interesa.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}).`);
  return llmTxt || seguimientoPlantilla(p);
}

/** Respuesta sugerida al mensaje entrante de un cliente (asistente de respuestas). */
export async function generarRespuesta(p: Prospecto, mensajeCliente: string): Promise<string> {
  const sist =
    "Eres un asesor de ventas de un desarrollador de software en David, Chiriquí. El negocio se llama EXACTAMENTE \"" + p.nombre_negocio + "\" y su rubro es \"" + p.tipo + "\" — jamás lo llames de otra forma. El producto es una NUBE PRIVADA CIFRADA: $50 de pago único (configuración + capacitación + primer mes de hosting), después $10/mes o export de datos gratis. Manejo de objeciones: si dicen que Google Drive es más barato, responde que Drive es compartido y escanea los datos, y que aquí el pago es único por soberanía real; si preguntan por el pago, ofrece USDC sin comisiones o transferencia (+10%); si dudan del precio, recuerda que incluye configuración completa, capacitación y primer mes, y que su tiempo vale más que 40 horas de prueba y error. Escribe una RESPUESTA corta (máx 140 palabras), cálida y honesta, en español de Panamá, sin placeholders, sin emojis y sin enlaces. Termina proponiendo configurar el espacio esta semana.";
  const prompt = `Negocio: ${p.nombre_negocio} (${p.tipo}). Mensaje entrante del cliente: "${mensajeCliente}". Escribe la respuesta.`;
  const llmTxt = await llm(sist, prompt);
  return llmTxt || mensajeCierre(p);
}

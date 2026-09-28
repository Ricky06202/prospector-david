/**
 * Cliente DeepSeek para generar copys de venta personalizados.
 * Sin API key, se usa una plantilla local de calidad (fallback).
 *
 * PRODUCTO: Nube Privada Soberana (IaaS automatizado) — suscripción mensual
 * $10/$25/$50 según plan, acceso inmediato con link. Nicho: independientes y
 * pequeños negocios con datos sensibles. Nada de setups únicos ni landings.
 *
 * ANTI-BAN: el mensaje de APERTURA jamás lleva enlaces/PDF/imágenes ni
 * menciona crypto/USDC. El LINK de activación y los precios por plan van
 * recién en el mensaje 2, cuando el contacto ya respondió.
 */
import "dotenv/config";
import type { Prospecto } from "../types.ts";
import {
  mensajeApertura,
  mensajeMuestra,
  mensajeCierre,
  mensajeFueraDePlanes,
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
  "Eres proveedor de infraestructura cloud en David, Chiriquí, y escribes el PRIMER mensaje de prospección por WhatsApp a independientes y pequeños negocios que manejan datos sensibles. Vendes ACCESO INMEDIATO a una nube privada cifrada ya lista y automatizada: suscripción mensual de $10 (50GB), $25 (200GB con sync móvil y backup diario) o $50 (500GB multiusuario). TONO DE SOLUCIÓN INMEDIATA, no de presupuesto ni de desarrollo a medida. REGLAS CRÍTICAS: sin NINGÚN enlace, sin adjuntos, SIN emojis, y PROHIBIDO escribir crypto, USDC, blockchain, bitcoin o token — siempre 'nube privada cifrada'. Máx 70 palabras, cálido, español de Panamá, sin placeholders. Debe: 1) notar que trabaja con información sensible específica de su giro, 2) destacar que la nube ya está lista — sin instalaciones ni esperas — y que ni el proveedor puede ver sus archivos, 3) mencionar el rango desde $10 al mes, más barato que Dropbox, 4) cerrar preguntando si le pasan el link para activarlo en 2 minutos.";

/** MENSAJE 1 — APERTURA: corto, sin enlaces/PDF/imágenes y sin mencionar crypto. */
export async function generarAperturaConDeepSeek(p: Prospecto): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return copyPlantilla(p);

  const prompt = [
    `Negocio: ${p.nombre_negocio} (${p.tipo}).`,
    `Datos sensibles que maneja: ${temaPorTipo(p.tipo)}.`,
    `Escribe el PRIMER mensaje de WhatsApp ofreciendo la nube privada cifrada ya lista (suscripción desde $10 al mes, activación en 2 minutos), sin enlaces, sin emojis y sin mencionar crypto o USDC, cerrando con '¿Te paso el link para activarlo?'.`,
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
  const url = (process.env.PLATAFORMA_URL || "").trim();
  const sist =
    "Eres proveedor de una plataforma de nubes privadas cifradas ya automatizada. Escribe el SEGUNDO mensaje de WhatsApp (máx 120 palabras) para quien YA RESPONDIÓ al primer mensaje. NO expliques tecnología ni arquitectura. Español de Panamá, sin emojis, sin placeholders. Debe: 1) listar los 3 planes como opciones cerradas — Básico $10/mes 50GB, Pro $25/mes 200GB con sincronización móvil y backup diario, Negocio $50/mes 500GB con hasta 3 usuarios y soporte prioritario por WhatsApp; 2) decir que la activación toma 2 minutos y todo se gestiona desde su panel; 3) formas de pago: USDC sin comisiones o transferencia bancaria (+10%); 4) " + (url ? "incluir exactamente este enlace de activación: " + url : "ofrecer el link por correo o por chat cuando lo pida") + ". Cerrar con 'si algo falla, me escribes y lo resuelvo en minutos'.";
  try {
    const res = await chatCompletions(key, {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: sist },
        { role: "user", content: `Negocio: ${p.nombre_negocio} (${p.tipo}). Datos que maneja: ${temaPorTipo(p.tipo)}.` },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });
    if (!res.ok) return mensajeMuestra(p);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    // El mensaje 2 SÍ puede llevar el enlace de la plataforma: solo validamos que
    // no meta enlaces extraños distintos al configurado.
    if (!texto) return mensajeMuestra(p);
    const enlaces = texto.match(/https?:\/\/\S+/g) || [];
    const enlacesPermitidos = url ? 1 : 0;
    return enlaces.length <= enlacesPermitidos ? texto : mensajeMuestra(p);
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
    "Eres proveedor de una nube privada cifrada con activación en 2 minutos, desde $10 al mes. Escribe UN mensaje de WhatsApp de RETOMA (máx 55 palabras), amable y sin presión, en español de Panamá, sin enlaces, sin emojis, sin placeholders y sin mencionar crypto. Es el ÚNICO seguimiento a quien no respondió. Debe: reconocer la semana ocupada, ofrecer pasar el link de activación si le interesa, y dejar salida elegante ('si no aplica, sin problema').";
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
    `Asunto: Tu propia nube privada cifrada — activa en 2 minutos, desde $10/mes`,
    ``,
    `Hola, mi nombre es Ricardo Sanjur; opero una plataforma de nube privada soberana en David, Chiriquí.`,
    ``,
    `Les escribo porque ${temaPorTipo(p.tipo)} merece un espacio propio: una nube privada cifrada de extremo a extremo donde ni el proveedor puede ver sus archivos. La plataforma ya está montada y automatizada: elegís un plan mensual (Básico $10 con 50GB, Pro $25 con 200GB, sincronización móvil y backup diario, o Negocio $50 con 500GB y hasta 3 usuarios), activás tu cuenta en 2 minutos y empezás a respaldar. Es más barato que Dropbox y 100% privado.`,
    ``,
    `Si les interesa, responda este correo y les paso el link de activación hoy mismo. Sin compromiso.`,
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
    "Eres proveedor de una plataforma de nubes privadas cifradas, lista y automatizada. Escribe un CORREO profesional en español de Panamá, sin placeholders, sin emojis y sin enlaces, dirigido a un independiente o pequeño negocio con datos sensibles. Ofrece suscripción mensual: Básico $10/50GB, Pro $25/200GB con sync móvil y backup diario, Negocio $50/500GB multiusuario con soporte prioritario. Tono solución inmediata: activación en 2 minutos desde tu panel, cifrado E2E donde ni el proveedor ve los archivos, más barato que Dropbox, cancelás cuando quieras llevándote tus datos. Pide respuesta para pasar el link. Máx 180 palabras.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}), ${p.direccion}. Datos sensibles: ${temaPorTipo(p.tipo)}.`);
  return llmTxt || emailPlantilla(p);
}

/** Recordatorio amable para prospectos ya contactados (el ÚNICO seguimiento). */
export async function generarSeguimiento(p: Prospecto): Promise<string> {
  const sist =
    "Eres proveedor de una nube privada cifrada con suscripciones desde $10 al mes y activación en 2 minutos. Escribe un mensaje de WhatsApp CORTO (máx 60 palabras), cálido y sin presión, en español de Panamá, sin placeholders, sin emojis y sin mencionar crypto. Es el único recordatorio a quien no respondió: ofrece pasar el link de activación si le interesa y deja salida elegante si no aplica.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}).`);
  return llmTxt || seguimientoPlantilla(p);
}

/** Respuesta sugerida al mensaje entrante de un cliente (asistente de respuestas). */
export async function generarRespuesta(p: Prospecto, mensajeCliente: string): Promise<string> {
  const sist =
    "Eres asesor de ventas de una plataforma de Nube Privada Soberana (IaaS automatizado) en David, Chiriquí. El cliente se llama EXACTAMENTE \"" + p.nombre_negocio + "\" y su rubro es \"" + p.tipo + "\" — jamás lo llames de otra forma. El producto es SOLO la suscripción: Básico $10/mes 50GB, Pro $25/mes 200GB con sync móvil y backup diario, Negocio $50/mes 500GB con hasta 3 usuarios y soporte prioritario. REGLA DE ORO: si pide algo fuera de los 3 planes (más espacio, instalar software, desarrollo a medida), se lo NEGÁS con la respuesta estándar: la plataforma está optimizada para esos 3 niveles y quizá no sea su mejor opción. Objeciones: Drive/iCloud escanean y comparten; aquí es cifrado E2E donde ni el proveedor ve nada; el pago es USDC sin comisiones o transferencia (+10%); dudas: todo se gestiona desde el panel y si algo falla lo resolvés en minutos. NO expliques tecnología. Escribe una RESPUESTA corta (máx 120 palabras), cálida, en español de Panamá, sin placeholders ni emojis. Termina ofreciendo el link de activación (2 minutos).";
  const prompt = `Negocio: ${p.nombre_negocio} (${p.tipo}). Mensaje entrante del cliente: "${mensajeCliente}". Escribe la respuesta.`;
  const llmTxt = await llm(sist, prompt);
  const fueraDePlanes = /tb|terabytes?|instalar|software|a medida|personalizad|infinit|ilimitad/i.test(mensajeCliente);
  return llmTxt || (fueraDePlanes ? mensajeFueraDePlanes(p) : mensajeCierre(p));
}

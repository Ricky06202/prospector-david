/**
 * Cliente DeepSeek para generar copys de venta personalizados.
 * Sin API key, se usa una plantilla local de calidad (fallback).
 */
import "dotenv/config";
import type { Prospecto } from "../types.ts";

/** Plantilla local (fallback): muestra gratis + semilla del paquete completo. */
export function copyPlantilla(p: Prospecto): string {
  return [
    `Hola ${p.nombre_negocio} 👋`,
    ``,
    `Les preparé una muestra gratis de cómo se vería su negocio en internet: con su ubicación en Google Maps y un botón directo de WhatsApp para que sus clientes los contacten al instante.`,
    ``,
    `No es nada formal — solo para que vean el potencial de su negocio con presencia digital propia. ¿Se las comparto por aquí?`,
    ``,
    `Y si les gusta, después vemos cómo llevarla al siguiente nivel con dominio propio, diseño a medida y soporte continuo. Sin compromiso, claro.`,
  ].join("\n");
}

const SISTEMA =
  "Eres un desarrollador web de David, Chiriquí, que escribe mensajes de prospección por WhatsApp a negocios locales. Hablas como parte de un equipo de desarrollo de software que opera desde oficinas en David. NO uses placeholders como [Tu Nombre], [Tu Empresa] ni corchetes. Escribe en español, corto (máx 100 palabras), cálido y persuasivo, sin tecnicismos. El mensaje debe: 1) ofrecer una MUESTRA GRATIS de cómo se vería el negocio en internet (no una 'maqueta' ni el sitio final), con su ubicación en Google Maps y un botón directo de WhatsApp para que los clientes contacten al instante; 2) aclarar que no es nada formal, solo para que vean el potencial de tener presencia digital propia; 3) pedir permiso para compartir la muestra; 4) sembrar sutilmente que el sitio completo incluye dominio propio, diseño a medida y soporte continuo; 5) terminar con 'sin compromiso'.";

export async function generarCopyWithDeepSeek(p: Prospecto): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return copyPlantilla(p);

  const prompt = [
    `Negocio: ${p.nombre_negocio} (${p.tipo}).`,
    `Ubicación: ${p.direccion}.`,
    `Escribe un mensaje de WhatsApp de prospección (máx 100 palabras) ofreciendo una página web profesional gratis en maqueta, con mapa de Google y botón de WhatsApp, y pidiendo permiso para compartirla.`,
  ].join("\n");

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SISTEMA },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });
    if (!res.ok) return copyPlantilla(p);
    const data = await res.json();
    const texto: string = data?.choices?.[0]?.message?.content?.trim();
    return texto || copyPlantilla(p);
  } catch {
    return copyPlantilla(p);
  }
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
    `Hola ${p.nombre_negocio} 👋`,
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
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 260,
      }),
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
    "Eres un desarrollador web de David, Chiriquí. Escribe un CORREO profesional en español, sin placeholders ni corchetes, dirigido a un negocio local. Debe: presentarte brevemente como desarrollador web local; ofrecer una MUESTRA GRATIS (nada formal) de cómo se vería su negocio en internet con ubicación en Google Maps y botón de WhatsApp; pedir permiso para compartirla; sembrar que el sitio completo incluye dominio propio, diseño a medida y soporte continuo; cerrar sin presión y con datos de contacto genéricos del equipo. Máx 180 palabras.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}), ${p.direccion}.`);
  return llmTxt || emailPlantilla(p);
}

/** Mensaje corto de seguimiento/recordatorio para prospectos ya contactados. */
export async function generarSeguimiento(p: Prospecto): Promise<string> {
  const sist =
    "Eres un desarrollador web de David, Chiriquí. Escribe un mensaje de WhatsApp CORTO (máx 60 palabras), cálido y sin presión, en español, sin placeholders ni corchetes. Es un recordatorio amable a un negocio que ya recibió una muestra gratis de su futura página web: preguntar si la vieron, ofrecer mostrarla con más detalle y cerrar con 'sin compromiso'.";
  const llmTxt = await llm(sist, `Negocio: ${p.nombre_negocio} (${p.tipo}).`);
  return llmTxt || seguimientoPlantilla(p);
}

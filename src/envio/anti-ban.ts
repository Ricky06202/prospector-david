/**
 * SISTEMA ANTI-BAN DE WHATSAPP + SECUENCIA "NUBE PRIVADA CIFRADA"
 * ---------------------------------------------------------------
 * Producto: configuración de nube privada cifrada por $50 (pago único,
 * incluye setup + primer mes de hosting; después $10/mes o export gratis).
 * Nichos: abogados, contadores, clínicas/consultorios, consultores y
 * negocios con información confidencial. NO se venden landings.
 *
 *  1) SECUENCIA EN 2 MENSAJES: la "apertura" es corta, SIN enlaces, SIN
 *     imágenes y SIN mencionar crypto/blockchain/USDC (regla del objetivo:
 *     la palabra crypto solo sale cuando el cliente ya respondió). El
 *     mensaje 2 ("detalles") es donde van precio completo y formas de pago.
 *  2) DELAYS DINÁMICOS con jitter + pausas + factor nocturno.
 *  3) TOPE DIARIO: 20-30 contactos por sesión/día (WA_MAX_SESION default 25).
 *  4) SEGUIMIENTO ÚNICO: a las 48h sin respuesta, UN solo mensaje amable;
 *     después se DESCARTA (no hay segundos reintentos).
 */
import "dotenv/config";
import type { Prospecto } from "../types.ts";

const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export interface ConfigAntiBan {
  /** Base del delay entre envíos (ms). */
  delayBase: number;
  /** Jitter aleatorio sobre el base (ms). */
  delayJitter: number;
  /** Factor multiplicador nocturno (22h-7h): 0 desactiva. */
  factorNocturno: number;
  /** Cada cuántos envíos se mete una pausa larga (0 = nunca). */
  pausaCada: number;
  /** Pausa larga mínima (ms). */
  pausaMin: number;
  /** Pausa larga máxima (ms). */
  pausaMax: number;
  /** Máx envíos por sesión antes de sugerir parar (0 = sin tope). */
  maxPorSesion: number;
}

export function configAntiBan(): ConfigAntiBan {
  return {
    delayBase: Number(process.env.WA_DELAY_BASE || 45000),          // 45 s
    delayJitter: Number(process.env.WA_DELAY_JITTER || 90000),      // +0-90 s
    factorNocturno: Number(process.env.WA_FACTOR_NOCTURNO || 2.5),  // x2.5 de noche
    pausaCada: Number(process.env.WA_PAUSA_CADA || 6),              // pausa cada 6
    pausaMin: Number(process.env.WA_PAUSA_MIN || 30) * 60000,       // 30 min
    pausaMax: Number(process.env.WA_PAUSA_MAX || 60) * 60000,       // 60 min
    // Regla del objetivo: máximo 20-30 contactos/día para no quemar la cuenta.
    maxPorSesion: Number(process.env.WA_MAX_SESION || 25),
  };
}

function esNocturno(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 22 || h < 7;
}

/**
 * Delay dinámico (ms) entre el envío `orden` y el `orden+1`.
 * Crece levemente con cada envío (patrón humano de cansancio) y
 * se multiplica de noche.
 */
export function delayDinamico(orden: number, cfg: ConfigAntiBan = configAntiBan()): number {
  let ms = cfg.delayBase + rng(0, cfg.delayJitter);
  if (orden > 0) ms += Math.min(orden, 15) * 9000;   // +9 s por envío (techo 135 s)
  if (esNocturno() && cfg.factorNocturno > 0) ms *= cfg.factorNocturno;
  return Math.round(ms);
}

/**
 * Si ya se enviaron `cantidadEnviados`, devuelve ms de PAUSA LARGA
 * (momento para dejar de enviar), o null si se sigue normalmente.
 */
export function pausaLarga(cantidadEnviados: number, cfg: ConfigAntiBan = configAntiBan()): number | null {
  if (cfg.pausaCada <= 0) return null;
  if (cantidadEnviados > 0 && cantidadEnviados % cfg.pausaCada === 0) {
    return rng(cfg.pausaMin, cfg.pausaMax);
  }
  return null;
}

/** Formatos legibles para el reporte humano. */
export function formatoMs(ms: number): string {
  if (ms >= 60000) {
    const m = Math.round(ms / 60000);
    return `${m} min`;
  }
  return `${Math.round(ms / 1000)} s`;
}

/** Secuencia de delays para una sesión de N envíos (para previsualizar el ritmo). */
export function planDeRitmo(n: number, cfg: ConfigAntiBan = configAntiBan()): { orden: number; delay: number; pausa: number | null }[] {
  return Array.from({ length: Math.max(1, n) }, (_, i) => ({
    orden: i + 1,
    delay: delayDinamico(i, cfg),
    pausa: pausaLarga(i + 1, cfg),
  }));
}

// ---------------------------------------------------------------
// PERSONALIZACIÓN POR GIRO
// ---------------------------------------------------------------

/** Qué datos sensibles maneja este tipo de negocio (para el gancho del mensaje 1). */
export function temaPorTipo(tipo: string): string {
  const t = (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/abogad|legal|juridic|notar|herencia/.test(t)) return "herencias, contratos y expedientes de casos";
  if (/contad|contabl|auditor|fiscal|impuesto/.test(t)) return "balances, declaraciones y datos fiscales de tus clientes";
  if (/psicolog|psiquiatr/.test(t)) return "notas de sesión y expedientes de pacientes";
  if (/clinic|medic|salud|dental|paciente|hospital/.test(t)) return "historiales clínicos y datos de pacientes";
  if (/laboratori/.test(t)) return "resultados de laboratorio y datos de pacientes";
  if (/seguro/.test(t)) return "pólizas y datos personales de asegurados";
  if (/inmobiliar/.test(t)) return "contratos de compra-venta y datos de clientes";
  if (/colegio|escuel/.test(t)) return "expedientes y datos de estudiantes y apoderados";
  if (/consultor|arquitect|ingenier|topograf|actuar/.test(t)) return "proyectos e información confidencial de tus clientes";
  return "información confidencial de tus clientes";
}

// ---------------------------------------------------------------
// SECUENCIA DE MENSAJES
// ---------------------------------------------------------------

/**
 * MENSAJE 1 — APERTURA. Corto, sin enlaces/imágenes y SIN la palabra crypto,
 * blockchain, USDC o similar (regla operativa 5). Solo "nube privada cifrada".
 */
export function mensajeApertura(p: Prospecto): string {
  const tema = temaPorTipo(p.tipo);
  const aperturas = [
    `Hola ${p.nombre_negocio}: vi que manejás ${tema}. Muchos colegas del área están migrando a nubes privadas cifradas para proteger esos datos sin suscripciones abusivas. Configuro tu espacio privado por $50 — pago único que incluye el setup y el primer mes de hosting. Después elegís: mantenerlo por $10/mes o llevarte tus datos gratis. ¿Te paso detalles?`,
    `Buenas ${p.nombre_negocio}: si hoy tu información sensible vive en un Drive compartido o en un pendrive, eso puede cambiar. Te monto una nube privada cifrada, solo para ti, por $50 de pago único (setup y primer mes incluidos). ¿Te explico en 2 minutos?`,
    `Hola ${p.nombre_negocio}: atendés ${tema}, justamente el tipo de información que no debería estar en un servicio que la escanea. Configuro tu espacio privado cifrado por $50, pago único con primer mes incluido. ¿Te comparto cómo funciona?`,
  ];
  return aperturas[Math.floor(Math.random() * aperturas.length)];
}

/**
 * MENSAJE 2 — DETALLES. Se envía SOLO si el contacto respondió. Aquí sí van
 * las formas de pago (USDC o transferencia) y la comparación con Drive.
 * Sin enlaces: todo el valor cabe en el texto (funciona en David sin links).
 */
export function mensajeMuestra(p: Prospecto, _urlPrototipo?: string): string {
  const tema = temaPorTipo(p.tipo);
  return [
    `¡Gracias por responder, ${p.nombre_negocio}! Te lo resumo en 4 puntos:`,
    ``,
    `1) Tu espacio privado cifrado para ${tema}: accedés desde el celular y la computadora, con tu propia cuenta. Nadie más entra; no lo escanea ningún tercero.`,
    `2) Setup, capacitación y el primer mes de hosting van incluidos por $50 de pago único. Sin contratos ni permanencia.`,
    `3) El mes siguiente elegís: mantenerlo por $10/mes, o te exportás TODOS los datos gratis y te quedás con ellos.`,
    `4) Forma de pago: USDC sin comisiones, o transferencia bancaria (+10%). Lo hago todo yo, vos solo me pasás qué carpetas necesitás.`,
    ``,
    `¿Te lo configuro esta semana?`,
  ].join("\n");
}

/**
 * MENSAJE 3 — CIERRE / MANEJO DE OBJECIONES. Para quien respondió pero duda
 * del precio o compara con Google Drive. Sin enlaces.
 */
export function mensajeCierre(_p: Prospecto): string {
  return [
    `Entiendo la duda, es la pregunta más común.`,
    ``,
    `Google Drive cuesta $3/mes pero es compartido: la plataforma escanea tus archivos y el alquiler nunca termina. Los $50 de la nube privada son pago único por un espacio cifrado que es solo tuyo, con configuración completa, capacitación y el primer mes de hosting dentro. Después decidís: $10/mes si querés seguir con nosotros, o te llevás tus datos gratis. Tu tiempo vale más que 40 horas de prueba y error.`,
    ``,
    `¿Lo probamos esta semana?`,
  ].join("\n");
}

/**
 * MENSAJE DE RETOMA — UN solo seguimiento a las 48h (regla operativa 4).
 * Pasados esos días sin respuesta, se DESCARTA: no genera segundo intento.
 */
export function mensajeRetoma(p: Prospecto, dias: number): string {
  if (dias > 7) return ""; // ventana cerrada: descartar, no insistir
  const tema = temaPorTipo(p.tipo);
  return [
    `Hola ${p.nombre_negocio}:`,
    ``,
    `Te escribí hace un par de días sobre la nube privada cifrada para ${tema}. Sé que la semana tiene — si el tema te interesa, te paso los detalles en 2 minutos. Si no aplica, sin problema y gracias por tu tiempo.`,
  ].join("\n");
}

/** Secuencia completa de mensajes con delays entre pasos. */
export function secuenciaMensajes(
  p: Prospecto,
  urlPrototipo?: string,
  cfg: ConfigAntiBan = configAntiBan()
): { tipo: string; texto: string; delay_tras_ms: number }[] {
  return [
    { tipo: "apertura", texto: mensajeApertura(p), delay_tras_ms: 0 },
    { tipo: "muestra", texto: mensajeMuestra(p, urlPrototipo), delay_tras_ms: delayDinamico(0, cfg) },
    { tipo: "cierre", texto: mensajeCierre(p), delay_tras_ms: delayDinamico(1, cfg) },
  ];
}

/**
 * Guardia de seguridad del mensaje de APERTURA: jamás enlaces, adjuntos,
 * emojis ni la palabra crypto/USDC/blockchain (regla 5 del objetivo).
 */
const PATRON_BLOQUEADO =
  /(https?:\/\/|www\.|wa\.me|\.pdf\b|\.docx?\b|\.xlsx?\b|\.zip\b|\.png\b|\.jpe?g\b|\.webp\b|\.gif\b|📎|⬇|adjunto|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]|crypto|criptomoned|blockchain|descentraliz|bitcoin|\bbtc\b|usdt|usdc|stablecoin|token|nft)/iu;
export function esMensajeAperturaSeguro(texto: string): boolean {
  return texto.length > 0 && texto.length <= 600 && !PATRON_BLOQUEADO.test(texto);
}

/** ¿El texto contiene algún enlace? (David: nunca enviar enlaces). */
export function contieneEnlaces(texto: string): boolean {
  return /(https?:\/\/|www\.|wa\.me|\b\w+\.(com|pa|net|org|io|dev)\b)/i.test(texto);
}

/** Días enteros transcurridos desde una fecha ISO hasta hoy. */
export function diasDesde(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / 86400000);
}

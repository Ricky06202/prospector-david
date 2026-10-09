/**
 * SISTEMA ANTI-BAN DE WHATSAPP
 * ----------------------------
 * Estrategia en 3 capas para que la cuenta no sea bloqueada por Meta:
 *
 *  1) SECUENCIA EN 2 MENSAJES: el primer mensaje ("apertura") es CORTO y
 *     NO contiene enlaces, PDFs, ni imágenes. Solo busca la respuesta del
 *     dueño. El material pesado (enlace al prototipo + 6 capturas) se envía
 *     como SEGUNDO mensaje, únicamente después de que el contacto responde.
 *
 *  2) DELAYS DINÁMICOS: cada envío se espacia con un delay humano con jitter
 *     (aleatorio), que crece con cada envío y se duplica en horario nocturno.
 *     Cada N envíos se inserta una pausa larga (configurable).
 *
 *  3) VARIACIÓN: los templates rotan aperturas para no repetir la misma huella
 *     de texto (las cuentas masivas se detectan por mensajes idénticos).
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
    pausaCada: Number(process.env.WA_PAUSA_CADA || 8),              // pausa cada 8
    pausaMin: Number(process.env.WA_PAUSA_MIN || 30) * 60000,       // 30 min
    pausaMax: Number(process.env.WA_PAUSA_MAX || 60) * 60000,       // 60 min
    maxPorSesion: Number(process.env.WA_MAX_SESION || 0),           // sin tope
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
// SECUENCIA DE MENSAJES
// ---------------------------------------------------------------

/**
 * MENSAJE 1 — APERTURA. Corto, sin enlaces/PDF/imágenes.
 * Su único objetivo es arrancar conversación y pedir permiso para enviar la muestra.
 */
export function mensajeApertura(p: Prospecto): string {
  const aperturas = [
    `Hola ${p.nombre_negocio}: mi equipo y yo preparamos una muestra gratis de cómo se vería su negocio en internet, con su ubicación en Google Maps y botón directo de WhatsApp.`,
    `Buenas ${p.nombre_negocio}: les diseñamos una vista previa gratis de su negocio en la web, lista para recibir clientes por WhatsApp.`,
    `Hola ${p.nombre_negocio}: les tenemos una sorpresa, una muestra gratis de su presencia digital, con mapa y botón de WhatsApp, sin costo ni compromiso.`,
  ];
  const base = aperturas[Math.floor(Math.random() * aperturas.length)];
  return [
    base,
    ``,
    `¿Se las comparto por aquí? Son solo 2 minutos para verla.`,
  ].join("\n");
}

/**
 * MENSAJE 2 — MUESTRA. Se envía SOLO si el contacto respondió.
 * En David, Chiriquí NO se envían enlaces (los clientes temen estafas):
 * este mensaje acompaña las IMÁGENES del prototipo que el humano adjunta.
 * Solo si ENVIAR_ENLACES=true se inserta el enlace al prototipo.
 */
export function mensajeMuestra(p: Prospecto, urlPrototipo?: string): string {
  const conEnlaces = urlPrototipo && process.env.ENVIAR_ENLACES === "true";
  const lineas = [
    `¡Gracias por responder, ${p.nombre_negocio}!`,
    ``,
    `Les adjunto unas vistas de cómo se vería su página en internet:`,
  ];
  if (conEnlaces) {
    lineas.push(``);
    lineas.push(`Ver prototipo: ${urlPrototipo}`);
  } else {
    lineas.push(`(les envío las imágenes aquí en el chat)`);
  }
  lineas.push(
    ``,
    `Incluye su ubicación en Google Maps, botón directo de WhatsApp y diseño que se adapta a celular y computadora.`,
    ``,
    `¿Qué opinan? Si les gusta, la armamos con dominio propio, diseño a medida y soporte continuo. Sin compromiso.`,
  );
  return lineas.join("\n");
}

/**
 * MENSAJE 3 — CIERRE / SEGUIMIENTO. Para quien respondió pero no cierra.
 * Sembrar el upsell institucional de forma sutil. Sin enlaces.
 */
export function mensajeCierre(p: Prospecto): string {
  return [
    `Hola ${p.nombre_negocio}: ¿Alcanzaron a ver las vistas que les envié de su página?`,
    ``,
    `Si les interesa, además de la página podemos montarles un panel para controlar pedidos, citas o su operación diaria desde el celular.`,
    ``,
    `Solo díganme y les paso los detalles. Sin compromiso, ¡saludos!`,
  ].join("\n");
}

/**
 * MENSAJE DE RETOMA — para quien NO respondió ni leyó el primer mensaje.
 * Se envía días/semanas/meses después. Se adapta a los días transcurridos
 * y NUNCA lleva enlaces: solo se refiere a las imágenes que se adjuntan.
 *  - <7 días:   nudge corto.
 *  - 7-30 días: retoma (muchos no leen el primer mensaje).
 *  - >30 días:  retoma en frío (re-apertura como si fuera nuevo).
 */
export function mensajeRetoma(p: Prospecto, dias: number): string {
  if (dias <= 7) {
    return [
      `Hola ${p.nombre_negocio}:`,
      ``,
      `¿Alcanzaron a ver el mensaje que les envié? Les adjunto de nuevo las vistas de su página por si se les pasó.`,
      ``,
      `Si les gusta, la armamos con dominio propio, diseño a medida y soporte continuo. Sin compromiso. ¡Saludos!`,
    ].join("\n");
  }
  if (dias <= 30) {
    return [
      `Hola ${p.nombre_negocio}:`,
      ``,
      `Les escribí hace unos días con una muestra de su negocio en internet. Sé que el primer mensaje muchas veces se pierde, así que les dejo por aquí las vistas otra vez.`,
      ``,
      `¿Qué opinan? Solo díganme y les comparto los detalles. Sin compromiso.`,
    ].join("\n");
  }
  return [
    `Hola ${p.nombre_negocio}:`,
    ``,
    `Les escribí hace un tiempo con una muestra gratis de cómo se vería su negocio en internet. Como no sabía si la vieron, les vuelvo a compartir las vistas aquí en el chat.`,
    ``,
    `Sigue disponible, sin compromiso. Si les interesa, con gusto les doy más detalles. ¡Saludos!`,
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
 * Guardia de seguridad: el mensaje de APERTURA jamás debe contener
 * enlaces, PDFs, imágenes pesadas ni adjuntos. Devuelve true si es seguro.
 */
const PATRON_BLOQUEADO = /(https?:\/\/|www\.|wa\.me|\.pdf\b|\.docx?\b|\.xlsx?\b|\.zip\b|\.png\b|\.jpe?g\b|\.webp\b|\.gif\b|📎|⬇|adjunto|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}])/u;
export function esMensajeAperturaSeguro(texto: string): boolean {
  return texto.length > 0 && texto.length <= 500 && !PATRON_BLOQUEADO.test(texto);
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

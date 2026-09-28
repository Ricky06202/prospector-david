/**
 * SISTEMA ANTI-BAN DE WHATSAPP + SECUENCIA "NUBE PRIVADA SOBERANA" (IaaS)
 * -----------------------------------------------------------------------
 * Modelo de negocio: proveedor de infraestructura con plataforma lista y
 * automatizada (Coolify/Dokploy + Storj). NO es desarrollo a medida: se vende
 * ACCESO INMEDIATO con suscripción mensual. 3 planes fijos, sin negociación:
 *   BÁSICO $10/mes (50GB) · PRO $25/mes (200GB + sync móvil + backup diario)
 *   NEGOCIO $50/mes (500GB + multiusuario hasta 3 + soporte prioritario).
 *
 * Reglas implementadas:
 *  1) Mensaje 1 (apertura): tono "solución inmediata", sin precio detallado,
 *     sin enlaces, sin emojis y SIN palabras crypto (regla de fricción).
 *  2) Mensaje 2 (tras respuesta): el LINK de activación/registro — no se
 *     explica tecnología. Si hay PLATAFORMA_URL en .env, se inserta directo.
 *  3) Dudas: "todo se gestiona desde tu panel; si algo falla, lo resuelvo en minutos".
 *  4) Regla de ORO anti-fricción: pedir algo fuera de los 3 planes → NO educado.
 *  5) Volumen: 30-50 contactos/día (WA_MAX_SESION default 40) con delays humanos.
 *  6) Seguimiento ÚNICO a las 48h; después se descarta.
 */
import "dotenv/config";
import type { Prospecto } from "../types.ts";

const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export interface ConfigAntiBan {
  delayBase: number;
  delayJitter: number;
  factorNocturno: number;
  pausaCada: number;
  pausaMin: number;
  pausaMax: number;
  /** Máx envíos por sesión/día (0 = sin tope). */
  maxPorSesion: number;
}

export function configAntiBan(): ConfigAntiBan {
  return {
    delayBase: Number(process.env.WA_DELAY_BASE || 30000),          // 30 s (más volumen: 30-50/día)
    delayJitter: Number(process.env.WA_DELAY_JITTER || 60000),      // +0-60 s
    factorNocturno: Number(process.env.WA_FACTOR_NOCTURNO || 2.5),  // x2.5 de noche
    pausaCada: Number(process.env.WA_PAUSA_CADA || 10),             // pausa cada 10
    pausaMin: Number(process.env.WA_PAUSA_MIN || 20) * 60000,       // 20 min
    pausaMax: Number(process.env.WA_PAUSA_MAX || 45) * 60000,       // 45 min
    // Meta de volumen del nuevo modelo: 30-50 leads/día (proceso automático, esfuerzo bajo).
    maxPorSesion: Number(process.env.WA_MAX_SESION || 40),
  };
}

function esNocturno(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 22 || h < 7;
}

/** Delay dinámico (ms) entre envío y envío (patrón humano, crece con el cansancio). */
export function delayDinamico(orden: number, cfg: ConfigAntiBan = configAntiBan()): number {
  let ms = cfg.delayBase + rng(0, cfg.delayJitter);
  if (orden > 0) ms += Math.min(orden, 15) * 6000;   // +6 s por envío (techo 90 s)
  if (esNocturno() && cfg.factorNocturno > 0) ms *= cfg.factorNocturno;
  return Math.round(ms);
}

/** Pausa larga cada N envíos, o null si se sigue normalmente. */
export function pausaLarga(cantidadEnviados: number, cfg: ConfigAntiBan = configAntiBan()): number | null {
  if (cfg.pausaCada <= 0) return null;
  if (cantidadEnviados > 0 && cantidadEnviados % cfg.pausaCada === 0) {
    return rng(cfg.pausaMin, cfg.pausaMax);
  }
  return null;
}

/** Formatos legibles para el reporte humano. */
export function formatoMs(ms: number): string {
  if (ms >= 60000) return `${Math.round(ms / 60000)} min`;
  return `${Math.round(ms / 1000)} s`;
}

/** Secuencia de delays para una sesión de N envíos. */
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

/** Qué dato sensible resaltar en la apertura según el giro del prospecto. */
export function temaPorTipo(tipo: string): string {
  const t = (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/abogad|legal|juridic|notar|herencia/.test(t)) return "expedientes y contratos de clientes";
  if (/contad|contabl|auditor|fiscal|impuesto/.test(t)) return "balances y declaraciones de tus clientes";
  if (/psicolog|psiquiatr/.test(t)) return "notas de sesión de tus pacientes";
  if (/clinic|medic|salud|dental|paciente|hospital|laboratori/.test(t)) return "historiales y datos de pacientes";
  if (/fotograf|video|disena|creador|community|redactor/.test(t)) return "tus archivos de clientes y proyectos";
  if (/nutricion|entrenad|coach/.test(t)) return "planes e historiales de tus clientes";
  if (/seguro/.test(t)) return "pólizas y datos de asegurados";
  if (/inmobiliar/.test(t)) return "contratos y datos de tus clientes";
  if (/colegio|escuel/.test(t)) return "expedientes de estudiantes";
  if (/consultor|arquitect|ingenier|topograf|actuar/.test(t)) return "proyectos e información de tus clientes";
  return "archivos importantes de tu trabajo";
}

// ---------------------------------------------------------------
// SECUENCIA DE MENSAJES (tono: solución inmediata, no presupuesto)
// ---------------------------------------------------------------

/**
 * MENSAJE 1 — APERTURA. Sin enlaces, sin emojis, sin crypto. Presenta la
 * nube ya lista ("ni yo puedo ver tus archivos") y pide permiso para pasar
 * el link de activación. El precio va como rango mensual, nunca como setup.
 */
export function mensajeApertura(p: Prospecto): string {
  const tema = temaPorTipo(p.tipo);
  const aperturas = [
    `Hola ${p.nombre_negocio}: vi que trabajás con ${tema}. ¿Sabías que podés tener tu propia nube privada cifrada donde ni yo puedo ver tus archivos? Ya está lista: sin instalaciones ni esperas. Por $10 a $25 al mes tenés espacio seguro, backups automáticos y control total. Es más barato que Dropbox y 100% privado. ¿Te paso el link para activarlo en 2 minutos?`,
    `Hola ${p.nombre_negocio}: si tus ${tema} viven en Google Drive o iCloud, eso se resuelve hoy. Ofrezco nubes privadas cifradas donde ni el proveedor puede meter las manos — suscripción mensual desde $10, backups automáticos y acceso desde el celular. Se activa en 2 minutos, sin instalaciones. ¿Te comparto el link?`,
    `Buenas ${p.nombre_negocio}: tengo una plataforma de nubes privadas cifradas ya funcionando — entrás, pagás tu plan mensual (desde $10) y en 2 minutos tenés tu espacio donde ni yo puedo ver tus archivos. Ideal para respaldar ${tema} sin depender de servicios que los escanean. ¿Te paso el link para activarlo?`,
  ];
  return aperturas[Math.floor(Math.random() * aperturas.length)];
}

/**
 * MENSAJE 2 — ACTIVACIÓN. SOLO tras la respuesta. No se explica tecnología:
 * va el link de registro/pago directo. Con PLATAFORMA_URL vacía, se pide el
 * correo para enviarlo manualmente.
 */
export function mensajeMuestra(_p: Prospecto, _urlPrototipo?: string): string {
  const url = (process.env.PLATAFORMA_URL || "").trim();
  const lineas = [
    `¡Perfecto! No necesitas saber nada técnico:`,
    ``,
    `1) Elegís tu plan: Básico $10/mes (50GB), Pro $25/mes (200GB + sincronización automática con tu celular + backup diario) o Negocio $50/mes (500GB, hasta 3 usuarios y soporte prioritario por WhatsApp).`,
    `2) Activás con tarjeta o USDC (transferencia bancaria +10%) y en 2 minutos ya estás subiendo tus archivos.`,
    ``,
  ];
  if (url) {
    lineas.push(`Link para activarlo: ${url}`);
  } else {
    lineas.push(`Paseame tu correo y te mando el link de activación ahora mismo (o pedímelo por aquí y te lo paso suelto).`);
  }
  lineas.push(
    ``,
    `Todo se gestiona desde tu panel. Si algo falla, me escribís y lo resuelvo en minutos.`
  );
  return lineas.join("\n");
}

/**
 * MENSAJE DE DUDAS — respuesta breve estándar cuando preguntan cómo funciona.
 * Prohibido explicar arquitectura; vender tranquilidad.
 */
export function mensajeCierre(_p: Prospecto): string {
  return [
    `Es simple: tu nube ya está corriendo, solo activás tu cuenta.`,
    ``,
    `Todo se gestiona desde tu panel: subís archivos, ves tus respaldos y administrás usuarios sin tocar nada técnico. Si algo falla, me escribís por aquí y lo resuelvo en minutos — ese es justamente el trato.`,
    ``,
    `¿Con cuál plan empezamos: Básico $10, Pro $25 o Negocio $50?`,
  ].join("\n");
}

/**
 * REGLA DE ORO ANTI-FRICCIÓN — el NO educado a lo que no está en los 3 planes
 * (2TB, instalar tal software, desarrollo a medida…). Filtra curiosos.
 */
export function mensajeFueraDePlanes(_p: Prospecto): string {
  return [
    `Te respondo honesto para no hacerte perder tiempo:`,
    ``,
    `Mi plataforma está optimizada para estos 3 niveles de seguridad/velocidad (Básico $10, Pro $25, Negocio $50). Lo que me pedís está fuera de lo que ofrezco, así que te digo que no. Si necesitás algo distinto, quizás no sea tu mejor opción ahora mismo.`,
    ``,
    `Si en algún punto un plan te sirve, la activación toma 2 minutos. ¡Saludos!`,
  ].join("\n");
}

/**
 * MENSAJE DE RETOMA — UN solo seguimiento a las 48h; después descartar.
 */
export function mensajeRetoma(p: Prospecto, dias: number): string {
  if (dias > 7) return ""; // ventana cerrada: descartar, no insistir
  return [
    `Hola ${p.nombre_negocio}:`,
    ``,
    `Te escribí hace un par de días por la nube privada cifrada (activación en 2 minutos, desde $10/mes). Si te interesa, te paso el link sin compromiso. Si no aplica, sin problema y gracias por tu tiempo.`,
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
 * Guardia del mensaje de APERTURA: jamás enlaces, adjuntos, emojis, ni
 * palabras crypto (USDC/bitcoin/blockchain) — el pago se menciona recién
 * en el mensaje 2. También rechaza precios de "setup único" (modelo viejo).
 */
const PATRON_BLOQUEADO =
  /(https?:\/\/|www\.|wa\.me|\.pdf\b|\.docx?\b|\.xlsx?\b|\.zip\b|\.png\b|\.jpe?g\b|\.webp\b|\.gif\b|📎|⬇|adjunto|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]|crypto|criptomoned|blockchain|descentraliz|bitcoin|\bbtc\b|usdt|usdc|stablecoin|token|nft|pago \u00fanico|setup)/iu;
export function esMensajeAperturaSeguro(texto: string): boolean {
  return texto.length > 0 && texto.length <= 600 && !PATRON_BLOQUEADO.test(texto);
}

/** ¿El texto contiene algún enlace? (usable para validar solo el mensaje 1). */
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

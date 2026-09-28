/**
 * LEAD SCORING — NUBE PRIVADA SOBERANA (IaaS, suscripción $10-$50/mes)
 * --------------------------------------------------------------------
 * Público PARA VELOCIDAD DE CONVERSIÓN: freelancers, creadores de contenido,
 * consultores independientes y pequeños negocios con datos sensibles
 * (estudios contables, abogados junior, clínicas pequeñas) SIN equipo IT.
 * EXCLUIR: grandes empresas/corporativos lentos y buscadores de dev custom.
 * La calidad de la web es irrelevante. Modelo 0-100.
 *
 * DOS MODOS:
 *   filter (DEFAULT) → entran giros sensibles/independientes bajo el umbral.
 *   rank             → no descarta a nadie (volumen), el score solo ordena.
 *
 * Config (.env):
 *   SCORE_MODO        = "filter" | "rank"   (default: filter)
 *   SCORE_RATING_MIN  = rating de referencia (4.0)
 *   SCORE_RESENAS_MIN = reseñas de referencia (10)
 *   SCORE_MINIMO      = puntaje mínimo para entrar (45)
 */
import "dotenv/config";

export type TierLead = "top" | "alta" | "media" | "baja";

export interface ScoringResult {
  score: number;
  tier: TierLead;
  pasa_filtro: boolean;
  motivo: string;
}

export interface DatosReputacion {
  rating: number;
  reseñas: number;
  tiene_web: boolean;
  web_deficiente: boolean;
  /** True si el giro maneja datos sensibles (nicho objetivo del nuevo objetivo). */
  giro_sensible: boolean;
  /** True si es profesional independiente (freelancer/creador): conversión rápida. */
  giro_independiente?: boolean;
}

/** Giros OBJETIVO: manejan información confidencial de clientes. */
export const GIROS_SENSIBLES = [
  "abogad", "legal", "juridic", "notar", "herencia", "legaliz",
  "contad", "contabl", "auditor", "fiscal", "tribut", "impuesto", "despacho",
  "clinica", "consultori", "medic", "salud", "psicolog", "paciente", "historial",
  "dental", "optometr", "laboratori", "medico",
  "seguros", "inmobiliar", "consultor", "arquitect", "ingenier", "topograf", "actuar",
];

/** Profesionales independientes (freelancers/creadores): pagan rápido, sin comité. */
export const GIROS_INDEPENDIENTES = [
  "fotograf", "video", "filma", "diseñador", "disenador", "grafic", "creador", "community",
  "redactor", "writer", "traduct", "intérprete", "interprete", "nutricion", "entrenad",
  "coach", "tutor", "profesor particular", "guia", "tour", "artesano", "joyero",
  "esteticista", "maquillaj", "tatua", "barber", "peluquer",
];

/** EXCLUIDOS por política: retail/gastro/marketing + corporativos lentos. */
export const GIROS_EXCLUIDOS = [
  "restaurant", "comida", "cafeter", "panader", "bar ", "pub", "discotec",
  "tienda", "supermercado", "abarrotes", "minimarket", "boutique", "ropa", "zapater",
  "marketing", "publicidad", "agencia de publicidad", "redes sociales",
  "salon de belleza", "barberia", "gimnasio", "mascota", "veterinari",
  "repuestos", "llantas", "taller", "ferreteria", "construccion", "materiales",
  // Corporativos/cajas lentas: cadena, banco, aseguradora grande, mayorista.
  "banco", "cadena", "mayorista", "corporativo", "cooperativa", "mutual", "financiera", "cambiaria",
];

function normaliza(tipo: string): string {
  return (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function esGiroSensible(tipo: string): boolean {
  const t = normaliza(tipo);
  return GIROS_SENSIBLES.some((g) => t.includes(g));
}

export function esGiroIndependiente(tipo: string): boolean {
  const t = normaliza(tipo);
  return GIROS_INDEPENDIENTES.some((g) => t.includes(g));
}

export function esGiroExcluido(tipo: string): boolean {
  const t = normaliza(tipo);
  return GIROS_EXCLUIDOS.some((g) => t.includes(g));
}

/** Alias de compatibilidad (scraper legado googlemaps.ts). */
export const esGiroTradicional = esGiroSensible;

const RATING_MIN = Number(process.env.SCORE_RATING_MIN || 4.0);
const RESENAS_MIN = Number(process.env.SCORE_RESENAS_MIN || 10);
const SCORE_MINIMO = Number(process.env.SCORE_MINIMO || 45);
// Proxy de "corporativo grande/lento": demasiadas reseñas = empresa con comité de compras.
const RESENAS_MAX = Number(process.env.SCORE_RESENAS_MAX || 600);
const SCORE_MODO = (process.env.SCORE_MODO || "filter").toLowerCase();

export const SCORE_UMBRALES = { RATING_MIN, RESENAS_MIN, SCORE_MINIMO, RESENAS_MAX, SCORE_MODO };

/**
 * Calcula el puntaje. Reglas del modelo de suscripción:
 *  - Giro EXCLUIDO (retail/gastro/marketing/corporativo) → 0 pts, fuera.
 *  - RESENAS > umbral (compra corporativa lenta) → fuera del filtro.
 *  - Giro sensible (+50) o independiente (+45, paga sin comité) | neutro (+0).
 *  - Rating: >=4.5 (+20) | >=4.0 (+12) | >=3.5 (+6).
 *  - Reseñas (cartera activa, pero no corporativo):
 *    >=200 (+15) | >=100 (+12) | >=10 (+10) | >=1 (+5).
 *  - Web propia (+5). La web NO filtra; el tamaño excesivo sí.
 */
export function calcularScore(d: DatosReputacion, giroTexto = ""): ScoringResult {
  if (esGiroExcluido(giroTexto)) {
    return { score: 0, tier: "baja", pasa_filtro: false, motivo: "Excluido: retail/gastro/marketing/corporativo" };
  }
  if (d.reseñas > RESENAS_MAX) {
    return { score: 0, tier: "baja", pasa_filtro: false, motivo: `Corporativo lento: ${d.reseñas} reseñas (decisiones con comité)` };
  }

  const motivos: string[] = [];
  let score = 0;

  if (d.giro_independiente || esGiroIndependiente(giroTexto)) {
    score += 45;
    motivos.push("Independiente: decide y paga sin comité");
  } else if (d.giro_sensible) {
    score += 50;
    motivos.push("Maneja datos sensibles");
  } else {
    motivos.push("Giro sin datos sensibles");
  }

  if (d.rating >= 4.5) {
    score += 20;
    motivos.push(`Rating ${d.rating.toFixed(1)}★`);
  } else if (d.rating >= RATING_MIN) {
    score += 12;
    motivos.push(`Rating ${d.rating.toFixed(1)}★`);
  } else if (d.rating >= 3.5) {
    score += 6;
    motivos.push(`Rating ${d.rating.toFixed(1)}★`);
  } else {
    motivos.push(`Rating ${d.rating ? d.rating.toFixed(1) : "s/d"}★`);
  }

  if (d.reseñas >= 200) {
    score += 12;
    motivos.push(`${d.reseñas} clientes reseñan`);
  } else if (d.reseñas >= 100) {
    score += 12;
    motivos.push(`${d.reseñas} clientes reseñan`);
  } else if (d.reseñas >= RESENAS_MIN) {
    score += 10;
    motivos.push(`${d.reseñas} clientes reseñan`);
  } else if (d.reseñas >= 1) {
    score += 5;
    motivos.push(`${d.reseñas} clientes reseñan`);
  }

  if (d.tiene_web) {
    score += 5;
    motivos.push("Negocio establecido");
  }

  const tier: TierLead = score >= 80 ? "top" : score >= 65 ? "alta" : score >= SCORE_MINIMO ? "media" : "baja";
  // Conversión por velocidad: independientes y giros sensibles pequeños entran
  // primero; los neutros solo en modo rank. No exigimos rating (abogados serios
  // tienen pocas reseñas).
  const objetivoDirecto = d.giro_sensible || d.giro_independiente || esGiroIndependiente(giroTexto);
  const pasa_filtro =
    SCORE_MODO === "rank"
      ? !esGiroExcluido(giroTexto) && d.reseñas <= RESENAS_MAX
      : objetivoDirecto && score >= SCORE_MINIMO;
  return { score, tier, pasa_filtro, motivo: motivos.join(" · ") };
}

/** Orden descendente por puntaje: los mejores leads primero. */
export function ordenarPorScore<T extends { lead_score?: number }>(prospectos: T[]): T[] {
  return [...prospectos].sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0));
}

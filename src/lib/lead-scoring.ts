/**
 * LEAD SCORING — prioriza negocios tradicionales con buena reputación
 * pero SIN presencia web (o con web deficiente). Modelo 0-100.
 *
 * DOS MODOS:
 *   rank (DEFAULT)  → el score SOLO ORDENA (mejores primero). No se descarta
 *                     a nadie: todos los que tengan teléfono válido y no tengan
 *                     web buena entran, para mantener VOLUMEN de trabajo.
 *   filter          → modo estricto: solo entran los que pasan los umbrales.
 *
 * Config (.env):
 *   SCORE_MODO        = "rank" | "filter"   (default: rank)
 *   SCORE_RATING_MIN  = rating de referencia (4.0)
 *   SCORE_RESENAS_MIN = reseñas de referencia (15)
 *   SCORE_MINIMO      = puntaje que separa tier "media" de "baja" (45)
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
  giro_tradicional: boolean;
}

/** GiroS objetivo: negocios tradicionales/operativos (volumen de $300 + upsell B2B). */
export const GIROS_TRADICIONALES = [
  "agro", "agricol", "agropecu", "agroind", "ganader", "riego", "semilla", "insumos",
  "logistic", "transporte", "encomienda", "aduanas", "carga", "flete", "mudanza",
  "construccion", "construct", "ingenieria", "concreto", "asfalto", "maquinaria",
  "ferreteria", "servicios", "electric", "plomeria", "topografia", "seguridad",
];

export function esGiroTradicional(tipo: string): boolean {
  const t = (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return GIROS_TRADICIONALES.some((g) => t.includes(g));
}

const RATING_MIN = Number(process.env.SCORE_RATING_MIN || 4.0);
const RESENAS_MIN = Number(process.env.SCORE_RESENAS_MIN || 15);
const SCORE_MINIMO = Number(process.env.SCORE_MINIMO || 45);
const SCORE_MODO = (process.env.SCORE_MODO || "rank").toLowerCase();

export const SCORE_UMBRALES = { RATING_MIN, RESENAS_MIN, SCORE_MINIMO, SCORE_MODO };

/**
 * Calcula el puntaje. Regla de negocio:
 *  - Con web propia EN BUEN estado  → NO es lead (0 pts).
 *  - Sin web propia (+45) | web deficiente (+25).
 *  - Rating: >=4.5 (+25) | >=4.0 (+15) | >=3.5 (+8) | resto (+0).
 *  - Reseñas: >=200 (+15) | >=100 (+12) | >=15 (+10) | >=1 (+5) | 0 (+0).
 *  - Giro tradicional (+15).
 * En modo "rank" NADIE se descarta por reputación (solo se ordena); en modo
 * "filter" solo pasan los que cumplen los umbrales.
 */
export function calcularScore(d: DatosReputacion): ScoringResult {
  if (d.tiene_web && !d.web_deficiente) {
    return { score: 0, tier: "baja", pasa_filtro: false, motivo: "Ya tiene web propia en buen estado" };
  }

  const motivos: string[] = [];
  let score = 0;
  if (!d.tiene_web) {
    score += 45;
    motivos.push("Sin web propia");
  } else {
    score += 25;
    motivos.push("Web deficiente");
  }

  if (d.rating >= 4.5) {
    score += 25;
    motivos.push(`Rating ${d.rating.toFixed(1)}★`);
  } else if (d.rating >= RATING_MIN) {
    score += 15;
    motivos.push(`Rating ${d.rating.toFixed(1)}★`);
  } else if (d.rating >= 3.5) {
    score += 8;
    motivos.push(`Rating ${d.rating.toFixed(1)}★`);
  } else {
    motivos.push(`Rating ${d.rating ? d.rating.toFixed(1) : "s/d"}★`);
  }

  if (d.reseñas >= 200) {
    score += 15;
    motivos.push(`${d.reseñas} reseñas`);
  } else if (d.reseñas >= 100) {
    score += 12;
    motivos.push(`${d.reseñas} reseñas`);
  } else if (d.reseñas >= RESENAS_MIN) {
    score += 10;
    motivos.push(`${d.reseñas} reseñas`);
  } else if (d.reseñas >= 1) {
    score += 5;
    motivos.push(`${d.reseñas} reseñas`);
  } else {
    motivos.push(`${d.reseñas ?? 0} reseñas`);
  }

  if (d.giro_tradicional) {
    score += 15;
    motivos.push("Giro tradicional");
  }

  const tier: TierLead = score >= 85 ? "top" : score >= 65 ? "alta" : score >= SCORE_MINIMO ? "media" : "baja";
  const pasa_filtro =
    SCORE_MODO !== "filter"
      ? true
      : score >= SCORE_MINIMO && d.rating >= RATING_MIN && d.reseñas >= RESENAS_MIN;
  return { score, tier, pasa_filtro, motivo: motivos.join(" · ") };
}

/** Orden descendente por puntaje: los mejores leads primero. */
export function ordenarPorScore<T extends { lead_score?: number }>(prospectos: T[]): T[] {
  return [...prospectos].sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0));
}

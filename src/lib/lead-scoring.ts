/**
 * LEAD SCORING — prioriza negocios tradicionales con buena reputación
 * pero SIN presencia web (o con web deficiente). Modelo 0-100.
 *
 * Config (.env):
 *   SCORE_RATING_MIN  = rating mínimo para entrar al embudo (4.0)
 *   SCORE_RESENAS_MIN = reseñas mínimas para entrar al embudo (50)
 *   SCORE_MINIMO      = puntaje mínimo para aceptar el lead (45)
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
const RESENAS_MIN = Number(process.env.SCORE_RESENAS_MIN || 50);
const SCORE_MINIMO = Number(process.env.SCORE_MINIMO || 45);

export const SCORE_UMBRALES = { RATING_MIN, RESENAS_MIN, SCORE_MINIMO };

/**
 * Calcula el puntaje. Regla de negocio:
 *  - Con web propia EN BUEN estado  → se descarta (0 pts, no pasa).
 *  - Sin web propia (+45) | web deficiente (+25).
 *  - Rating: >=4.5 (+25) | >=4.0 (+15) | <4.0 → descarta.
 *  - Reseñas: >=200 (+15) | >=100 (+12) | >=50 (+10) | <50 → descarta.
 *  - Giro tradicional (+15).
 */
export function calcularScore(d: DatosReputacion): ScoringResult {
  const motivos: string[] = [];

  if (d.tiene_web && !d.web_deficiente) {
    return { score: 0, tier: "baja", pasa_filtro: false, motivo: "Ya tiene web propia en buen estado" };
  }

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
  } else {
    return { score, tier: "baja", pasa_filtro: false, motivo: `Rating bajo (${d.rating ?? "s/d"})` };
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
  } else {
    return { score, tier: "baja", pasa_filtro: false, motivo: `Pocas reseñas (${d.reseñas ?? 0})` };
  }

  if (d.giro_tradicional) {
    score += 15;
    motivos.push("Giro tradicional");
  }

  const tier: TierLead = score >= 70 ? "top" : score >= 55 ? "alta" : score >= SCORE_MINIMO ? "media" : "baja";
  const pasa_filtro = score >= SCORE_MINIMO && d.rating >= RATING_MIN && d.reseñas >= RESENAS_MIN;
  return { score, tier, pasa_filtro, motivo: motivos.join(" · ") };
}

/** Orden descendente por puntaje: los mejores leads primero. */
export function ordenarPorScore<T extends { lead_score?: number }>(prospectos: T[]): T[] {
  return [...prospectos].sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0));
}

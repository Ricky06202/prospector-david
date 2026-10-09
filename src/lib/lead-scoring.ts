/**
 * LEAD SCORING — NUBE PRIVADA CIFRADA ($50 USDC, pago único)
 * ----------------------------------------------------------
 * Prioriza negocios que MANEJAN DATOS SENSIBLES: abogados, contadores,
 * clínicas/consultorios, consultores y pequeños negocios con información
 * confidencial. La calidad de su web es IRRELEVANTE para este producto.
 * Modelo 0-100.
 *
 * DOS MODOS:
 *   filter (DEFAULT) → entran solo giros sensibles que superan el umbral.
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
}

/** Giros OBJETIVO: manejan información confidencial de clientes. */
export const GIROS_SENSIBLES = [
  "abogad", "legal", "juridic", "notar", "herencia", "legaliz",
  "contad", "contabl", "auditor", "fiscal", "tribut", "impuesto", "despacho",
  "clinica", "consultori", "medic", "salud", "psicolog", "paciente", "historial",
  "dental", "optometr", "laboratori", "medico",
  "seguros", "inmobiliar", "consultor", "arquitect", "ingenier", "topograf", "actuar",
];

/** EXCLUIDOS por política: retail, gastronomía, tiendas, marketing. */
export const GIROS_EXCLUIDOS = [
  "restaurant", "comida", "cafeter", "panader", "bar ", "pub", "discotec",
  "tienda", "supermercado", "abarrotes", "minimarket", "boutique", "ropa", "zapater",
  "marketing", "publicidad", "agencia de publicidad", "redes sociales",
  "salon de belleza", "barberia", "gimnasio", "mascota", "veterinari",
  "repuestos", "llantas", "taller", "ferreteria", "construccion", "materiales",
];

function normaliza(tipo: string): string {
  return (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function esGiroSensible(tipo: string): boolean {
  const t = normaliza(tipo);
  return GIROS_SENSIBLES.some((g) => t.includes(g));
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
const SCORE_MODO = (process.env.SCORE_MODO || "filter").toLowerCase();

export const SCORE_UMBRALES = { RATING_MIN, RESENAS_MIN, SCORE_MINIMO, SCORE_MODO };

/**
 * Calcula el puntaje. Reglas del nuevo objetivo:
 *  - Giro EXCLUIDO (retail/gastro/marketing) → 0 pts, fuera.
 *  - Giro sensible (+50) | giro neutro (+0, solo entra en modo rank).
 *  - Rating (proxy de cartera activa): >=4.5 (+20) | >=4.0 (+12) | >=3.5 (+6).
 *  - Reseñas (proxy de cantidad de clientes = cantidad de datos):
 *    >=200 (+15) | >=100 (+12) | >=10 (+10) | >=1 (+5).
 *  - Web propia (+5): negocio establecido = puede pagar. La web YA NO filtra.
 */
export function calcularScore(d: DatosReputacion, giroTexto = ""): ScoringResult {
  if (esGiroExcluido(giroTexto)) {
    return { score: 0, tier: "baja", pasa_filtro: false, motivo: "Excluido: retail/gastro/marketing (no maneja datos sensibles)" };
  }

  const motivos: string[] = [];
  let score = 0;

  if (d.giro_sensible) {
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
    score += 15;
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
  // OJO: no exigimos rating mínimo — muchos abogados/contadores serios tienen
  // pocas reseñas. El giro sensible + el umbral de score ya filtran bastante.
  const pasa_filtro =
    SCORE_MODO === "rank"
      ? !esGiroExcluido(giroTexto)
      : d.giro_sensible && score >= SCORE_MINIMO;
  return { score, tier, pasa_filtro, motivo: motivos.join(" · ") };
}

/** Orden descendente por puntaje: los mejores leads primero. */
export function ordenarPorScore<T extends { lead_score?: number }>(prospectos: T[]): T[] {
  return [...prospectos].sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0));
}

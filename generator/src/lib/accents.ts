export interface Accent {
  label: string;
  base: string;
  dark: string;
  soft: string;
}

/** Mapa de identidad de marca: color_accent -> paleta. */
export const ACCENTS: Record<string, Accent> = {
  teal: { label: "teal", base: "#0d9488", dark: "#0f766e", soft: "#ccfbf1" },
  orange: { label: "orange", base: "#ea580c", dark: "#c2410c", soft: "#ffedd5" },
  red: { label: "red", base: "#dc2626", dark: "#b91c1c", soft: "#fee2e2" },
  blue: { label: "blue", base: "#2563eb", dark: "#1d4ed8", soft: "#dbeafe" },
  cyan: { label: "cyan", base: "#0891b2", dark: "#0e7490", soft: "#cffafe" },
  rose: { label: "rose", base: "#e11d48", dark: "#be123c", soft: "#ffe4e6" },
  pink: { label: "pink", base: "#db2777", dark: "#be185d", soft: "#fce7f3" },
  sky: { label: "sky", base: "#0284c7", dark: "#0369a1", soft: "#e0f2fe" },
  amber: { label: "amber", base: "#d97706", dark: "#b45309", soft: "#fef3c7" },
  green: { label: "green", base: "#16a34a", dark: "#15803d", soft: "#dcfce7" },
  violet: { label: "violet", base: "#7c3aed", dark: "#6d28d9", soft: "#ede9fe" },
  slate: { label: "slate", base: "#475569", dark: "#334155", soft: "#e2e8f0" },
};

export const ACCENT_DEFAULT: Accent = ACCENTS.teal;

export function accentDe(key: string | undefined): Accent {
  return (key && ACCENTS[key]) || ACCENT_DEFAULT;
}

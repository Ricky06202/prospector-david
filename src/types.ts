export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Prospecto {
  /** Slug único (ej. "craft-cafe-david") — se usa en la ruta y en nombres de archivo. */
  id: string;
  nombre_negocio: string;
  tipo: string;
  direccion: string;
  coordenadas: Coordenadas;
  /** Número de WhatsApp con prefijo internacional obligatorio. */
  whatsapp: string;
  /** Correo del negocio (si se pudo extraer de CAMCHI, su web o el directorio). */
  email?: string;
  /** Clave de color para la identidad de marca (ver ACCENTS en el generador). */
  color_accent: string;
  /** true si el negocio ya revela tener sitio web propio (filtro "a ciegas digitales"). */
  tiene_web?: boolean;
  /** URL del sitio web propio detectado (para analizar su calidad). */
  web?: string;
  /** true si la web propia existe pero es deficiente (sin viewport móvil, casi vacía o caída). */
  web_deficiente?: boolean;
  /** Calificación promedio en Google (0-5). */
  rating?: number;
  /** Cantidad de reseñas en Google. */
  reseñas?: number;
  /** Puntaje de lead scoring 0-100 (Lead Scoring). */
  lead_score?: number;
  /** Categoría del puntaje. */
  tier_lead?: "top" | "alta" | "media" | "baja";
  /** Motivo legible del puntaje (para revisión humana). */
  scoring_motivo?: string;
  /** Logo del negocio (URL pública o base64 data-URI) para inyectar en el prototipo. */
  logo?: string;
  /** Tagline personalizado para el prototipo (sobreescribe el genérico por giro). */
  tagline?: string;
  /** Plan de mantenimiento recurrente (si el cliente lo tiene contratado). */
  mantenimiento?: {
    plan: "mensual" | "trimestral" | "semestral";
    vence: string; // ISO
  };
  /** Estado de prospección: nuevo | en_cola | enviado | seguimiento | no_interesado | reagendar | interesado | cliente. */
  estado?: string;
  /** A qué embudo pertenece: "landing" ($300, sin web) | "upsell" (dashboard $1,200, ya tiene web buena). */
  tipo_lead?: "landing" | "upsell";
  /** Fecha de envío (ISO) cuando estado === "enviado". */
  enviado_en?: string;
  /** Última vez que se contactó al negocio (envío o seguimiento). */
  ultimo_contacto?: string;
  /** Timestamp de creación (ISO). */
  creado_en?: string;
}

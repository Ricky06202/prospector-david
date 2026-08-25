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
  /** Clave de color para la identidad de marca (ver ACCENTS en el generador). */
  color_accent: string;
  /** true si el negocio ya revela tener sitio web propio (filtro "a ciegas digitales"). */
  tiene_web?: boolean;
  /** Estado de prospección: nuevo | en_cola | enviado | no_interesado | reagendar. */
  estado?: string;
  /** Fecha de envío (ISO) cuando estado === "enviado". */
  enviado_en?: string;
  /** Timestamp de creación (ISO). */
  creado_en?: string;
}

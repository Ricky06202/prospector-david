/**
 * Cotizador: precios configurables y generación de cotizaciones.
 * Los precios se ajustan por env (PRECIO_*); por defecto valores sugeridos.
 */
import "dotenv/config";

export const PRECIOS = {
  landing: Number(process.env.PRECIO_LANDING || 300),
  catalogoBase: Number(process.env.PRECIO_CATALOGO_BASE || 400),
  porProducto: Number(process.env.PRECIO_POR_PRODUCTO || 2),
  ecommerce: Number(process.env.PRECIO_ECOMMERCE || 800),
  mantenimiento: Number(process.env.PRECIO_MANTENIMIENTO || 25),
};

export type TipoProyecto = "landing" | "catalogo" | "ecommerce";

export interface Cotizacion {
  tipo: TipoProyecto;
  tipoLabel: string;
  base: number;
  productos: number;
  porProducto: number;
  mantenimiento: number;
  total: number;
}

export function cotizar(tipo: TipoProyecto, productos = 0, conMantenimiento = false): Cotizacion {
  let base: number;
  let tipoLabel: string;
  if (tipo === "landing") {
    base = PRECIOS.landing;
    tipoLabel = "Landing de presentación";
  } else if (tipo === "catalogo") {
    base = PRECIOS.catalogoBase + productos * PRECIOS.porProducto;
    tipoLabel = "Catálogo en línea + pedidos por WhatsApp";
  } else {
    base = PRECIOS.ecommerce;
    tipoLabel = "Tienda en línea con pagos";
  }
  return {
    tipo,
    tipoLabel,
    base,
    productos,
    porProducto: PRECIOS.porProducto,
    mantenimiento: conMantenimiento ? PRECIOS.mantenimiento : 0,
    total: base,
  };
}

/** Texto de cotización listo para enviar (desglose claro, sin ambigüedades). */
export function textoCotizacion(
  nombreNegocio: string,
  tipo: TipoProyecto,
  productos: number,
  conMantenimiento: boolean
): string {
  const c = cotizar(tipo, productos, conMantenimiento);
  const lineas: string[] = [
    `📋 Cotización · ${nombreNegocio}`,
    ``,
    `Proyecto: ${c.tipoLabel}`,
  ];
  if (tipo === "catalogo") {
    lineas.push(`Base del catálogo: B/. ${PRECIOS.catalogoBase.toFixed(2)}`);
    lineas.push(`Productos a publicar (${productos} × B/. ${PRECIOS.porProducto.toFixed(2)}): B/. ${(productos * PRECIOS.porProducto).toFixed(2)}`);
  } else {
    lineas.push(`Valor base: B/. ${c.base.toFixed(2)}`);
  }
  lineas.push(`————————————`);
  lineas.push(`TOTAL: B/. ${c.total.toFixed(2)} (pago único)`);
  lineas.push(``);
  lineas.push(`Incluye: dominio propio, alojamiento, diseño a medida y botón de WhatsApp.`);
  if (conMantenimiento) {
    lineas.push(`Mantenimiento mensual: B/. ${c.mantenimiento.toFixed(2)}/mes (contenido actualizado, soporte y optimización).`);
  } else {
    lineas.push(`Opcional: mantenimiento mensual por B/. ${c.mantenimiento.toFixed(2)}/mes para mantener todo actualizado.`);
  }
  lineas.push(`Plazos y detalles se confirman en una llamada breve. ¡Saludos!`);
  return lineas.join("\n");
}

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

/** HTML de cotización con marca (para el PDF) — limpio y profesional. */
export function htmlCotizacion(nombreNegocio: string, tipo: TipoProyecto, productos: number, conMantenimiento: boolean, fecha: string): string {
  const c = cotizar(tipo, productos, conMantenimiento);
  const filas: string[] = [
    `<tr><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#334155">Proyecto</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:700;text-align:right;color:#0f172a">${c.tipoLabel}</td></tr>`,
  ];
  if (tipo === "catalogo") {
    filas.push(
      `<tr><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#334155">Base del catálogo</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f172a">B/. ${PRECIOS.catalogoBase.toFixed(2)}</td></tr>`,
      `<tr><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#334155">Productos (${productos} × B/. ${PRECIOS.porProducto.toFixed(2)})</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f172a">B/. ${(productos * PRECIOS.porProducto).toFixed(2)}</td></tr>`
    );
  }
  if (conMantenimiento) {
    filas.push(`<tr><td style="padding:10px 14px;color:#334155">Mantenimiento mensual</td><td style="padding:10px 14px;text-align:right;color:#0f172a">B/. ${PRECIOS.mantenimiento.toFixed(2)} /mes</td></tr>`);
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    body{margin:0;color:#0f172a}
    .top{background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;padding:28px 36px}
    .top h1{margin:0;font-size:24px;font-weight:800}
    .top p{margin:4px 0 0;color:#ccfbf1;font-size:13px}
    .body{padding:30px 36px}
    .titulo{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #0d9488;padding-bottom:12px}
    .titulo h2{margin:0;font-size:18px;font-weight:800}
    .titulo span{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
    .total td{font-weight:800;font-size:18px;color:#0d9488;padding-top:14px}
    .nota{margin-top:20px;padding:14px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:12px;color:#134e4a}
    .foot{margin-top:28px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
  </style></head><body>
    <div class="top"><h1>Cotización</h1><p>Desarrollo web · David, Chiriquí</p></div>
    <div class="body">
      <div class="titulo"><h2>${nombreNegocio}</h2><span>${fecha}</span></div>
      <table>
        ${filas.join("\n")}
        <tr class="total"><td>TOTAL</td><td style="text-align:right">B/. ${c.total.toFixed(2)}</td></tr>
      </table>
      <div class="nota"><b>Incluye:</b> dominio propio, alojamiento, diseño a medida y botón directo de WhatsApp.${conMantenimiento ? "" : " Mantenimiento mensual opcional: B/. " + PRECIOS.mantenimiento.toFixed(2) + "/mes."}<br>Plazos y detalles se confirman en una llamada breve.</div>
      <div class="foot">Cotización sin compromiso · Válida por 15 días · Ricardo Sanjur · WhatsApp 6510-4147</div>
    </div>
  </body></html>`;
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

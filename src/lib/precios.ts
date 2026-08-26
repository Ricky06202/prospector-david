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
  const fila = (nombre: string, monto: number, destacado = false) =>
    `<tr${destacado ? ' style="background:#f0fdfa"' : ""}><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${nombre}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">B/. ${monto.toFixed(2)}</td></tr>`;

  const filas =
    tipo === "catalogo"
      ? fila("Base del catálogo", PRECIOS.catalogoBase) +
        fila(`Publicación de ${productos} productos`, productos * PRECIOS.porProducto)
      : fila("Proyecto", c.base);

  const mantTexto = conMantenimiento
    ? `<div style="margin-top:12px;font-size:12px;color:#64748b">Mantenimiento mensual incluido: <b style="color:#0f172a">B/. ${PRECIOS.mantenimiento.toFixed(2)}/mes</b></div>`
    : `<div style="margin-top:12px;font-size:12px;color:#64748b">Mantenimiento opcional: <b style="color:#0f172a">B/. ${PRECIOS.mantenimiento.toFixed(2)}/mes</b> para mantener la página actualizada.</div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
    body{margin:0;color:#0f172a}
    .brand{background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;padding:20px 40px;display:flex;justify-content:space-between;align-items:center}
    .brand .t{font-weight:800;font-size:15px;letter-spacing:.02em}
    .brand .s{font-size:11px;color:#ccfbf1}
    .brand .n{font-size:11px;color:#ccfbf1;text-align:right;line-height:1.5}
    .body{padding:30px 40px}
    .cabeza{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:2px solid #0d9488}
    .neg{font-size:20px;font-weight:800;letter-spacing:-.01em}
    .tipo{color:#64748b;font-size:12px;margin-top:3px}
    .fecha{font-size:12px;color:#64748b}
    .total-box{background:#0d9488;color:#fff;border-radius:14px;padding:16px 24px;margin:20px 0;display:flex;justify-content:space-between;align-items:center}
    .total-box .lbl{font-size:11px;color:#ccfbf1;text-transform:uppercase;letter-spacing:.1em}
    .total-box .val{font-size:32px;font-weight:800;letter-spacing:-.02em}
    .total-box .nota{font-size:11px;color:#ccfbf1;background:transparent;border:none;padding:0;margin:0}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:8px 16px;border-bottom:1px solid #e2e8f0}
    th.m{text-align:right}
    .nota{margin-top:18px;padding:14px 16px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:12px;color:#134e4a;line-height:1.6}
    .foot{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="brand">
      <div><div class="t">Cotización</div><div class="s">Desarrollo web · David, Chiriquí</div></div>
      <div class="n">Ricardo Sanjur<br>WhatsApp 6510-4147</div>
    </div>
    <div class="body">
      <div class="cabeza">
        <div><div class="neg">${nombreNegocio}</div><div class="tipo">${c.tipoLabel}</div></div>
        <div class="fecha">${fecha}</div>
      </div>
      <div class="total-box">
        <div><div class="lbl">Total · pago único</div><div class="nota">${c.tipoLabel}</div></div>
        <div class="val">B/. ${c.total.toFixed(2)}</div>
      </div>
      <table><thead><tr><th>Concepto</th><th class="m">Monto</th></tr></thead><tbody>
        ${filas}
      </tbody></table>
      ${mantTexto}
      <div class="nota"><b>Incluye:</b> dominio propio, alojamiento, diseño a medida y botón directo de WhatsApp. Plazos y detalles se confirman en una llamada breve.</div>
      <div class="foot"><span>Cotización sin compromiso · Válida por 15 días</span><span>Ricardo Sanjur · WhatsApp 6510-4147</span></div>
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

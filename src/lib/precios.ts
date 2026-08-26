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
  mantenimientoTrimestral: Number(process.env.PRECIO_MANT_TRIMESTRAL || 60),
  mantenimientoSemestral: Number(process.env.PRECIO_MANT_SEMESTRAL || 100),
};

export type PlanMantenimiento = "mensual" | "trimestral" | "semestral";
export type TipoProyecto = "landing" | "catalogo" | "ecommerce" | "mantenimiento";

export const PLANES: Record<PlanMantenimiento, { dias: number; precio: number; label: string }> = {
  mensual: { dias: 30, precio: PRECIOS.mantenimiento, label: "Mensual" },
  trimestral: { dias: 90, precio: PRECIOS.mantenimientoTrimestral, label: "Trimestral" },
  semestral: { dias: 180, precio: PRECIOS.mantenimientoSemestral, label: "Semestral" },
};

export interface Cotizacion {
  tipo: TipoProyecto;
  tipoLabel: string;
  baseProyecto: number;
  productos: number;
  plan: string; // "sin" | PlanMantenimiento
  planInfo: { label: string; precio: number; dias: number } | null;
  total: number;
}

/** Calcula la cotización: proyecto + plan de mantenimiento (si lo hay) = TOTAL INICIAL. */
export function cotizar(tipo: TipoProyecto, productos = 0, plan = "sin"): Cotizacion {
  let baseProyecto = 0;
  let tipoLabel: string;
  if (tipo === "landing") {
    baseProyecto = PRECIOS.landing;
    tipoLabel = "Landing de presentación";
  } else if (tipo === "catalogo") {
    baseProyecto = PRECIOS.catalogoBase + productos * PRECIOS.porProducto;
    tipoLabel = "Catálogo en línea + pedidos por WhatsApp";
  } else if (tipo === "ecommerce") {
    baseProyecto = PRECIOS.ecommerce;
    tipoLabel = "Tienda en línea con pagos";
  } else {
    tipoLabel = "Mantenimiento recurrente";
  }
  const planInfo = plan !== "sin" && PLANES[plan] ? PLANES[plan] : null;
  const total = baseProyecto + (planInfo ? planInfo.precio : 0);
  return { tipo, tipoLabel, baseProyecto, productos, porProducto: PRECIOS.porProducto, plan, planInfo, total };
}

/** HTML de cotización con marca (para el PDF) — limpio y profesional. */
export function htmlCotizacion(nombreNegocio: string, tipo: TipoProyecto, productos: number, plan: string, fecha: string): string {
  const c = cotizar(tipo, productos, plan);
  const fila = (nombre: string, monto: number) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${nombre}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">B/. ${monto.toFixed(2)}</td></tr>`;

  const filas = tipo === "catalogo"
    ? fila("Base del catálogo", PRECIOS.catalogoBase) +
      fila(`Publicación de ${productos} productos`, productos * PRECIOS.porProducto)
    : tipo !== "mantenimiento"
      ? fila("Proyecto", c.baseProyecto)
      : "";
  const filaMant = c.planInfo ? fila(`Mantenimiento ${c.planInfo.label.toLowerCase()} — cubre ${c.planInfo.dias} días`, c.planInfo.precio) : "";

  const mantBloque = c.planInfo
    ? `<div style="margin-top:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:12px;color:#78350f;line-height:1.6">
        <b>Mantenimiento ${c.planInfo.label.toLowerCase()} · B/. ${c.planInfo.precio.toFixed(2)} — este pago cubre ${c.planInfo.dias} días de mantenimiento.</b>
        <ul style="margin:8px 0 0;padding-left:18px">
          <li>Actualización de contenido: precios, fotos, productos y promociones cuando lo necesites.</li>
          <li>Soporte técnico directo por WhatsApp.</li>
          <li>Respaldo y seguridad de tu página.</li>
          <li>Optimización de velocidad para que cargue rápido.</li>
        </ul>
      </div>`
    : tipo !== "mantenimiento"
      ? `<div style="margin-top:16px;padding:14px 16px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:12px;color:#134e4a;line-height:1.7">
          <b>Mantenimiento opcional</b> (contenido actualizado, soporte directo, respaldo y optimización):
          <div style="display:flex;gap:18px;margin-top:8px;flex-wrap:wrap">
            <span><b style="color:#0d9488">Mensual</b> · B/. ${PLANES.mensual.precio.toFixed(2)}</span>
            <span><b style="color:#0d9488">Trimestral</b> · B/. ${PLANES.trimestral.precio.toFixed(2)}</span>
            <span><b style="color:#0d9488">Semestral</b> · B/. ${PLANES.semestral.precio.toFixed(2)}</span>
          </div>
        </div>`
      : "";

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
        <div><div class="lbl">Total inicial · ${c.planInfo ? `incluye mantenimiento ${c.planInfo.label.toLowerCase()} (${c.planInfo.dias} días)` : "pago único"}</div><div class="nota">${c.tipoLabel}${c.planInfo ? " + mantenimiento" : ""}</div></div>
        <div class="val">B/. ${c.total.toFixed(2)}</div>
      </div>
      <table><thead><tr><th>Concepto</th><th class="m">Monto</th></tr></thead><tbody>
        ${filas}${filaMant}
      </tbody></table>
      ${mantBloque}
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
  plan: string
): string {
  const c = cotizar(tipo, productos, plan);
  const lineas: string[] = [
    `📋 Cotización · ${nombreNegocio}`,
    ``,
    `Proyecto: ${c.tipoLabel}`,
  ];
  if (tipo === "catalogo") {
    lineas.push(`Base del catálogo: B/. ${PRECIOS.catalogoBase.toFixed(2)}`);
    lineas.push(`Productos (${productos} × B/. ${PRECIOS.porProducto.toFixed(2)}): B/. ${(productos * PRECIOS.porProducto).toFixed(2)}`);
  } else if (tipo !== "mantenimiento") {
    lineas.push(`Valor del proyecto: B/. ${c.baseProyecto.toFixed(2)}`);
  }
  if (c.planInfo) {
    lineas.push(`Mantenimiento ${c.planInfo.label.toLowerCase()} — este pago cubre ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)}`);
  }
  lineas.push(`————————————`);
  lineas.push(`TOTAL INICIAL: B/. ${c.total.toFixed(2)}`);
  if (c.planInfo) {
    if (tipo === "mantenimiento") {
      lineas.push(`(${c.planInfo.label} por ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)})`);
    } else {
      lineas.push(`(Proyecto B/. ${c.baseProyecto.toFixed(2)} + mantenimiento ${c.planInfo.label.toLowerCase()} por ${c.planInfo.dias} días B/. ${c.planInfo.precio.toFixed(2)})`);
    }
    lineas.push(`Renovación del mantenimiento cada ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)}`);
  }
  lineas.push(``);
  if (tipo !== "mantenimiento") {
    lineas.push(`Incluye: dominio propio, alojamiento, diseño a medida y botón de WhatsApp.`);
  }
  if (c.planInfo) {
    lineas.push(`Mantenimiento incluye: contenido actualizado, soporte directo, respaldo y optimización.`);
  } else if (tipo !== "mantenimiento") {
    lineas.push(`Mantenimiento opcional (contenido actualizado, soporte, respaldo y optimización):`);
    lineas.push(`  › Mensual B/. ${PLANES.mensual.precio.toFixed(2)} · Trimestral B/. ${PLANES.trimestral.precio.toFixed(2)} · Semestral B/. ${PLANES.semestral.precio.toFixed(2)}`);
  }
  lineas.push(`Plazos y detalles se confirman en una llamada breve. ¡Saludos!`);
  return lineas.join("\n");
}

/**
 * Cotizador: precios configurables y generación de cotizaciones.
 * Los precios se ajustan por env (PRECIO_*); por defecto valores sugeridos.
 *
 * FUENTE ÚNICA DE PRECIOS:
 *   - PRECIOS: tarifas base configurables por env (compatibilidad con el motor).
 *   - PAQUETES: la oferta vigente por CONTEXTO de negocio (página web, catálogo,
 *     pedidos y pagos, inscripciones y pagos, reservas, portal de archivos y citas,
 *     mantenimiento y sistema a medida). Mismos precios publicados; no se tocaron.
 *   Se conserva el modo escalonado (Nivel 1 + Nivel 2) por compatibilidad.
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
  /** Nivel 2 del upsell institucional (desde). */
  plataforma: Number(process.env.PRECIO_PLATAFORMA || 1200),
};

/** Datos de la empresa matriz que respalda el Nivel 2 (autoridad + garantía). */
export const MATRIZ = {
  nombre: process.env.MATRIZ_NOMBRE || "Topografía Especializada S.A.",
  rubro: process.env.MATRIZ_RUBRO || "Empresa de ingeniería y desarrollo de software",
  ubicacion: process.env.MATRIZ_UBICACION || "David, Chiriquí · República de Panamá",
  garantia: process.env.MATRIZ_GARANTIA || "",
  contacto: process.env.MATRIZ_CONTACTO || "WhatsApp 6510-4147",
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
  porProducto?: number;
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
  const planInfo = plan !== "sin" && plan in PLANES ? PLANES[plan as PlanMantenimiento] : null;
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
    ? `<div style="margin-top:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:12px;color:#78350f;line-height:1.6">
        <b>Mantenimiento ${c.planInfo.label.toLowerCase()} · B/. ${c.planInfo.precio.toFixed(2)} — este pago cubre ${c.planInfo.dias} días de mantenimiento.</b>
        <ul style="margin:8px 0 0;padding-left:18px">
          <li>Actualización de contenido: precios, fotos, productos y promociones cuando lo necesites.</li>
          <li>Soporte técnico directo por WhatsApp.</li>
          <li>Respaldo y seguridad de tu página.</li>
          <li>Optimización de velocidad para que cargue rápido.</li>
        </ul>
      </div>`
    : tipo !== "mantenimiento"
      ? `<div style="margin-top:16px;padding:14px 16px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;font-size:12px;color:#155e75;line-height:1.7">
          <b>Mantenimiento opcional</b> (contenido actualizado, soporte directo, respaldo y optimización):
          <div style="display:flex;gap:18px;margin-top:8px;flex-wrap:wrap">
            <span><b style="color:#0891b2">Mensual</b> · B/. ${PLANES.mensual.precio.toFixed(2)}</span>
            <span><b style="color:#0891b2">Trimestral</b> · B/. ${PLANES.trimestral.precio.toFixed(2)}</span>
            <span><b style="color:#0891b2">Semestral</b> · B/. ${PLANES.semestral.precio.toFixed(2)}</span>
          </div>
        </div>`
      : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
    body{margin:0;background:#ffffff;color:#0f172a}
    .brand{background:linear-gradient(135deg,#2563EB,#06B6D4,#8B5CF6);color:#fff;padding:22px 40px;display:flex;justify-content:space-between;align-items:center}
    .brand .t{font-weight:800;font-size:16px;letter-spacing:.02em}
    .brand .s{font-size:11px;color:rgba(255,255,255,.9)}
    .brand .n{font-size:11px;color:rgba(255,255,255,.95);text-align:right;line-height:1.5}
    .body{padding:30px 40px}
    .cabeza{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:2px solid #06B6D4}
    .neg{font-size:20px;font-weight:800;letter-spacing:-.01em;color:#0f172a}
    .tipo{color:#64748b;font-size:12px;margin-top:3px}
    .fecha{font-size:12px;color:#64748b}
    .total-box{background:linear-gradient(120deg,#eff6ff,#ecfeff);border:1px solid #bfdbfe;color:#0f172a;border-radius:16px;padding:18px 24px;margin:20px 0;display:flex;justify-content:space-between;align-items:center}
    .total-box .lbl{font-size:11px;color:#0369a1;text-transform:uppercase;letter-spacing:.1em}
    .total-box .val{font-size:32px;font-weight:800;letter-spacing:-.02em;color:#0f172a}
    .total-box .nota{font-size:11px;color:#475569;background:transparent;border:none;padding:0;margin:0}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:8px 16px;border-bottom:1px solid #e2e8f0}
    th.m{text-align:right}
    .nota{margin-top:18px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:12px;color:#334155;line-height:1.6}
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
    `Cotización · ${nombreNegocio}`,
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

// =====================================================================
// COTIZACIÓN ESCALONADA (Nivel 1 + Nivel 2 / Upsell institucional)
// =====================================================================

export interface NivelUpsell {
  tipoLabel: string;
  desde: number;      // monto "desde"
  entrega: string;
  extras: string[];
}

export interface CotizacionEscalonada {
  nivel1: Cotizacion;                 // landing (apertura)
  nivel2: NivelUpsell;                // plataforma (upsell)
  totalNivel1: number;
  desdeNivel2: number;
}

/** Arma los dos niveles: Nivel 1 = landing con plan opcional; Nivel 2 = plataforma. */
export function cotizarEscalonada(productos = 0, plan = "sin"): CotizacionEscalonada {
  const nivel1 = cotizar("landing", 0, plan);
  return {
    nivel1,
    nivel2: {
      tipoLabel: "Plataforma Operativa / Dashboard a la Medida",
      desde: PRECIOS.plataforma,
      entrega: "Proyecto institucional · entrega estimada 3-5 semanas según alcance",
      extras: [
        "Panel de control para pedidos, citas o tareas del negocio desde el celular",
        "Reportes y métricas de ventas, inventario o producción en tiempo real",
        "Usuarios y permisos para tu equipo (según rol)",
        "Integración con WhatsApp, correo y tus herramientas actuales",
        "Capacitación del personal y soporte dedicado",
      ],
    },
    totalNivel1: nivel1.total,
    desdeNivel2: PRECIOS.plataforma,
  };
}

const GARANTIA_MATRIZ = [
  `Este proyecto se ejecuta bajo el paraguas y la garantía de ${MATRIZ.nombre} (${MATRIZ.rubro}, ${MATRIZ.ubicacion}).`,
  `Al contratar con nosotros, tu inversión queda respaldada por una empresa establecida, con contrato formal, facturación y acompañamiento durante toda la implementación.`,
];

/** Texto listo para WhatsApp del cotizador escalonado (los 2 niveles). */
export function textoCotizacionEscalonada(nombreNegocio: string, plan = "sin"): string {
  const c = cotizarEscalonada(0, plan);
  const n1 = c.nivel1;
  const lineas: string[] = [
    `Cotización en 2 niveles · ${nombreNegocio}`,
    `Ricardo Sanjur · Desarrollo web · David, Chiriquí · WhatsApp 6510-4147`,
    ``,
    `──────────────────────────`,
    `NIVEL 1 - APERTURA`,
    `Landing Page optimizada · entregable en 48 h`,
    `B/. ${PRECIOS.landing.toFixed(2)}`,
    ``,
    `  • Dominio propio, alojamiento, diseño a medida y botón directo de WhatsApp`,
  ];
  if (n1.planInfo) {
    lineas.push(`  • Mantenimiento ${n1.planInfo.label.toLowerCase()} — este pago cubre ${n1.planInfo.dias} días: B/. ${n1.planInfo.precio.toFixed(2)}`);
  } else {
    lineas.push(`  • Mantenimiento opcional (Mensual B/. ${PLANES.mensual.precio.toFixed(2)} · Trimestral B/. ${PLANES.trimestral.precio.toFixed(2)} · Semestral B/. ${PLANES.semestral.precio.toFixed(2)})`);
  }
  lineas.push(
    ``,
    `──────────────────────────`,
    `NIVEL 2 - UPSELL INSTITUCIONAL`,
    `${c.nivel2.tipoLabel} · desde B/. ${PRECIOS.plataforma.toLocaleString("es-PA")}.00`,
    `(${c.nivel2.entrega})`,
    ``
  );
  for (const e of c.nivel2.extras) lineas.push(`  • ${e}`);
  lineas.push(
    ``,
    `Si decides avanzar al Nivel 2 dentro de los siguientes 30 días de completado el Nivel 1, el monto pagado en el Nivel 1 (B/. ${PRECIOS.landing.toFixed(2)}) se descuenta del total del Nivel 2.`,
    ``,
    `MANTENIMIENTO OPCIONAL (aplica a cualquiera de los dos niveles)`,
    `Contenido actualizado, soporte directo, respaldo y optimización:`,
    `• Mensual B/. ${PLANES.mensual.precio.toFixed(2)} | Trimestral B/. ${PLANES.trimestral.precio.toFixed(2)} | Semestral B/. ${PLANES.semestral.precio.toFixed(2)}`,
  );
  if (n1.planInfo) {
    lineas.push(`Plan elegido: ${n1.planInfo.label} — este pago cubre ${n1.planInfo.dias} días: B/. ${n1.planInfo.precio.toFixed(2)}`);
  }
  lineas.push(
    ``,
    `FORMA DE PAGO: 50% de anticipo para iniciar el proyecto, 50% contra entrega.`,
    ``,
    `RESPALDO INSTITUCIONAL`,
    ...GARANTIA_MATRIZ,
    ``,
    `Cotización sin compromiso · Válida por 15 días`,
    `${MATRIZ.nombre} · ${MATRIZ.contacto}`,
  );
  return lineas.join("\n");
}

/** HTML para PDF del cotizador escalonado (marca + 2 niveles + garantía de la matriz). */
export function htmlCotizacionEscalonada(nombreNegocio: string, plan: string, fecha: string): string {
  const c = cotizarEscalonada(0, plan);
  const n1 = c.nivel1;
  const fila = (nombre: string, monto: string) =>
    `<tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${nombre}</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">${monto}</td></tr>`;

  const filasN1 = fila("Landing Page optimizada (entregable en 48 h)", `B/. ${PRECIOS.landing.toFixed(2)}`) +
    (n1.planInfo
      ? fila(`Mantenimiento ${n1.planInfo.label.toLowerCase()} — este pago cubre ${n1.planInfo.dias} días`, `B/. ${n1.planInfo.precio.toFixed(2)}`)
      : "");

  const extrasN2 = c.nivel2.extras
    .map((e) => `<li>${e}</li>`)
    .join("");

  const mantBloque = n1.planInfo
    ? `<div style="margin-top:14px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:12px;color:#78350f;line-height:1.6">
        <b>Mantenimiento ${n1.planInfo.label.toLowerCase()} · B/. ${n1.planInfo.precio.toFixed(2)} — este pago cubre ${n1.planInfo.dias} días.</b><br>
        Incluye: contenido actualizado (precios, fotos, productos), soporte directo, respaldo y optimización.
      </div>`
    : `<div style="margin-top:14px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:12px;color:#78350f;line-height:1.7">
        <b>Mantenimiento opcional</b> (aplica a cualquiera de los dos niveles) · contenido actualizado, soporte directo, respaldo y optimización:
        <div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">
          <span><b style="color:#b45309">Mensual</b> · B/. ${PLANES.mensual.precio.toFixed(2)} (30 días)</span>
          <span><b style="color:#b45309">Trimestral</b> · B/. ${PLANES.trimestral.precio.toFixed(2)} (90 días)</span>
          <span><b style="color:#b45309">Semestral</b> · B/. ${PLANES.semestral.precio.toFixed(2)} (180 días)</span>
        </div>
      </div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
    body{margin:0;background:#ffffff;color:#0f172a}
    .brand{background:linear-gradient(135deg,#2563EB,#06B6D4,#8B5CF6);color:#fff;padding:22px 40px;display:flex;justify-content:space-between;align-items:center}
    .brand .t{font-weight:800;font-size:16px;letter-spacing:.02em}
    .brand .s{font-size:11px;color:rgba(255,255,255,.9)}
    .brand .n{font-size:11px;color:rgba(255,255,255,.95);text-align:right;line-height:1.5}
    .body{padding:30px 40px}
    .cabeza{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:2px solid #06B6D4}
    .neg{font-size:20px;font-weight:800;letter-spacing:-.01em;color:#0f172a}
    .fecha{font-size:12px;color:#64748b}
    .nivel{border-radius:16px;padding:18px 22px;margin:16px 0;border:1px solid #dbeafe}
    .nivel h2{margin:0 0 4px;font-size:16px;font-weight:800;letter-spacing:-.01em;color:#0f172a}
    .nivel .precio{font-size:26px;font-weight:800;letter-spacing:-.02em}
    .nivel .sub{font-size:12px;color:#64748b;margin:2px 0 10px}
    .n1{background:linear-gradient(160deg,#ecfeff,#f0f9ff);border-color:#a5f3fc}
    .n2{background:linear-gradient(160deg,#eef2ff,#f5f3ff);border-color:#c7d2fe}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
    .extras{margin:10px 0 0;padding-left:20px;font-size:13px;color:#334155;line-height:1.7}
    .extras li{margin-bottom:4px}
    .credito{margin-top:12px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:12px;color:#78350f;line-height:1.6}
    .pago{margin-top:14px;padding:12px 16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;font-size:12px;color:#3730a3;line-height:1.6}
    .garantia{margin-top:14px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:12px;color:#334155;line-height:1.7}
    .garantia b{color:#0891b2}
    .foot{margin-top:22px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="brand">
      <div><div class="t">Cotización en 2 niveles</div><div class="s">Desarrollo web · David, Chiriquí</div></div>
      <div class="n">Ricardo Sanjur<br>WhatsApp 6510-4147</div>
    </div>
    <div class="body">
      <div class="cabeza">
        <div><div class="neg">${nombreNegocio}</div></div>
        <div class="fecha">${fecha}</div>
      </div>

      <div class="nivel n1">
        <h2>Nivel 1 · Apertura</h2>
        <div class="precio">B/. ${c.totalNivel1.toFixed(2)}</div>
        <div class="sub">Landing Page optimizada · entregable en 48 h</div>
        <table><tbody>${filasN1}</tbody></table>
      </div>

      <div class="nivel n2">
        <h2>Nivel 2 · Upsell institucional</h2>
        <div class="precio">Desde B/. ${PRECIOS.plataforma.toLocaleString("es-PA")}.00</div>
        <div class="sub">${c.nivel2.tipoLabel} · ${c.nivel2.entrega}</div>
        <ul class="extras">${extrasN2}</ul>
      </div>

      <div class="credito">Si decides avanzar al Nivel 2 dentro de los siguientes <b>30 días</b> de completado el Nivel 1, el monto pagado en el Nivel 1 (<b>B/. ${PRECIOS.landing.toFixed(2)}</b>) se descuenta del total del Nivel 2.</div>

      ${mantBloque}

      <div class="pago"><b>Forma de pago:</b> 50% de anticipo para iniciar el proyecto, 50% contra entrega.</div>

      <div class="garantia"><b>Respaldo institucional</b><br>${GARANTIA_MATRIZ[0]}<br>${GARANTIA_MATRIZ[1]}</div>

      <div class="foot">
        <span>Cotización sin compromiso · Válida por 15 días</span>
        <span>Ricardo Sanjur · WhatsApp 6510-4147</span>
      </div>
    </div>
  </body></html>`;
}
// =====================================================================
// PAQUETES (oferta vigente, por CONTEXTO de negocio)
// Fuente única para el cotizador y los mensajes: id, nombre, para_quien,
// precio / precio_mes y tipo del motor con el que se cotiza.
// NO se cambian precios: son los publicados en rsanjur.com/servicios/.
// =====================================================================

export type PaqueteId =
  | "pagina"
  | "catalogo"
  | "pedidos"
  | "inscripciones"
  | "reservas"
  | "portal"
  | "mantenimiento"
  | "sistema";

export interface Paquete {
  id: PaqueteId;
  nombre: string;
  /** A qué negocios les sirve (contexto de venta). */
  para_quien: string;
  /** Rubros típicos: sirve para ofrecer el paquete que le sirve a ese negocio. */
  rubros: string[];
  /** Precio del proyecto (pago único) o base del plan si es recurrente. */
  precio: number;
  /** Mensualidad incluida cuando el paquete cobra mes a mes. */
  precio_mes?: number;
  /** Techo del rango cuando el precio es "de X a Y". */
  precio_max?: number;
  /** Precio "desde" (proyectos a medida). */
  desde?: boolean;
  /** Tipo del motor con el que se cotiza (compatibilidad con TipoProyecto). */
  tipo: TipoProyecto | "plataforma";
  destacado?: boolean;
}

export const PAQUETES: Paquete[] = [
  {
    id: "pagina",
    nombre: "Página web",
    para_quien: "Negocios que necesitan presencia profesional en internet",
    rubros: ["negocio", "comercio", "servicios", "profesional", "local", "emprendimiento"],
    precio: 300,
    tipo: "landing",
    destacado: true,
  },
  {
    id: "catalogo",
    nombre: "Catálogo con productos",
    para_quien: "Comercios que quieren mostrar su inventario y recibir pedidos por WhatsApp",
    rubros: ["tienda", "boutique", "ferretería", "supermercado", "minimarket", "farmacia", "repuestos", "almacén", "ropa"],
    precio: 400,
    tipo: "catalogo",
    destacado: true,
  },
  {
    id: "pedidos",
    nombre: "Pedidos y pagos",
    para_quien: "Restaurantes, panaderías, cafeterías y food trucks que reciben pedidos",
    rubros: ["restaurante", "panadería", "cafetería", "food truck", "comida", "pizzería", "sushi", "cocina", "heladería"],
    precio: 400,
    precio_mes: 25,
    tipo: "ecommerce",
    destacado: true,
  },
  {
    id: "inscripciones",
    nombre: "Inscripciones y pagos",
    para_quien: "Academias, gimnasios, clubes y escuelas que inscriben y cobran en línea",
    rubros: ["academia", "gimnasio", "club", "escuela", "colegio", "deporte", "taller", "educación", "danza"],
    precio: 500,
    precio_mes: 25,
    tipo: "ecommerce",
  },
  {
    id: "reservas",
    nombre: "Reservas",
    para_quien: "Cabañas, hostales y tours que necesitan reservas en línea",
    rubros: ["cabaña", "hostal", "hotel", "tour", "posada", "turismo", "finca", "alojamiento"],
    precio: 500,
    precio_mes: 25,
    tipo: "ecommerce",
  },
  {
    id: "portal",
    nombre: "Portal de archivos y citas",
    para_quien: "Clínicas, despachos e inmobiliarias que gestionan citas y documentos",
    rubros: ["clínica", "consultorio", "despacho", "abogado", "contador", "inmobiliaria", "dental", "médico", "seguros"],
    precio: 400,
    tipo: "catalogo",
  },
  {
    id: "mantenimiento",
    nombre: "Mantenimiento mensual",
    para_quien: "Clientes con sitio activo que quieren el contenido al día y soporte",
    rubros: [],
    precio: 25,
    precio_max: 40,
    tipo: "mantenimiento",
  },
  {
    id: "sistema",
    nombre: "Sistema a medida",
    para_quien: "Negocios con operación compleja que necesitan un sistema propio",
    rubros: [],
    precio: 1200,
    desde: true,
    tipo: "plataforma",
    destacado: true,
  },
];

export const MAPA_PAQUETES: Record<string, Paquete> = Object.fromEntries(
  PAQUETES.map((p) => [p.id, p] as const)
);

/** Devuelve el paquete que mejor encaja con el rubro/tipo del negocio (para el copy). */
export function paquetePorRubro(rubro: string): Paquete | null {
  const r = (rubro || "").toLowerCase();
  if (!r) return null;
  for (const p of PAQUETES) {
    if (p.rubros.some((x) => r.includes(x))) return p;
  }
  return null;
}

/** Etiqueta compacta del precio de un paquete (para UI/copy). */
export function precioPaqueteLabel(p: Paquete): string {
  const base = `B/. ${p.precio.toFixed(2)}`;
  if (p.precio_max) return `${base} a B/. ${p.precio_max.toFixed(2)}/mes`;
  if (p.precio_mes) return `${base} + B/. ${p.precio_mes.toFixed(2)}/mes`;
  if (p.desde) return `desde ${base}`;
  return base;
}

export interface PaqueteCotizacion {
  paquete: Paquete;
  tipoLabel: string;
  baseProyecto: number;
  plan: string;
  planInfo: { label: string; precio: number; dias: number } | null;
  /** Mensualidad incluida en el paquete (si aplica). */
  mensualRecurrente: number;
  /** Total a pagar al inicio (proyecto/base + plan si se eligió). */
  total: number;
}

/** Cotiza por PAQUETE (contexto), manteniendo el plan de mantenimiento opcional. */
export function cotizarPaquete(paqueteId: string, plan = "sin"): PaqueteCotizacion | null {
  const paquete = MAPA_PAQUETES[paqueteId];
  if (!paquete) return null;
  const planInfo = plan !== "sin" && plan in PLANES ? PLANES[plan as PlanMantenimiento] : null;
  const baseProyecto = paquete.precio;
  const total = baseProyecto + (planInfo ? planInfo.precio : 0);
  return {
    paquete,
    tipoLabel: paquete.nombre,
    baseProyecto,
    plan,
    planInfo,
    mensualRecurrente: paquete.precio_mes || 0,
    total,
  };
}

/** Texto listo para WhatsApp de una cotización por PAQUETE (estilo es-PA, sin emojis). */
export function textoCotizacionPaquete(nombreNegocio: string, paqueteId: string, plan = "sin"): string {
  const c = cotizarPaquete(paqueteId, plan);
  if (!c) return textoCotizacion(nombreNegocio, "landing", 0, plan);
  const p = c.paquete;
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    ``,
    `Paquete: ${p.nombre}`,
    `Pensado para: ${p.para_quien}`,
    ``,
    p.desde
      ? `Valor del paquete: desde B/. ${p.precio.toFixed(2)} (según alcance)`
      : `Valor del paquete: B/. ${p.precio.toFixed(2)}`,
  ];
  if (p.precio_mes) {
    lineas.push(`Mensualidad del paquete: B/. ${p.precio_mes.toFixed(2)}/mes (incluida)`);
  }
  if (p.precio_max) {
    lineas.push(`Rango según alcance: B/. ${p.precio.toFixed(2)} a B/. ${p.precio_max.toFixed(2)}/mes`);
  }
  if (c.planInfo) {
    lineas.push(`Mantenimiento ${c.planInfo.label.toLowerCase()} — este pago cubre ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)}`);
  }
  lineas.push(`————————————`);
  lineas.push(`TOTAL INICIAL: B/. ${c.total.toFixed(2)}`);
  if (c.planInfo) {
    lineas.push(`Renovación del mantenimiento cada ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)}`);
  }
  if (p.precio_mes) {
    lineas.push(`Se renueva cada mes: B/. ${p.precio_mes.toFixed(2)}/mes.`);
  }
  lineas.push(``);
  lineas.push(`Incluye: dominio propio, alojamiento, diseño a medida y botón de WhatsApp.`);
  if (!c.planInfo && p.id !== "mantenimiento") {
    lineas.push(`Mantenimiento opcional (contenido actualizado, soporte, respaldo y optimización):`);
    lineas.push(`  › Mensual B/. ${PLANES.mensual.precio.toFixed(2)} · Trimestral B/. ${PLANES.trimestral.precio.toFixed(2)} · Semestral B/. ${PLANES.semestral.precio.toFixed(2)}`);
  }
  lineas.push(`Plazos y detalles se confirman en una llamada breve. ¡Saludos!`);
  return lineas.join("\n");
}

/** HTML de cotización por PAQUETE (para el PDF) — misma marca, un solo paquete + plan. */
export function htmlCotizacionPaquete(nombreNegocio: string, paqueteId: string, plan: string, fecha: string): string {
  const c = cotizarPaquete(paqueteId, plan);
  const p = c?.paquete ?? MAPA_PAQUETES.pagina;
  const precioTxt = p.desde
    ? `Desde B/. ${p.precio.toFixed(2)}`
    : p.precio_max
      ? `B/. ${p.precio.toFixed(2)} a B/. ${p.precio_max.toFixed(2)}/mes`
      : `B/. ${p.precio.toFixed(2)}`;
  const fila = (nombre: string, monto: string) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${nombre}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">${monto}</td></tr>`;

  const filas =
    fila(`Paquete ${p.nombre}`, precioTxt) +
    (p.precio_mes ? fila(`Mensualidad del paquete`, `B/. ${p.precio_mes.toFixed(2)}/mes`) : "") +
    (c?.planInfo ? fila(`Mantenimiento ${c.planInfo.label.toLowerCase()} — cubre ${c.planInfo.dias} días`, `B/. ${c.planInfo.precio.toFixed(2)}`) : "");

  const mantBloque = c?.planInfo
    ? `<div style="margin-top:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:12px;color:#78350f;line-height:1.6">
        <b>Mantenimiento ${c.planInfo.label.toLowerCase()} · B/. ${c.planInfo.precio.toFixed(2)} — este pago cubre ${c.planInfo.dias} días.</b>
        <ul style="margin:8px 0 0;padding-left:18px">
          <li>Actualización de contenido: precios, fotos, productos y promociones.</li>
          <li>Soporte técnico directo por WhatsApp.</li>
          <li>Respaldo y seguridad de tu página.</li>
          <li>Optimización de velocidad para que cargue rápido.</li>
        </ul>
      </div>`
    : `<div style="margin-top:16px;padding:14px 16px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;font-size:12px;color:#155e75;line-height:1.7">
        <b>Mantenimiento opcional</b> (contenido actualizado, soporte directo, respaldo y optimización):
        <div style="display:flex;gap:18px;margin-top:8px;flex-wrap:wrap">
          <span><b style="color:#0891b2">Mensual</b> · B/. ${PLANES.mensual.precio.toFixed(2)}</span>
          <span><b style="color:#0891b2">Trimestral</b> · B/. ${PLANES.trimestral.precio.toFixed(2)}</span>
          <span><b style="color:#0891b2">Semestral</b> · B/. ${PLANES.semestral.precio.toFixed(2)}</span>
        </div>
      </div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
    body{margin:0;background:#ffffff;color:#0f172a}
    .brand{background:linear-gradient(135deg,#2563EB,#06B6D4,#8B5CF6);color:#fff;padding:22px 40px;display:flex;justify-content:space-between;align-items:center}
    .brand .t{font-weight:800;font-size:16px;letter-spacing:.02em}
    .brand .s{font-size:11px;color:rgba(255,255,255,.9)}
    .brand .n{font-size:11px;color:rgba(255,255,255,.95);text-align:right;line-height:1.5}
    .body{padding:30px 40px}
    .cabeza{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:2px solid #06B6D4}
    .neg{font-size:20px;font-weight:800;letter-spacing:-.01em;color:#0f172a}
    .tipo{color:#64748b;font-size:12px;margin-top:3px}
    .fecha{font-size:12px;color:#64748b}
    .total-box{background:linear-gradient(120deg,#eff6ff,#ecfeff);border:1px solid #bfdbfe;color:#0f172a;border-radius:16px;padding:18px 24px;margin:20px 0;display:flex;justify-content:space-between;align-items:center}
    .total-box .lbl{font-size:11px;color:#0369a1;text-transform:uppercase;letter-spacing:.1em}
    .total-box .val{font-size:32px;font-weight:800;letter-spacing:-.02em;color:#0f172a}
    .total-box .nota{font-size:11px;color:#475569}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:8px 16px;border-bottom:1px solid #e2e8f0}
    th.m{text-align:right}
    .nota{margin-top:18px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:12px;color:#334155;line-height:1.6}
    .foot{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="brand">
      <div><div class="t">Cotización</div><div class="s">Desarrollo web · David, Chiriquí</div></div>
      <div class="n">Ricardo Sanjur<br>WhatsApp 6510-4147</div>
    </div>
    <div class="body">
      <div class="cabeza">
        <div><div class="neg">${nombreNegocio}</div><div class="tipo">${p.nombre} · ${p.para_quien}</div></div>
        <div class="fecha">${fecha}</div>
      </div>
      <div class="total-box">
        <div><div class="lbl">Total inicial · ${c?.planInfo ? `incluye mantenimiento ${c.planInfo.label.toLowerCase()} (${c.planInfo.dias} días)` : "según paquete"}</div><div class="nota">${p.nombre}${c?.planInfo ? " + mantenimiento" : ""}${p.precio_mes ? ` · +${p.precio_mes.toFixed(2)}/mes` : ""}</div></div>
        <div class="val">B/. ${(c?.total ?? p.precio).toFixed(2)}</div>
      </div>
      <table><thead><tr><th>Concepto</th><th class="m">Monto</th></tr></thead><tbody>
        ${filas}
      </tbody></table>
      ${mantBloque}
      <div class="nota"><b>Incluye:</b> dominio propio, alojamiento, diseño a medida y botón directo de WhatsApp. Plazos y detalles se confirman en una llamada breve.</div>
      <div class="foot"><span>Cotización sin compromiso · Válida por 15 días</span><span>Ricardo Sanjur · WhatsApp 6510-4147</span></div>
    </div>
  </body></html>`;
}

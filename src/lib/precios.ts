/**
 * Cotizador: precios configurables y generación de cotizaciones.
 * Los precios se ajustan por env (PRECIO_*); por defecto valores sugeridos.
 *
 * FUENTE ÚNICA DE PRECIOS:
 *   - PRECIOS: solo los valores base publicados en rsanjur.com que el motor
 *     necesita para cotizar (página $300, catálogo $400, mantenimiento $25 base).
 *   - PAQUETES: la oferta publicada en rsanjur.com/servicios (array "soluciones")
 *     y en la home (array "paquetes"). Cada paquete trae su nombre, precio_label,
 *     nota e incluye TAL CUAL se publican. El cotizador y los mensajes salen de aquí.
 */
import "dotenv/config";

export const PRECIOS = {
  landing: Number(process.env.PRECIO_LANDING || 300),
  catalogoBase: Number(process.env.PRECIO_CATALOGO_BASE || 400),
  mantenimiento: Number(process.env.PRECIO_MANTENIMIENTO || 25),
};

export type PlanMantenimiento = "mensual";
export type TipoProyecto = "landing" | "catalogo" | "ecommerce" | "mantenimiento";

export const PLANES: Record<PlanMantenimiento, { dias: number; precio: number; label: string }> = {
  mensual: { dias: 30, precio: PRECIOS.mantenimiento, label: "Mensual" },
};

export interface Cotizacion {
  tipo: TipoProyecto;
  tipoLabel: string;
  baseProyecto: number;
  plan: string; // "sin" | PlanMantenimiento
  planInfo: { label: string; precio: number; dias: number } | null;
  total: number;
}

/** Calcula la cotización: proyecto + plan de mantenimiento (si lo hay) = TOTAL INICIAL. */
export function cotizar(tipo: TipoProyecto, plan = "sin"): Cotizacion {
  let baseProyecto = 0;
  let tipoLabel: string;
  if (tipo === "landing") {
    baseProyecto = PRECIOS.landing;
    tipoLabel = "Página web";
  } else if (tipo === "catalogo") {
    baseProyecto = PRECIOS.catalogoBase;
    tipoLabel = "Catálogo en línea + pedidos por WhatsApp";
  } else if (tipo === "ecommerce") {
    // Alineado a rsanjur.com: la oferta publicada es "Pedidos y pagos" (Desde $400).
    baseProyecto = MAPA_PAQUETES.pedidos.precio;
    tipoLabel = "Pedidos y pagos";
  } else {
    tipoLabel = "Mantenimiento recurrente";
  }
  const planInfo = plan !== "sin" && plan in PLANES ? PLANES[plan as PlanMantenimiento] : null;
  const total = baseProyecto + (planInfo ? planInfo.precio : 0);
  return { tipo, tipoLabel, baseProyecto, plan, planInfo, total };
}

/** HTML de cotización con marca (para el PDF) — limpio y profesional. */
export function htmlCotizacion(nombreNegocio: string, tipo: TipoProyecto, plan: string, fecha: string): string {
  const c = cotizar(tipo, plan);
  const fila = (nombre: string, monto: number) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${nombre}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">B/. ${monto.toFixed(2)}</td></tr>`;

  const filas = tipo === "catalogo"
    ? fila("Base del catálogo", PRECIOS.catalogoBase)
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
  plan: string
): string {
  const c = cotizar(tipo, plan);
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    ``,
    `Proyecto: ${c.tipoLabel}`,
  ];
  if (tipo === "catalogo") {
    lineas.push(`Base del catálogo: B/. ${PRECIOS.catalogoBase.toFixed(2)}`);
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
    lineas.push(`  › Mensual B/. ${PLANES.mensual.precio.toFixed(2)}`);
  }
  lineas.push(`Plazos y detalles se confirman en una llamada breve. ¡Saludos!`);
  return lineas.join("\n");
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
  /** Precio EXACTO como se publica en rsanjur.com (ej. "Desde $400"). */
  precio_label: string;
  /** Nota EXACTA de precio como se publica (ej. "+ $25/mes", "pago único"). */
  nota: string;
  /** "Qué incluye" EXACTO como se publica en rsanjur.com. */
  incluye: string[];
  destacado?: boolean;
}

export const PAQUETES: Paquete[] = [
  {
    id: "pagina",
    nombre: "Página web / catálogo",
    para_quien: "Negocios que necesitan presencia profesional en internet",
    rubros: ["negocio", "comercio", "servicios", "profesional", "local", "emprendimiento"],
    precio: 300,
    precio_label: "$300 página",
    nota: "$400 catálogo con productos",
    incluye: ["Diseño", "Versión móvil", "Que aparezca en Google", "Botón de WhatsApp"],
    tipo: "landing",
    destacado: true,
  },
  {
    id: "catalogo",
    nombre: "Catálogo con productos",
    para_quien: "Comercios que quieren mostrar su inventario y recibir pedidos por WhatsApp",
    rubros: ["tienda", "boutique", "ferretería", "supermercado", "minimarket", "farmacia", "repuestos", "almacén", "ropa"],
    precio: 400,
    precio_label: "$400 catálogo",
    nota: "pago único",
    incluye: ["Diseño", "Versión móvil", "Que aparezca en Google", "Botón de WhatsApp"],
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
    precio_label: "Desde $400",
    nota: "+ $25/mes",
    incluye: ["Menú digital", "Carrito", "Pago con Yappy", "Panel de pedidos", "Correo de confirmación", "Seguimiento"],
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
    precio_label: "Desde $500",
    nota: "+ $25/mes",
    incluye: ["Formulario", "Control de cupos", "Pago en línea", "Listas y reportes"],
    tipo: "ecommerce",
  },
  {
    id: "reservas",
    nombre: "Reservas",
    para_quien: "Cabañas, hostales y tours que necesitan reservas en línea",
    rubros: ["cabaña", "hostal", "hotel", "tour", "posada", "turismo", "finca", "alojamiento"],
    precio: 500,
    precio_mes: 25,
    precio_label: "Desde $500",
    nota: "+ $25/mes",
    incluye: ["Calendario", "Disponibilidad", "Pago", "Reportes para el dueño"],
    tipo: "ecommerce",
  },
  {
    id: "portal",
    nombre: "Portal de archivos y citas",
    para_quien: "Clínicas, despachos e inmobiliarias que gestionan citas y documentos",
    rubros: ["clínica", "consultorio", "despacho", "abogado", "contador", "inmobiliaria", "dental", "médico", "seguros"],
    precio: 400,
    precio_label: "Desde $400",
    nota: "pago único",
    incluye: ["Subida y descarga de documentos con clave", "Avisos"],
    tipo: "catalogo",
  },
  {
    id: "mantenimiento",
    nombre: "Mantenimiento mensual",
    para_quien: "Clientes con sitio activo que quieren el contenido al día y soporte",
    rubros: [],
    precio: 25,
    precio_max: 40,
    precio_label: "$25 a $40",
    nota: "por mes",
    incluye: ["Cambios", "Respaldos", "Monitoreo", "Soporte por WhatsApp"],
    tipo: "mantenimiento",
  },
  {
    id: "sistema",
    nombre: "Sistema a medida",
    para_quien: "Negocios con operación compleja que necesitan un sistema propio",
    rubros: [],
    precio: 1200,
    desde: true,
    precio_label: "Desde $1,200",
    nota: "pago único",
    incluye: ["Panel de administración", "Pagos en línea", "Reportes", "Soporte por WhatsApp"],
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

/** Etiqueta compacta del precio PUBLICADO de un paquete (para UI/copy). */
export function precioPaqueteLabel(p: Paquete): string {
  return p.nota ? `${p.precio_label} · ${p.nota}` : p.precio_label;
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
  if (!c) return textoCotizacion(nombreNegocio, "landing", plan);
  const p = c.paquete;
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    ``,
    `Paquete: ${p.nombre}`,
    `Pensado para: ${p.para_quien}`,
    `Precio: ${p.precio_label}${p.nota ? ` (${p.nota})` : ""}`,
    ``,
    `Incluye:`,
  ];
  for (const it of p.incluye) lineas.push(`  • ${it}`);
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
  if (!c.planInfo && p.id !== "mantenimiento") {
    lineas.push(``);
    lineas.push(`Mantenimiento opcional (contenido actualizado, soporte, respaldo y optimización):`);
    lineas.push(`  › Mensual B/. ${PLANES.mensual.precio.toFixed(2)}`);
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
    fila(`Paquete ${p.nombre}`, p.precio_label) +
    (p.precio_mes ? fila(`Mensualidad del paquete`, `B/. ${p.precio_mes.toFixed(2)}/mes`) : "") +
    (p.nota ? fila(`Nota`, p.nota) : "") +
    (c?.planInfo ? fila(`Mantenimiento ${c.planInfo.label.toLowerCase()} — cubre ${c.planInfo.dias} días`, `B/. ${c.planInfo.precio.toFixed(2)}`) : "");

  const incluyeBloque = p.incluye.length
    ? `<div class="nota"><b>Incluye:</b><ul style="margin:8px 0 0;padding-left:18px">${p.incluye.map((it) => `<li>${it}</li>`).join("")}</ul></div>`
    : "";

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
      ${incluyeBloque}
      ${mantBloque}
      <div class="nota">Plazos y detalles se confirman en una llamada breve.</div>
      <div class="foot"><span>Cotización sin compromiso · Válida por 15 días</span><span>Ricardo Sanjur · WhatsApp 6510-4147</span></div>
    </div>
  </body></html>`;
}

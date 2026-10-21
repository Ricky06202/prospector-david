/**
 * Cotizador: precios configurables y generación de cotizaciones.
 * Los paquetes de lanzamiento se mantienen iguales a rsanjur.com/servicios.
 * PRECIO_MANTENIMIENTO queda solo para renovaciones ya existentes.
 *
 * FUENTE ÚNICA DE PRECIOS:
 *   - PRECIOS: solo los valores base publicados en rsanjur.com que el motor
 *     necesita para cotizar (landing $50, catálogo $75; mantenimiento legado).
 *   - PAQUETES refleja el catálogo canónico de rsanjur-com/src/data/paquetes.js.
 *     Mantener sincronizados nombres, precios, alcances, notas e inclusiones.
 *     El cotizador y sus mensajes salen de este catálogo del servidor.
 */
import "dotenv/config";

const ENTIDADES_HTML: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => ENTIDADES_HTML[caracter]);
}

export const PRECIOS = {
  landing: 50,
  catalogoBase: 75,
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

/** Calcula el flujo legacy; los paquetes nuevos ignoran los planes mensuales. */
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
    // Compatibilidad legacy: la oferta publicada equivalente es "Pedidos y pagos básicos" ($100).
    baseProyecto = MAPA_PAQUETES.pedidos.precio;
    tipoLabel = "Pedidos y pagos";
  } else {
    tipoLabel = "Mantenimiento recurrente";
  }
  const planInfo = tipo === "mantenimiento" && plan !== "sin" && plan in PLANES
    ? PLANES[plan as PlanMantenimiento]
    : null;
  const total = baseProyecto + (planInfo ? planInfo.precio : 0);
  return { tipo, tipoLabel, baseProyecto, plan, planInfo, total };
}

/** HTML de cotización con marca (para el PDF) — limpio y profesional. */
export function htmlCotizacion(nombreNegocio: string, tipo: TipoProyecto, plan: string, fecha: string): string {
  if (tipo !== "mantenimiento") {
    const paqueteId = tipo === "landing" ? "pagina" : tipo === "catalogo" ? "catalogo" : "pedidos";
    return htmlCotizacionPaquete(nombreNegocio, paqueteId, "sin", fecha);
  }
  const c = cotizar(tipo, plan);
  const nombreHtml = escaparHtml(nombreNegocio);
  const fila = (nombre: string, monto: number) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${escaparHtml(nombre)}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">B/. ${monto.toFixed(2)}</td></tr>`;

  const filas = "";
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
        <div><div class="neg">${nombreHtml}</div><div class="tipo">${escaparHtml(c.tipoLabel)}</div></div>
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
  if (tipo !== "mantenimiento") {
    const paqueteId = tipo === "landing" ? "pagina" : tipo === "catalogo" ? "catalogo" : "pedidos";
    return textoCotizacionPaquete(nombreNegocio, paqueteId, "sin");
  }
  const c = cotizar(tipo, plan);
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    ``,
    `Proyecto: ${c.tipoLabel}`,
  ];
  if (c.planInfo) {
    lineas.push(`Mantenimiento ${c.planInfo.label.toLowerCase()} — este pago cubre ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)}`);
  }
  lineas.push(`————————————`);
  lineas.push(`TOTAL INICIAL: B/. ${c.total.toFixed(2)}`);
  if (c.planInfo) {
    lineas.push(`(${c.planInfo.label} por ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)})`);
    lineas.push(`Renovación del mantenimiento cada ${c.planInfo.dias} días: B/. ${c.planInfo.precio.toFixed(2)}`);
  }
  lineas.push(``);
  if (c.planInfo) {
    lineas.push(`Mantenimiento incluye: contenido actualizado, soporte directo, respaldo y optimización.`);
  }
  lineas.push(`Plazos y detalles se confirman en una llamada breve. ¡Saludos!`);
  return lineas.join("\n");
}

// =====================================================================
// PAQUETES (oferta vigente de lanzamiento, por CONTEXTO de negocio)
// Esta lista debe coincidir con src/data/paquetes.js en rsanjur-com.
// Las renovaciones de mantenimiento existentes siguen en PLANES, pero no se
// ofrecen como mensualidad en las nuevas cotizaciones por paquete.
// =====================================================================

export type PaqueteId =
  | "pagina"
  | "catalogo"
  | "pedidos"
  | "inscripciones"
  | "reservas"
  | "portal-publico"
  | "portal"
  | "sistema";

export interface Paquete {
  id: PaqueteId;
  nombre: string;
  /** A qué negocios les sirve (contexto de venta). */
  para_quien: string;
  /** Rubros típicos: sirve para ofrecer el paquete que le sirve a ese negocio. */
  rubros: string[];
  /** Precio del paquete en dólares; para "Desde" es el monto mínimo. */
  precio: number;
  /** Precio "desde" (proyectos a medida). */
  desde?: boolean;
  /** Tipo del motor con el que se cotiza (compatibilidad con TipoProyecto). */
  tipo: TipoProyecto | "plataforma";
  /** Texto exacto de precio publicado en rsanjur.com. */
  precio_label: string;
  /** Nota exacta de precio publicada en rsanjur.com. */
  nota: string;
  /** Descripción del alcance, incluida en las tarjetas y cotizaciones. */
  descripcion: string;
  /** Lista exacta de inclusiones publicada en rsanjur.com. */
  incluye: string[];
  destacado?: boolean;
}

export const PAQUETES: Paquete[] = [
  {
    id: "pagina",
    nombre: "Landing / página web",
    para_quien: "Negocios y profesionales que necesitan una presencia sencilla en internet.",
    rubros: ["negocio", "comercio", "servicios", "profesional", "local", "emprendimiento"],
    precio: 50,
    precio_label: "$50",
    nota: "pago único",
    descripcion: "Una página de hasta 5 secciones, con plantilla adaptada al negocio.",
    incluye: ["Una página de hasta 5 secciones", "Diseño adaptable a celular", "Botón de WhatsApp"],
    tipo: "landing",
    destacado: true,
  },
  {
    id: "catalogo",
    nombre: "Catálogo básico",
    para_quien: "Negocios con productos que quieren mostrarlos y recibir pedidos por WhatsApp.",
    rubros: ["tienda", "boutique", "ferretería", "supermercado", "minimarket", "farmacia", "repuestos", "almacén", "ropa"],
    precio: 75,
    precio_label: "$75",
    nota: "pago único",
    descripcion: "Catálogo de hasta 20 productos, sin carrito ni inventario; pedidos por WhatsApp.",
    incluye: ["Hasta 20 productos", "Diseño adaptable a celular", "Pedidos por WhatsApp"],
    tipo: "catalogo",
    destacado: true,
  },
  {
    id: "pedidos",
    nombre: "Pedidos y pagos básicos",
    para_quien: "Restaurantes, panaderías, cafeterías y food trucks que quieren recibir pedidos en línea.",
    rubros: ["restaurante", "panadería", "cafetería", "food truck", "comida", "pizzería", "sushi", "cocina", "heladería"],
    precio: 100,
    precio_label: "$100",
    nota: "pago único",
    descripcion: "Formulario de pedido y enlace al proveedor de pago. No incluye inventario, delivery ni conciliación automática.",
    incluye: ["Formulario de pedido", "Enlace de pago del proveedor"],
    tipo: "ecommerce",
    destacado: true,
  },
  {
    id: "inscripciones",
    nombre: "Inscripciones básicas",
    para_quien: "Academias, gimnasios, clubes, escuelas y talleres.",
    rubros: ["academia", "gimnasio", "club", "escuela", "colegio", "deporte", "taller", "educación", "danza"],
    precio: 100,
    precio_label: "$100",
    nota: "pago único",
    descripcion: "Un formulario de inscripción y exportación de la lista; pagos en línea o validaciones especiales se cotizan aparte.",
    incluye: ["Un formulario", "Lista exportable de inscritos"],
    tipo: "ecommerce",
  },
  {
    id: "reservas",
    nombre: "Reservas básicas",
    para_quien: "Cabañas, hostales y tours.",
    rubros: ["cabaña", "hostal", "hotel", "tour", "posada", "turismo", "finca", "alojamiento"],
    precio: 100,
    precio_label: "$100",
    nota: "pago único",
    descripcion: "Solicitud de reserva con confirmación manual; no incluye calendario en tiempo real ni cobro en línea.",
    incluye: ["Formulario de solicitud", "Confirmación manual"],
    tipo: "ecommerce",
  },
  {
    id: "portal-publico",
    nombre: "Portal público de archivos",
    para_quien: "Negocios que necesitan publicar archivos no confidenciales para descargar.",
    rubros: ["archivos públicos", "asociación", "documentos públicos"],
    precio: 75,
    precio_label: "$75",
    nota: "pago único",
    descripcion: "Página pública para descargar archivos no confidenciales.",
    incluye: ["Listado de archivos públicos", "Enlaces de descarga"],
    tipo: "catalogo",
  },
  {
    id: "portal",
    nombre: "Portal privado de archivos",
    para_quien: "Negocios que necesitan compartir archivos con acceso privado.",
    rubros: ["clínica", "consultorio", "despacho", "abogado", "contador", "inmobiliaria", "dental", "médico", "seguros"],
    precio: 200,
    desde: true,
    precio_label: "Desde $200",
    nota: "pago único",
    descripcion: "Portal privado básico desde $200; datos sensibles y permisos complejos se cotizan aparte.",
    incluye: ["Acceso privado básico", "Alcance y permisos definidos antes de empezar"],
    tipo: "plataforma",
  },
  {
    id: "sistema",
    nombre: "Microsistema a medida",
    para_quien: "Negocios con una necesidad concreta que cabe en un sistema pequeño.",
    rubros: [],
    precio: 200,
    desde: true,
    precio_label: "Desde $200",
    nota: "pago único",
    descripcion: "Un flujo, un tipo de usuario y hasta 3 pantallas; sistemas grandes se cotizan por alcance.",
    incluye: ["Un proceso concreto", "Un tipo de usuario", "Hasta 3 pantallas"],
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
  /** Conservado por compatibilidad; los paquetes de lanzamiento no se renuevan. */
  mensualRecurrente: number;
  /** Total de pago único; en paquetes "Desde" es el monto mínimo. */
  total: number;
}

/** Cotiza por paquete de lanzamiento; no agrega mensualidades a una cotización nueva. */
export function cotizarPaquete(paqueteId: string, _plan = "sin"): PaqueteCotizacion | null {
  const paquete = MAPA_PAQUETES[paqueteId];
  if (!paquete) return null;
  const baseProyecto = paquete.precio;
  return {
    paquete,
    tipoLabel: paquete.nombre,
    baseProyecto,
    plan: "sin",
    planInfo: null,
    mensualRecurrente: 0,
    total: baseProyecto,
  };
}

/** Texto listo para WhatsApp de una cotización por PAQUETE (estilo es-PA, sin emojis). */
export function textoCotizacionPaquete(nombreNegocio: string, paqueteId: string, _plan = "sin"): string {
  const c = cotizarPaquete(paqueteId);
  if (!c) throw new Error(`Paquete desconocido: ${paqueteId}`);
  const p = c.paquete;
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    ``,
    `Paquete: ${p.nombre}`,
    `Pensado para: ${p.para_quien}`,
    `Precio de lanzamiento: ${p.precio_label}${p.nota ? ` (${p.nota})` : ""}`,
    `Alcance: ${p.descripcion}`,
    ``,
    `Incluye:`,
  ];
  for (const it of p.incluye) lineas.push(`  • ${it}`);
  lineas.push(``, `Condiciones:`, `  • Pago único.`, `  • Funciones fuera del alcance se cotizan aparte.`, `  • Hosting incluido, sin mensualidad para el cliente.`, `  • Si ya tienes dominio, sigue a tu nombre y lo renuevas directamente; si no, usamos un subdominio de rsanjur.com.`);
  lineas.push(`————————————`);
  lineas.push(`${p.desde ? "TOTAL INICIAL DESDE" : "TOTAL INICIAL"}: B/. ${c.total.toFixed(2)}`);
  lineas.push(`La fecha de entrega y las demás condiciones se confirman antes de comenzar. ¡Saludos!`);
  return lineas.join("\n");
}

/** HTML de cotización por PAQUETE (para el PDF) — pago único, sin plan mensual. */
export function htmlCotizacionPaquete(nombreNegocio: string, paqueteId: string, _plan: string, fecha: string): string {
  const c = cotizarPaquete(paqueteId);
  if (!c) throw new Error(`Paquete desconocido: ${paqueteId}`);
  const p = c.paquete;
  const nombreHtml = escaparHtml(nombreNegocio);
  const nombrePaqueteHtml = escaparHtml(p.nombre);
  const paraQuienHtml = escaparHtml(p.para_quien);
  const precioLabelHtml = escaparHtml(p.precio_label);
  const precioTxt = escaparHtml(`${p.desde ? "Desde " : ""}B/. ${c.total.toFixed(2)}`);
  const fila = (nombre: string, monto: string) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${escaparHtml(nombre)}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">${escaparHtml(monto)}</td></tr>`;

  const filas =
    fila(`Paquete ${p.nombre}`, p.precio_label) +
    fila("Modalidad", "Pago único");

  const incluyeBloque = p.incluye.length
    ? `<div class="nota"><b>Alcance:</b> ${escaparHtml(p.descripcion)}<br><br><b>Incluye:</b><ul style="margin:8px 0 0;padding-left:18px">${p.incluye.map((it) => `<li>${escaparHtml(it)}</li>`).join("")}</ul></div>`
    : `<div class="nota"><b>Alcance:</b> ${escaparHtml(p.descripcion)}</div>`;

  const condicionesBloque = `<div class="nota"><b>Condiciones:</b><ul style="margin:8px 0 0;padding-left:18px">
    <li>Pago único.</li>
    <li>Funciones fuera del alcance se cotizan aparte.</li>
    <li>Hosting incluido, sin mensualidad para el cliente.</li>
    <li>El dominio sigue a nombre del cliente; si no tiene uno, se usa un subdominio de rsanjur.com.</li>
  </ul></div>`;

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
        <div><div class="neg">${nombreHtml}</div><div class="tipo">${nombrePaqueteHtml} · ${paraQuienHtml}</div></div>
        <div class="fecha">${fecha}</div>
      </div>
      <div class="total-box">
        <div><div class="lbl">${p.desde ? "Precio mínimo · pago único" : "Total · pago único"}</div><div class="nota">${nombrePaqueteHtml} · ${precioLabelHtml}</div></div>
        <div class="val">${precioTxt}</div>
      </div>
      <table><thead><tr><th>Concepto</th><th class="m">Monto</th></tr></thead><tbody>
        ${filas}
      </tbody></table>
      ${incluyeBloque}
      ${condicionesBloque}
      <div class="nota">Plazos detallados y fecha de entrega se acuerdan antes de comenzar.</div>
      <div class="foot"><span>Cotización informativa · Condiciones finales antes del inicio</span><span>Ricardo Sanjur · WhatsApp 6510-4147</span></div>
    </div>
  </body></html>`;
}

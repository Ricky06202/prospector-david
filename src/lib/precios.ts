/**
 * Cotizador — NUBE PRIVADA CIFRADA.
 *
 * OFERTA ÚNICA (nuevo objetivo):
 *   Setup $50 de pago único — incluye configuración completa, capacitación
 *   y el PRIMER MES de hosting.
 *   Después el cliente elige: $10/mes de hosting, o export de TODOS sus
 *   datos gratis y se va sin penalización. No se venden landings.
 *
 * Pago: USDC sin comisiones, o transferencia bancaria (+10%).
 * Los montos se ajustan por env (PRECIO_SETUP / PRECIO_MENSUAL).
 */
import "dotenv/config";

export const PRECIOS = {
  /** Pago único: configuración + capacitación + primer mes de hosting. */
  setup: Number(process.env.PRECIO_SETUP || 50),
  /** Renovación mensual del hosting si decide quedarse. */
  mensual: Number(process.env.PRECIO_MENSUAL || 10),
  /** Alias para la GUI: el "mantenimiento" de este producto es el hosting. */
  mantenimiento: Number(process.env.PRECIO_MENSUAL || 10),
  mantenimientoTrimestral: Number(process.env.PRECIO_MENSUAL || 10) * 3,
  mantenimientoSemestral: Number(process.env.PRECIO_MENSUAL || 10) * 6,
};

/** Datos de la empresa matriz que respalda el servicio (autoridad + garantía). */
export const MATRIZ = {
  nombre: process.env.MATRIZ_NOMBRE || "Topografía Especializada S.A.",
  rubro: process.env.MATRIZ_RUBRO || "Empresa de ingeniería y desarrollo de software",
  ubicacion: process.env.MATRIZ_UBICACION || "David, Chiriquí · República de Panamá",
  garantia: process.env.MATRIZ_GARANTIA || "",
  contacto: process.env.MATRIZ_CONTACTO || "WhatsApp 6510-4147",
};

export type PlanMantenimiento = "mensual" | "trimestral" | "semestral";
export type TipoProyecto = "nube";

export const PLANES: Record<PlanMantenimiento, { dias: number; precio: number; label: string }> = {
  mensual: { dias: 30, precio: PRECIOS.mensual, label: "Mensual" },
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

/** Cotiza el servicio (único): setup $50 + continuidad opcional según plan elegido. */
export function cotizar(_tipo: TipoProyecto = "nube", _productos = 0, plan = "sin"): Cotizacion {
  const planInfo = plan !== "sin" && plan in PLANES ? PLANES[plan as PlanMantenimiento] : null;
  const total = PRECIOS.setup; // el primer mes ya está dentro del setup
  return {
    tipo: "nube",
    tipoLabel: "Nube privada cifrada — configuración por $50 de pago único",
    baseProyecto: PRECIOS.setup,
    productos: 0,
    porProducto: 0,
    plan,
    planInfo,
    total,
  };
}

const QUE_INCLUYE = [
  "Espacio de archivos cifrado, solo para tu negocio: ningún tercero accede ni escanea tus documentos.",
  "Acceso desde celular y computadora con tu propia cuenta, y usuarios adicionales para tu equipo.",
  "Migración guiada de tus archivos actuales (Drive, pendrive o correos).",
  "Capacitación en vivo para que tu equipo lo use desde el primer día.",
  "Primer mes de hosting incluido dentro de los $50.",
];

const CONTINUIDAD = [
  "Después del primer mes, tú decides: continuar por $10/mes…",
  "…o exportar TODOS tus datos gratis y llevártelos, sin penalización ni contrato.",
];

const PAGO = [
  "Forma de pago: USDC sin comisiones (el más rápido), o transferencia bancaria (+10%).",
];

/** HTML de cotización con marca (para el PDF). */
export function htmlCotizacion(nombreNegocio: string, _tipo: TipoProyecto = "nube", _productos = 0, plan = "sin", fecha: string): string {
  const c = cotizar("nube", 0, plan);
  const fila = (nombre: string, monto: string) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;color:#334155">${nombre}</td><td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">${monto}</td></tr>`;
  const li = (t: string) => `<li style="margin-bottom:5px">${t}</li>`;

  const filas =
    fila("Configuración de la nube privada cifrada (setup + capacitación)", `$ ${PRECIOS.setup.toFixed(2)}`) +
    fila("Primer mes de hosting", "INCLUIDO");
  const filaContinuidad = c.planInfo
    ? fila(`Continuidad ${c.planInfo.label.toLowerCase()} — cubre ${c.planInfo.dias} días (a partir del mes 2)`, `$ ${c.planInfo.precio.toFixed(2)}`)
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
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:8px 16px;border-bottom:1px solid #e2e8f0}
    th.m{text-align:right}
    .nota{margin-top:18px;padding:14px 16px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:12px;color:#134e4a;line-height:1.6}
    .pago{margin-top:14px;padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;color:#1e40af;line-height:1.6}
    .foot{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="brand">
      <div><div class="t">Cotización · Nube privada cifrada</div><div class="s">David, Chiriquí · ${MATRIZ.nombre}</div></div>
      <div class="n">${MATRIZ.nombre}<br>${MATRIZ.contacto}</div>
    </div>
    <div class="body">
      <div class="cabeza">
        <div><div class="neg">${nombreNegocio}</div><div class="tipo">Protección de datos sensibles para tu negocio</div></div>
        <div class="fecha">${fecha}</div>
      </div>
      <div class="total-box">
        <div><div class="lbl">Pago único</div></div>
        <div class="val">$ ${c.total.toFixed(2)}</div>
      </div>
      <table><thead><tr><th>Concepto</th><th class="m">Monto</th></tr></thead><tbody>
        ${filas}${filaContinuidad}
      </tbody></table>
      <div class="nota"><b>Incluye:</b><ul style="margin:8px 0 0;padding-left:18px">${QUE_INCLUYE.map(li).join("")}</ul></div>
      <div class="nota" style="background:#fffbeb;border-color:#fde68a;color:#78350f"><b>Después del primer mes:</b><ul style="margin:8px 0 0;padding-left:18px">${CONTINUIDAD.map(li).join("")}</ul></div>
      <div class="pago"><b>Pago:</b> ${PAGO[0]}</div>
      <div class="foot"><span>Cotización sin compromiso · Válida por 15 días</span><span>${MATRIZ.nombre} · ${MATRIZ.contacto}</span></div>
    </div>
  </body></html>`;
}

/** Texto de cotización listo para enviar por WhatsApp (desglose claro). */
export function textoCotizacion(
  nombreNegocio: string,
  _tipo: TipoProyecto = "nube",
  _productos = 0,
  plan = "sin"
): string {
  const c = cotizar("nube", 0, plan);
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    `Nube privada cifrada · David, Chiriquí`,
    ``,
    `Pago único: $ ${PRECIOS.setup.toFixed(2)} (incluye configuración, capacitación y primer mes de hosting).`,
    ``,
    `Qué incluye:`,
    ...QUE_INCLUYE.map((t) => `  • ${t}`),
    ``,
    `Después del primer mes:`,
    ...CONTINUIDAD.map((t) => `  • ${t}`),
  ];
  if (c.planInfo) {
    lineas.push(`Plan elegido: ${c.planInfo.label} — $ ${c.planInfo.precio.toFixed(2)} cubre ${c.planInfo.dias} días de hosting desde el mes 2.`);
  }
  lineas.push(
    ``,
    ...PAGO,
    ``,
    `Sin contrato, sin permanencia. ¿La dejamos lista esta semana?`,
  );
  return lineas.join("\n");
}

// =====================================================================
// COTIZACIÓN EN 2 BLOQUES (Setup único + Continuidad flexible)
// =====================================================================

export interface NivelUpsell {
  tipoLabel: string;
  desde: number;
  entrega: string;
  extras: string[];
}

export interface CotizacionEscalonada {
  nivel1: Cotizacion;   // setup $50 (apertura)
  nivel2: NivelUpsell;  // continuidad: $10/mes o export gratis
  totalNivel1: number;
  desdeNivel2: number;
}

/** Arma los dos bloques: Setup único y Continuidad sin permanencia. */
export function cotizarEscalonada(_productos = 0, plan = "sin"): CotizacionEscalonada {
  const nivel1 = cotizar("nube", 0, plan);
  return {
    nivel1,
    nivel2: {
      tipoLabel: "Continuidad flexible — sin contrato ni permanencia",
      desde: PRECIOS.mensual,
      entrega: "Desde el mes 2, tú decides cada mes",
      extras: [
        "Continuar tu espacio por $10/mes con soporte incluido",
        "Exportar TODOS tus datos gratis y llevártelos cuando quieras",
        "Subir o bajar usuarios de tu equipo sin recargo",
        "Copias de seguridad automáticas de tus carpetas cifradas",
        "Soporte directo por WhatsApp con el mismo técnico que lo montó",
      ],
    },
    totalNivel1: nivel1.total,
    desdeNivel2: PRECIOS.mensual,
  };
}

const GARANTIA_MATRIZ = [
  `Este servicio se respalda bajo ${MATRIZ.nombre} (${MATRIZ.rubro}, ${MATRIZ.ubicacion}).`,
  `Tus datos son tuyos: si algún día te vas, te los llevas completos y gratis. Sin letra pequeña.`,
];

/** Texto listo para WhatsApp de la cotización en 2 bloques. */
export function textoCotizacionEscalonada(nombreNegocio: string, plan = "sin"): string {
  const c = cotizarEscalonada(0, plan);
  const n1 = c.nivel1;
  const lineas: string[] = [
    `Cotización · ${nombreNegocio}`,
    `${MATRIZ.nombre} · ${MATRIZ.contacto}`,
    ``,
    `──────────────────────────`,
    `BLOQUE 1 - CONFIGURACIÓN (pago único)`,
    `Nube privada cifrada · lista en menos de 1 semana`,
    `$ ${PRECIOS.setup.toFixed(2)}`,
    ``,
    ...QUE_INCLUYE.map((e) => `  • ${e}`),
    ``,
    `──────────────────────────`,
    `BLOQUE 2 - CONTINUIDAD (desde el mes 2)`,
    `${c.nivel2.tipoLabel} · desde $ ${PRECIOS.mensual.toFixed(2)}/mes`,
    ``,
    ...c.nivel2.extras.map((e) => `  • ${e}`),
    ``,
    `FORMA DE PAGO: USDC sin comisiones, o transferencia bancaria (+10%).`,
    ``,
    `RESPALDO`,
    ...GARANTIA_MATRIZ,
    ``,
    `Cotización sin compromiso · Válida por 15 días`,
    `${MATRIZ.nombre} · ${MATRIZ.contacto}`,
  ];
  if (n1.planInfo) {
    lineas.splice(
      lineas.findIndex((l) => l.startsWith("FORMA DE PAGO")),
      0,
      `Plan elegido: ${n1.planInfo.label} — $ ${n1.planInfo.precio.toFixed(2)} cubre ${n1.planInfo.dias} días de hosting desde el mes 2.`,
      ``
    );
  }
  return lineas.join("\n");
}

/** HTML para PDF del cotizador en 2 bloques (marca + setup + continuidad). */
export function htmlCotizacionEscalonada(nombreNegocio: string, plan: string, fecha: string): string {
  const c = cotizarEscalonada(0, plan);
  const n1 = c.nivel1;

  const extrasN2 = c.nivel2.extras.map((e) => `<li>${e}</li>`).join("");

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
    .fecha{font-size:12px;color:#64748b}
    .nivel{border-radius:14px;padding:18px 22px;margin:16px 0}
    .nivel h2{margin:0 0 4px;font-size:16px;font-weight:800;letter-spacing:-.01em}
    .nivel .precio{font-size:26px;font-weight:800;letter-spacing:-.02em}
    .nivel .sub{font-size:12px;color:#475569;margin:2px 0 10px}
    .n1{background:#fef3c7;border:1px solid #fde68a}
    .n2{background:#f0fdf4;border:1px solid #bbf7d0}
    .extras{margin:10px 0 0;padding-left:20px;font-size:13px;color:#334155;line-height:1.7}
    .extras li{margin-bottom:4px}
    .pago{margin-top:14px;padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;color:#1e40af;line-height:1.6}
    .garantia{margin-top:14px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:12px;color:#334155;line-height:1.7}
    .garantia b{color:#0d9488}
    .foot{margin-top:22px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="brand">
      <div><div class="t">Cotización · Nube privada cifrada</div><div class="s">${MATRIZ.nombre} · ${MATRIZ.rubro}</div></div>
      <div class="n">${MATRIZ.nombre}<br>${MATRIZ.ubicacion}<br>${MATRIZ.contacto}</div>
    </div>
    <div class="body">
      <div class="cabeza">
        <div><div class="neg">${nombreNegocio}</div></div>
        <div class="fecha">${fecha}</div>
      </div>

      <div class="nivel n1">
        <h2>Bloque 1 · Configuración (pago único)</h2>
        <div class="precio">$ ${c.totalNivel1.toFixed(2)}</div>
        <div class="sub">Nube privada cifrada · lista en menos de 1 semana</div>
        <ul class="extras">${QUE_INCLUYE.map((e) => `<li>${e}</li>`).join("")}</ul>
      </div>

      <div class="nivel n2">
        <h2>Bloque 2 · Continuidad (desde el mes 2)</h2>
        <div class="precio">Desde $ ${c.desdeNivel2.toFixed(2)}/mes</div>
        <div class="sub">${c.nivel2.tipoLabel} · ${c.nivel2.entrega}</div>
        <ul class="extras">${extrasN2}</ul>
      </div>

      ${n1.planInfo ? `<div class="pago" style="background:#fffbeb;border-color:#fde68a;color:#78350f"><b>Plan elegido:</b> ${n1.planInfo.label} — $ ${n1.planInfo.precio.toFixed(2)} cubre ${n1.planInfo.dias} días de hosting desde el mes 2.</div>` : ""}

      <div class="pago"><b>Forma de pago:</b> ${PAGO[0]}</div>

      <div class="garantia"><b>Respaldo</b><br>${GARANTIA_MATRIZ[0]}<br>${GARANTIA_MATRIZ[1]}</div>

      <div class="foot">
        <span>Cotización sin compromiso · Válida por 15 días</span>
        <span>${MATRIZ.nombre} · ${MATRIZ.contacto}</span>
      </div>
    </div>
  </body></html>`;
}

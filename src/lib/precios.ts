/**
 * Cotizador — NUBE PRIVADA SOBERANA (IaaS, suscripción mensual).
 *
 * OFERTA EMPAQUETADA (3 planes fijos, sin negociación ni desarrollo a medida):
 *   BÁSICO  $10/mes — 50GB cifrados E2E, acceso web/app. Respaldo personal.
 *   PRO     $25/mes — 200GB + sincronización automática móvil + backup diario.
 *   NEGOCIO $50/mes — 500GB + multiusuario (hasta 3) + soporte prioritario WhatsApp.
 *
 * Pago: USDC sin comisiones, tarjeta o transferencia bancaria (+10%).
 * El ingreso objetivo es RECURRENT: $200+/mes en suscripciones activas.
 * Los precios se ajustan por env (PRECIO_BASICO / PRECIO_PRO / PRECIO_NEGOCIO).
 */
import "dotenv/config";

export const PRECIOS = {
  basico: Number(process.env.PRECIO_BASICO || 10),
  pro: Number(process.env.PRECIO_PRO || 25),
  negocio: Number(process.env.PRECIO_NEGOCIO || 50),
  /** Alias legacy para la pestaña de mantenimiento de la GUI (renovación Básico). */
  mantenimiento: Number(process.env.PRECIO_BASICO || 10),
  mantenimientoTrimestral: Number(process.env.PRECIO_BASICO || 10) * 3,
  mantenimientoSemestral: Number(process.env.PRECIO_BASICO || 10) * 6,
};

export interface PlanNube {
  id: "basico" | "pro" | "negocio";
  label: string;
  precio: number;
  gb: number;
  ideal: string;
  extras: string[];
}

/** Los 3 planes — la única oferta que existe. Nada fuera de esto se cotiza. */
export function planesNube(): PlanNube[] {
  return [
    {
      id: "basico",
      label: "Básico",
      precio: PRECIOS.basico,
      gb: 50,
      ideal: "Respaldo personal",
      extras: ["50GB de almacenamiento cifrado de extremo a extremo", "Acceso web y app, tuyo de punta a punta"],
    },
    {
      id: "pro",
      label: "Pro",
      precio: PRECIOS.pro,
      gb: 200,
      ideal: "Freelancers y trabajo remoto",
      extras: ["200GB cifrados E2E", "Sincronización automática con tu celular", "Backup diario sin que muevas un dedo"],
    },
    {
      id: "negocio",
      label: "Negocio",
      precio: PRECIOS.negocio,
      gb: 500,
      ideal: "Equipos pequeños",
      extras: ["500GB cifrados E2E", "Multiusuario: hasta 3 personas con su propia cuenta", "Soporte prioritario por WhatsApp"],
    },
  ];
}

export function planNube(id: string): PlanNube {
  const p = planesNube().find((x) => x.id === id);
  return p ?? planesNube()[1]; // default: Pro (el que más convierte)
}

/** Datos de la empresa matriz que respalda el servicio (autoridad + garantía). */
export const MATRIZ = {
  nombre: process.env.MATRIZ_NOMBRE || "Topografía Especializada S.A.",
  rubro: process.env.MATRIZ_RUBRO || "Infraestructura y desarrollo de software",
  ubicacion: process.env.MATRIZ_UBICACION || "David, Chiriquí · República de Panamá",
  garantia: process.env.MATRIZ_GARANTIA || "",
  contacto: process.env.MATRIZ_CONTACTO || "WhatsApp 6510-4147",
};

export type PlanMantenimiento = "mensual" | "trimestral" | "semestral";
export type TipoProyecto = "nube";

export const PLANES: Record<PlanMantenimiento, { dias: number; precio: number; label: string }> = {
  mensual: { dias: 30, precio: PRECIOS.basico, label: "Mensual" },
  trimestral: { dias: 90, precio: PRECIOS.mantenimientoTrimestral, label: "Trimestral" },
  semestral: { dias: 180, precio: PRECIOS.mantenimientoSemestral, label: "Semestral" },
};

export interface Cotizacion {
  tipo: TipoProyecto;
  tipoLabel: string;
  baseProyecto: number;   // = precio mensual del plan
  productos: number;
  porProducto?: number;
  plan: string;           // "basico" | "pro" | "negocio" | "sin"
  planInfo: { label: string; precio: number; dias: number } | null;
  total: number;          // mensualidad
}

/** Cotiza el plan elegido (el "plan" del cotizador viejo ahora es el id del plan nube). */
export function cotizar(_tipo: TipoProyecto = "nube", _productos = 0, plan = "pro"): Cotizacion {
  const pn = planNube(plan === "sin" ? "pro" : plan);
  return {
    tipo: "nube",
    tipoLabel: `Nube privada ${pn.label} — ${pn.gb}GB cifrados E2E · $${pn.precio}/mes`,
    baseProyecto: pn.precio,
    productos: 0,
    porProducto: 0,
    plan,
    planInfo: { label: pn.label, precio: pn.precio, dias: 30 },
    total: pn.precio,
  };
}

const PAGO = "Pago: USDC sin comisiones, o transferencia bancaria (+10%).";
const GARANTIA = [
  `Tus archivos están cifrados de extremo a extremo: ni el proveedor —yo mismo— puede verlos.`,
  `Cancelás cuando quieras y te llevás todos tus datos. Sin contrato, sin permanencia, sin letra pequeña.`,
];

/** HTML de cotización (PDF): los 3 planes con el elegido resaltado. */
export function htmlCotizacion(nombreNegocio: string, _tipo: TipoProyecto = "nube", _productos = 0, plan = "pro", fecha: string): string {
  const elegido = planNube(plan === "sin" ? "pro" : plan);
  const li = (t: string) => `<li style="margin-bottom:5px">${t}</li>`;
  const tarjetas = planesNube()
    .map(
      (p) => `
    <div style="border-radius:14px;padding:16px 20px;margin:12px 0;${
      p.id === elegido.id
        ? "background:#0d9488;color:#fff"
        : "background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a"
    }">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <b style="font-size:16px">Plan ${p.label}${p.id === elegido.id ? " ← elegido" : ""}</b>
        <span style="font-size:22px;font-weight:800">$${p.precio}<small style="font-size:11px;font-weight:400">/mes</small></span>
      </div>
      <div style="font-size:12px;opacity:.8;margin:2px 0 8px">${p.gb}GB cifrados E2E · ideal para: ${p.ideal}</div>
      <ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.6">${p.extras.map(li).join("")}</ul>
    </div>`
    )
    .join("");

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
    .nota{margin-top:16px;padding:14px 16px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:12px;color:#134e4a;line-height:1.6}
    .pago{margin-top:14px;padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;color:#1e40af;line-height:1.6}
    .foot{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="brand">
      <div><div class="t">Nube Privada Soberana</div><div class="s">Suscripción mensual · Activación en 2 minutos</div></div>
      <div class="n">${MATRIZ.nombre}<br>${MATRIZ.contacto}</div>
    </div>
    <div class="body">
      <div class="cabeza">
        <div><div class="neg">${nombreNegocio}</div></div>
        <div class="fecha">${fecha}</div>
      </div>
      ${tarjetas}
      <div class="nota"><b>Así de simple:</b> activás tu cuenta desde el link, elegís el plan y subís tus archivos. Todo se gestiona desde tu panel; si algo falla, soporte directo por WhatsApp.</div>
      <div class="pago"><b>${PAGO}</b></div>
      <div class="nota" style="background:#fffbeb;border-color:#fde68a;color:#78350f">${GARANTIA[0]}<br>${GARANTIA[1]}</div>
      <div class="foot"><span>Sin compromiso · Precios en USD, renovables cada mes</span><span>${MATRIZ.nombre} · ${MATRIZ.contacto}</span></div>
    </div>
  </body></html>`;
}

/** Texto de cotización para WhatsApp (los 3 planes, tono inmediato). */
export function textoCotizacion(
  nombreNegocio: string,
  _tipo: TipoProyecto = "nube",
  _productos = 0,
  plan = "pro"
): string {
  const elegido = planNube(plan === "sin" ? "pro" : plan);
  const lineas: string[] = [`Cotización · ${nombreNegocio}`, `Nube Privada Soberana · activación en 2 minutos`, ``];
  for (const p of planesNube()) {
    lineas.push(
      `Plan ${p.label} — $${p.precio}/mes${p.id === elegido.id ? "  ◀ recomendado" : ""}`,
      `  • ${p.extras.join(" · ")}`,
      ``
    );
  }
  lineas.push(
    `Todo se gestiona desde tu panel. Cifrado extremo a extremo: ni yo puedo ver tus archivos.`,
    `Cancelás cuando quieras y te llevás tus datos.`,
    ``,
    PAGO,
    `¿Con cuál arrancamos?`
  );
  return lineas.join("\n");
}

// =====================================================================
// MENÚ COMPLETO (los 3 planes + regla de oro) — reemplaza al "escalonado"
// =====================================================================

export interface NivelUpsell {
  tipoLabel: string;
  desde: number;
  entrega: string;
  extras: string[];
}

export interface CotizacionEscalonada {
  nivel1: Cotizacion;               // plan recomendado (Pro)
  nivel2: NivelUpsell;              // los otros dos planes, como menú
  totalNivel1: number;
  desdeNivel2: number;
}

export function cotizarEscalonada(_productos = 0, plan = "pro"): CotizacionEscalonada {
  const nivel1 = cotizar("nube", 0, plan);
  const otros = planesNube().filter((p) => p.id !== nivel1.planInfo?.label.toLowerCase());
  return {
    nivel1,
    nivel2: {
      tipoLabel: "Además podés elegir",
      desde: otros[0]?.precio ?? PRECIOS.basico,
      entrega: "Cualquier plan se activa igual de rápido",
      extras: otros.map((p) => `Plan ${p.label} $${p.precio}/mes — ${p.extras.join(", ")}`),
    },
    totalNivel1: nivel1.total,
    desdeNivel2: otros[0]?.precio ?? PRECIOS.basico,
  };
}

/** Texto con los 3 planes + regla de oro anti-fricción. */
export function textoCotizacionEscalonada(nombreNegocio: string, plan = "pro"): string {
  const c = cotizarEscalonada(0, plan);
  const lineas: string[] = [
    `Nube Privada Soberana · ${nombreNegocio}`,
    `${MATRIZ.nombre} · ${MATRIZ.contacto}`,
    ``,
    `Planes mensuales (sin contrato, cancelás cuando quieras):`,
    ``,
    ...planesNube().flatMap((p) => [
      `PLAN ${p.label.toUpperCase()} — $${p.precio}/mes${p.id === c.nivel1.planInfo?.label.toLowerCase() ? "  ◀ tu mejor opción" : ""}`,
      ...p.extras.map((e) => `  • ${e}`),
      ``
    ]),
    `Cifrado extremo a extremo: ni el proveedor ve tus archivos.`,
    `Más barato que Dropbox, 100% privado. Activación en 2 minutos.`,
    ``,
    PAGO,
    ``,
    `Nota honesta: la plataforma corre solo con estos 3 niveles. Si necesitás algo distinto (más espacio, software especial), te lo digo de frente: no es tu opción ahora mismo.`,
    ``,
    `${GARANTIA[1]}`,
  ];
  return lineas.join("\n");
}

/** HTML (PDF) del menú completo. */
export function htmlCotizacionEscalonada(nombreNegocio: string, plan: string, fecha: string): string {
  return htmlCotizacion(nombreNegocio, "nube", 0, plan, fecha);
}

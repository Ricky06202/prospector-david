/**
 * MÓDULO 4 — Asistente humano (EL QUE PREPARA EL ENVÍO)
 * -----------------------------------------------------
 * NO envía mensajes automáticamente (protege la cuenta de WhatsApp).
 * Genera:
 *   - output/lista_envio.json  (estructurado, para herramientas)
 *   - output/reporte_envio.html (interactivo: copys, fotos y enlaces wa.me listos)
 *
 * ANTI-BAN: cada prospecto lleva una SECUENCIA de mensajes:
 *   1) apertura (corto, sin enlaces/PDF/imágenes) → wa.me
 *   2) muestra  (con las IMÁGENES del prototipo, SOLO tras la respuesta del dueño)
 *   3) cierre   (seguimiento si no cierra)
 * Además genera la LISTA DE SEGUIMIENTO: quienes no respondieron ni leyeron
 * recuperan su mensaje de retoma (adaptado a los días transcurridos) para
 * re-enviarlo cuando sea — aun un mes después.
 */
import "dotenv/config";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generarAperturaConDeepSeek, generarMuestraConDeepSeek, generarRetomaConDeepSeek, waLink } from "./deepseek.ts";
import { filtrarActivos, ROOT } from "../lib/prospectos-io.ts";
import { configAntiBan, planDeRitmo, formatoMs, esMensajeAperturaSeguro, diasDesde, contieneEnlaces } from "./anti-ban.ts";
import type { Prospecto } from "../types.ts";

const OUT = join(ROOT, "output");

const prospectos = await filtrarActivos(
  JSON.parse(await readFile(join(ROOT, "data", "prospectos.json"), "utf-8")),
  process.env.NICHO
);

await mkdir(OUT, { recursive: true });

// URL pública base del prototipo. POR DEFECTO no se envían enlaces en David
// (ENVIAR_ENLACES=false); el mensaje 2 solo menciona las imágenes adjuntas.
const URL_PUBLICA = (process.env.URL_PUBLICA || "").replace(/\/+$/, "");
const urlPrototipo = URL_PUBLICA ? `${URL_PUBLICA}/` : undefined;

const registros = [];
const fotosDir = join(OUT, "screenshots");
let avisosApertura = 0;

for (const p of prospectos) {
  // Capturas en carpeta propia: output/screenshots/<id>/
  let archivos: string[] = [];
  try {
    archivos = (await readdir(join(fotosDir, p.id))).filter((f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".webp")).sort();
  } catch { /* sin capturas aún */ }

  const apertura = await generarAperturaConDeepSeek(p);
  if (!esMensajeAperturaSeguro(apertura)) avisosApertura++;
  const muestra = await generarMuestraConDeepSeek(p, urlPrototipo);

  registros.push({
    id: p.id,
    nombre_negocio: p.nombre_negocio,
    tipo: p.tipo,
    estado: p.estado || "nuevo",
    lead_score: p.lead_score,
    tier_lead: p.tier_lead,
    scoring_motivo: p.scoring_motivo,
    email: p.email,
    whatsapp: p.whatsapp,
    // Back-compat: el copy principal es la apertura (segura, sin enlaces).
    copy_whatsapp: apertura,
    mensajes: [
      {
        tipo: "apertura",
        etiqueta: "1 · Apertura (sin enlaces)",
        texto: apertura,
        wa_link: waLink(p.whatsapp, apertura),
        delay_estimado_ms: 0,
      },
      {
        tipo: "muestra",
        etiqueta: "2 · Muestra (tras su respuesta)",
        texto: muestra,
        wa_link: waLink(p.whatsapp, muestra),
        delay_estimado_ms: planDeRitmo(1)[0].delay,
      },
    ],
    fotos: archivos.map((f) => ({
      archivo: `output/screenshots/${p.id}/${f}`,
      ruta_absoluta: join(fotosDir, p.id, f),
    })),
  });
  console.log(`[envio] ${p.id} · apertura + muestra (${archivos.length} fotos)`);
}

// ---- SEGUIMIENTOS: quienes no han cerrado, con su retoma por días ----
const TODOS = JSON.parse(await readFile(join(ROOT, "data", "prospectos.json"), "utf-8")) as Prospecto[];
const EN_SEGUIMIENTO = new Set(["enviado", "seguimiento", "reagendar"]);
const seguimientos = [];
for (const p of TODOS) {
  if (!EN_SEGUIMIENTO.has(p.estado || "")) continue;
  const base = p.ultimo_contacto || p.enviado_en || p.creado_en;
  const dias = diasDesde(base) ?? 0;
  const retoma = await generarRetomaConDeepSeek(p, dias);
  seguimientos.push({
    id: p.id,
    nombre_negocio: p.nombre_negocio,
    tipo: p.tipo,
    estado: p.estado,
    dias_desde_contacto: dias,
    ultimo_contacto: p.ultimo_contacto || p.enviado_en,
    retoma,
    wa_link: waLink(p.whatsapp, retoma),
    sin_enlaces: !contieneEnlaces(retoma),
  });
}
seguimientos.sort((a, b) => b.dias_desde_contacto - a.dias_desde_contacto);

const cfg = configAntiBan();
const ritmo = planDeRitmo(registros.length || 1, cfg);

await writeFile(
  join(OUT, "lista_envio.json"),
  JSON.stringify({ generado_en: new Date().toISOString(), config_anti_ban: cfg, ritmo_sugerido: ritmo, registros }, null, 2),
  "utf-8"
);
await writeFile(join(OUT, "seguimientos.json"), JSON.stringify({ generado_en: new Date().toISOString(), seguimientos }, null, 2), "utf-8");

// Reporte HTML interactivo para revisión humana.
const tarjetas = registros
  .map(
    (r) => `
    <article style="border:1px solid #e2e8f0;border-radius:16px;padding:20px;background:#fff;display:flex;flex-direction:column;gap:12px">
      <div>
        <h3 style="margin:0;font-size:18px;color:#0f172a">${r.nombre_negocio}</h3>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b">${r.tipo}${r.lead_score ? ` · <b style="color:#0d9488">score ${r.lead_score} (${r.tier_lead})</b> · ${r.scoring_motivo}` : ""}${r.email ? ` · <a href="mailto:${r.email}" style="color:#2563eb">${r.email}</a>` : ""}</p>
      </div>
      ${r.mensajes
        .map(
          (m) => `
        <div style="border-left:3px solid ${m.tipo === "apertura" ? "#f59e0b" : "#0d9488"};padding:4px 0 4px 12px">
          <p style="margin:0;font-size:12px;font-weight:700;color:#334155">${m.etiqueta}${m.delay_estimado_ms ? ` · envíalo ~${formatoMs(m.delay_estimado_ms)} después` : ""}</p>
          <pre style="white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:12px;font-size:13px;color:#334155;margin:6px 0">${m.texto.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
          ${m.tipo === "muestra" ? '<p style="margin:4px 0;font-size:12px;color:#b45309"><b>Adjunta las imágenes de abajo</b> al enviar este mensaje (en David no se mandan enlaces).</p>' : ""}
          <a href="${m.wa_link}" target="_blank" rel="noopener" style="display:inline-block;background:${m.tipo === "apertura" ? "#f59e0b" : "#25D366"};color:#fff;text-decoration:none;text-align:center;padding:10px 16px;border-radius:10px;font-weight:700;font-size:13px">Abrir WhatsApp · ${m.tipo}</a>
        </div>`
        )
        .join("\n")}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${r.fotos
          .map(
            (f) =>
              `<img src="${f.archivo.replace("output/", "")}" alt="${f.archivo}" style="width:${f.archivo.includes("movil_") ? 90 : 170}px;border-radius:8px;border:1px solid #e2e8f0"/>`
          )
          .join("\n")}
      </div>
    </article>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte de Envío · Prospector David</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f1f5f9">
  <div style="max-width:880px;margin:0 auto;padding:24px">
    <h1 style="font-size:24px;color:#0f172a">Lista de envío manual</h1>
    <p style="color:#64748b">Revisa cada copia, abre el WhatsApp con el mensaje preescrito y envía tú mismo (nada se envía automáticamente).</p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px 16px;font-size:13px;color:#78350f;margin-bottom:16px">
      <b>Ritmo anti-ban recomendado:</b> entre envío y envío espera ${formatoMs(cfg.delayBase)} a ${formatoMs(cfg.delayBase + cfg.delayJitter)} (crece con cada uno). Cada ${cfg.pausaCada} envíos haz una pausa de ${formatoMs(cfg.pausaMin)}–${formatoMs(cfg.pausaMax)}.
      <br><b>En David no se mandan enlaces:</b> el mensaje 1 es la apertura sin nada; si el dueño responde, envía el mensaje 2 adjuntando las <b>imágenes</b> de abajo. Sin emojis (se ven mal en el enlace wa.me).
      ${avisosApertura ? `<br><b style="color:#b45309">${avisosApertura} apertura(s) con enlace detectado — corregidas con la plantilla segura.</b>` : ""}
    </div>
    <div style="display:grid;gap:16px;margin-top:16px">${tarjetas}</div>
  </div>
</body></html>`;

await writeFile(join(OUT, "reporte_envio.html"), html, "utf-8");

console.log(`[envio] ${registros.length} registros -> output/lista_envio.json + output/reporte_envio.html`);
console.log(`[envio] ${seguimientos.length} seguimientos -> output/seguimientos.json`);
console.log(`[envio] Abre el reporte con: xdg-open ${join(OUT, "reporte_envio.html")}`);

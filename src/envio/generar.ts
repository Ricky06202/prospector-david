/**
 * MÓDULO 4 — Asistente humano (EL QUE PREPARA EL ENVÍO)
 * -----------------------------------------------------
 * NO envía mensajes automáticamente (protege la cuenta de WhatsApp).
 * Genera:
 *   - output/lista_envio.json  (estructurado, para herramientas)
 *   - output/reporte_envio.html (interactivo: copys, fotos y enlaces wa.me listos)
 */
import "dotenv/config";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generarCopyWithDeepSeek, waLink } from "./deepseek.ts";
import { filtrarActivos, ROOT } from "../lib/prospectos-io.ts";

const OUT = join(ROOT, "output");

const prospectos = await filtrarActivos(
  JSON.parse(await readFile(join(ROOT, "data", "prospectos.json"), "utf-8")),
  process.env.NICHO
);

await mkdir(OUT, { recursive: true });

const registros = [];
const fotosDir = join(OUT, "screenshots");
for (const p of prospectos) {
  // Capturas en carpeta propia: output/screenshots/<id>/
  let archivos: string[] = [];
  try {
    archivos = (await readdir(join(fotosDir, p.id))).filter((f) => f.endsWith(".png")).sort();
  } catch { /* sin capturas aún */ }

  const copy = await generarCopyWithDeepSeek(p);

  registros.push({
    id: p.id,
    nombre_negocio: p.nombre_negocio,
    tipo: p.tipo,
    estado: p.estado || "nuevo",
    copy_whatsapp: copy,
    fotos: archivos.map((f) => ({
      archivo: `output/screenshots/${p.id}/${f}`,
      ruta_absoluta: join(fotosDir, p.id, f),
    })),
    wa_link: waLink(p.whatsapp, copy),
  });
  console.log(`[envio] Copy listo para: ${p.id} (${archivos.length} fotos)`);
}

await writeFile(join(OUT, "lista_envio.json"), JSON.stringify(registros, null, 2), "utf-8");

// Reporte HTML interactivo para revisión humana.
const tarjetas = registros
  .map(
    (r) => `
    <article style="border:1px solid #e2e8f0;border-radius:16px;padding:20px;background:#fff;display:flex;flex-direction:column;gap:12px">
      <div>
        <h3 style="margin:0;font-size:18px;color:#0f172a">${r.nombre_negocio}</h3>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b">${r.tipo}</p>
      </div>
      <pre style="white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:12px;font-size:13px;color:#334155;margin:0">${r.copy_whatsapp.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${r.fotos
          .map(
            (f) =>
              `<img src="${f.archivo.replace("output/", "")}" alt="${f.archivo}" style="width:${f.archivo.includes("movil_") ? 90 : 170}px;border-radius:8px;border:1px solid #e2e8f0"/>`
          )
          .join("\n")}
      </div>
      <a href="${r.wa_link}" target="_blank" rel="noopener" style="background:#25D366;color:#fff;text-decoration:none;text-align:center;padding:12px;border-radius:10px;font-weight:700">Abrir WhatsApp con mensaje preescrito</a>
    </article>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte de Envío · Prospector David</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f1f5f9">
  <div style="max-width:880px;margin:0 auto;padding:24px">
    <h1 style="font-size:24px;color:#0f172a">📬 Lista de envío manual</h1>
    <p style="color:#64748b">Revisa cada copia, abre el WhatsApp con el mensaje preescrito y envía tú mismo (nada se envía automáticamente).</p>
    <div style="display:grid;gap:16px;margin-top:16px">${tarjetas}</div>
  </div>
</body></html>`;

await writeFile(join(OUT, "reporte_envio.html"), html, "utf-8");

console.log(`[envio] ${registros.length} registros -> output/lista_envio.json + output/reporte_envio.html`);
console.log(`[envio] Abre el reporte con: xdg-open ${join(OUT, "reporte_envio.html")}`);

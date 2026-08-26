/** Dashboard de Prospector David — SPA multi-página (sidebar como navegador). */
export const DASHBOARD = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prospector David</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --brand:#0d9488; --brand2:#0e7490; --brand3:#0f172a;
  --bg:#f1f5f9; --card:#ffffff; --line:#e2e8f0;
  --ink:#0f172a; --muted:#64748b;
  --ok:#10b981; --warn:#d97706; --err:#dc2626; --info:#2563eb;
  --r:16px;
  --shadow:0 1px 2px rgba(15,23,42,.05),0 8px 24px -12px rgba(15,23,42,.15);
  --shadow-lg:0 2px 4px rgba(15,23,42,.06),0 16px 40px -16px rgba(15,23,42,.25);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);font-size:14px}
svg{display:block}
a{color:inherit}

/* ---------- Sidebar (navegador de páginas) ---------- */
.sidebar{position:fixed;inset:0 auto 0 0;width:244px;background:linear-gradient(180deg,#0f172a 0%,#134e4a 130%);color:#e2e8f0;display:flex;flex-direction:column;padding:22px 16px;z-index:30}
.brand{display:flex;align-items:center;gap:11px;padding:0 6px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.brand-logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0e7490);display:grid;place-items:center;font-size:20px;box-shadow:0 4px 14px -4px rgba(20,184,166,.6)}
.brand b{display:block;font-size:15px;letter-spacing:-.01em;color:#fff}
.brand span{font-size:11px;color:#94a3b8}
.side-nav{margin-top:18px;display:flex;flex-direction:column;gap:4px;flex:1}
.side-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;color:#cbd5e1;text-decoration:none;font-weight:600;font-size:13px;transition:.15s;cursor:pointer}
.side-nav a:hover{background:rgba(255,255,255,.07);color:#fff}
.side-nav a.active{background:rgba(20,184,166,.16);color:#5eead4}
.side-nav a .ic{opacity:.8}
.side-foot{margin-top:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;font-size:11px;color:#94a3b8}
.side-foot b{display:block;color:#e2e8f0;font-size:12px;margin-bottom:4px}
.side-foot .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ok);margin-right:6px;box-shadow:0 0 0 3px rgba(16,185,129,.2)}

/* ---------- Layout ---------- */
.main{margin-left:244px;padding:0 28px 48px}
@media(max-width:960px){.sidebar{display:none}.main{margin-left:0;padding:0 16px 40px}}

/* ---------- Topbar ---------- */
.topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:26px 0 20px;flex-wrap:wrap}
.topbar h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em}
.topbar p{margin:3px 0 0;color:var(--muted);font-size:13px}
.top-actions{display:flex;align-items:center;gap:10px}
.pill{border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:7px}
.st-idle{background:#e2e8f0;color:#334155}.st-corriendo{background:#fef3c7;color:#b45309}
.st-listo{background:#dcfce7;color:#15803d}.st-error{background:#fee2e2;color:#b91c1c}
.pill::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.85}
.st-corriendo::before{animation:blink 1s infinite}
@keyframes blink{50%{opacity:.2}}
.aviso{border-radius:12px;padding:12px 16px;margin-bottom:18px;font-size:13px;font-weight:600;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}
.av-err{background:#fee2e2;color:#b91c1c;border-color:#fecaca}

/* ---------- Pantallas ---------- */
.screen{display:none}
.screen.activa{display:block}

/* ---------- Botones ---------- */
button{font:inherit;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;transition:.15s;font-size:13px}
button:hover{border-color:#cbd5e1;background:#f8fafc;transform:translateY(-1px)}
button:active{transform:translateY(0)}
button.prim{background:linear-gradient(135deg,#14b8a6,#0d9488);border:none;color:#fff;box-shadow:0 6px 16px -6px rgba(13,148,136,.55)}
button.prim:hover{background:linear-gradient(135deg,#0d9488,#0f766e);filter:brightness(1.04)}
button.wa{background:#25D366;border:none;color:#fff;box-shadow:0 6px 16px -6px rgba(37,211,102,.5)}
button.danger{background:#fee2e2;border-color:#fecaca;color:#b91c1c}
a.btn{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--brand);text-decoration:none;font-size:13px;padding:7px 10px;border-radius:9px}
a.btn:hover{background:#f0fdfa}
input,select,textarea{font:inherit;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink)}
input:focus,select:focus,textarea:focus,button:focus{outline:2px solid rgba(13,148,136,.35);outline-offset:1px;border-color:var(--brand)}

/* ---------- KPIs ---------- */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:22px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow);transition:.18s}
.kpi:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.kpi-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.kpi b{display:block;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1}
.kpi span{font-size:12px;color:var(--muted);font-weight:600}

/* ---------- Cards ---------- */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:20px;margin-bottom:18px;box-shadow:var(--shadow)}
.card h2{margin:0 0 4px;font-size:16px;font-weight:800;letter-spacing:-.01em}
.card .sub{color:var(--muted);font-size:12px;margin:0 0 14px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}

/* ---------- Prospectos ---------- */
.p-card{border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;background:#fff;transition:.18s;box-shadow:var(--shadow)}
.p-card:hover{box-shadow:var(--shadow-lg)}
.p-top{display:flex;align-items:center;gap:12px}
.p-ava{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:17px;flex-shrink:0}
.p-name{font-weight:700;font-size:14px}
.p-meta{font-size:12px;color:var(--muted);margin-top:2px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;margin-left:auto}
.badge::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
.b-nuevo{background:#dbeafe;color:#1d4ed8}.b-en_cola{background:#fef3c7;color:#b45309}
.b-enviado{background:#f1f5f9;color:#475569}.b-no_interesado{background:#fee2e2;color:#b91c1c}
.b-reagendar{background:#ede9fe;color:#6d28d9}.b-interesado{background:#dcfce7;color:#059669}
.b-cliente{background:#fef9c3;color:#a16207}
.copy{white-space:pre-wrap;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:11px;font-size:12px;margin:12px 0;color:#334155;line-height:1.5}
.fotos{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.fotos img{height:66px;border-radius:9px;border:1px solid var(--line);cursor:zoom-in;transition:.15s}
.fotos img:hover{transform:scale(1.04);box-shadow:var(--shadow)}
.p-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.muted{color:var(--muted);font-size:12px}

/* ---------- Tabla ---------- */
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:620px}
th{text-align:left;padding:11px 14px;background:#f8fafc;color:var(--muted);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--line)}
td{padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr:hover{background:#f8fafc}
.t-name{display:flex;align-items:center;gap:9px;font-weight:600}
.t-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.empty{padding:32px;text-align:center;color:var(--muted);font-size:13px}
.cb-list{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:12px;margin-top:5px;max-height:300px;overflow-y:auto;z-index:60;box-shadow:var(--shadow-lg)}
.cb-item{padding:9px 13px;cursor:pointer;font-size:13px;display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #f1f5f9}
.cb-item:last-child{border-bottom:none}
.cb-item:hover{background:#f0fdfa}
.cb-item .st{font-size:11px;color:var(--muted);flex-shrink:0}
</style>
</head>
<body>
<aside class="sidebar">
  <div class="brand">
    <div class="brand-logo">🎯</div>
    <div><b>Prospector</b><span>David · Chiriquí</span></div>
  </div>
  <nav class="side-nav">
    <a data-pantalla="dashboard" class="active" href="#"><span class="ic">◧</span> Dashboard</a>
    <a data-pantalla="prospectos" href="#"><span class="ic">☷</span> Prospectos</a>
    <a data-pantalla="herramientas" href="#"><span class="ic">⚙</span> Herramientas</a>
  </nav>
  <div class="side-foot">
    <b><span class="dot"></span>Sistema operativo</b>
    Prospección local · David, Chiriquí<br>
    Genera, captura, cotiza y envía.
  </div>
</aside>

<div class="main">
  <header class="topbar">
    <div>
      <h1 id="page-title">Dashboard</h1>
      <p>Prospección local · David, Chiriquí</p>
    </div>
    <div class="top-actions">
      <span id="status" class="pill st-idle">idle</span>
      <button data-accion="recargar">↻ Recargar</button>
    </div>
  </header>

  <p id="aviso" class="aviso hidden"></p>

  <!-- ============ DASHBOARD ============ -->
  <section class="screen activa" id="scr-dashboard">
    <div class="kpis" id="stats"></div>

    <div class="card" id="lote">
      <h2>Lote del día</h2>
      <p class="sub">Prepara tu lote diario (nunca se repiten los enviados) y genera sus landings, capturas y copys.</p>
      <div class="row">
        <input type="number" id="lote-n" value="10" min="1" max="50" style="width:92px">
        <button class="prim" data-accion="preparar">Preparar lote</button>
        <button data-accion="generar">Generar capturas y reporte</button>
        <button class="danger" data-accion="vaciar">Vaciar lote</button>
      </div>
    </div>

    <div class="card" id="scrapers">
      <h2>Ampliar base</h2>
      <p class="sub">Scrapea el directorio formal de Chiriquí o Google Maps/Places (con coordenadas reales).</p>
      <div class="row">
        <button data-accion="scrape">↻ Scrapear CAMCHI</button>
        <button data-accion="gmaps">↻ Scrapear Google Maps</button>
        <button data-accion="places">☆ Scrapear Google Places</button>
      </div>
    </div>
  </section>

  <!-- ============ PROSPECTOS ============ -->
  <section class="screen" id="scr-prospectos">
    <div class="card">
      <h2>Prospectos del lote</h2>
      <p class="sub">Los que estás enviando hoy. Revisa, envía y marca.</p>
      <div id="lote-list"></div>
    </div>

    <div class="card">
      <h2>Todos los prospectos</h2>
      <p class="sub">Control total de tu base. El prototipo de cualquier prospecto se regenera solo si falta.</p>
      <div class="row" style="margin-bottom:14px">
        <input id="q" placeholder="Buscar negocio…" style="min-width:220px">
        <select id="f-estado">
          <option value="">Todos</option><option value="nuevo">Nuevos</option>
          <option value="en_cola">En cola</option><option value="enviado">Enviados</option>
          <option value="interesado">Interesados</option><option value="cliente">Clientes</option>
          <option value="no_interesado">No interesados</option>
        </select>
        <button data-accion="filtrar">Filtrar</button>
      </div>
      <div class="table-wrap"><div id="tabla"></div></div>
    </div>
  </section>

  <!-- ============ HERRAMIENTAS ============ -->
  <section class="screen" id="scr-herramientas">
    <div class="card">
      <h2>📧 Generador de textos</h2>
      <p class="sub">Email de presentación, respuesta a clientes y cotizaciones (texto o PDF).</p>

      <div class="row">
        <div class="cb" style="position:relative;min-width:280px">
          <input id="txt-buscar" placeholder="🔍 Buscar empresa…" autocomplete="off" style="width:100%">
          <input type="hidden" id="txt-prospecto">
          <div id="txt-lista" class="cb-list hidden"></div>
        </div>
        <button data-accion="txt-email">📧 Email de presentación</button>
        <button data-accion="txt-seg">🔁 Seguimiento / recordatorio</button>
      </div>
      <div id="txt-info" class="muted" style="margin-top:6px;font-weight:700">Selecciona un prospecto…</div>
      <textarea id="txt-out" rows="8" placeholder="Aquí aparecerá tu texto…" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:1px solid var(--line);resize:vertical"></textarea>
      <div class="row" style="margin-top:10px">
        <button data-accion="txt-copiar">📋 Copiar</button>
        <a id="txt-wa" class="btn hidden" target="_blank" rel="noopener">Abrir en WhatsApp ↗</a>
      </div>

      <div style="border-top:1px solid var(--line);margin-top:20px;padding-top:16px">
        <h3 style="margin:0 0 4px">💬 Asistente de respuestas</h3>
        <p class="sub">Pega el mensaje que te escribió el cliente y genera una respuesta sugerida con la oferta.</p>
        <textarea id="resp-in" rows="3" placeholder="Mensaje entrante del cliente…" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);resize:vertical"></textarea>
        <div class="row" style="margin-top:10px"><button data-accion="resp-generar">✨ Generar respuesta</button></div>
        <textarea id="resp-out" rows="8" placeholder="Respuesta sugerida…" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid var(--line);resize:vertical"></textarea>
        <div class="row" style="margin-top:10px">
          <button data-accion="resp-copiar">📋 Copiar</button>
          <a id="resp-wa" class="btn hidden" target="_blank" rel="noopener">Abrir en WhatsApp ↗</a>
        </div>
      </div>

      <div style="border-top:1px solid var(--line);margin-top:20px;padding-top:16px">
        <h3 style="margin:0 0 4px">🧾 Cotizador</h3>
        <p class="sub">Genera la cotización con desglose (landing / catálogo / e-commerce). Precios configurables en .env.</p>
        <div class="row">
          <select id="cot-tipo" style="min-width:200px">
            <option value="landing">Landing de presentación</option>
            <option value="catalogo" selected>Catálogo en línea + WhatsApp</option>
            <option value="ecommerce">Tienda en línea con pagos</option>
          </select>
          <span id="cot-productos-wrap">
            <input type="number" id="cot-productos" placeholder="Nº productos" min="0" value="0" style="width:130px">
          </span>
          <label style="display:flex;align-items:center;gap:6px;font-weight:600"><input type="checkbox" id="cot-mant" checked> Mantenimiento mensual</label>
          <button data-accion="cot-generar">🧾 Generar cotización</button>
        </div>
        <p class="muted" style="margin:8px 0 0">Mantenimiento (B/. 25/mes) incluye: contenido actualizado cuando lo pidas (precios, fotos, productos), soporte directo, respaldo y optimización.</p>
        <textarea id="cot-out" rows="9" placeholder="Cotización…" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid var(--line);resize:vertical"></textarea>
        <div class="row" style="margin-top:10px">
          <button data-accion="cot-copiar">📋 Copiar</button>
          <button data-accion="cot-pdf">📄 Descargar PDF</button>
          <span class="muted" id="cot-info"></span>
        </div>
      </div>
    </div>
  </section>
</div>

<script>
const $=s=>document.querySelector(s);
async function api(url,opts){const r=await fetch(url,opts);return r.json();}
let COPS={};
const COLOR={teal:'#0d9488',orange:'#ea580c',red:'#dc2626',blue:'#2563eb',cyan:'#0891b2',rose:'#e11d48',pink:'#db2777',sky:'#0284c7',amber:'#d97706',green:'#16a34a',violet:'#7c3aed',slate:'#475569'};
function cColor(k){return COLOR[k]||'#0d9488';}
const ICONS={nuevo:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M12 12H3M12 12h9"/></svg>',
  en_cola:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  enviado:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
  interesado:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 3.09L18.5 4l.41 3.09L22 9l-1.59 3.09L22 15l-3.09 1.41L18.5 19.5l-3.41-.91L12 22l-3.09-3.09-3.41.91L4.91 16.41 1.5 15l1.59-3.09L1.5 9l3.09-1.41L4.91 4.5l3.41.91L12 2Z"/></svg>',
  cliente:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  total:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>'};
const KPICOL={nuevo:'#2563eb',en_cola:'#d97706',enviado:'#94a3b8',interesado:'#059669',cliente:'#ca8a04'};
function badg(e){return '<span class="badge b-'+(e||'nuevo')+'">'+(e||'nuevo')+'</span>';}
function waLink(tel,msg){return 'https://wa.me/'+tel.replace(/\D/g,'')+'?text='+encodeURIComponent(msg);}
function copDe(id){const c=COPS[id];return c?c.copy_whatsapp:'';}
function aviso(msg,tipo){const el=$('#aviso');el.textContent=msg;el.className='aviso'+(tipo==='err'?' av-err':'');}
function acciones(p){
  const est=p.estado||'nuevo';
  const b=(label,accion,extra)=>'<button data-accion="'+accion+'" data-id="'+p.id+'"'+(extra?' data-estado="'+extra+'"':'')+'>'+label+'</button> ';
  if(est==='en_cola') return b('✓ Enviado','enviar')+b('★ Interesado','estado','interesado')+b('Reagendar','estado','reagendar')+b('No','estado','no_interesado');
  if(est==='enviado') return b('★ Interesado','estado','interesado')+b('Reagendar','estado','reagendar')+b('No','estado','no_interesado');
  if(est==='interesado') return b('✓ Cerrar (Cliente)','estado','cliente')+b('No','estado','no_interesado');
  if(est==='reagendar') return b('★ Interesado','estado','interesado')+b('No','estado','no_interesado');
  if(est==='no_interesado') return b('↩ Reactivar','estado','nuevo');
  if(est==='cliente') return b('↩ Reabrir','estado','nuevo');
  return '';
}

/* ---------- Navegación entre páginas (sidebar) ---------- */
const TITULOS={dashboard:'Dashboard',prospectos:'Prospectos',herramientas:'Herramientas'};
document.querySelectorAll('.side-nav a[data-pantalla]').forEach(a=>{
  a.addEventListener('click',(e)=>{
    e.preventDefault();
    const p=a.dataset.pantalla;
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('activa'));
    const scr=document.getElementById('scr-'+p);
    if(scr) scr.classList.add('activa');
    document.querySelectorAll('.side-nav a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    $('#page-title').textContent=TITULOS[p]||'Dashboard';
    window.scrollTo(0,0);
  });
});

async function loadStats(t){
  const s=$('#stats'); s.innerHTML='';
  const orden=[['nuevo','Nuevos'],['en_cola','En cola'],['enviado','Enviados'],['interesado','★ Interesados'],['cliente','✓ Clientes']];
  orden.forEach(([k,label])=>{
    const c=KPICOL[k]||'#64748b';
    const d=document.createElement('div'); d.className='kpi';
    d.innerHTML='<div class="kpi-ic" style="background:'+c+'1a;color:'+c+'">'+(ICONS[k]||ICONS.total)+'</div>'+
      '<div><b>'+(t[k]||0)+'</b><span>'+label+'</span></div>';
    s.appendChild(d);
  });
}

async function cargarFotos(id){
  const r=await api('/api/prospectos/'+id+'/fotos');
  const el=$('#f-'+id); if(!el) return;
  el.innerHTML=r.fotos.length
    ? r.fotos.map(f=>'<img data-accion="foto" data-src="'+f+'" src="'+f+'">').join('')
    : '<span class="muted">Sin capturas — usa "Prototipo ↗" para regenerar.</span>';
}

async function loadLote(){
  const r=await api('/api/prospectos?estado=en_cola');
  const box=$('#lote-list');
  if(!r.prospectos.length){ box.innerHTML='<div class="empty">Sin lote preparado. Ve a Dashboard → Preparar lote.</div>'; return; }
  box.innerHTML=r.prospectos.map(p=>{
    const c=cColor(p.color_accent);
    return '<div class="p-card" style="border-left:3px solid '+c+'">'+
      '<div class="p-top">'+
        '<span class="p-ava" style="background:linear-gradient(135deg,'+c+',color-mix(in srgb,'+c+' 70%,#0f172a))">'+p.nombre_negocio.charAt(0)+'</span>'+
        '<div><div class="p-name">'+p.nombre_negocio+'</div><div class="p-meta">'+p.tipo+' · '+p.whatsapp+'</div></div>'+
        badg(p.estado)+
      '</div>'+
      (copDe(p.id)?'<div class="copy">'+copDe(p.id)+'</div>':'')+
      '<div class="fotos" id="f-'+p.id+'"><span class="muted">cargando…</span></div>'+
      '<div class="p-actions">'+
        acciones(p)+
        '<button data-accion="prototipo" data-id="'+p.id+'">Prototipo ↗</button>'+
        '<a class="btn" href="/api/prospectos/'+p.id+'/descargar-todo">Descargar todo ⬇</a>'+
      '</div></div>';
  }).join('');
  r.prospectos.forEach(p=>cargarFotos(p.id));
}

async function cargarTabla(){
  const q=encodeURIComponent($('#q').value), est=$('#f-estado').value;
  const r=await api('/api/prospectos?q='+q+'&estado='+est);
  $('#tabla').innerHTML=r.prospectos.length?(
    '<table><thead><tr><th>Negocio</th><th>Tipo</th><th>Estado</th><th>Teléfono</th><th>Acciones</th></tr></thead><tbody>'+
    r.prospectos.map(p=>{
      const c=cColor(p.color_accent);
      return '<tr>'+
        '<td><span class="t-name"><span class="t-dot" style="background:'+c+'"></span>'+p.nombre_negocio+'</span></td>'+
        '<td>'+p.tipo+'</td><td>'+badg(p.estado)+'</td><td>'+p.whatsapp+'</td>'+
        '<td>'+acciones(p)+
        '<button data-accion="prototipo" data-id="'+p.id+'">Prototipo</button> '+
        '<a class="btn" href="/api/prospectos/'+p.id+'/descargar-todo">Descargar todo ⬇</a>'+
        '</td></tr>';
    }).join('')+'</tbody></table>'
  ):('<div class="empty">No hay prospectos con ese filtro.</div>');
}

async function refrescar(){
  const r=await api('/api/prospectos');
  loadStats(r.totales);
  COPS=(await api('/api/copys')).copys.reduce((m,c)=>(m[c.id]=c,m),{});
  const s=await api('/api/estado');
  const st=$('#status'); st.className='pill st-'+s.estado; st.textContent=s.estado+(s.estado==='corriendo'?'…':'');
  loadLote(); cargarTabla(); poblarSelect();
}

let PROS={};
function prosTel(id){ return PROS[id]?PROS[id].whatsapp:''; }
async function poblarSelect(){
  const r=await api('/api/prospectos');
  PROS={};
  r.prospectos.forEach(p=>PROS[p.id]={whatsapp:p.whatsapp,nombre:p.nombre_negocio,estado:p.estado||'nuevo'});
  const sel=$('#txt-prospecto').value;
  if(sel && PROS[sel]){ $('#txt-buscar').value=PROS[sel].nombre; }
  else { $('#txt-prospecto').value=''; $('#txt-buscar').value=''; }
  mostrarInfoSel();
}
function filtrarLista(){
  const q=$('#txt-buscar').value.toLowerCase();
  const lista=$('#txt-lista');
  const items=Object.entries(PROS)
    .filter(([,pr])=>pr.nombre.toLowerCase().includes(q))
    .sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre))
    .slice(0,30)
    .map(([id,pr])=>'<div class="cb-item" data-id="'+id+'"><span>'+pr.nombre+'</span><span class="st">'+pr.estado+'</span></div>');
  lista.innerHTML=items.join('')||'<div class="cb-item" style="color:var(--muted)">Sin resultados</div>';
  lista.classList.remove('hidden');
}
$('#txt-buscar').addEventListener('focus',filtrarLista);
$('#txt-buscar').addEventListener('input',filtrarLista);
$('#txt-buscar').addEventListener('blur',()=>setTimeout(()=>$('#txt-lista').classList.add('hidden'),150));
function seleccionarItem(e){
  const it=e.target.closest('.cb-item');
  if(!it) return;
  const id=it.dataset.id;
  const pr=PROS[id];
  if(!id||!pr) return;
  $('#txt-prospecto').value=id;
  $('#txt-buscar').value=pr.nombre;
  $('#txt-lista').classList.add('hidden');
  mostrarInfoSel();
}
$('#txt-lista').addEventListener('mousedown',(e)=>{ e.preventDefault(); seleccionarItem(e); });
$('#txt-lista').addEventListener('click',(e)=>{ seleccionarItem(e); });
document.addEventListener('click',(e)=>{
  if(!e.target.closest('.cb')) $('#txt-lista').classList.add('hidden');
});
function mostrarInfoSel(){
  const id=$('#txt-prospecto').value, info=$('#txt-info');
  const pr=PROS[id];
  info.textContent=pr
    ? 'Seleccionado: '+pr.nombre+' · '+pr.estado+' · Tel: '+pr.whatsapp
    : 'Busca y selecciona una empresa…';
  info.style.color= pr? '#0d9488':'#b45309';
}

// Cotizador: mostrar/ocultar el campo de productos según el tipo de proyecto.
function cotToggle(){
  const wrap=$('#cot-productos-wrap');
  wrap.style.display=($('#cot-tipo').value==='catalogo')?'':'none';
}
$('#cot-tipo').addEventListener('change', cotToggle);
cotToggle();

async function estado(id,e){ await api('/api/prospectos/'+id+'/estado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado:e})}); refrescar(); }
async function enviar(id){ await estado(id,'enviado'); }

document.addEventListener('click', async (ev)=>{
  const b=ev.target.closest('[data-accion]');
  if(!b) return;
  const accion=b.dataset.accion, id=b.dataset.id, est=b.dataset.estado;
  if(accion==='preparar'){
    aviso('Preparando lote…');
    const r=await api('/api/lote/preparar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({n:+$('#lote-n').value})});
    aviso('✓ '+r.mensaje+(r.n?' · Pulsa "Generar capturas y reporte".':''));
    refrescar();
  }
  else if(accion==='generar'){
    aviso('⏳ Generando landings, capturas y copys… (tarda unos minutos)');
    await api('/api/generar',{method:'POST'});
    aviso('✓ Listo. Revisa cada tarjeta, envía y marca "Enviado".');
    refrescar();
  }
  else if(accion==='vaciar'){
    await api('/api/lote/vaciar',{method:'POST'});
    aviso('Lote vaciado (los prospectos vuelven a "nuevo").');
    refrescar();
  }
  else if(accion==='scrape'){
    aviso('⏳ Scrapeando CAMCHI… (2-3 min)');
    await api('/api/scrape',{method:'POST'});
    aviso('✓ Scrapeo CAMCHI terminado. Ve a Prospectos y filtra por "Nuevos".');
    refrescar();
  }
  else if(accion==='gmaps'){
    aviso('⏳ Scrapeando Google Maps… (lento, con pausas anti-captcha)');
    await api('/api/gmaps',{method:'POST'});
    aviso('✓ Scrapeo Google Maps terminado.');
    refrescar();
  }
  else if(accion==='places'){
    aviso('⏳ Scrapeando Google Places… (API oficial, rápido)');
    await api('/api/places',{method:'POST'});
    aviso('✓ Scrapeo Google Places terminado.');
    refrescar();
  }
  else if(accion==='recargar'){ aviso('↻ Recargado'); refrescar(); }
  else if(accion==='filtrar'){ cargarTabla(); }
  else if(accion==='enviar'){ enviar(id); }
  else if(accion==='estado'){ estado(id,est); }
  else if(accion==='foto'){ window.open(b.dataset.src); }
  else if(accion==='prototipo'){
    const win=window.open('','_blank');
    const abrir=()=>{ if(win){ win.location='/prototipo/'+id+'/'; } else { window.open('/prototipo/'+id+'/','_blank'); } };
    const check=await fetch('/prototipo/'+id+'/');
    if(check.ok){ abrir(); }
    else{
      aviso('⏳ Regenerando prototipo y fotos de '+id+'… (~15s)');
      await api('/api/prospectos/'+id+'/prototipo',{method:'POST'});
      aviso('✓ Prototipo y fotos listos');
      abrir();
    }
  }
  else if(accion==='txt-email'||accion==='txt-seg'){
    const pid=$('#txt-prospecto').value;
    if(!pid){ aviso('Selecciona un prospecto primero','err'); return; }
    aviso('⏳ Generando texto…');
    const r=await api('/api/texto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,tipo:accion==='txt-email'?'email':'seguimiento'})});
    if(r.ok){
      $('#txt-out').value=r.texto;
      aviso(accion==='txt-email'?'✓ Email listo — cópialo y envíalo.':'✓ Seguimiento listo.');
      const link=$('#txt-wa'); link.href=waLink(prosTel(pid),r.texto); link.classList.remove('hidden');
    } else aviso('Error al generar','err');
  }
  else if(accion==='txt-copiar'){
    const v=$('#txt-out').value;
    if(v){ await navigator.clipboard.writeText(v); aviso('✓ Copiado al portapapeles'); }
    else aviso('Primero genera un texto','err');
  }
  else if(accion==='resp-generar'){
    const pid=$('#txt-prospecto').value, msg=$('#resp-in').value.trim();
    if(!pid){ aviso('Selecciona un prospecto arriba','err'); return; }
    if(!msg){ aviso('Pega primero el mensaje del cliente','err'); return; }
    aviso('⏳ Generando respuesta…');
    const r=await api('/api/respuesta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,mensaje:msg})});
    if(r.ok){
      $('#resp-out').value=r.texto;
      aviso('✓ Respuesta lista.');
      const link=$('#resp-wa'); link.href=waLink(prosTel(pid),r.texto); link.classList.remove('hidden');
    } else aviso('Error al generar','err');
  }
  else if(accion==='resp-copiar'){
    const v=$('#resp-out').value;
    if(v){ await navigator.clipboard.writeText(v); aviso('✓ Copiado al portapapeles'); }
    else aviso('Primero genera una respuesta','err');
  }
  else if(accion==='cot-generar'){
    const pid=$('#txt-prospecto').value;
    if(!pid){ aviso('Selecciona un prospecto en el selector de arriba','err'); return; }
    const tipo=$('#cot-tipo').value, productos=+$('#cot-productos').value||0, mant=$('#cot-mant').checked;
    if(tipo==='catalogo'&&productos<=0){ aviso('Indica el nº de productos del catálogo','err'); return; }
    aviso('⏳ Armando cotización…');
    const r=await api('/api/cotizador',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,tipo,productos,mantenimiento:mant})});
    if(r.ok){
      $('#cot-out').value=r.texto;
      $('#cot-info').textContent='Total: B/. '+r.cotizacion.total.toFixed(2);
      aviso('✓ Cotización lista — cópiala y envíala.');
    } else aviso('Error al cotizar','err');
  }
  else if(accion==='cot-copiar'){
    const v=$('#cot-out').value;
    if(v){ await navigator.clipboard.writeText(v); aviso('✓ Cotización copiada'); }
    else aviso('Primero genera una cotización','err');
  }
  else if(accion==='cot-pdf'){
    const pid=$('#txt-prospecto').value;
    if(!pid){ aviso('Selecciona un prospecto','err'); return; }
    const tipo=$('#cot-tipo').value, productos=+$('#cot-productos').value||0, mant=$('#cot-mant').checked;
    aviso('⏳ Generando PDF…');
    const r=await fetch('/api/cotizador/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,tipo,productos,mantenimiento:mant})});
    if(r.ok){
      const blob=await r.blob();
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='cotizacion_'+pid+'.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
      aviso('✓ PDF descargado');
    } else aviso('Error al generar el PDF','err');
  }
});

$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter') cargarTabla(); });
setInterval(async()=>{
  const s=await api('/api/estado');
  const st=$('#status'); st.className='pill st-'+s.estado; st.textContent=s.estado+(s.estado==='corriendo'?'…':'');
},3000);

refrescar();
</script>
</body>
</html>`;

/** Dashboard de Prospector David — interfaz SaaS moderna (todo por data-*, sin bugs de comillas). */
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

/* ---------- Sidebar ---------- */
.sidebar{position:fixed;inset:0 auto 0 0;width:244px;background:linear-gradient(180deg,#0f172a 0%,#134e4a 130%);color:#e2e8f0;display:flex;flex-direction:column;padding:22px 16px;z-index:30}
.brand{display:flex;align-items:center;gap:11px;padding:0 6px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.brand-logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0e7490);display:grid;place-items:center;font-size:20px;box-shadow:0 4px 14px -4px rgba(20,184,166,.6)}
.brand b{display:block;font-size:15px;letter-spacing:-.01em;color:#fff}
.brand span{font-size:11px;color:#94a3b8}
.side-nav{margin-top:18px;display:flex;flex-direction:column;gap:4px;flex:1}
.side-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;color:#cbd5e1;text-decoration:none;font-weight:600;font-size:13px;transition:.15s}
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

/* ---------- Botones ---------- */
button{font:inherit;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;transition:.15s;font-size:13px}
button:hover{border-color:#cbd5e1;background:#f8fafc;transform:translateY(-1px)}
button:active{transform:translateY(0)}
button.prim{background:linear-gradient(135deg,#14b8a6,#0d9488);border:none;color:#fff;box-shadow:0 6px 16px -6px rgba(13,148,136,.55)}
button.prim:hover{background:linear-gradient(135deg,#0d9488,#0f766e);filter:brightness(1.04)}
button.wa{background:#25D366;border:none;color:#fff;box-shadow:0 6px 16px -6px rgba(37,211,102,.5)}
button.danger{background:#fee2e2;border-color:#fecaca;color:#b91c1c}
button.ghost{border-color:transparent;background:transparent;color:var(--muted)}
a.btn{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--brand);text-decoration:none;font-size:13px;padding:7px 10px;border-radius:9px}
a.btn:hover{background:#f0fdfa}
input,select{font:inherit;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink)}
input:focus,select:focus,button:focus{outline:2px solid rgba(13,148,136,.35);outline-offset:1px;border-color:var(--brand)}

/* ---------- KPIs ---------- */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:22px}
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
.aviso{border-radius:12px;padding:12px 16px;margin-top:14px;font-size:13px;font-weight:600;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;box-shadow:inset 0 2px 6px -4px rgba(34,197,94,.4)}
.av-err{background:#fee2e2;color:#b91c1c;border-color:#fecaca}

/* ---------- Prospectos lote ---------- */
.p-card{border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;background:#fff;transition:.18s;box-shadow:var(--shadow)}
.p-card:hover{box-shadow:var(--shadow-lg)}
.p-top{display:flex;align-items:center;gap:12px}
.p-ava{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:17px;flex-shrink:0}
.p-name{font-weight:700;font-size:14px}
.p-meta{font-size:12px;color:var(--muted);margin-top:2px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;margin-left:auto}
.badge::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
.b-nuevo{background:#dbeafe;color:#1d4ed8}.b-en_cola{background:#fef3c7;color:#b45309}
.b-enviado{background:#dcfce7;color:#15803d}.b-no_interesado{background:#fee2e2;color:#b91c1c}
.b-reagendar{background:#ede9fe;color:#6d28d9}
.copy{white-space:pre-wrap;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:11px;font-size:12px;margin:12px 0;color:#334155;line-height:1.5}
.fotos{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.fotos img{height:66px;border-radius:9px;border:1px solid var(--line);cursor:zoom-in;transition:.15s}
.fotos img:hover{transform:scale(1.04);box-shadow:var(--shadow)}
.p-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}

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
</style>
</head>
<body>
<aside class="sidebar">
  <div class="brand">
    <div class="brand-logo">🎯</div>
    <div><b>Prospector</b><span>David · Chiriquí</span></div>
  </div>
  <nav class="side-nav">
    <a class="active" href="#"><span class="ic">◧</span> Dashboard</a>
    <a href="#lote"><span class="ic">▤</span> Lote del día</a>
    <a href="#prospectos"><span class="ic">☷</span> Prospectos</a>
    <a href="#scrapers"><span class="ic">↻</span> Scrapers</a>
  </nav>
  <div class="side-foot">
    <b><span class="dot"></span>Sistema operativo</b>
    Prospección local · David, Chiriquí<br>
    Genera, captura y envía en un solo lugar.
  </div>
</aside>

<div class="main">
  <header class="topbar">
    <div>
      <h1>Dashboard</h1>
      <p>Prospección local · David, Chiriquí</p>
    </div>
    <div class="top-actions">
      <span id="status" class="pill st-idle">idle</span>
      <button data-accion="recargar">↻ Recargar</button>
    </div>
  </header>

  <section class="kpis" id="stats"></section>

  <section class="card" id="lote">
    <h2>Lote del día</h2>
    <p class="sub">Prepara tu lote diario (nunca se repiten los enviados) y genera sus landings, capturas y copys.</p>
    <div class="row">
      <input type="number" id="lote-n" value="10" min="1" max="50" style="width:92px">
      <button class="prim" data-accion="preparar">Preparar lote</button>
      <button data-accion="generar">Generar capturas y reporte</button>
      <button class="danger" data-accion="vaciar">Vaciar lote</button>
    </div>
    <p id="aviso" class="aviso hidden"></p>
  </section>

  <section class="card" id="scrapers">
    <h2>Ampliar base</h2>
    <p class="sub">Scrapea el directorio formal de Chiriquí o Google Maps (sector informal, con coordenadas).</p>
    <div class="row">
      <button data-accion="scrape">↻ Scrapear CAMCHI</button>
      <button data-accion="gmaps">↻ Scrapear Google Maps</button>
      <button data-accion="places">☆ Scrapear Google Places</button>
    </div>
  </section>

  <section class="card" id="prospectos">
    <h2>Prospectos del lote</h2>
    <p class="sub">Los que estás enviando hoy. Revisa, envía y marca.</p>
    <div id="lote-list"></div>
  </section>

  <section class="card">
    <h2>Todos los prospectos</h2>
    <p class="sub">Control total de tu base. El prototipo de cualquier prospecto se regenera solo si falta.</p>
    <div class="row" style="margin-bottom:14px">
      <input id="q" placeholder="Buscar negocio…" style="min-width:220px">
      <select id="f-estado">
        <option value="">Todos</option><option value="nuevo">Nuevos</option>
        <option value="en_cola">En cola</option><option value="enviado">Enviados</option>
        <option value="no_interesado">No interesados</option>
      </select>
      <button data-accion="filtrar">Filtrar</button>
    </div>
    <div class="table-wrap"><div id="tabla"></div></div>
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
  total:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>'};
const KPICOL={nuevo:'#2563eb',en_cola:'#d97706',enviado:'#10b981',total:'#7c3aed'};
function badg(e){return '<span class="badge b-'+(e||'nuevo')+'">'+(e||'nuevo')+'</span>';}
function waLink(tel,msg){return 'https://wa.me/'+tel.replace(/\D/g,'')+'?text='+encodeURIComponent(msg);}
function copDe(id){const c=COPS[id];return c?c.copy_whatsapp:'';}
function aviso(msg,tipo){const el=$('#aviso');el.textContent=msg;el.className='aviso'+(tipo==='err'?' av-err':'');}

async function loadStats(t){
  const s=$('#stats'); s.innerHTML='';
  ['nuevo','en_cola','enviado','total'].forEach(k=>{
    const c=KPICOL[k];
    const d=document.createElement('div'); d.className='kpi';
    d.innerHTML='<div class="kpi-ic" style="background:'+c+'1a;color:'+c+'">'+ICONS[k]+'</div>'+
      '<div><b>'+t[k]+'</b><span>'+k.replace('_',' ')+'</span></div>';
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
  if(!r.prospectos.length){ box.innerHTML='<div class="empty">Sin lote preparado. Pulsa "Preparar lote" arriba.</div>'; return; }
  box.innerHTML=r.prospectos.map(p=>{
    const c=cColor(p.color_accent);
    const wa=waLink(p.whatsapp,copDe(p.id)||('Hola '+p.nombre_negocio+', vi su sitio web y quiero información.'));
    return '<div class="p-card" style="border-left:3px solid '+c+'">'+
      '<div class="p-top">'+
        '<span class="p-ava" style="background:linear-gradient(135deg,'+c+',color-mix(in srgb,'+c+' 70%,#0f172a))">'+p.nombre_negocio.charAt(0)+'</span>'+
        '<div><div class="p-name">'+p.nombre_negocio+'</div><div class="p-meta">'+p.tipo+' · '+p.whatsapp+'</div></div>'+
        badg(p.estado)+
      '</div>'+
      (copDe(p.id)?'<div class="copy">'+copDe(p.id)+'</div>':'')+
      '<div class="fotos" id="f-'+p.id+'"><span class="muted">cargando…</span></div>'+
      '<div class="p-actions">'+
        '<button class="wa" data-accion="enviar" data-id="'+p.id+'">✓ Marcar enviado</button>'+
        '<a class="btn" target="_blank" rel="noopener" href="'+wa+'">WhatsApp ↗</a>'+
        '<button data-accion="prototipo" data-id="'+p.id+'">Prototipo ↗</button>'+
        '<a class="btn" href="/api/prospectos/'+p.id+'/descargar">Fotos ⬇</a>'+
        '<button class="ghost" data-accion="estado" data-id="'+p.id+'" data-estado="no_interesado">No interesado</button>'+
        '<button class="ghost" data-accion="estado" data-id="'+p.id+'" data-estado="reagendar">Reagendar</button>'+
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
        '<td>'+
        '<button data-accion="prototipo" data-id="'+p.id+'">Prototipo</button> '+
        '<a class="btn" href="/api/prospectos/'+p.id+'/descargar">Fotos ⬇</a> '+
        (p.estado!=='enviado'?'<button data-accion="enviar" data-id="'+p.id+'">Enviado</button> ':'')+
        (p.estado==='enviado'||p.estado==='no_interesado'?'':'<button data-accion="estado" data-id="'+p.id+'" data-estado="no_interesado">No</button>')+
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
  loadLote(); cargarTabla();
}

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
    aviso('✓ Scrapeo CAMCHI terminado. Filtra por "Nuevos".');
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
    const check=await fetch('/prototipo/'+id+'/');
    if(check.ok){ window.open('/prototipo/'+id+'/','_blank'); }
    else{
      aviso('⏳ Regenerando prototipo y fotos de '+id+'… (~15s)');
      await api('/api/prospectos/'+id+'/prototipo',{method:'POST'});
      aviso('✓ Prototipo y fotos listos');
      window.open('/prototipo/'+id+'/','_blank');
    }
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

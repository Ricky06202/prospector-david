/** Dashboard de Prospector David (HTML + vanilla JS). */
export const DASHBOARD = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prospector David</title>
<style>
:root{--a:#0d9488;--b:#0f766e;--g:#f1f5f9;--s:#64748b}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:var(--g);color:#0f172a}
header{background:linear-gradient(90deg,#0d9488,#0e7490);color:#fff;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
header h1{margin:0;font-size:20px}
.stats{display:flex;gap:10px;flex-wrap:wrap}
.stat{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;font-size:13px}
.stat b{display:block;font-size:20px;color:var(--b)}
.wrap{max-width:1100px;margin:20px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:16px}
.card h2{margin:0 0 12px;font-size:16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input,select,button{font:inherit;padding:9px 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff}
button{cursor:pointer;font-weight:600}
button.prim{background:var(--a);border-color:var(--a);color:#fff}
button.wa{background:#25D366;border-color:#25D366;color:#fff}
button.danger{background:#fee2e2;border-color:#fecaca;color:#b91c1c}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}
.b-nuevo{background:#dbeafe;color:#1d4ed8}.b-en_cola{background:#fef3c7;color:#b45309}
.b-enviado{background:#dcfce7;color:#15803d}.b-no_interesado{background:#fee2e2;color:#b91c1c}
.b-reagendar{background:#ede9fe;color:#6d28d9}
.fotos{display:flex;gap:8px;flex-wrap:wrap}
.fotos img{height:64px;border-radius:8px;border:1px solid #e2e8f0;cursor:zoom-in}
.copy{white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:10px;font-size:12px;margin:8px 0}
.muted{color:var(--s);font-size:12px}
#status{border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}
.st-idle{background:#e2e8f0;color:#334155}.st-corriendo{background:#fef3c7;color:#b45309}
.st-listo{background:#dcfce7;color:#15803d}.st-error{background:#fee2e2;color:#b91c1c}
.aviso{border-radius:10px;padding:10px 14px;margin-top:10px;font-size:13px;font-weight:600;background:#dcfce7;color:#15803d}
.av-err{background:#fee2e2;color:#b91c1c}
.hidden{display:none}
</style>
</head>
<body>
<header>
  <h1>🎯 Prospector David</h1>
  <div class="stats" id="stats"></div>
</header>
<div class="wrap">

  <div class="card">
    <h2>Lote del día</h2>
    <div class="row">
      <input type="number" id="lote-n" value="10" min="1" max="50" style="width:90px">
      <button class="prim" id="btn-lote">Preparar lote</button>
      <button id="btn-generar">Generar capturas y reporte</button>
      <button class="danger" id="btn-vaciar">Vaciar lote</button>
      <button id="btn-refresh">↻ Recargar</button>
      <span id="status" class="st-idle">idle</span>
    </div>
    <div class="row" style="margin-top:10px">
      <span class="muted">Ampliar base:</span>
      <button id="btn-scrape">Scrapear CAMCHI</button>
      <button id="btn-gmaps">Scrapear Google Maps</button>
    </div>
    <p id="aviso" class="aviso hidden"></p>
    <p class="muted">Prepara N prospectos nuevos (nunca se repiten los enviados) y los marca "en cola". Después genera sus landings, capturas y copys.</p>
  </div>

  <div class="card">
    <h2>Prospectos del lote</h2>
    <div id="lote" class="muted">Sin lote preparado.</div>
  </div>

  <div class="card">
    <h2>Todos los prospectos</h2>
    <div class="row" style="margin-bottom:12px">
      <input id="q" placeholder="Buscar negocio…" style="min-width:220px">
      <select id="f-estado">
        <option value="">Todos</option><option value="nuevo">Nuevos</option>
        <option value="en_cola">En cola</option><option value="enviado">Enviados</option>
        <option value="no_interesado">No interesados</option>
      </select>
      <button id="btn-filtrar">Filtrar</button>
    </div>
    <div id="tabla"></div>
  </div>

</div>
<script>
const $=s=>document.querySelector(s);
async function api(url,opts){const r=await fetch(url,opts);return r.json();}
let COPS={};

function badg(e){return '<span class="badge b-'+(e||'nuevo')+'">'+(e||'nuevo')+'</span>';}
function waLink(tel,msg){return 'https://wa.me/'+tel.replace(/\\D/g,'')+'?text='+encodeURIComponent(msg);}
function copDe(id){const c=COPS[id];return c?c.copy_whatsapp:'';}

async function loadStats(t){
  $('#stats').innerHTML='';
  ['nuevo','en_cola','enviado'].forEach(k=>{
    const d=document.createElement('div');d.className='stat';
    d.innerHTML='<b>'+t[k]+'</b>'+k.replace('_',' ');$('#stats').appendChild(d);
  });
  const d=document.createElement('div');d.className='stat';d.innerHTML='<b>'+t.total+'</b>total';$('#stats').appendChild(d);
}

function aviso(msg,tipo){
  const el=$('#aviso');
  el.textContent=msg;
  el.className='aviso av-'+(tipo||'ok');
  el.classList.remove('hidden');
}

async function loadLote(){
  const r=await api('/api/prospectos?estado=en_cola');
  const box=$('#lote');
  if(!r.prospectos.length){box.className='muted';box.textContent='Sin lote preparado.';return;}
  box.className='';
  box.innerHTML=r.prospectos.map(p=>{
    const wa=waLink(p.whatsapp,copDe(p.id)||'Hola '+p.nombre_negocio+', vi su sitio web y quiero información.');
    return '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px">'+
      '<div class="row" style="justify-content:space-between"><b>'+p.nombre_negocio+'</b>'+badg(p.estado)+'</div>'+
      '<div class="muted">'+p.tipo+' · '+p.whatsapp+'</div>'+
      (copDe(p.id)?'<div class="copy">'+copDe(p.id)+'</div>':'')+
      '<div class="fotos" id="f-'+p.id+'"><span class="muted">cargando fotos…</span></div>'+
      '<div class="row" style="margin-top:8px">'+
      '<button class="wa" onclick="enviar(\''+p.id+'\')">Marcar enviado</button>'+
      '<a class="button wa" target="_blank" rel="noopener" href="'+wa+'" style="text-decoration:none;color:#fff">Abrir WhatsApp</a>'+
      '<a href="/prototipo/'+p.id+'/" target="_blank" rel="noopener" style="color:var(--b);font-weight:600">Prototipo ↗</a>'+
      '<a href="/api/prospectos/'+p.id+'/descargar" style="color:var(--b);font-weight:600">Descargar fotos ⬇</a>'+
      '<button onclick="estado(\''+p.id+'\',\'no_interesado\')">No interesado</button>'+
      '<button onclick="estado(\''+p.id+'\',\'reagendar\')">Reagendar</button>'+
      '</div></div>';
  }).join('');
  r.prospectos.forEach(p=>cargarFotos(p.id));
}

async function cargarFotos(id){
  const r=await api('/api/prospectos/'+id+'/fotos');
  const el=$('#f-'+id);if(!el)return;
  el.innerHTML=r.fotos.map(f=>'<img src="'+f+'" onclick="window.open(this.src)">').join('')||'<span class="muted">sin capturas</span>';
}

async function cargarTabla(){
  const q=$('#q').value,est=$('#f-estado').value;
  const r=await api('/api/prospectos?q='+encodeURIComponent(q)+'&estado='+est);
  $('#tabla').innerHTML='<table><tr><th>Negocio</th><th>Tipo</th><th>Estado</th><th>Teléfono</th><th>Acciones</th></tr>'+
    r.prospectos.map(p=>'<tr><td><b>'+p.nombre_negocio+'</b></td><td>'+p.tipo+'</td><td>'+badg(p.estado)+
    '<td>'+p.whatsapp+'</td><td>'+
    (p.estado!=='enviado'?'<button onclick="estado(\\''+p.id+'\\',\\'enviado\\')">Enviado</button> ':'')+
    '<button onclick="estado(\\''+p.id+'\\',\\'no_interesado\\')">No</button></td></tr>').join('')+'</table>';
}

async function refrescar(){
  const r=await api('/api/prospectos');
  loadStats(r.totales);
  COPS=(await api('/api/copys')).copys.reduce((m,c)=>(m[c.id]=c,m),{});
  const s=await api('/api/estado');
  const st=$('#status');st.className='st-'+s.estado;st.textContent=s.estado+(s.estado==='corriendo'?'…':'');
  loadLote();cargarTabla();
}
setInterval(async()=>{const s=await api('/api/estado');const st=$('#status');st.className='st-'+s.estado;st.textContent=s.estado+(s.estado==='corriendo'?'…':'');},3000);

async function estado(id,e){await api('/api/prospectos/'+id+'/estado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado:e})});refrescar();}
async function enviar(id){await estado(id,'enviado');}
$('#btn-lote').onclick=async()=>{
  aviso('Preparando lote…');
  const r=await api('/api/lote/preparar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({n:+$('#lote-n').value})});
  aviso('✓ '+r.mensaje+(r.n?' · Pulsa "Generar capturas y reporte".':''));
  refrescar();
};
$('#btn-generar').onclick=async()=>{
  aviso('⏳ Generando landings, capturas y copys… (tarda unos minutos)');
  $('#status').textContent='corriendo…';
  await api('/api/generar',{method:'POST'});
  aviso('✓ Listo. Revisa cada tarjeta, envía por WhatsApp y marca "Enviado".');
  refrescar();
};
$('#btn-vaciar').onclick=async()=>{
  await api('/api/lote/vaciar',{method:'POST'});
  aviso('Lote vaciado (los prospectos vuelven a "nuevo").');
  refrescar();
};
$('#btn-scrape').onclick=async()=>{
  aviso('⏳ Scrapeando CAMCHI… (2-3 min, busca teléfonos +507)');
  $('#status').textContent='corriendo…';
  await api('/api/scrape',{method:'POST'});
  aviso('✓ Scrapeo CAMCHI terminado. Recarga la vista con el filtro "Nuevos".');
  refrescar();
};
$('#btn-gmaps').onclick=async()=>{
  aviso('⏳ Scrapeando Google Maps… (lento, con pausas anti-captcha)');
  $('#status').textContent='corriendo…';
  await api('/api/gmaps',{method:'POST'});
  aviso('✓ Scrapeo Google Maps terminado. Revisa los nuevos.');
  refrescar();
};
$('#btn-filtrar').onclick=cargarTabla;
$('#btn-refresh').onclick=()=>{aviso('↻ Recargado'); refrescar();};
// Auto-refresco cada 10s para mantenerse en sync (sin interrumpir scrapeos/pipeline).
setInterval(async()=>{
  const s=await api('/api/estado');
  if(s.estado!=='corriendo') refrescar();
},10000);
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter')cargarTabla();});
refrescar();
</script>
</body>
</html>`;

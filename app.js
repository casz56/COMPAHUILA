const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const state = {
  currentView: 'inicio',
  activeMarketCategory: 'Todos',
  activeMapType: 'Todos',
  map: null,
  mapLayer: null,
  actors: []
};

const services = [
  ['🌾','Registro y fortalecimiento de oferta','Apoyo para inscripción de productores, organizaciones ACFC, productos, capacidad y documentos.','Ir a la red'],
  ['📘','Asistencia técnica y requisitos','Orientación sobre calidad, inocuidad, fichas técnicas, logística y requisitos para compras públicas.','Ver guías'],
  ['📣','Convocatorias y oportunidades','Publicación de necesidades institucionales, ruedas de negocio y llamadas públicas.','Ver oportunidades'],
  ['🚚','Logística y postcosecha','Puntos de acopio, rutas de entrega, capacidades de almacenamiento y cadena de frío.','Ver servicios'],
  ['〽','Trazabilidad y soporte documental','Evidencia de compra, entrega, factura, acta, validación supervisora y reporte Ley 2046.','Ir a trazabilidad'],
  ['📊','Reportes gerenciales','Indicadores por municipio, operador, producto, contrato y cumplimiento de compra local.','Generar reporte']
];

const community = [
  ['🌱','Historia productiva','Asociaciones de pasifloras del sur del Huila fortalecen su oferta para programas públicos.','Historias'],
  ['📅','Rueda de negocio','Encuentro territorial entre operadores, productores, alcaldías y supervisores.','Agenda'],
  ['📚','Biblioteca Ley 2046','Guías, fichas y orientaciones para compra local, trazabilidad y requisitos sanitarios.','Biblioteca'],
  ['🧭','Ruta de inscripción','Paso a paso para registrar oferta local y asociarla a demanda institucional.','Guías'],
  ['🤝','Comunidad ACFC','Red de organizaciones, cooperativas y asociaciones habilitadas para compra pública local.','Red'],
  ['🔎','Datos abiertos','Consulta de indicadores de compra local, brechas y productores beneficiados.','Reportes']
];

const traceSteps = [
  ['Oferta registrada','Productor u organización ACFC registra producto, capacidad, municipio y documentos.'],
  ['Demanda institucional','Entidad u operador publica necesidad por producto, cantidad, fecha y territorio.'],
  ['Matching territorial','El sistema cruza cercanía, disponibilidad, requisitos y capacidad logística.'],
  ['Pedido','Operador genera solicitud y programa entrega.'],
  ['Entrega','Productor entrega con evidencia, remisión, factura y georreferencia.'],
  ['Validación','Supervisor revisa soporte y aprueba compra local.'],
  ['Reporte Ley 2046','La compra suma a indicadores y trazabilidad gerencial.']
];

function toast(message){
  let t = $('.toast');
  if(!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = message;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2600);
}

function formatMoney(value){
  if(value >= 1e9) return `$ ${(value/1e9).toFixed(1).replace('.',',')} mil M`;
  if(value >= 1e6) return `$ ${(value/1e6).toFixed(1).replace('.',',')} M`;
  return `$ ${Number(value||0).toLocaleString('es-CO')}`;
}

function statusFor(i){ return ['Popular','De temporada','Compra pública','Brecha','ACFC'][i % 5]; }
function roleFor(i){ return ['Oferta','Demanda','Servicio','Supervisor','ACFC','Institucional'][i % 6]; }

function navigate(view){
  state.currentView = view;
  const intro = document.querySelector('.intro-band');
  if (intro) intro.style.display = view === 'inicio' ? 'grid' : 'none';
  $$('.view').forEach(v => v.classList.remove('active-view'));
  $(`#view-${view}`)?.classList.add('active-view');
  $$('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#navMenu')?.classList.remove('open');
  updateNavTheme();
  if(view === 'mapa') setTimeout(()=>{ initMap(); state.map?.invalidateSize(); fitHuila(); }, 180);
  window.scrollTo({top:0, behavior:'smooth'});
}

function updateNavTheme(){
  const nav = $('#siteNav');
  if(!nav) return;
  const dark = state.currentView === 'inicio' && window.scrollY < 60;
  nav.classList.toggle('glass-nav', dark);
  nav.classList.toggle('light', !dark);
  nav.classList.toggle('scrolled', window.scrollY > 60 || !dark);
}

function buildMarket(){
  const cats = ['Todos','Frutas','Pasifloras','Lácteos','Huevos','Carnes','Piscícola','Verduras','Café y cacao','Cereales','Transformados','ACFC','De temporada'];
  $('#marketChips').innerHTML = cats.map(c=>`<button class="chip ${c==='Todos'?'active':''}" data-cat="${c}">${c}</button>`).join('');
  $$('#marketChips .chip').forEach(chip=>chip.addEventListener('click',()=>{
    state.activeMarketCategory = chip.dataset.cat;
    $$('#marketChips .chip').forEach(c=>c.classList.toggle('active', c===chip));
    renderMarket();
  }));
  $('#marketSearch')?.addEventListener('input', renderMarket);
  renderMarket();
}

function renderMarket(){
  const search = ($('#marketSearch')?.value || '').toLowerCase();
  const cat = state.activeMarketCategory;
  const producers = COMPAH.productores || [];
  const items = (COMPAH.productos || []).filter(p=>{
    const hay = `${p.nombre} ${p.categoria}`.toLowerCase().includes(search);
    const matchCat = cat === 'Todos' || p.categoria.includes(cat) || (cat==='Frutas' && p.categoria.includes('Frutas')) || (cat==='Verduras' && p.categoria.includes('Verduras')) || (cat==='ACFC') || (cat==='De temporada');
    return hay && matchCat;
  });
  $('#marketCount').textContent = `${items.length} productos disponibles`;
  $('#marketGrid').innerHTML = items.map((p,i)=>{
    const prod = producers[(i*3)%producers.length] || {};
    const cap = (prod.capacidad || (800+i*120));
    return `<article class="product-tile">
      <div class="product-visual"><span class="badge">${statusFor(i)}</span><span class="emoji">${p.icono || '🌱'}</span></div>
      <div class="product-body">
        <h3>${p.nombre}</h3>
        <p>${prod.nombre || 'Productor local'} · ${prod.municipio || 'Huila'}</p>
        <div class="meta-row"><span>${p.categoria}</span><span>${cap.toLocaleString('es-CO')} ${p.unidad}</span><span>${p.requisito}</span></div>
        <div class="tile-actions"><button class="btn secondary" data-toast="Ficha de ${p.nombre} abierta en modo demo.">Ver ficha</button><button class="btn primary" data-map-product="${p.nombre}">Ver en mapa</button></div>
      </div>
    </article>`;
  }).join('');
  $$('[data-map-product]').forEach(b=>b.addEventListener('click',()=>{ navigate('mapa'); setTimeout(()=>toast(`Mapa filtrado por ${b.dataset.mapProduct}.`),260); }));
  $$('[data-toast]').forEach(bindToast);
}

function buildNetwork(){
  const actors = (COMPAH.productores || []).slice(0,24).map((p,i)=>({...p, role: roleFor(i)}));
  $('#networkGrid').innerHTML = actors.map((a,i)=>`<article class="actor-card">
    <div class="actor-head"><div class="actor-icon">${a.role==='Demanda'?'🏫':a.role==='Servicio'?'🚚':a.role==='Supervisor'?'✅':a.role==='Institucional'?'🏛':'🌱'}</div><span class="chip">${a.role}</span></div>
    <h3>${a.nombre}</h3><p>${a.municipio} · ${a.vereda}</p>
    <div class="meta-row"><span>${a.tipo}</span><span>${a.productos?.[0] || 'Oferta local'}</span><span>${a.estado}</span></div>
    <div class="tile-actions"><button class="btn secondary" data-toast="Perfil de actor abierto en modo demo.">Ver perfil</button><button class="btn primary" data-view-target="mapa">Ver en mapa</button></div>
  </article>`).join('');
}

function buildServices(){
  $('#servicesGrid').innerHTML = services.map(s=>`<article class="service-card"><div class="service-icon">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p><a>${s[3]} →</a></article>`).join('');
}

function buildCommunity(){
  $('#communityGrid').innerHTML = community.map(c=>`<article class="community-card"><div class="community-visual">${c[0]}</div><div><span class="eyebrow">${c[3]}</span><h3>${c[1]}</h3><p>${c[2]}</p><button class="btn secondary" data-toast="Contenido abierto en modo demo.">Leer más</button></div></article>`).join('');
}

function buildTrace(){
  $('#traceFlow').innerHTML = traceSteps.map((s,i)=>`<article class="trace-step"><b>${i+1}</b><h3>${s[0]}</h3><p>${s[1]}</p></article>`).join('');
}

function buildReports(){
  const total = (COMPAH.contratos||[]).reduce((a,c)=>a+c.valorTotal,0);
  const local = (COMPAH.contratos||[]).reduce((a,c)=>a+c.comprasLocales,0);
  const cumplimiento = Math.round(local / ((COMPAH.contratos||[]).reduce((a,c)=>a+c.valorAlimentos,0)||1) * 100);
  const kpis = [
    ['Cumplimiento Ley 2046', `${cumplimiento}%`, 'Meta mínima 30%'],
    ['Valor contractual', formatMoney(total), 'Contratos alimentarios'],
    ['Compra local', formatMoney(local), 'Compra validada'],
    ['Productores visibles', COMPAH.productores.length, 'Red territorial'],
    ['Municipios', '37/37', 'Cobertura Huila'],
    ['Alertas activas', '9', 'Seguimiento']
  ];
  $('#kpiGrid').innerHTML = kpis.map(k=>`<article class="kpi"><small>${k[0]}</small><strong>${k[1]}</strong><span>${k[2]}</span></article>`).join('');
  $('#barChart').innerHTML = (COMPAH.contratos||[]).map(c=>{
    const pct = Math.round(c.comprasLocales / c.valorAlimentos * 100);
    return `<div class="bar"><b>${c.programa}</b><div class="bar-track"><i style="width:${Math.min(100,pct)}%"></i></div><span>${pct}%</span></div>`;
  }).join('');
  const reports = ['Reporte Ley 2046','Reporte por municipio','Reporte por operador','Reporte de productores','Reporte de trazabilidad','Reporte para entes de control'];
  $('#reportsList').innerHTML = reports.map(r=>`<div class="report-row"><b>${r}</b><button class="btn secondary" data-toast="${r} generado en modo demo.">Generar</button></div>`).join('');
}

function buildCommand(){
  const results = [
    ['Mapa de actores','mapa'],['Mercado institucional','mercado'],['Red Compra Local Huila','red'],['Servicios','servicios'],['Trazabilidad','trazabilidad'],['Reportes Ley 2046','reportes'],
    ...(COMPAH.productos||[]).slice(0,8).map(p=>[p.nombre,'mercado']), ...(COMPAH.municipios||[]).slice(0,8).map(m=>[m.nombre,'mapa'])
  ];
  function render(){
    const q = ($('#commandInput')?.value||'').toLowerCase();
    $('#commandResults').innerHTML = results.filter(r=>r[0].toLowerCase().includes(q)).slice(0,12).map(r=>`<button class="command-result" data-view-target="${r[1]}"><span>${r[0]}</span><b>Ir →</b></button>`).join('') || '<p class="fine-dark">Sin resultados.</p>';
  }
  $('#commandInput')?.addEventListener('input', render);
  render();
}

function bindToast(el){
  if(el.dataset.bound) return;
  el.dataset.bound = '1';
  el.addEventListener('click', e=>{ e.stopPropagation(); toast(el.dataset.toast); });
}

function makeActors(){
  const base = (COMPAH.productores||[]).map((p,i)=>({
    ...p,
    markerType: i%7===0?'Demanda':i%9===0?'Servicio':i%11===0?'Certificación':i%5===0?'ACFC':'Oferta',
    numero: (i%4)+1
  }));
  state.actors = base;
}

function initMap(){
  if(!$('#map') || typeof L === 'undefined') return;
  if(!state.map){
    state.map = L.map('map', { zoomControl:true, scrollWheelZoom:true }).setView([2.45,-75.56], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'© OpenStreetMap'}).addTo(state.map);
    state.mapLayer = L.layerGroup().addTo(state.map);
  }
  renderMapActors();
}

function markerClass(t){ return t==='Demanda'?'demand':t==='Servicio'?'service':t==='Certificación'?'cert':'offer'; }
function renderMapActors(){
  if(!state.map || !state.mapLayer) return;
  state.mapLayer.clearLayers();
  const search = ($('#mapSearch')?.value || '').toLowerCase();
  const type = state.activeMapType;
  const filtered = state.actors.filter(a=>{
    const text = `${a.nombre} ${a.municipio} ${a.productos?.join(' ')} ${a.markerType}`.toLowerCase();
    return text.includes(search) && (type==='Todos' || a.markerType===type || (type==='Oferta' && a.markerType==='ACFC'));
  });
  $('#actorsCount').textContent = filtered.length;
  const bounds = [];
  filtered.forEach((a,i)=>{
    const cls = markerClass(a.markerType);
    const icon = L.divIcon({ className:'', html:`<div class="cluster-marker ${cls}">${a.numero}</div>`, iconSize:[42,42], iconAnchor:[21,21] });
    const m = L.marker([a.lat,a.lng], {icon}).addTo(state.mapLayer);
    m.on('mouseover',()=>updateMapPanel(a));
    m.on('click',()=>{ updateMapPanel(a); toast(`Ficha territorial: ${a.nombre}`); });
    bounds.push([a.lat,a.lng]);
  });
  updateMapStats(filtered);
  if(bounds.length>1) state.map.fitBounds(bounds,{padding:[40,40],maxZoom:10});
}
function updateMapPanel(a){
  $('#mapPanelTitle').textContent = a.nombre;
  $('#mapPanelText').innerHTML = `<strong>${a.markerType}</strong> en ${a.municipio}, vereda ${a.vereda}. Producto principal: ${a.productos?.[0]}. Capacidad estimada: ${Number(a.capacidad).toLocaleString('es-CO')} ${a.unidad}. Estado: ${a.estado}.`;
}
function updateMapStats(list){
  const acfc = list.filter(a=>a.tipo==='Organización ACFC').length;
  const cap = list.reduce((s,a)=>s+(+a.capacidad||0),0);
  $('#mapStats').innerHTML = `<div><span>Actores visibles</span><b>${list.length}</b></div><div><span>Municipios</span><b>${new Set(list.map(a=>a.municipio)).size}</b></div><div><span>Organizaciones ACFC</span><b>${acfc}</b></div><div><span>Capacidad agregada</span><b>${cap.toLocaleString('es-CO')}</b></div>`;
}
function fitHuila(){
  if(!state.map) return;
  const pts = (COMPAH.municipios||[]).map(m=>[m.lat,m.lng]);
  if(pts.length) state.map.fitBounds(pts,{padding:[45,45],maxZoom:8});
}

function bindGlobal(){
  $('#entryLoginForm')?.addEventListener('submit', e=>{ e.preventDefault(); $('#loginScreen').classList.add('is-hidden'); $('#app').classList.remove('is-hidden'); updateNavTheme(); });
  $('#entryMoreInfo')?.addEventListener('click',()=>toast('COMPAH conecta oferta local, demanda pública y trazabilidad Ley 2046.'));
  $$('.nav-link,.brand-link,[data-view-target]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.view || el.dataset.viewTarget)));
  $('#mobileMenu')?.addEventListener('click',()=>$('#navMenu').classList.toggle('open'));
  window.addEventListener('scroll', updateNavTheme);
  $('#logoutBtn')?.addEventListener('click',()=>{ $('#app').classList.add('is-hidden'); $('#loginScreen').classList.remove('is-hidden'); });
  $('#fabMain')?.addEventListener('click',()=>$('#fabMenu').classList.toggle('open'));
  $('#openCommand')?.addEventListener('click',()=>{ $('#commandModal').classList.add('open'); $('#commandInput')?.focus(); });
  $('#commandModal')?.addEventListener('click', e=>{ if(e.target.id==='commandModal') e.currentTarget.classList.remove('open'); });
  document.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); $('#commandModal').classList.add('open'); $('#commandInput')?.focus(); } if(e.key==='Escape'){ $('#commandModal')?.classList.remove('open'); $('#fabMenu')?.classList.remove('open'); }});
  document.addEventListener('click', e=>{ const t=e.target.closest('[data-view-target]'); if(t){ navigate(t.dataset.viewTarget); } });
  $$('[data-toast]').forEach(bindToast);
  $('#mapSearch')?.addEventListener('input', renderMapActors);
  $('#fitHuila')?.addEventListener('click', fitHuila);
  $('#toggleMapFilters')?.addEventListener('click',()=>$('#mapFilters').classList.toggle('is-hidden'));
  $$('.map-filter').forEach(f=>f.addEventListener('click',()=>{ state.activeMapType=f.dataset.type; $$('.map-filter').forEach(x=>x.classList.toggle('active',x===f)); renderMapActors(); }));
}

function boot(){
  makeActors();
  buildMarket();
  buildNetwork();
  buildServices();
  buildCommunity();
  buildTrace();
  buildReports();
  buildCommand();
  bindGlobal();
  updateNavTheme();
}

document.addEventListener('DOMContentLoaded', boot);

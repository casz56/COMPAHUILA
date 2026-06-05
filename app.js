const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const money = v => v >= 1e9 ? `$ ${(v/1e9).toLocaleString('es-CO',{maximumFractionDigits:1})} mil M` : `$ ${v.toLocaleString('es-CO')}`;
const number = v => Number(v).toLocaleString('es-CO');
const pct = c => Math.round((c.comprasLocales / c.valorAlimentos) * 100);
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const state = { view:'home', map:null, markers:[], selectedProduct:'Todos', selectedMunicipio:'Todos', selectedMapTab:'territorial', selectedProductCard:null };

const demandByProduct = {
  'Cholupa': 5200, 'Café pergamino': 8400, 'Tilapia': 6200, 'Leche cruda refrigerada': 11800,
  'Carne bovina': 7600, 'Huevos': 4900, 'Plátano': 9800, 'Yuca': 7200, 'Arroz': 13200, 'Cacao': 4400
};

const alertTypes = [
  {name:'Bajo mínimo legal', value:2, status:'bad'},
  {name:'Soportes pendientes', value:3, status:'warn'},
  {name:'Documentos vencidos', value:6, status:'warn'},
  {name:'Baja oferta local', value:4, status:'info'},
  {name:'Compras sin validar', value:4, status:'warn'}
];

function navigate(view){
  state.view=view;
  $$('.view').forEach(v=>v.classList.remove('active-view'));
  $(`#view-${view}`)?.classList.add('active-view');
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('#sidebar').classList.remove('open');
  if(view==='mapa') setTimeout(()=>{ initMap(); fitMapToData(); },120);
  window.scrollTo({top:0,behavior:'smooth'});
}
function fillSelect(el, opts, label='Todos'){ el.innerHTML = label?`<option>${label}</option>`:''; opts.forEach(o=>el.insertAdjacentHTML('beforeend',`<option>${o}</option>`)); }
function statusClass(s){ return ['Validado','Aprobado','Óptimo','Suficiente'].includes(s)?'':'Requiere subsanación Pendiente Observado Seguimiento Media'.includes(s)?'warn':'bad'; }
function complianceClass(v){return v<25?'bad':v<30?'warn':'';}
function getProductStats(product){
  const producers = COMPAH.productores.filter(p=>p.productos.includes(product.nombre));
  const capacity = producers.reduce((a,p)=>a+p.capacidad,0);
  const demand = demandByProduct[product.nombre] || Math.round(capacity*.68 + 1800);
  return { producers, capacity, demand, gap: Math.max(0,demand-capacity), municipios:new Set(producers.map(p=>p.municipio)).size };
}
function showInsight(title, status, text, action){
  $('#kpiInsight').innerHTML = `<div class="insight-title"><strong>${title}</strong><span class="status ${status==='Crítico'?'bad':status==='Seguimiento'?'warn':''}">${status}</span></div><p>${text}</p><p><strong>Acción sugerida:</strong> ${action}</p>`;
}

function renderKpis(){
  const municipiosCubiertos = new Set(COMPAH.productores.map(p=>p.municipio)).size;
  const totalContratos = COMPAH.contratos.reduce((a,c)=>a+c.valorTotal,0);
  const totalLocal = COMPAH.contratos.reduce((a,c)=>a+c.comprasLocales,0);
  const totalAlimentos = COMPAH.contratos.reduce((a,c)=>a+c.valorAlimentos,0);
  const cumplimiento = Math.round(totalLocal/totalAlimentos*100);
  const pendientes = COMPAH.compras.filter(c=>c.estado!=='Aprobado').length;
  const riesgos = COMPAH.contratos.filter(c=>pct(c)<30).length;
  const alertas = riesgos + COMPAH.productores.filter(p=>p.estado!=='Validado').length;
  const kpis = [
    {t:'Cumplimiento Ley 2046',v:`${cumplimiento}%`,p:cumplimiento,s:cumplimiento>=30?'Óptimo':'Crítico',d:'El tablero mide el porcentaje agregado de compra local sobre recursos de alimentos.',a:'Priorizar contratos bajo 30% y validar compras pendientes.'},
    {t:'Compra local acumulada',v:money(totalLocal),p:62,s:'Seguimiento',d:'Valor reportado y validado/parcialmente validado a pequeños productores y ACFC.',a:'Concentrar nuevos pedidos en municipios con oferta suficiente.'},
    {t:'Valor contractual alimentario',v:money(totalContratos),p:76,s:'Óptimo',d:'Universo contractual simulado sujeto a seguimiento de la Ley 2046.',a:'Actualizar contratos activos y separar valor destinado específicamente a alimentos.'},
    {t:'Productores activos',v:number(COMPAH.productores.length),p:92,s:'Óptimo',d:'Base de oferta territorial registrada en los 37 municipios.',a:'Depurar documentación y fortalecer productores con estado de subsanación.'},
    {t:'Municipios cubiertos',v:`${municipiosCubiertos}/37`,p:100,s:'Óptimo',d:'Cobertura territorial completa del prototipo.',a:'Pasar de cobertura nominal a capacidad real por producto y temporada.'},
    {t:'Contratos en riesgo',v:number(riesgos),p:100-riesgos*25,s:riesgos?'Crítico':'Óptimo',d:'Contratos por debajo del mínimo legal del 30%.',a:'Activar plan de compra local y revisión de soportes con supervisores.'},
    {t:'Organizaciones ACFC',v:number(COMPAH.productores.filter(p=>p.tipo==='Organización ACFC').length),p:70,s:'Seguimiento',d:'Actores colectivos con potencial de agregación de oferta.',a:'Verificar composición ACFC y capacidad de cumplimiento contractual.'},
    {t:'Productos ofertados',v:number(COMPAH.productos.length),p:80,s:'Óptimo',d:'Líneas agroalimentarias priorizadas para consulta institucional.',a:'Cruzar oferta con minutas, demanda y fichas técnicas.'},
    {t:'Compras pendientes',v:number(pendientes),p:40,s:'Seguimiento',d:'Compras con soportes pendientes u observados.',a:'Asignar revisión al supervisor y solicitar subsanación documental.'},
    {t:'Alertas activas',v:number(alertas),p:20,s:'Crítico',d:'Alertas contractuales, documentales y territoriales.',a:'Cerrar alertas críticas antes de cortes de reporte.'}
  ];
  $('#kpiGrid').innerHTML = kpis.map((k,i)=>`<article class="kpi-card" data-kpi="${i}"><span class="kpi-status ${k.s==='Crítico'?'bad':k.s==='Seguimiento'?'warn':''}">${k.s}</span><div class="kpi-title">${k.t}</div><div class="kpi-value" title="${k.v}">${k.v}</div><div class="kpi-read">lectura ejecutiva</div><div class="progress-mini ${k.s==='Crítico'?'bad':k.s==='Seguimiento'?'warn':''}"><i style="width:${clamp(k.p,5,100)}%"></i></div></article>`).join('');
  $$('.kpi-card').forEach(card=>card.addEventListener('click',()=>{ $$('.kpi-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); const k=kpis[+card.dataset.kpi]; showInsight(k.t,k.s,k.d,k.a); }));
}

function renderDashboardCharts(){
  $('#contractBars').innerHTML = COMPAH.contratos.map(c=>{ const p=pct(c); return `<div class="hbar-item chart-click" data-title="${c.nombre}" data-status="${p<30?'Crítico':p<50?'Seguimiento':'Óptimo'}" data-text="${c.operador}: ${money(c.comprasLocales)} comprados localmente de ${money(c.valorAlimentos)} destinados a alimentos." data-action="${p<30?'Exigir plan de compra local y revisión semanal de soportes.':'Mantener trazabilidad y documentar compras validadas.'}"><div class="bar-top"><strong>${c.nombre}</strong><span>${p}%</span></div><div class="bar-track"><i class="bar-fill ${complianceClass(p)}" style="width:${clamp(p,3,100)}%"></i></div></div>` }).join('');
  const munTotals = COMPAH.municipios.slice(0,10).map((m,i)=>({name:m.nombre, value: 320 + (i*147)%980, productores: COMPAH.productores.filter(p=>p.municipio===m.nombre).length }));
  const maxMun = Math.max(...munTotals.map(x=>x.value));
  $('#municipioBars').innerHTML = munTotals.map(m=>`<div class="hbar-item chart-click" data-title="${m.name}" data-status="Óptimo" data-text="Municipio con ${m.productores} actores registrados y compra local simulada de ${number(m.value)} millones." data-action="Revisar oferta disponible y cruzar con contratos activos del municipio."><div class="bar-top"><strong>${m.name}</strong><span>${number(m.value)} M</span></div><div class="bar-track"><i class="bar-fill" style="width:${Math.round(m.value/maxMun*100)}%"></i></div></div>`).join('');
  const products = Object.keys(demandByProduct).slice(0,10).map(name=>({name, value:demandByProduct[name]}));
  const maxP = Math.max(...products.map(x=>x.value));
  $('#productBars').innerHTML = products.map(p=>`<div class="vbar chart-click" data-title="${p.name}" data-status="Seguimiento" data-text="Demanda mensual estimada: ${number(p.value)} unidades. Revise oferta local y brecha." data-action="Filtrar producto en mapa y asociarlo a demanda institucional."><i style="height:${Math.round(p.value/maxP*200)}px"></i><span title="${p.name}">${p.name.split(' ')[0]}</span></div>`).join('');
  const maxA=Math.max(...alertTypes.map(a=>a.value));
  $('#alertBars').innerHTML = alertTypes.map(a=>`<div class="hbar-item chart-click" data-title="${a.name}" data-status="${a.status==='bad'?'Crítico':'Seguimiento'}" data-text="${a.value} eventos identificados en el prototipo." data-action="Filtrar alertas, asignar responsable y actualizar estado de gestión."><div class="bar-top"><strong>${a.name}</strong><span>${a.value}</span></div><div class="bar-track"><i class="bar-fill ${a.status==='bad'?'bad':a.status==='warn'?'warn':''}" style="width:${Math.round(a.value/maxA*100)}%"></i></div></div>`).join('');
  $$('.chart-click').forEach(el=>el.addEventListener('click',()=>showInsight(el.dataset.title,el.dataset.status,el.dataset.text,el.dataset.action)));
}

function renderAlerts(){
  const alerts = [
    ...COMPAH.contratos.filter(c=>pct(c)<30).map(c=>({type:'Contractual',level:'Crítica',title:c.nombre,desc:`Cumplimiento actual ${pct(c)}%. Debe alcanzar mínimo 30%.`,action:'Revisar plan de compras locales',target:'contratos'})),
    ...COMPAH.productores.filter(p=>p.estado!=='Validado').slice(0,6).map(p=>({type:'Documental',level:'Media',title:p.nombre,desc:`${p.municipio}: documentos o requisitos sanitarios pendientes.`,action:'Solicitar subsanación',target:'productores'})),
    {type:'Territorial',level:'Media',title:'Brecha de oferta en pasifloras',desc:'Demanda institucional superior a oferta registrada en municipios priorizados.',action:'Activar rueda de negocio',target:'mapa'}
  ];
  $('#alertList').innerHTML = alerts.map((a,i)=>`<article class="alert-card" data-i="${i}"><div class="alert-head"><span class="status ${a.level==='Crítica'?'bad':'warn'}">${a.level}</span><span class="tag">${a.type}</span></div><h3>${a.title}</h3><p>${a.desc}</p><button class="btn secondary" data-view-target="${a.target}">${a.action}</button></article>`).join('');
  $$('.alert-card').forEach((card,i)=>card.addEventListener('click',e=>{ if(e.target.matches('button'))return; const a=alerts[i]; showInsight(a.title,a.level==='Crítica'?'Crítico':'Seguimiento',a.desc,a.action); }));
}

function filterMapData(){
  const product=$('#mapProductFilter').value||'Todos'; const region=$('#mapRegionFilter').value||'Todas las regiones'; const municipio=$('#mapMunicipioFilter').value||'Todos los municipios'; const actor=$('#mapActorFilter').value||'Todos los actores';
  return COMPAH.productores.filter(p=>(product==='Todos'||p.productos.includes(product))&&(region==='Todas las regiones'||p.region===region)&&(municipio==='Todos los municipios'||p.municipio===municipio)&&(actor==='Todos los actores'||p.tipo===actor));
}
function initMap(){
  if(!window.L){ $('#map').innerHTML='<div class="panel"><h3>Mapa no disponible</h3><p>Conecte internet para cargar Leaflet/OpenStreetMap.</p></div>'; return; }
  if(!state.map){ state.map=L.map('map',{zoomControl:true}).setView([2.45,-75.65],8); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(state.map); }
  setTimeout(()=>state.map.invalidateSize(),60);
  drawMarkers();
}
function drawMarkers(){
  if(!state.map)return; const data=filterMapData();
  state.markers.forEach(m=>m.remove()); state.markers=[];
  data.forEach(p=>{ const icon=L.divIcon({className:'',html:`<div class="custom-marker ${p.tipo==='Organización ACFC'?'org':''}"></div>`,iconSize:[18,18],iconAnchor:[9,9]}); const m=L.marker([p.lat,p.lng],{icon}).addTo(state.map); m.on('mouseover',()=>updateMapReading(p)); m.on('click',()=>updateMapReading(p,true)); state.markers.push(m); });
  updateMapSummary(data); if(data.length) fitMapToData();
}
function fitMapToData(){ if(!state.map||!state.markers.length)return; const g=L.featureGroup(state.markers); state.map.fitBounds(g.getBounds().pad(.28)); setTimeout(()=>state.map.invalidateSize(),80); }
function updateMapSummary(data=filterMapData()){
  $('#mapSummary').innerHTML = `<div><strong>Productores visibles</strong><span>${data.length}</span></div><div><strong>Municipios</strong><span>${new Set(data.map(p=>p.municipio)).size}</span></div><div><strong>Organizaciones ACFC</strong><span>${data.filter(p=>p.tipo==='Organización ACFC').length}</span></div><div><strong>Capacidad agregada</strong><span>${number(data.reduce((a,p)=>a+p.capacidad,0))}</span></div>`;
  $('#mapReading').innerHTML = `<strong>${$('#mapProductFilter').value||'Todos los productos'}</strong><p>Filtre por producto, región o municipio. Al pasar el cursor sobre un marcador se actualizará esta lectura sin tapar el mapa.</p>`;
}
function updateMapReading(p,clicked=false){
  $('#mapReading').innerHTML = `<strong>${p.nombre}</strong><p>${p.tipo} · ${p.municipio} · Región ${p.region}</p><p><b>Productos:</b> ${p.productos.join(', ')}<br><b>Capacidad:</b> ${number(p.capacidad)} ${p.unidad}<br><b>Estado:</b> ${p.estado}<br><b>Potencial:</b> ${p.estado==='Validado'?'Apto para contacto institucional':'Requiere subsanación antes de compra'}</p>${clicked?'<span class="tag">Seleccionado</span>':''}`;
}

function renderMunicipios(){
  $('#municipioGrid').innerHTML = COMPAH.municipios.map((m,i)=>{ const ps=COMPAH.productores.filter(p=>p.municipio===m.nombre); return `<button class="municipio-btn" data-mun="${m.nombre}"><strong>${m.nombre}</strong><span>${m.region} · ${ps.length} actores · ${ps[0]?.productos[0]||'Oferta'}</span></button>`; }).join('');
  $$('.municipio-btn').forEach(btn=>btn.addEventListener('click',()=>selectMunicipio(btn.dataset.mun)));
  selectMunicipio(COMPAH.municipios[0].nombre);
}
function selectMunicipio(name){
  state.selectedMunicipio=name; $$('.municipio-btn').forEach(b=>b.classList.toggle('active',b.dataset.mun===name));
  const m=COMPAH.municipios.find(x=>x.nombre===name); const ps=COMPAH.productores.filter(p=>p.municipio===name); const products=[...new Set(ps.flatMap(p=>p.productos))];
  $('#municipioFicha').innerHTML = `<span class="eyebrow">Ficha municipal</span><h3>${name}</h3><p>Subregión ${m.region}. Lectura territorial para compra pública local.</p><div class="metric-list"><div><strong>Productores activos</strong><span>${ps.length}</span></div><div><strong>Organizaciones ACFC</strong><span>${ps.filter(p=>p.tipo==='Organización ACFC').length}</span></div><div><strong>Productos destacados</strong><span>${products.slice(0,3).join(', ')}</span></div><div><strong>Capacidad agregada</strong><span>${number(ps.reduce((a,p)=>a+p.capacidad,0))}</span></div></div><button class="btn primary" id="focusMunicipio">Ver en mapa</button>`;
  $('#focusMunicipio').onclick=()=>{ navigate('mapa'); setTimeout(()=>{ $('#mapMunicipioFilter').value=name; drawMarkers(); },180); };
}
function renderOfferDemand(){
  $('#offerDemandGrid').innerHTML = COMPAH.productos.slice(0,8).map(p=>{ const s=getProductStats(p); return `<article class="feature-card"><span>${p.icono}</span><h3>${p.nombre}</h3><p>Oferta: ${number(s.capacity)} ${p.unidad}<br>Demanda estimada: ${number(s.demand)} ${p.unidad}<br>Municipios: ${s.municipios}</p><button class="btn secondary" data-product-map="${p.nombre}">Analizar en mapa</button></article>`; }).join('');
  $$('[data-product-map]').forEach(b=>b.onclick=()=>{ navigate('mapa'); setTimeout(()=>{ $('#mapProductFilter').value=b.dataset.productMap; drawMarkers(); },180); });
}
function renderGaps(){
  $('#gapGrid').innerHTML = COMPAH.productos.map(p=>{ const s=getProductStats(p); const st=s.gap>0?'Seguimiento':'Suficiente'; return `<article class="feature-card"><span class="status ${s.gap>0?'warn':''}">${st}</span><h3>${p.nombre}</h3><p>Brecha estimada: <b>${number(s.gap)} ${p.unidad}</b><br>Capacidad: ${number(s.capacity)} · Demanda: ${number(s.demand)}</p></article>`; }).join('');
}

function renderProducts(){
  const search=($('#productSearch')?.value||'').toLowerCase(); const cat=$('#productCategoryFilter')?.value||'Todas las categorías';
  const products=COMPAH.productos.filter(p=>(cat==='Todas las categorías'||p.categoria===cat)&&`${p.nombre} ${p.categoria}`.toLowerCase().includes(search));
  $('#productCatalog').innerHTML=products.map(p=>{ const s=getProductStats(p); const status=s.gap>0?'Seguimiento':'Suficiente'; return `<article class="product-card" data-product="${p.nombre}"><div class="product-icon">${p.icono}</div><h3>${p.nombre}</h3><p><b>Categoría:</b> ${p.categoria}<br><b>Unidad:</b> ${p.unidad}<br><b>Requisito:</b> ${p.requisito}</p><div class="product-stats"><span class="tag">${s.producers.length} actores</span><span class="tag">${s.municipios} municipios</span><span class="status ${status==='Seguimiento'?'warn':''}">${status}</span></div></article>`; }).join('');
  $$('.product-card').forEach(card=>card.addEventListener('click',()=>selectProduct(card.dataset.product)));
  if(!state.selectedProductCard && products[0]) selectProduct(products[0].nombre); else if(state.selectedProductCard) selectProduct(state.selectedProductCard);
}
function selectProduct(name){
  state.selectedProductCard=name; $$('.product-card').forEach(c=>c.classList.toggle('active',c.dataset.product===name));
  const p=COMPAH.productos.find(x=>x.nombre===name); if(!p)return; const s=getProductStats(p);
  $('#productReading').innerHTML=`<span class="eyebrow">Lectura de línea agroalimentaria</span><h3>${p.icono} ${p.nombre}</h3><p>Panel integrado no invasivo para análisis contractual y territorial.</p><div class="metric-list"><div><strong>Categoría</strong><span>${p.categoria}</span></div><div><strong>Municipios productores</strong><span>${s.municipios}</span></div><div><strong>Capacidad agregada</strong><span>${number(s.capacity)} ${p.unidad}</span></div><div><strong>Demanda estimada</strong><span>${number(s.demand)} ${p.unidad}</span></div><div><strong>Brecha</strong><span>${number(s.gap)} ${p.unidad}</span></div></div><p><b>Recomendación:</b> ${s.gap>0?'Activar rueda de negocio y fortalecer oferta local antes de comprometer minutas.':'Producto con capacidad suficiente para cruces de demanda pública.'}</p><div class="button-row"><button class="btn primary" id="productToMap">Analizar en mapa</button><button class="btn secondary" id="productToProducers">Ver productores</button></div>`;
  $('#productToMap').onclick=()=>{ navigate('mapa'); setTimeout(()=>{ $('#mapProductFilter').value=name; drawMarkers(); },180); };
  $('#productToProducers').onclick=()=>{ navigate('productores'); setTimeout(()=>{ $('#producerSearch').value=name; renderProducers(); },80); };
}

function renderProducers(){
  const search=($('#producerSearch')?.value||'').toLowerCase(); const mun=$('#producerMunicipioFilter')?.value||'Todos'; const tipo=$('#producerTipoFilter')?.value||'Todos';
  const rows=COMPAH.productores.filter(p=>(mun==='Todos'||p.municipio===mun)&&(tipo==='Todos'||p.tipo===tipo)&&`${p.nombre} ${p.municipio} ${p.productos.join(' ')}`.toLowerCase().includes(search));
  $('#producerTable').innerHTML=rows.map(p=>`<tr><td><strong>${p.nombre}</strong><br><small>Vereda ${p.vereda}</small></td><td>${p.municipio}<br><small>${p.region}</small></td><td>${p.tipo}</td><td>${p.productos.map(x=>`<span class="tag">${x}</span>`).join(' ')}</td><td>${number(p.capacidad)} ${p.unidad}</td><td><span class="status ${p.estado==='Validado'?'':'warn'}">${p.estado}</span></td></tr>`).join('');
}
function renderContracts(){
  $('#contractsGrid').innerHTML=COMPAH.contratos.map(c=>{ const p=pct(c); return `<article class="contract-card"><div class="alert-head"><h3>${c.nombre}</h3><span class="status ${p<30?'bad':p<50?'warn':''}">${p<30?'Riesgo':p<50?'Seguimiento':'Cumple'}</span></div><div class="contract-meta"><span><b>Entidad:</b> ${c.entidad}</span><span><b>Operador:</b> ${c.operador}</span><span><b>Supervisor:</b> ${c.supervisor}</span><span><b>Valor alimentos:</b> ${money(c.valorAlimentos)}</span><span><b>Compra local:</b> ${money(c.comprasLocales)}</span></div><div class="progress-line"><div style="width:${clamp(p,3,100)}%;background:${p<30?'var(--danger)':p<50?'var(--warn)':'var(--teal)'}"></div></div><strong>${p}% Ley 2046</strong></article>`;}).join('');
}
function renderPurchases(){
  $('#purchaseTable').innerHTML=COMPAH.compras.map(p=>{ const c=COMPAH.contratos.find(x=>x.id===p.contratoId); const prod=COMPAH.productores.find(x=>x.id===p.productorId); return `<tr><td>${p.fecha}</td><td>${c?.nombre}</td><td><strong>${prod?.nombre}</strong><br><small>${prod?.municipio}</small></td><td>${p.producto}</td><td>${number(p.cantidad)} ${p.unidad}</td><td>${money(p.valor)}</td><td><span class="status ${p.estado==='Aprobado'?'':p.estado==='Observado'?'warn':'info'}">${p.estado}</span></td></tr>`;}).join('');
}
function renderSupervision(){
  const pending=COMPAH.compras.filter(p=>p.estado!=='Aprobado');
  $('#supervisionList').innerHTML=pending.map(p=>{ const c=COMPAH.contratos.find(x=>x.id===p.contratoId); const prod=COMPAH.productores.find(x=>x.id===p.productorId); return `<article class="supervision-card"><div><h3>${p.producto} · ${money(p.valor)}</h3><p><b>Contrato:</b> ${c?.nombre}<br><b>Productor:</b> ${prod?.nombre} · ${prod?.municipio}<br><b>Soporte:</b> Factura/remisión simulada · <span class="status warn">${p.estado}</span></p></div><div class="supervision-actions"><button class="btn primary">Aprobar</button><button class="btn secondary">Observar</button><button class="btn secondary">Rechazar</button></div></article>`;}).join('') || '<div class="panel"><h3>Sin pendientes</h3><p>Todas las compras están aprobadas.</p></div>';
}
function renderReports(){
  const reports=['Informe Ley 2046','Reporte por contrato','Reporte municipal','Compras por producto','Alertas críticas','Datos abiertos agregados'];
  $('#reportsGrid').innerHTML=reports.map(r=>`<article class="feature-card"><span>📊</span><h3>${r}</h3><p>Generación simulada en PDF, Excel o CSV para uso institucional.</p><button class="btn secondary">Generar</button></article>`).join('');
}

function setupCommandCenter(){
  const open=()=>{ $('#commandCenter').classList.add('open'); $('#commandCenter').setAttribute('aria-hidden','false'); $('#commandInput').focus(); renderCommandResults(''); };
  const close=()=>{ $('#commandCenter').classList.remove('open'); $('#commandCenter').setAttribute('aria-hidden','true'); };
  $('#openCommand').onclick=open; $('#quickSearch').onclick=open; $('#closeCommand').onclick=close;
  document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); open(); } if(e.key==='Escape') close(); });
  $('#commandCenter').addEventListener('click',e=>{ if(e.target.id==='commandCenter') close(); });
  $('#commandInput').addEventListener('input',e=>renderCommandResults(e.target.value));
}
function renderCommandResults(q){
  q=q.toLowerCase();
  const items=[...COMPAH.productos.map(p=>({type:'Producto',name:p.nombre,view:'productos'})),...COMPAH.municipios.map(m=>({type:'Municipio',name:m.nombre,view:'mapa'})),...COMPAH.productores.map(p=>({type:'Productor',name:p.nombre,view:'productores'})),...COMPAH.contratos.map(c=>({type:'Contrato',name:c.nombre,view:'contratos'})),{type:'Sección',name:'Dashboard gerencial',view:'dashboard'},{type:'Sección',name:'Alertas prioritarias',view:'dashboard'}].filter(i=>`${i.type} ${i.name}`.toLowerCase().includes(q)).slice(0,18);
  $('#commandResults').innerHTML=items.map(i=>`<div class="command-result" data-view="${i.view}" data-name="${i.name}"><div><strong>${i.name}</strong><br><small>${i.type}</small></div><span>Ir</span></div>`).join('');
  $$('.command-result').forEach(r=>r.onclick=()=>{ $('#commandCenter').classList.remove('open'); navigate(r.dataset.view); if(r.dataset.view==='mapa') setTimeout(()=>{ if(COMPAH.municipios.some(m=>m.nombre===r.dataset.name)){$('#mapMunicipioFilter').value=r.dataset.name; drawMarkers();} if(COMPAH.productos.some(p=>p.nombre===r.dataset.name)){$('#mapProductFilter').value=r.dataset.name; drawMarkers();} },180); });
}

function initControls(){
  fillSelect($('#mapProductFilter'),COMPAH.productos.map(p=>p.nombre),'Todos');
  fillSelect($('#mapRegionFilter'),[...new Set(COMPAH.municipios.map(m=>m.region))],'Todas las regiones');
  fillSelect($('#mapMunicipioFilter'),COMPAH.municipios.map(m=>m.nombre),'Todos los municipios');
  fillSelect($('#producerMunicipioFilter'),COMPAH.municipios.map(m=>m.nombre),'Todos');
  fillSelect($('#productCategoryFilter'),[...new Set(COMPAH.productos.map(p=>p.categoria))],'Todas las categorías');
  fillSelect($('#registroMunicipio'),COMPAH.municipios.map(m=>m.nombre),'');
  fillSelect($('#registroProducto'),COMPAH.productos.map(p=>p.nombre),'');
  ['mapProductFilter','mapRegionFilter','mapMunicipioFilter','mapActorFilter'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{ drawMarkers(); }));
  ['producerSearch','producerMunicipioFilter','producerTipoFilter'].forEach(id=>$('#'+id)?.addEventListener('input',renderProducers));
  ['productSearch','productCategoryFilter'].forEach(id=>$('#'+id)?.addEventListener('input',renderProducts));
  $$('.map-tab').forEach(tab=>tab.onclick=()=>{ $$('.map-tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active'); $$('.map-tab-content').forEach(c=>c.classList.remove('active')); $(`#mapTab-${tab.dataset.tab}`).classList.add('active'); if(tab.dataset.tab==='territorial') setTimeout(()=>{initMap();fitMapToData();},80); });
  $('#fitHuila').onclick=fitMapToData; $('#showOffer').onclick=()=>updateMapSummary(filterMapData()); $('#clearMap').onclick=()=>{ $('#mapProductFilter').value='Todos'; $('#mapRegionFilter').value='Todas las regiones'; $('#mapMunicipioFilter').value='Todos los municipios'; $('#mapActorFilter').value='Todos los actores'; drawMarkers(); };
}
function initEvents(){
  $('#entryLoginForm').addEventListener('submit',e=>{e.preventDefault(); $('#loginScreen').classList.add('hidden');});
  $('#entryMoreInfo').onclick=()=>alert('COMPAH v2.0 integra oferta local, compras públicas, supervisión y trazabilidad territorial.');
  $('#logoutBtn').onclick=()=>$('#loginScreen').classList.remove('hidden');
  $('#menuToggle').onclick=()=>$('#sidebar').classList.toggle('open');
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
  document.body.addEventListener('click',e=>{ const target=e.target.closest('[data-view-target]'); if(target){ navigate(target.dataset.viewTarget); $('#quickMenu').classList.remove('open'); }});
  $('#assistantButton').onclick=e=>{ e.stopPropagation(); $('#quickMenu').classList.toggle('open'); };
  document.addEventListener('click',e=>{ if(!e.target.closest('#quickMenu')&&!e.target.closest('#assistantButton')) $('#quickMenu').classList.remove('open'); });
  $('#refreshKpis').onclick=()=>{ renderKpis(); renderDashboardCharts(); showInsight('Indicadores actualizados','Óptimo','Los componentes principales fueron recalculados con datos simulados del prototipo.','Validar la información real antes de presentación institucional.'); };
  $('#exportDashboard').onclick=()=>alert('Reporte gerencial simulado generado. En versión productiva exportará PDF/Excel.');
  $('#goAlerts').onclick=()=>document.querySelector('.alerts-panel')?.scrollIntoView({behavior:'smooth'});
  $('#saveDemo').onclick=()=>alert('Registro demo guardado correctamente.');
}
function boot(){
  initControls(); initEvents(); setupCommandCenter();
  renderKpis(); renderDashboardCharts(); renderAlerts(); renderMunicipios(); renderOfferDemand(); renderGaps(); renderProducts(); renderProducers(); renderContracts(); renderPurchases(); renderSupervision(); renderReports();
  showInsight('Cumplimiento Ley 2046','Óptimo','El sistema supera la meta mínima del 30%, pero conserva contratos en riesgo que requieren seguimiento.','Priorizar contratos por debajo del 30% y compras pendientes de validación.');
}
document.addEventListener('DOMContentLoaded',boot);

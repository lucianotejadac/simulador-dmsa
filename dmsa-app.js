/* Simulador DMSA: carga de estaticas, vistas con lateralidad, regiones de interes y funcion renal
   relativa por media geometrica, exportacion PNG y proyecto. Todo local, en el navegador. */
'use strict';
(()=>{
const $=id=>document.getElementById(id),C=RenalCore;
const ORDEN=['Anterior','Posterior','OAD','OAI','OPD','OPI'];
const COLORES={izq:'#e00000',der:'#00a000',fondoIzq:'#d8d800',fondoDer:'#0000d0'};
const E=2; // escala de los lienzos de cuantificacion
const SIGMA_ISO=1; // suavizado (pixeles) solo para trazar isocontornos; las cuentas se miden en la imagen original
const S={caso:null,archivos:[],ignorados:[],seleccion:null,paleta:'grisInv',techo:1,marcadores:{Anterior:{},Posterior:{}},marcaActiva:null,
 rois:{Posterior:{},Anterior:{}},vistaActiva:'Posterior',herramienta:'iso',objetivo:'izq',umbral:.4,poligono:[],
 confirmado:false,exportados:{vistas:false,cuantif:false},proyectoGuardado:false,infoVista:new Set(),paso:0};
const lienzos={vistas:{},cuantif:{}};
let tutorial=null;
function estado(msg){$('status').textContent=msg;}
/* ---------- archivos ---------- */
function reconocido(d){return d.rec&&(S.caso===null||d.rec.caso===S.caso);}
function archivoRol(rol){return S.archivos.find(d=>d.rec&&d.rec.rol===rol&&(S.caso===null||d.rec.caso===S.caso))||null;}
function frameVista(nombre){for(const d of S.archivos){const i=d.vistas.indexOf(nombre);if(i>=0&&(S.caso===null||!d.rec||d.rec.caso===S.caso))return {d,i,img:d.frame(i)};}return null;}
async function cargar(files){
 let nuevos=0;
 for(const f of files){
  if(/\.(png|pdf|txt|zip|docx?)$/i.test(f.name)){S.ignorados.push(f.name+' (no es DICOM)');continue;}
  try{const d=await C.leer(f);
   if(S.archivos.some(x=>x.hash===d.hash)){S.ignorados.push(f.name+' (copia repetida de un archivo ya cargado)');continue;}
   d.rec=dmsaReconocer(d.hash);d.vistas=d.detectores.map(x=>dmsaNormalizaVista(x.vista));S.archivos.push(d);nuevos++;
  }catch(e){S.ignorados.push(f.name+' ('+e.message+')');}
 }
 if(S.caso===null){const r=S.archivos.find(d=>d.rec);if(r&&tutorial)tutorial.setCaso(r.rec.caso);}
 estado(nuevos?nuevos+' archivo(s) cargado(s).':'No se cargó ningún archivo nuevo.');
 refrescar();
}
function faltantes(){return ['ap','oad','oai'].filter(r=>!archivoRol(r));}
function problemasCarga(){
 const p=[];
 for(const d of S.archivos){
  if(!d.rec)p.push('«'+d.nombre+'» no pertenece a ningún caso de este curso. Revisa que sea de tu carpeta.');
  else if(S.caso!==null&&d.rec.caso!==S.caso)p.push('«'+d.nombre+'» es del caso '+d.rec.caso+', no del caso '+S.caso+'. Cárgalo desde la carpeta correcta o cambia el caso en el tutorial.');
 }
 const f=faltantes();if(S.archivos.length&&f.length)p.push('Falta: '+f.map(r=>DMSA_ROLES[r]).join('; ')+'. Tu carpeta trae tres archivos.');
 return p;
}
function listar(){
 const ul=$('listaArchivos');ul.replaceChildren();
 for(const d of S.archivos){
  const li=document.createElement('li');li.className=reconocido(d)?'ok':'problema';
  const st=document.createElement('strong');st.textContent=d.nombre;li.append(st);
  li.append(Object.assign(document.createElement('span'),{textContent:d.tipo+' · '+d.frames+' vistas: '+d.vistas.join(' + ')}));
  li.append(Object.assign(document.createElement('span'),{textContent:Math.round(d.duracionMs/1000)+' s · '+d.frames+'×'+d.rows+'×'+d.cols}));
  const est=document.createElement('span');est.className='estado';est.textContent=d.rec?'Caso '+d.rec.caso+' · '+DMSA_ROLES[d.rec.rol]:'archivo desconocido';li.append(est);
  li.tabIndex=0;li.onclick=()=>{S.seleccion=d;if(d.rec)S.infoVista.add(d.rec.rol);refrescar();};li.onkeydown=e=>{if(e.key==='Enter')li.onclick();};
  if(S.seleccion===d)li.style.outline='2px solid #000080';
  ul.append(li);
 }
 const info=[];if(S.archivos.length)info.push(S.archivos.length+' archivo(s) DICOM.');if(S.ignorados.length)info.push('Omitidos: '+S.ignorados.join('; ')+'.');
 $('cargaInfo').textContent=info.join(' ')||'Aún no hay archivos.';
 $('infoAdquisicion').hidden=!S.seleccion;if(S.seleccion)tablaInfo(S.seleccion);
}
function tablaInfo(d){
 const filas=[['Tipo de imagen',d.imageType.join(' / ')],['Matriz',d.cols+' × '+d.rows+' píxeles, '+d.frames+' frames'],['Píxel',C.fmt(d.pixelMm,2)+' mm · campo '+C.fmt(d.pixelMm*d.cols/10,1)+' cm'],
  ['Zoom de adquisición',C.fmt(d.detectores[0]?.zoom||1,3)],['Detectores',d.detectores.map(x=>'detector '+x.indice+': '+(dmsaNormalizaVista(x.vista)||'sin vista')+' a '+C.fmt(x.angulo,1)+'°').join(' · ')],
  ['Duración',Math.round(d.duracionMs/1000)+' s'],['Cuentas por vista',d.vistas.map((v,i)=>v+': '+Math.round(C.total(d.frame(i))/1000)+' k').join(' · ')],
  ['Ventana energética',d.ventanas.map(w=>(w.nombre||'')+' '+C.fmt(w.bajo,1)+'–'+C.fmt(w.alto,1)+' keV').join('; ')||'no consta'],
  ['Radiofármaco',(d.farmaco||'no consta en el DICOM')+(d.dosisMBq?' · '+C.fmt(d.dosisMBq,1)+' MBq':' · dosis no registrada')],
  ['Fecha y hora',d.fecha.replace(/(\d{4})(\d{2})(\d{2})/,'$3-$2-$1')+' '+d.hora.replace(/(\d{2})(\d{2})(\d{2}).*/,'$1:$2:$3')],
  ['Paciente',d.paciente.nombre+(d.paciente.edad?' · '+d.paciente.edad:'')+(d.paciente.sexo?' · '+d.paciente.sexo:'')],['Identificación del caso',d.rec?'Caso '+d.rec.caso+' · '+DMSA_ROLES[d.rec.rol]:'no reconocido']];
 const t=document.createElement('table');t.className='tabla';filas.forEach(([k,v])=>{const tr=document.createElement('tr');const th=document.createElement('td');th.textContent=k;const td=document.createElement('td');td.style.textAlign='left';td.textContent=v;tr.append(th,td);t.append(tr);});
 $('infoTabla').replaceChildren(t);
}
/* ---------- vistas ---------- */
function dibujarVista(nombre){
 const v=frameVista(nombre),cont=lienzos.vistas[nombre];if(!v||!cont)return;
 const {d,img}=v;const base=C.lienzo(d.cols,d.rows);C.pintar(base,img,d.rows,d.cols,{paleta:S.paleta,maxRel:S.techo});
 const cv=cont.canvas;cv.width=d.cols*E;cv.height=d.rows*E;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(base,0,0,cv.width,cv.height);
 dibujarMarcas(ctx,nombre,d);
 cont.titulo.textContent=nombre;cont.detalle.textContent=Math.round(d.duracionMs/1000)+' s · '+Math.round(C.total(img)/1000)+' k cuentas';
}
function dibujarMarcas(ctx,nombre,d){
 const m=S.marcadores[nombre];if(!m)return;
 for(const letra of ['D','I']){const p=m[letra];if(!p)continue;ctx.save();ctx.font='bold '+(14*E)+'px Tahoma, Arial';ctx.fillStyle=S.paleta==='grisInv'?'#0000c0':'#ffff00';ctx.strokeStyle=S.paleta==='grisInv'?'#fff':'#000';ctx.lineWidth=3;ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeText(letra,p.x*E,p.y*E);ctx.fillText(letra,p.x*E,p.y*E);ctx.restore();}
}
function construirVistas(){
 const g=$('vistas');g.replaceChildren();lienzos.vistas={};
 for(const nombre of ORDEN){
  const v=frameVista(nombre);const sec=document.createElement('section');sec.className='imagewindow';
  const h=document.createElement('h2');const titulo=document.createElement('b');titulo.textContent=nombre;const detalle=document.createElement('span');h.append(titulo,detalle);
  const canvas=document.createElement('canvas');canvas.width=256*E;canvas.height=256*E;canvas.setAttribute('aria-label','Vista '+nombre);
  sec.append(h,canvas);g.append(sec);
  if(!v){detalle.textContent='no cargada';continue;}
  lienzos.vistas[nombre]={canvas,titulo,detalle};
  if(nombre==='Anterior'||nombre==='Posterior')canvas.onclick=e=>{if(!S.marcaActiva){estado('Elige primero la letra D o I en el panel de lateralidad.');return;}const p=coord(canvas,e,v.d);S.marcadores[nombre][S.marcaActiva]={x:p.x,y:p.y};S.marcaActiva=null;refrescar();};
  dibujarVista(nombre);
 }
}
function coord(canvas,e,d){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*d.cols,y:(e.clientY-r.top)/r.height*d.rows};}
function marcasCorrectas(){
 const p=[];let ok=0;
 for(const vista of ['Anterior','Posterior']){const v=frameVista(vista);if(!v)continue;const m=S.marcadores[vista],mitad=v.d.cols/2;
  for(const letra of ['D','I']){const pt=m[letra];if(!pt){p.push('Falta la marca '+letra+' en la '+vista.toLowerCase()+'.');continue;}
   // En anterior, la derecha del paciente queda a la izquierda de la imagen; en posterior, a la derecha.
   const esperaIzquierdaImagen=(vista==='Anterior')===(letra==='D');
   if((pt.x<mitad)===esperaIzquierdaImagen)ok++;else p.push('La marca '+letra+' de la '+vista.toLowerCase()+' está en el lado equivocado de la imagen. Piensa desde dónde mira el detector.');}}
 return {ok:ok===4&&!p.length,problemas:p};
}
/* ---------- regiones ---------- */
function dibujarCuantif(vista){
 const v=frameVista(vista),cont=lienzos.cuantif[vista];if(!v||!cont)return;
 const {d,img}=v;const base=C.lienzo(d.cols,d.rows);C.pintar(base,img,d.rows,d.cols,{paleta:S.paleta,maxRel:S.techo});
 const cv=cont.canvas;cv.width=d.cols*E;cv.height=d.rows*E;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(base,0,0,cv.width,cv.height);
 ctx.save();ctx.scale(E,E);
 const r=S.rois[vista];
 for(const k of ['fondoIzq','fondoDer','izq','der']){if(!r[k])continue;C.contorno(ctx,r[k],d.rows,d.cols,COLORES[k],2);const c=C.centroide(r[k],d.rows,d.cols);if(c&&(k==='izq'||k==='der')){ctx.save();ctx.font='7px Tahoma, Arial';ctx.fillStyle=COLORES[k];ctx.textAlign='center';ctx.fillText(k==='izq'?'Izquierdo':'Derecho',c.x,Math.max(6,c.y-Math.sqrt(c.n)/1.6));ctx.restore();}}
 if(vista===S.vistaActiva&&S.poligono.length){ctx.strokeStyle=COLORES[S.objetivo];ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.beginPath();S.poligono.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);S.poligono.forEach(([x,y])=>{ctx.fillStyle=COLORES[S.objetivo];ctx.fillRect(x-1,y-1,2,2);});}
 ctx.restore();
 cont.sec.classList.toggle('seleccionada',vista===S.vistaActiva);
 const res=calcular(vista);cont.detalle.textContent=res?'Izq '+C.fmt(res.pct.izq,1)+' % · Der '+C.fmt(res.pct.der,1)+' %':'faltan regiones';
}
function construirCuantif(){
 const g=$('cuantif');g.replaceChildren();lienzos.cuantif={};
 for(const vista of ['Posterior','Anterior']){
  const v=frameVista(vista);const sec=document.createElement('section');sec.className='imagewindow';
  const h=document.createElement('h2');h.style.cursor='pointer';const titulo=document.createElement('b');titulo.textContent=vista;const detalle=document.createElement('span');h.append(titulo,detalle);h.onclick=()=>{S.vistaActiva=vista;S.poligono=[];refrescar();};
  const canvas=document.createElement('canvas');canvas.className='lienzoRoi';canvas.width=256*E;canvas.height=256*E;canvas.setAttribute('aria-label','Cuantificación '+vista);
  sec.append(h,canvas);g.append(sec);if(!v){detalle.textContent='no cargada';continue;}
  lienzos.cuantif[vista]={canvas,titulo,detalle,sec};
  canvas.onclick=e=>{S.vistaActiva=vista;const p=coord(canvas,e,v.d);clicRoi(vista,p,v);};
  canvas.ondblclick=e=>{e.preventDefault();if(S.herramienta==='poli'&&S.poligono.length>=3)cerrarPoligono();};
  dibujarCuantif(vista);
 }
}
const suaves=new Map();
function suave(v){const k=v.d.hash+':'+v.i;if(!suaves.has(k))suaves.set(k,C.suavizar(v.img,v.d.rows,v.d.cols,SIGMA_ISO));return suaves.get(k);}
function clicRoi(vista,p,v){
 const {d,img}=v;
 if(S.herramienta==='iso'){const ventana=Math.round(110/(d.pixelMm||1.35));const m=C.isocontorno(suave(v),d.rows,d.cols,p.x,p.y,S.umbral,6,ventana);const n=C.cuentas(img,m).pixeles;if(!n){estado('El isocontorno quedó vacío: haz clic dentro del riñón o baja el umbral.');return;}
  S.rois[vista][S.objetivo]=m;S.rois[vista][S.objetivo==='izq'?'fondoIzq':'fondoDer']=C.fondoPerirrenal(m,d.rows,d.cols);S.confirmado=false;
  estado(C.isocontorno.derramado?'El isocontorno se derramó hasta el borde de su ventana: el umbral es bajo para este fondo. Súbelo o usa polígono.':'Isocontorno del riñón '+(S.objetivo==='izq'?'izquierdo':'derecho')+' en la '+vista.toLowerCase()+': '+n+' píxeles. El fondo perirrenal se generó solo.');refrescar();return;}
 if(S.herramienta==='poli'){S.poligono.push([p.x,p.y]);$('cerrarPoli').disabled=S.poligono.length<3;dibujarCuantif(vista);estado(S.poligono.length+' vértice(s). Doble clic o «Cerrar polígono» para terminar.');}
}
function cerrarPoligono(){
 const vista=S.vistaActiva,v=frameVista(vista);if(!v||S.poligono.length<3)return;
 const m=C.mascaraPoligono(S.poligono,v.d.rows,v.d.cols);S.rois[vista][S.objetivo]=m;S.rois[vista][S.objetivo==='izq'?'fondoIzq':'fondoDer']=C.fondoPerirrenal(m,v.d.rows,v.d.cols);S.poligono=[];S.confirmado=false;$('cerrarPoli').disabled=true;estado('Polígono cerrado: '+C.cuentas(v.img,m).pixeles+' píxeles.');refrescar();
}
function fondoAutomatico(){const vista=S.vistaActiva,v=frameVista(vista);if(!v)return;const r=S.rois[vista];for(const k of ['izq','der'])if(r[k])r[k==='izq'?'fondoIzq':'fondoDer']=C.fondoPerirrenal(r[k],v.d.rows,v.d.cols);S.confirmado=false;refrescar();}
function copiarEspejo(){const p=frameVista('Posterior'),a=frameVista('Anterior');if(!p||!a)return;const src=S.rois.Posterior;if(!src.izq&&!src.der){estado('Primero dibuja los riñones en la posterior.');return;}
 for(const k of ['izq','der','fondoIzq','fondoDer'])if(src[k])S.rois.Anterior[k]=C.espejar(src[k],p.d.rows,p.d.cols);S.confirmado=false;estado('Regiones copiadas en espejo a la anterior. Revísalas: el paciente no es simétrico y la anterior tiene otra profundidad.');refrescar();}
function calcular(vista){
 const v=frameVista(vista),r=S.rois[vista];if(!v||!r.izq||!r.der||!r.fondoIzq||!r.fondoDer)return null;
 const neto=(k,f)=>{const a=C.cuentas(v.img,r[k]),b=C.cuentas(v.img,r[f]);const porPixel=b.pixeles?b.suma/b.pixeles:0;return {bruto:a.suma,pixeles:a.pixeles,fondoPorPixel:porPixel,fondoPixeles:b.pixeles,neto:a.suma-porPixel*a.pixeles};};
 const izq=neto('izq','fondoIzq'),der=neto('der','fondoDer');const ni=Math.max(0,izq.neto),nd=Math.max(0,der.neto),t=ni+nd;
 return {izq,der,pct:{izq:t?100*ni/t:NaN,der:t?100*nd/t:NaN},negativo:izq.neto<0||der.neto<0};
}
function resultado(){
 const P=calcular('Posterior'),A=calcular('Anterior');if(!P||!A)return null;
 const gm=k=>Math.sqrt(Math.max(0,P[k].neto)*Math.max(0,A[k].neto));const gi=gm('izq'),gd=gm('der'),t=gi+gd;
 return {P,A,gm:{izq:gi,der:gd},pct:{izq:t?100*gi/t:NaN,der:t?100*gd/t:NaN}};
}
function ladoOk(vista,k,m){const v=frameVista(vista);if(!v||!m)return true;const c=C.centroide(m,v.d.rows,v.d.cols);if(!c)return true;const izqImagen=c.x<v.d.cols/2;return vista==='Posterior'?(k==='izq')===izqImagen:(k==='izq')!==izqImagen;}
function problemasRoi(vista){
 const p=[],v=frameVista(vista);if(!v)return ['Falta el archivo AP/PA.'];const r=S.rois[vista];
 for(const k of ['izq','der']){const nombre=k==='izq'?'izquierdo':'derecho';if(!r[k]){p.push('Falta el ROI del riñón '+nombre+' en la '+vista.toLowerCase()+'.');continue;}
  if(!ladoOk(vista,k,r[k]))p.push('El ROI «'+nombre+'» de la '+vista.toLowerCase()+' está en el lado de la imagen que corresponde al otro riñón. Recuerda cómo cambia la lateralidad entre anterior y posterior.');
  const n=C.cuentas(v.img,r[k]).pixeles;if(n<6)p.push('El ROI del riñón '+nombre+' tiene solo '+n+' píxeles: revisa la semilla o el umbral.');
  const maxPx=Math.round(150/(v.d.pixelMm*v.d.pixelMm/100));// 150 cm2, mas que cualquier rinon
  if(n>maxPx)p.push('El ROI del riñón '+nombre+' tiene '+n+' píxeles, unos '+Math.round(n*v.d.pixelMm*v.d.pixelMm/100)+' cm²: más que cualquier riñón. El isocontorno se derramó por el fondo; sube el umbral o usa polígono.');
  if(!r[k==='izq'?'fondoIzq':'fondoDer'])p.push('Falta el fondo del riñón '+nombre+'.');}
 if(r.izq&&r.der){let sol=0;for(let i=0;i<r.izq.length;i++)if(r.izq[i]&&r.der[i])sol++;if(sol)p.push('Los dos ROI renales se superponen en '+sol+' píxeles.');}
 const res=calcular(vista);if(res&&res.negativo)p.push('Un riñón queda con cuentas netas negativas: el fondo elegido es más intenso que el riñón. Revisa el fondo o el umbral.');
 return p;
}
function tabla(){
 const host=$('tablaCuantif');const R=resultado();
 if(!R){host.replaceChildren();$('confirmar').disabled=true;return;}
 const t=document.createElement('table');t.className='tabla';
 const fila=(cells,th)=>{const tr=document.createElement('tr');cells.forEach((c,i)=>{const td=document.createElement(th?'th':'td');td.textContent=c;if(!th&&i===0)td.style.textAlign='left';tr.append(td);});t.append(tr);};
 fila(['Función renal relativa','Izquierda','Derecha'],true);
 fila(['Posterior · cuentas netas',Math.round(R.P.izq.neto/1000)+' k',Math.round(R.P.der.neto/1000)+' k']);fila(['Posterior · %',C.fmt(R.P.pct.izq,2),C.fmt(R.P.pct.der,2)]);
 fila(['Anterior · cuentas netas',Math.round(R.A.izq.neto/1000)+' k',Math.round(R.A.der.neto/1000)+' k']);fila(['Anterior · %',C.fmt(R.A.pct.izq,2),C.fmt(R.A.pct.der,2)]);
 fila(['Media geométrica · cuentas',Math.round(R.gm.izq/1000)+' k',Math.round(R.gm.der/1000)+' k']);fila(['Media geométrica · %',C.fmt(R.pct.izq,2),C.fmt(R.pct.der,2)]);
 const det=document.createElement('details');det.append(Object.assign(document.createElement('summary'),{textContent:'Detalle del cálculo'}));
 const ul=document.createElement('ul');for(const [vista,X] of [['Posterior',R.P],['Anterior',R.A]])for(const k of ['izq','der']){const q=X[k];const li=document.createElement('li');li.textContent=vista+' · '+(k==='izq'?'izquierdo':'derecho')+': '+Math.round(q.bruto)+' cuentas brutas en '+q.pixeles+' píxeles; fondo '+C.fmt(q.fondoPorPixel,2)+' cuentas/píxel en '+q.fondoPixeles+' píxeles; neto '+Math.round(q.neto)+'.';ul.append(li);}
 det.append(ul);det.append(Object.assign(document.createElement('p'),{className:'notice',textContent:'Neto = brutas − fondo por píxel × píxeles del ROI. La media geométrica de anterior y posterior compensa la profundidad distinta de cada riñón. Umbral del isocontorno: '+Math.round(S.umbral*100)+' %.'}));
 host.replaceChildren(t,det);$('confirmar').disabled=false;
 $('confirmadoInfo').textContent=S.confirmado?'Cuantificación confirmada. Puedes exportar en el paso 4.':'Cuando estés conforme con las regiones, confirma.';
}
/* ---------- exportacion ---------- */
function casoActual(){return S.caso??(S.archivos.find(d=>d.rec)?.rec.caso??null);}
function cabecera(ctx,W,titulo){ctx.fillStyle='#fff';ctx.fillRect(0,0,W,860);ctx.fillStyle='#000';ctx.font='bold 20px Arial';ctx.fillText('CINTIGRAMA RENAL DMSA',W/2-120,34);ctx.font='14px Arial';const n=casoActual();ctx.fillText((n?'Caso '+n:'Caso sin identificar')+' · '+(frameVista('Posterior')?.d.fecha.replace(/(\d{4})(\d{2})(\d{2})/,'$3-$2-$1')||''),24,34);ctx.fillText(titulo,W-24-ctx.measureText(titulo).width,34);}
function paginaVistas(){
 const W=1132,H=860,cv=C.lienzo(W,H),ctx=cv.getContext('2d');cabecera(ctx,W,'Estáticas · seis proyecciones');
 const tw=346,th=346,x0=(W-3*tw-2*20)/2,y0=70;ctx.imageSmoothingEnabled=false;
 ORDEN.forEach((nombre,i)=>{const col=i%3,row=Math.floor(i/3),x=x0+col*(tw+20),y=y0+row*(th+40);const v=frameVista(nombre);
  ctx.fillStyle='#c8c8e8';ctx.fillRect(x,y+th,tw,22);ctx.fillStyle='#000';ctx.font='13px Arial';
  if(!v){ctx.fillStyle='#eee';ctx.fillRect(x,y,tw,th);ctx.fillStyle='#000';ctx.fillText(nombre+' · no cargada',x+8,y+th+16);return;}
  const base=C.lienzo(v.d.cols,v.d.rows);C.pintar(base,v.img,v.d.rows,v.d.cols,{paleta:S.paleta,maxRel:S.techo});ctx.drawImage(base,x,y,tw,th);
  ctx.save();ctx.translate(x,y);ctx.scale(tw/(v.d.cols*E),th/(v.d.rows*E));dibujarMarcas(ctx,nombre,v.d);ctx.restore();
  ctx.fillText(nombre+' · '+Math.round(v.d.duracionMs/1000)+' s · '+Math.round(C.total(v.img)/1000)+' k cuentas · píxel '+C.fmt(v.d.pixelMm,2)+' mm',x+8,y+th+16);});
 return cv;
}
function paginaCuantif(){
 const W=1132,H=860,cv=C.lienzo(W,H),ctx=cv.getContext('2d');cabecera(ctx,W,'Función renal relativa');
 const R=resultado();ctx.imageSmoothingEnabled=false;
 [['Posterior',70],['Anterior',450]].forEach(([vista,y])=>{const v=frameVista(vista),cont=lienzos.cuantif[vista];if(!v||!cont)return;ctx.drawImage(cont.canvas,24,y,360,360);ctx.fillStyle='#c8c8e8';ctx.fillRect(24,y+360,360,22);ctx.fillStyle='#000';ctx.font='13px Arial';ctx.fillText(vista+' · '+Math.round(C.total(v.img)/1000)+' k cuentas · '+Math.round(v.d.duracionMs/1000)+' s',30,y+376);});
 ctx.fillStyle='#e6e6f5';ctx.fillRect(420,70,680,420);ctx.fillStyle='#000';ctx.font='bold 15px Arial';ctx.fillText('Función renal relativa',440,100);
 if(R){ctx.font='14px Arial';const filas=[['','Izquierda','Derecha'],['Posterior · cuentas netas',Math.round(R.P.izq.neto/1000)+' k',Math.round(R.P.der.neto/1000)+' k'],['Posterior · %',C.fmt(R.P.pct.izq,2),C.fmt(R.P.pct.der,2)],['Anterior · cuentas netas',Math.round(R.A.izq.neto/1000)+' k',Math.round(R.A.der.neto/1000)+' k'],['Anterior · %',C.fmt(R.A.pct.izq,2),C.fmt(R.A.pct.der,2)],['Media geométrica · cuentas',Math.round(R.gm.izq/1000)+' k',Math.round(R.gm.der/1000)+' k'],['Media geométrica · %',C.fmt(R.pct.izq,2),C.fmt(R.pct.der,2)]];
  filas.forEach((f,i)=>{const y=135+i*34;if(i===filas.length-1)ctx.font='bold 15px Arial';ctx.fillText(f[0],440,y);ctx.fillText(f[1],800,y);ctx.fillText(f[2],960,y);ctx.fillStyle='#999';ctx.fillRect(440,y+10,640,1);ctx.fillStyle='#000';});
  ctx.font='12px Arial';ctx.fillText('Fondo perirrenal restado por píxel. Isocontorno al '+Math.round(S.umbral*100)+' % del máximo local o polígono manual.',440,420);ctx.fillText('Media geométrica de anterior y posterior. Valor normal de referencia 50 ± 5 %.',440,440);}
 else{ctx.font='14px Arial';ctx.fillText('Cuantificación incompleta.',440,140);}
 return cv;
}
async function exportarPng(tipo){
 const cv=tipo==='vistas'?paginaVistas():paginaCuantif();const n=casoActual();const nombre='DMSA-Caso-'+(n??'X')+'-'+(tipo==='vistas'?'vistas':'cuantificacion')+'.png';
 const blob=await C.canvasABlob(cv);C.descargar(blob,nombre);S.exportados[tipo]=true;$('exportInfo').textContent='Descargado '+nombre+'.';
 const prev=$('previsualizacion');const img=document.createElement('img');img.src=URL.createObjectURL(blob);img.style.maxWidth='100%';img.style.border='1px solid #808080';img.alt=nombre;prev.replaceChildren(img);
 window.dispatchEvent(new CustomEvent('dmsa',{detail:{kind:'png',tipo,nombre,blob}}));refrescar();
}
function estadoProyecto(){
 const rois={};for(const vista of ['Posterior','Anterior']){rois[vista]={};for(const k of Object.keys(S.rois[vista]))if(S.rois[vista][k])rois[vista][k]=C.mascaraABase64(S.rois[vista][k]);}
 return {caso:casoActual(),paleta:S.paleta,techo:S.techo,marcadores:S.marcadores,rois,umbral:S.umbral,confirmado:S.confirmado,exportados:S.exportados,infoVista:[...S.infoVista]};
}
function guardarProyecto(){const n=casoActual();C.guardarProyecto('dmsa',estadoProyecto(),S.archivos,'DMSA-Caso-'+(n??'X')+'.renalproject');S.proyectoGuardado=true;$('exportInfo').textContent='Proyecto guardado. Con «Abrir proyecto…» lo retomas con las regiones incluidas.';refrescar();}
async function abrirProyecto(file){
 try{const obj=await C.abrirProyecto(file);if(obj.app!=='dmsa')throw Error('Este proyecto es del simulador '+obj.app+'.');
  reiniciar(false);await cargar(obj.files);const e=obj.estado;S.paleta=e.paleta;S.techo=e.techo;S.marcadores=e.marcadores||S.marcadores;S.umbral=e.umbral??.5;S.confirmado=!!e.confirmado;S.exportados=e.exportados||S.exportados;S.infoVista=new Set(e.infoVista||[]);
  for(const vista of ['Posterior','Anterior'])for(const [k,b] of Object.entries(e.rois?.[vista]||{}))S.rois[vista][k]=C.mascaraDesdeBase64(b);
  $('paleta').value=S.paleta;$('techo').value=Math.round(S.techo*100);$('umbral').value=Math.round(S.umbral*100);if(e.caso&&tutorial)tutorial.setCaso(e.caso);S.proyectoGuardado=true;estado('Proyecto abierto.');refrescar();
 }catch(err){estado('No se pudo abrir el proyecto: '+err.message);}
}
/* ---------- navegacion y refresco ---------- */
function navegar(i){S.paso=Math.max(0,Math.min(3,i));document.querySelectorAll('.step').forEach((s,k)=>s.hidden=k!==S.paso);document.querySelectorAll('.steps button').forEach((b,k)=>b.classList.toggle('active',k===S.paso));$('prev').disabled=S.paso===0;$('next').disabled=S.paso===3;$('posicion').textContent='Paso '+(S.paso+1)+' de 4';
 $('panelMarcadores').hidden=S.paso!==1;$('panelHerramientas').hidden=S.paso!==2;$('vacio').hidden=S.archivos.length>0||S.paso!==0;if(tutorial)tutorial.render();}
function refrescar(){
 listar();
 const hay=frameVista('Posterior');
 if(hay){construirVistas();construirCuantif();}else{$('vistas').replaceChildren();$('cuantif').replaceChildren();}
 tabla();
 const n=casoActual();$('casoNombre').textContent=n?'DMSA · Caso '+n:'Sin caso';$('casoInfo').textContent=n&&DMSA_CASOS[n]?DMSA_CASOS[n].titulo:'Elige el caso en el tutorial y carga los archivos de tu carpeta.';
 $('vistaActiva').textContent=S.vistaActiva;$('marcaD').setAttribute('aria-pressed',String(S.marcaActiva==='D'));$('marcaI').setAttribute('aria-pressed',String(S.marcaActiva==='I'));
 $('herrIso').setAttribute('aria-pressed',String(S.herramienta==='iso'));$('herrPoli').setAttribute('aria-pressed',String(S.herramienta==='poli'));
 const R=resultado();$('pngVistas').disabled=!hay;$('pngCuantif').disabled=!R;$('guardarProyecto').disabled=!S.archivos.length;
 $('vacio').hidden=S.archivos.length>0||S.paso!==0;
 document.querySelectorAll('.steps button').forEach((b,k)=>b.classList.toggle('hecho',[!faltantes().length&&S.archivos.length>0,marcasCorrectas().ok,S.confirmado,S.exportados.vistas&&S.exportados.cuantif][k]));
 if(tutorial)tutorial.render();
 window.dispatchEvent(new CustomEvent('dmsa',{detail:{kind:'estado'}}));
}
function reiniciar(conCaso=true){Object.assign(S,{archivos:[],ignorados:[],seleccion:null,marcadores:{Anterior:{},Posterior:{}},marcaActiva:null,rois:{Posterior:{},Anterior:{}},poligono:[],confirmado:false,exportados:{vistas:false,cuantif:false},proyectoGuardado:false,infoVista:new Set()});$('archivos').value='';$('carpeta').value='';$('previsualizacion').replaceChildren();$('exportInfo').textContent='';if(conCaso){navegar(0);refrescar();}}
/* ---------- tutorial ---------- */
function pasosTutorial(n,caso){
 const nombreEst=Object.entries(DMSA_ESTUDIANTES).find(([,l])=>l.includes(n))?.[0];
 const carpeta=nombreEst?'«DMSA '+nombreEst+' › Caso '+n+'»':'la carpeta del caso '+n;
 return [
  {titulo:'Cargar los tres archivos',pantalla:0,resaltar:'archivos',
   texto:'Tu carpeta es '+carpeta+'. Trae tres archivos DICOM sin extensión; cada uno guarda dos vistas, una por detector.',
   haz:['Pulsa «Archivos» y selecciona los tres archivos de la carpeta, o usa «O carpeta» y elige la carpeta del caso.','Espera a que aparezcan las tres filas en la lista.'],
   deberia:'Tres filas en verde: AP/PA con Anterior + Posterior, oblicuas OAD + OPI y oblicuas OAI + OPD. Cada fila indica «Caso '+n+'».',
   ayuda:'Una fila roja significa que el archivo no es de este caso o no es DICOM. Si falta una fila, vuelve a seleccionar: los tres archivos van juntos. No renombres los archivos.',
   completo:()=>S.archivos.length>0&&!faltantes().length&&!problemasCarga().length,problemas:()=>problemasCarga(),
   detalle:()=>S.archivos.filter(reconocido).map(d=>d.nombre+': '+d.vistas.join(' + ')).join(' · ')},
  {titulo:'Reconocer la adquisición',pantalla:0,resaltar:'listaArchivos',
   texto:'Antes de mirar los riñones, lee cómo se adquirieron las imágenes. Estos datos salen de la cabecera DICOM y son los que usarás en la presentación.',
   haz:['Haz clic en la fila AP/PA de la lista.','Lee matriz, píxel, zoom, ventana energética, duración y cuentas por vista.','Haz lo mismo con las dos oblicuas y compara duraciones.'],
   deberia:'Matriz 256 × 256, píxel de 1,35 mm, zoom 1,78, ventana de 129 a 150 keV. La duración es distinta en cada archivo: el equipo se detuvo al juntar unas 600 k cuentas en el detector posterior.',
   ayuda:'Si la tabla no aparece, la fila no quedó seleccionada: vuelve a hacer clic. La dosis y el radiofármaco no siempre constan en el DICOM; en ese caso, úsalos desde el antecedente y dilo así.',
   completo:()=>S.infoVista.has('ap'),problemas:()=>[],
   detalle:()=>{const d=archivoRol('ap');return d?'AP/PA: '+Math.round(d.duracionMs/1000)+' s · '+d.vistas.map((v,i)=>v+' '+Math.round(C.total(d.frame(i))/1000)+' k').join(', '):'';}},
  {titulo:'Vistas y lateralidad',pantalla:1,resaltar:'panelMarcadores',
   texto:'Las seis proyecciones están en el orden del equipo. El detector anterior mira al paciente de frente y el posterior desde la espalda: la derecha del paciente cambia de lado entre ambas.',
   haz:['Ajusta el techo de la escala en el menú hasta ver bien la corteza de ambos riñones.','Pulsa «D», luego haz clic sobre el riñón derecho del paciente en la imagen Anterior. Repite con «I» sobre el izquierdo.','Haz lo mismo en la Posterior.'],
   deberia:'Cuatro letras en total, dos por imagen. En la anterior la D queda a la izquierda de la imagen; en la posterior, a la derecha.',
   ayuda:'Si el tutorial marca una letra en el lado equivocado, piensa desde dónde mira cada detector: en la vista anterior la imagen es como mirar al paciente de frente; en la posterior, como mirarlo por la espalda. Usa «Borrar marcas» y vuelve a colocarlas.',
   completo:()=>marcasCorrectas().ok,problemas:()=>marcasCorrectas().problemas},
  {titulo:'Regiones en la posterior',pantalla:2,resaltar:'panelHerramientas',
   texto:'La posterior es la vista principal del DMSA porque los riñones quedan más cerca del detector. Dibuja el ROI de cada riñón; el fondo perirrenal se genera solo como una media luna lateral, igual que en el equipo.',
   haz:['Comprueba que la vista activa sea «Posterior».','Con «Riñón: izquierdo» y la herramienta Isocontorno, haz clic dentro del riñón izquierdo del paciente. Ajusta el umbral si el contorno incluye fondo o corta corteza.','Cambia a «derecho» y repite.','Si el riñón es tenue o irregular, usa Polígono: un clic por vértice y doble clic para cerrar.'],
   deberia:'Rojo alrededor del riñón izquierdo con su fondo amarillo, verde alrededor del derecho con su fondo azul. En el título de la imagen aparecen los porcentajes de esta vista.',
   ayuda:'Si el isocontorno se «derrama» por el fondo, sube el umbral o usa polígono. Si queda muy chico, baja el umbral. Si el fondo se ve mal ubicado, vuelve a generarlo con «Fondo perirrenal automático» después de corregir el riñón.',
   completo:()=>!!calcular('Posterior')&&!problemasRoi('Posterior').length,problemas:()=>problemasRoi('Posterior'),
   detalle:()=>{const r=calcular('Posterior');return r?'Posterior: izq '+C.fmt(r.pct.izq,1)+' %, der '+C.fmt(r.pct.der,1)+' %':'';}},
  {titulo:'Regiones en la anterior',pantalla:2,resaltar:'copiarEspejo',
   texto:'La anterior sirve para corregir la profundidad distinta de cada riñón con la media geométrica. Sus regiones deben cubrir los mismos riñones, ahora vistos de frente.',
   haz:['Pulsa «Copiar ROI de posterior a anterior (espejo)» o haz clic en el título «Anterior» y dibuja de nuevo.','Revisa que cada contorno siga al riñón en la anterior; corrige con isocontorno o polígono si se corrió.'],
   deberia:'Las cuatro regiones también en la anterior, con los colores intercambiados de lado en la imagen: el riñón izquierdo del paciente ahora queda a la derecha.',
   ayuda:'El espejo es un punto de partida: el paciente no es simétrico y la anterior tiene otro fondo. Si el contorno quedó fuera del riñón, elige ese riñón y vuelve a marcarlo con isocontorno.',
   completo:()=>!!calcular('Anterior')&&!problemasRoi('Anterior').length,problemas:()=>problemasRoi('Anterior'),
   acciones:()=>[{etiqueta:'Copiar en espejo',accion:copiarEspejo}],
   detalle:()=>{const r=calcular('Anterior');return r?'Anterior: izq '+C.fmt(r.pct.izq,1)+' %, der '+C.fmt(r.pct.der,1)+' %':'';}},
  {titulo:'Revisar y confirmar el resultado',pantalla:2,resaltar:'confirmar',
   texto:'La tabla muestra tres porcentajes por riñón: posterior, anterior y media geométrica. La media geométrica es el resultado del estudio.',
   haz:['Compara el porcentaje posterior con el anterior: la diferencia es la profundidad.','Abre «Detalle del cálculo» y verifica que ningún riñón tenga cuentas netas negativas.','Pulsa «Confirmar cuantificación».'],
   deberia:'Un resultado izquierda/derecha que suma 100 con la media geométrica en negrita.',
   ayuda:'Si un porcentaje da NaN o 0, alguna región quedó vacía o el fondo supera al riñón. Vuelve al paso anterior. Confirmar no bloquea nada: puedes corregir y confirmar de nuevo.',
   completo:()=>S.confirmado&&!!resultado(),problemas:()=>resultado()?[]:['La tabla aún no se puede calcular: faltan regiones.']},
  {titulo:'Exportar y guardar',pantalla:3,resaltar:'pngVistas',
   texto:'Entregas dos PNG: la página de vistas con tus marcas de lateralidad y la página de cuantificación con regiones y tabla. Guarda también el proyecto para poder retomar.',
   haz:['Pulsa «Descargar PNG · vistas».','Pulsa «Descargar PNG · cuantificación».','Pulsa «Guardar proyecto…» y conserva el archivo .renalproject junto a los PNG.'],
   deberia:'Tres descargas: DMSA-Caso-'+n+'-vistas.png, DMSA-Caso-'+n+'-cuantificacion.png y DMSA-Caso-'+n+'.renalproject.',
   ayuda:'Si el navegador bloquea varias descargas seguidas, permite las descargas del sitio y vuelve a pulsar. El proyecto incluye los DICOM y las regiones; no lo compartas fuera del curso.',
   completo:()=>S.exportados.vistas&&S.exportados.cuantif&&S.proyectoGuardado,problemas:()=>{const p=[];if(!S.exportados.vistas)p.push('Falta el PNG de vistas.');if(!S.exportados.cuantif)p.push('Falta el PNG de cuantificación.');if(!S.proyectoGuardado)p.push('Falta guardar el proyecto.');return p;}}
 ];
}
function cierreTutorial(n,caso){
 const R=resultado();const box=document.createElement('div');
 if(!caso.referencia){box.append(Object.assign(document.createElement('p'),{textContent:'Este caso no tiene informe disponible, así que no hay valor de referencia. Tu resultado: izquierda '+C.fmt(R?.pct.izq,1)+' %, derecha '+C.fmt(R?.pct.der,1)+' %.'}));return box;}
 const ref=caso.referencia;const t=document.createElement('table');t.className='tabla';
 const fila=(c,th)=>{const tr=document.createElement('tr');c.forEach(x=>{const td=document.createElement(th?'th':'td');td.textContent=x;tr.append(td);});t.append(tr);};
 fila(['','Izquierda','Derecha'],true);fila(['Tu media geométrica',C.fmt(R?.pct.izq,1)+' %',C.fmt(R?.pct.der,1)+' %']);fila(['Informe ('+ref.metodo+')',C.fmt(ref.izq,1)+' %',C.fmt(ref.der,1)+' %']);
 const dif=R?Math.abs(R.pct.izq-ref.izq):NaN;fila(['Diferencia',C.fmt(dif,1)+' puntos','']);box.append(t);
 const msg=document.createElement('p');msg.textContent=!Number.isFinite(dif)?'Sin resultado propio para comparar.':dif<=DMSA_TOLERANCIA?'Tu resultado coincide con el informe dentro de '+DMSA_TOLERANCIA+' puntos. Explica igual de qué dependió: umbral, fondo y forma del ROI.':'Tu resultado se aleja del informe más de '+DMSA_TOLERANCIA+' puntos. No lo corrijas para que calce: revisa qué región lo explica y llévalo a la discusión.';box.append(msg);
 if(ref.izq+ref.der!==100)box.append(Object.assign(document.createElement('p'),{className:'notice',textContent:'Los porcentajes del informe original suman '+(ref.izq+ref.der)+': el informe traía un error de tipeo.'}));
 const imp=document.createElement('details');imp.open=true;imp.append(Object.assign(document.createElement('summary'),{textContent:'Impresión del informe'}));imp.append(Object.assign(document.createElement('p'),{textContent:ref.impresion}));box.append(imp);
 return box;
}
/* ---------- arranque ---------- */
function iniciar(){
 tutorial=RenalTutorial.crear({contenedor:$('tutorial'),workspace:$('workspace'),boton:$('tutorialBoton'),titulo:'Tutorial DMSA',clave:'dmsaTutorial',casos:DMSA_CASOS,estudiantes:DMSA_ESTUDIANTES,pasos:pasosTutorial,cierre:cierreTutorial,preguntasOrales:DMSA_PREGUNTAS_ORALES,
  onCaso:n=>{S.caso=n;refrescarSuave();},navegar:i=>{if(i!==S.paso&&S.archivos.length)navegar(i);}});
 S.caso=tutorial.caso;
 $('archivos').onchange=e=>cargar([...e.target.files]);$('carpeta').onchange=e=>cargar([...e.target.files].filter(f=>!/\.(png|pdf|txt)$/i.test(f.name)));
 $('paleta').onchange=e=>{S.paleta=e.target.value;refrescar();};$('techo').oninput=e=>{S.techo=Number(e.target.value)/100;$('techoValor').textContent=e.target.value+' %';refrescarSuave();};
 $('umbral').oninput=e=>{S.umbral=Number(e.target.value)/100;$('umbralValor').textContent=e.target.value+' %';};
 $('objetivo').onchange=e=>{S.objetivo=e.target.value;S.poligono=[];refrescarSuave();};
 $('herrIso').onclick=()=>{S.herramienta='iso';S.poligono=[];refrescarSuave();};$('herrPoli').onclick=()=>{S.herramienta='poli';refrescarSuave();};
 $('cerrarPoli').onclick=cerrarPoligono;$('fondoAuto').onclick=fondoAutomatico;$('copiarEspejo').onclick=copiarEspejo;
 $('borrarRoi').onclick=()=>{const r=S.rois[S.vistaActiva];r[S.objetivo]=null;r[S.objetivo==='izq'?'fondoIzq':'fondoDer']=null;S.confirmado=false;refrescar();};
 $('borrarTodo').onclick=()=>{S.rois[S.vistaActiva]={};S.poligono=[];S.confirmado=false;refrescar();};
 $('marcaD').onclick=()=>{S.marcaActiva=S.marcaActiva==='D'?null:'D';refrescarSuave();};$('marcaI').onclick=()=>{S.marcaActiva=S.marcaActiva==='I'?null:'I';refrescarSuave();};
 $('borrarMarcas').onclick=()=>{S.marcadores={Anterior:{},Posterior:{}};refrescar();};
 $('confirmar').onclick=()=>{S.confirmado=true;estado('Cuantificación confirmada.');refrescar();};
 $('pngVistas').onclick=()=>exportarPng('vistas');$('pngCuantif').onclick=()=>exportarPng('cuantif');$('guardarProyecto').onclick=guardarProyecto;
 $('abrirProyecto').onclick=()=>$('proyectoInput').click();$('proyectoInput').onchange=e=>{if(e.target.files[0])abrirProyecto(e.target.files[0]);e.target.value='';};
 $('nuevo').onclick=()=>{if(!S.archivos.length||confirm('¿Descartar el caso cargado y sus regiones? Guarda el proyecto antes si quieres conservarlo.'))reiniciar();};
 $('prev').onclick=()=>navegar(S.paso-1);$('next').onclick=()=>navegar(S.paso+1);document.querySelectorAll('.steps button').forEach(b=>b.onclick=()=>navegar(Number(b.dataset.step)));
 $('ayuda').onclick=()=>$('acerca').showModal();$('cerrarAcerca').onclick=()=>$('acerca').close();$('inicio').onclick=()=>navegar(0);
 window.addEventListener('error',e=>{(window.__errores=window.__errores||[]).push(String(e.message));});
 navegar(0);refrescar();
}
function refrescarSuave(){refrescar();}
window.DmsaApp={estado:S,cargar,calcular,resultado,frameVista,cerrarPoligono,copiarEspejo,navegar,exportarPng,guardarProyecto,get tutorial(){return tutorial;},clicRoi,marcasCorrectas,problemasRoi,problemasCarga};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
})();

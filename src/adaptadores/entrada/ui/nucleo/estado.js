// ============================================================
//  INTERFAZ · Estado de la sesión y formatos
//  STATE, refresco de pantalla, indicador de conexión, fechas, dinero y escape de HTML.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/13-multitenant-isolation/13-multitenant-isolation.md
// ============================================================

let ESCRIBIENDO = false;   // true mientras el usuario arma un pedido

// Indicador de conexión (punto verde/rojo/naranja). Lo llama el adaptador de datos.
function mostrarConexion(estado){
  const el=document.getElementById('fb-status');
  if(!el) return;
  if(estado==='ok'){ el.className='fb-dot ok'; el.title='Sincronizado'; }
  else if(estado==='error'){ el.className='fb-dot err'; el.title='Error de nube'; }
  else { el.className='fb-dot off'; el.title='Sin conexión'; }
}

// Refresca la pantalla salvo que el usuario esté ocupado
function refrescarSiSePuede(){
  if(!STATE.user) return;
  // Si el usuario está escribiendo en CUALQUIER campo (texto, número, select
  // abierto, textarea), NO refrescamos: redibujar destruiría el campo y se
  // perdería el foco / el teclado en móvil. Esperamos a que termine.
  const a=document.activeElement;
  if(a){
    const tag=(a.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'||a.isContentEditable){
      _refrescoPendiente=true;   // recordamos que hay cambios sin pintar
      return;
    }
  }
  // Solo se evita refrescar mientras se ARMA una venta (pantalla 'ventas')
  if(ESCRIBIENDO && STATE.pageNeg==='ventas') return;
  const modal=document.getElementById('modal-container');
  if(modal && modal.classList.contains('activo')) return;   // modal abierto
  _refrescoPendiente=false;
  try{ render(); }catch(e){ reportarError('el refresco de pantalla', e); }
}
let _refrescoPendiente=false;
// Cuando el usuario deja de escribir (quita el foco), pintamos lo que llegó
document.addEventListener('focusout', function(){
  setTimeout(function(){
    if(!_refrescoPendiente) return;
    const a=document.activeElement;
    const tag=a?(a.tagName||'').toLowerCase():'';
    if(tag==='input'||tag==='textarea'||tag==='select'||(a&&a.isContentEditable)) return;
    _refrescoPendiente=false;
    refrescarSiSePuede();
  },150);
}, true);

// Botón "Actualizar": fuerza traer de la nube lo que corresponda
function refrescarDeLaNube(){
  if(!FB_READY){ toast('Sin conexión a la nube','error'); return; }
  toast('Actualizando...','info');
  Datos.recargar({superAdmin:!!STATE.esSuperAdmin, negId:STATE.negocio?STATE.negocio.id:null})
    .then(()=>{ toast('Actualizado','success'); render(); })
    .catch(()=>toast('No se pudo actualizar','error'));
}


// ============================================================
//  ESTADO Y CONFIGURACIÓN
// ============================================================
const STATE = {
  user:null, negocio:null, esSuperAdmin:false, modoSupervision:false,
  page:'', pageNeg:'inicio', sucursal:null, buscaNegocio:''
};

function now(){ return new Date().toISOString(); }
// ---------- JORNADA DE TRABAJO ----------
// Hay negocios que abren de noche y cierran en la madrugada. Para ellos el
// "día" NO es el del calendario: todo lo que se venda hasta que se cierre la
// caja pertenece al día en que esa caja se ABRIÓ. Así una jornada no queda
// partida en dos días y los informes cuadran.
function jornadaActual(){
  try{ return Dominio.fechas.jornadaDeCaja(cajaActual()); }catch(e){ return today(); }
}
function fmtMoney(n){ return '$ '+(Math.round(n||0)).toLocaleString('es-CO'); }
// Formato corto para etiquetas de gráficas: 1.2M, 950k, 500
function fmtCorto(n){
  n=Math.round(n||0);
  if(n>=1000000) return (n/1000000).toFixed(n>=10000000?0:1).replace('.0','')+'M';
  if(n>=1000) return (n/1000).toFixed(0)+'k';
  return String(n);
}
function fmtDate(f){
  if(!f) return '—';
  const d=new Date(f);
  return d.toLocaleDateString('es-CO')+' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

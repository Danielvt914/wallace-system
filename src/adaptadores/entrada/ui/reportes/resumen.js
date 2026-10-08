// ============================================================
//  INTERFAZ · Resumen de ventas para el panel del super-admin (R1)
//  Los equipos de cada negocio publican data_<negocio>_resumen (ventas por día y
//  por mes, total y cantidad; regla en dominio/ventas.js). El panel lee solo eso
//  en vez de descargar las ventas de todos los negocios.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/08-sales-reports/08-sales-reports.md
// ============================================================

let _resumenNeg=null;   // negocio cuyas ventas ya bajaron completas de la nube

// Lo llama el adaptador de datos (gancho alCargarTabla) cuando terminó de bajar las ventas
function ventasCargadas(){
  if(!STATE.negocio) return;
  _resumenNeg=STATE.negocio.id;
  publicarResumen();
}
// Publica el resumen si cambió. Solo con las ventas completas: un equipo a medio
// sincronizar no debe sobrescribir las cifras con datos parciales.
function publicarResumen(){
  if(!FB_READY || !STATE.negocio || _resumenNeg!==STATE.negocio.id) return;
  const clave=claveDe(STATE.negocio.id,'resumen');
  const r=Dominio.ventas.resumenVentas(misDatos('ventas'), today());
  if(Dominio.ventas.mismoResumen(DB.get(clave), r)) return;
  DB.set(clave, r);
}
// Cifras de un negocio para el panel: el resumen publicado o, si las ventas están en
// este equipo (modo local, o ya se leyeron), calculadas aquí. null = aún no hay datos.
function resumenDe(negId){
  const r=DB.get(claveDe(negId,'resumen'));
  if(r) return r;
  const vs=datosDe(negId,'ventas');
  return vs.length ? Dominio.ventas.resumenVentas(vs, today()) : null;
}
// Panel: calcula y publica el resumen de los negocios que todavía no lo tienen
// (negocios en los que nadie ha entrado desde la versión nueva)
async function calcularResumenes(){
  if(!esAdminSistema()){ toast('No tienes permiso','error'); return; }
  const faltan=(DB.get('negocios')||[]).filter(n=>!DB.get(claveDe(n.id,'resumen')));
  if(!faltan.length){ toast('Todos los negocios tienen sus cifras al día','info'); return; }
  toast('Calculando cifras de '+faltan.length+' negocio(s)…','info');
  for(const n of faltan){
    try{
      if(FB_READY) await Datos.leerNegocioCompleto(n.id);
      DB.set(claveDe(n.id,'resumen'), Dominio.ventas.resumenVentas(datosDe(n.id,'ventas'), today()));
    }catch(e){ reportarError('el cálculo de cifras de '+n.nombre, e); }
  }
  toast('Cifras calculadas','success');
  render();
}

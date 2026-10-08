// ============================================================
//  DOMINIO · Consecutivo de facturas
//  La reserva del número en la nube la hace un adaptador; aquí solo
//  vive la regla de qué número usar.
// ============================================================

export function numeroDe(factura){ return parseInt(String(factura||'').replace(/\D/g,''))||0; }
export function mayorNumero(ventas){
  let mayor=0;
  (ventas||[]).forEach(v=>{ const n=numeroDe(v&&v.factura); if(n>mayor) mayor=n; });
  return mayor;
}
export function formatearFactura(n){ return 'F-'+String(n).padStart(5,'0'); }
// Elige el número de la próxima factura.
//  reservada: número reservado en la nube por este equipo (o null)
//  local:     mayor número que este equipo conoce
//  seq:       último número reservado en la nube que este equipo conoce
// Se usa la reserva si es mayor a lo conocido; si no (sin internet), el mayor + 1.
export function elegirNumero(reservada, local, seq){
  if(reservada!==null && reservada!==undefined && reservada>local) return reservada;
  return Math.max(local||0, seq||0)+1;
}

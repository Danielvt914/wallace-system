// ============================================================
//  INTERFAZ · Permisos del usuario actual y sucursales
//  Aplica al usuario de la sesión las reglas de dominio/permisos.js y dominio/negocio.js.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/10-users-roles/10-users-roles.md
// ============================================================


// ============================================================
//  PERMISOS DEL USUARIO ACTUAL
//  Las reglas viven en src/dominio/permisos.js y src/dominio/negocio.js
//  (ROLES, PANTALLAS_POR_ROL, PERFILES, PLANES… los publica el puente);
//  aquí solo se aplican al usuario y al negocio de la sesión.
// ============================================================

// ¿Este negocio lleva control de existencias? (por defecto, el de la sesión)
function usaInventario(neg){ return Dominio.negocio.usaInventario(neg||STATE.negocio); }
// ¿El usuario actual puede hacer esta acción?
function tienePermiso(accion){ return Dominio.permisos.puede(STATE.user, accion); }
// Igual que tienePermiso, pero avisa. Se usa al INICIO de cada acción sensible:
// esconder el botón no basta, la función se puede llamar igual.
function exigirPermiso(accion, texto){
  if(tienePermiso(accion)) return true;
  toast(texto||'No tienes permiso para esta acción','error');
  return false;
}
// Super-admin con poder de gestión (dueño o ayudante; el vendedor solo maneja demos)
function esAdminSistema(){
  return !!(STATE.esSuperAdmin && STATE.user && STATE.user.rolSuper!=='vendedor');
}
// Pantallas del negocio que el usuario actual puede abrir (las mismas del menú)
function pantallasPermitidas(){
  if(!STATE.negocio || !STATE.user) return [];
  return armarMenu().filter(m=>m.id).map(m=>m.id);
}
function puedeVerPantalla(id){ return pantallasPermitidas().indexOf(id)>-1; }
// Si la pantalla pedida no está permitida, se cambia por la primera que sí
function pantallaValida(){
  const perm=pantallasPermitidas();
  if(perm.indexOf(STATE.pageNeg)<0) STATE.pageNeg=perm[0]||'';
  return STATE.pageNeg;
}

// ============================================================
//  SUCURSALES
// ============================================================
// sucursalesDe / usaSucursales: src/dominio/negocio.js (las publica el puente)
function sucursalActual(){
  if(!usaSucursales(STATE.negocio)) return 'principal';
  return STATE.sucursal || (sucursalesDe(STATE.negocio)[0]||{}).id || 'principal';
}
// F1: cada sucursal tiene su propia caja (regla en dominio/caja.js)
function cajaActual(){ return cajaDe(misDatos('caja_actual'), sucursalActual()); }
function guardarCajaActual(c){ guardarMisDatos('caja_actual', Dominio.caja.conCaja(misDatos('caja_actual'), sucursalActual(), c)); }
function puedeVerSucursal(sucId){ return Dominio.permisos.puedeVerSucursal(STATE.user, sucId); }
function cambiarSucursal(sucId){
  STATE.sucursal=sucId;
  try{ localStorage.setItem('ws_suc_'+STATE.negocio.id, sucId); }catch(e){}
  const s=sucursalesDe(STATE.negocio).find(x=>x.id===sucId);
  toast('Trabajando en: '+(s?s.nombre:sucId),'success');
  render();
}

// ============================================================
//  DOMINIO · Cuentas (S1, Plan B)
//  Reglas puras del modelo de cuentas con Firebase Authentication:
//   · login/<claveUsuario> = {correo, uid}   índice usuario → cuenta
//   · perfiles/<uid>       = negocio, rol y permisos que leen las reglas
//  No conoce Firebase: lo usan el adaptador de cuentas y el servicio de sesión.
//  Detalle del diseño: Documentation/-02-corrections (S1 → Plan B).
// ============================================================

export const DOMINIO_CORREO='usuarios.wallace-system.app';
// Mínimo que exige Firebase Authentication
export const PASS_MIN_CUENTA=6;
// Campos de contraseña del esquema viejo: nunca salen de data/usuarios ni data/superadmins
export const CAMPOS_PASS=['pass','passHash','passSal','passIter'];
// Campos del negocio que solo cambia el super-admin (las reglas los bloquean al admin del negocio)
export const CAMPOS_NEGOCIO_RESERVADOS=['id','activo','plan','precioMes','diaPago','funciones','vendedorId',
  'vendedorNombre','notasComerciales','esDemo','demoDe','creado','sucursales'];

// Firebase no admite . $ # [ ] / en las claves. Se codifica conservando mayúsculas.
export function claveUsuario(usuario){
  const u=String(usuario==null?'':usuario).trim();
  if(!u) return '';
  return encodeURIComponent(u).replace(/\./g,'%2E');
}
// Correo inventado que identifica la cuenta en Auth. Aleatorio: no depende del
// nombre de usuario (tildes, espacios) y permite reemplazar la cuenta.
export function correoInterno(aleatorio){
  const a=String(aleatorio||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  if(a.length<8) throw new Error('correoInterno: aleatorio demasiado corto');
  return 'u'+a+'@'+DOMINIO_CORREO;
}
export function passValidaCuenta(pass){ return typeof pass==='string' && pass.length>=PASS_MIN_CUENTA; }

// Copia de un usuario sin campos de contraseña (lo que puede ver su negocio)
export function sinContrasenas(rec){
  if(!rec) return rec;
  const c=JSON.parse(JSON.stringify(rec));
  CAMPOS_PASS.forEach(k=>{ delete c[k]; });
  return c;
}

// Pantallas efectivas del usuario: las suyas o las de su rol
export function pantallasDe(u, pantallasPorRol){
  if(u && Array.isArray(u.pantallas) && u.pantallas.length) return u.pantallas.slice();
  const pr=pantallasPorRol||{};
  return (pr[u&&u.rol]||pr.cajero||[]).slice();
}
// ¿Puede editar "Mi Negocio"? Igual que el menú: admin, o quien tenga la pantalla config.
export function editaNegocio(u, pantallasPorRol){
  if(!u) return false;
  if(u.rol==='admin') return true;
  return pantallasDe(u, pantallasPorRol).indexOf('config')>-1;
}

// Perfil de un empleado de negocio (lo que leen las reglas y la app al entrar)
export function perfilDesdeUsuario(u, pantallasPorRol){
  return {
    usuario:u.usuario, nombre:u.nombre||'', rol:u.rol||'cajero', rolSuper:null,
    negocioId:u.negocioId, usuarioId:u.id, superId:null,
    activo:u.activo!==false,
    pantallas:Array.isArray(u.pantallas)?u.pantallas.slice():[],
    permisos:Array.isArray(u.permisos)?u.permisos.slice():[],
    sucursales:Array.isArray(u.sucursales)?u.sucursales.slice():[],
    editaNegocio:editaNegocio(u, pantallasPorRol)
  };
}
// Perfil de un administrador del sistema
export function perfilDesdeSuperAdmin(s){
  return {
    usuario:s.usuario, nombre:s.nombre||'', rol:'superadmin', rolSuper:s.rolSuper||'dueno',
    negocioId:null, usuarioId:null, superId:s.id,
    activo:s.activo!==false, pantallas:[], permisos:[], sucursales:[], editaNegocio:false
  };
}
// STATE.user a partir del perfil (misma forma que usaba la app con la tabla de usuarios)
export function usuarioDesdePerfil(p, uid){
  if(!p) return null;
  if(p.rol==='superadmin') return {id:p.superId, nombre:p.nombre, usuario:p.usuario, rol:'superadmin', rolSuper:p.rolSuper||'dueno', uid};
  return {id:p.usuarioId, nombre:p.nombre, usuario:p.usuario, rol:p.rol, negocioId:p.negocioId,
    pantallas:p.pantallas||[], permisos:p.permisos||[], sucursales:p.sucursales||[], activo:p.activo!==false, uid};
}

// ¿El perfil corresponde de verdad a este registro? (detecta perfiles creados por terceros)
export function perfilCoincide(perfil, rec, esSuper){
  if(!perfil || !rec) return false;
  if(perfil.usuario!==rec.usuario) return false;
  if(esSuper) return perfil.rol==='superadmin' && perfil.superId===rec.id;
  return perfil.rol!=='superadmin' && perfil.rol===rec.rol && perfil.negocioId===rec.negocioId && perfil.usuarioId===rec.id;
}

/**
 * Estado de la migración de cada cuenta real (pantalla "Migración de cuentas").
 * @param {{superadmins:Array, usuarios:Array, perfiles:Object, login:Object}} d
 * @returns {Array<{tipo:'super'|'usuario', id:string, usuario:string, nombre:string, negocioId:?string,
 *   rol:string, estado:'migrado'|'pendiente'|'revisar', motivo:string, uid:?string, migradoEn:?string}>}
 */
export function estadoMigracion(d){
  const perfiles=d.perfiles||{}, login=d.login||{};
  const filas=[], uidsLegitimos={};
  const revisar=(rec, esSuper)=>{
    const entrada=login[claveUsuario(rec.usuario)];
    const base={tipo:esSuper?'super':'usuario', id:rec.id, usuario:rec.usuario, nombre:rec.nombre||'',
      negocioId:esSuper?null:rec.negocioId, rol:esSuper?(rec.rolSuper||'dueno'):rec.rol, uid:null, migradoEn:null};
    if(!entrada || !entrada.uid) return Object.assign(base, {estado:'pendiente', motivo:''});
    base.uid=entrada.uid;
    const p=perfiles[entrada.uid];
    if(!p) return Object.assign(base, {estado:'revisar', motivo:'El índice apunta a una cuenta sin perfil'});
    if(rec.uid && rec.uid!==entrada.uid) return Object.assign(base, {estado:'revisar', motivo:'La cuenta del índice no es la registrada para este usuario'});
    if(!perfilCoincide(p, rec, esSuper)) return Object.assign(base, {estado:'revisar', motivo:'El perfil no coincide con el usuario (rol o negocio)'});
    uidsLegitimos[entrada.uid]=true;
    return Object.assign(base, {estado:'migrado', motivo:'', migradoEn:p.migradoEn||null});
  };
  (d.superadmins||[]).forEach(s=>{ if(s&&s.usuario) filas.push(revisar(s, true)); });
  (d.usuarios||[]).forEach(u=>{ if(u&&u.usuario) filas.push(revisar(u, false)); });
  // Perfiles que no pertenecen a ninguna cuenta real: posibles intrusos o restos de reemplazos
  Object.keys(perfiles).forEach(uid=>{
    if(uidsLegitimos[uid]) return;
    if(filas.some(f=>f.uid===uid)) return;   // ya listado como "revisar"
    const p=perfiles[uid]||{};
    filas.push({tipo:p.rol==='superadmin'?'super':'usuario', id:null, usuario:p.usuario||'?', nombre:p.nombre||'',
      negocioId:p.negocioId||null, rol:p.rolSuper||p.rol||'?', uid, migradoEn:p.migradoEn||null,
      estado:'revisar', motivo:'Perfil sin usuario real (posible cuenta ajena)'});
  });
  return filas;
}
export function resumenMigracion(filas){
  const r={total:0, migradas:0, pendientes:0, revisar:0};
  (filas||[]).forEach(f=>{
    if(f.id) r.total++;
    if(f.estado==='migrado') r.migradas++;
    else if(f.estado==='pendiente') r.pendientes++;
    else r.revisar++;
  });
  return r;
}

// Diferencias de un registro (por campo) para escribir solo lo que cambió.
// Devuelve {campo: valorNuevo|null}. Comparación por JSON, igual que el adaptador de datos.
export function camposCambiados(antes, despues){
  const out={};
  const a=antes||{}, b=despues||{};
  Object.keys(b).forEach(k=>{ if(JSON.stringify(b[k])!==JSON.stringify(a[k])) out[k]=b[k]===undefined?null:b[k]; });
  Object.keys(a).forEach(k=>{ if(!(k in b)) out[k]=null; });
  return out;
}

// ============================================================
//  INTERFAZ · Inicio de sesión
//  Login con cuentas de Firebase (S1) o local, sesión guardada, configuración inicial del dueño.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/10-users-roles/10-users-roles.md
// ============================================================


// ============================================================
//  CONTRASEÑAS (hash con sal, nunca en texto plano)
//  Antes cada usuario guardaba "pass" tal cual y la tabla viajaba a todos
//  los equipos. Ahora se guarda passHash = SHA-256 iterado de sal+contraseña.
//  Es síncrono y sin librerías para no depender de crypto.subtle (que exige
//  HTTPS) ni volver asíncrono el login.
// ============================================================
// Convierte a hash todas las contraseñas que sigan en texto plano.
// Corre una vez al arrancar, cuando ya se leyó la nube.
// Contraseña con hash: reglas en src/dominio/contrasenas.js; la sal la da el adaptador de cripto
function ponerPass(rec, pass){ return Dominio.contrasenas.ponerPass(rec, pass, Cripto.nuevaSal()); }
function migrarContrasenas(){
  ['superadmins','usuarios'].forEach(t=>{
    const arr=DB.get(t);
    if(!Array.isArray(arr)) return;
    let cambio=false;
    arr.forEach(x=>{ if(Dominio.contrasenas.necesitaMigrar(x)){ ponerPass(x, x.pass); cambio=true; } });
    if(cambio) DB.set(t, arr);
  });
}

// ============================================================
//  LOGIN
//  Con Firebase configurado (S1, Plan B): la contraseña la verifica Firebase
//  Authentication y el perfil (perfiles/<uid>) dice negocio, rol y permisos.
//  La primera vez de cada usuario su cuenta se migra sola (servicio de sesión,
//  src/aplicacion/servicios/sesion.js). Sin nube (modo local): se compara con
//  el hash guardado en el equipo, como antes.
// ============================================================
let _sesion=null, _dejarPerfil=null, _entrando=false, _configInicial=false;
const CLAVE_PERFIL='wallace_perfil_sesion';   // perfil de la sesión guardada (para abrir sin internet)
function conCuentasFirebase(){ return !!(FB_READY && Datos.estado.cuentas); }
function servicioSesion(){ return _sesion||(_sesion=ServicioSesion.crear()); }
function mensajeCuenta(e){ return ServicioSesion.mensajeDeFallo((e&&(e.codigo||e.motivo))||'error'); }
// Corta una promesa que no responde (sin internet) y devuelve el valor por defecto
function conTiempo(promesa, ms, porDefecto){
  return Promise.race([promesa, new Promise(r=>setTimeout(()=>r(porDefecto), ms))]);
}
function guardarPerfilLocal(uid, perfil){ try{ localStorage.setItem(CLAVE_PERFIL, JSON.stringify({uid, perfil})); }catch(e){} }
function leerPerfilLocal(){ try{ return JSON.parse(localStorage.getItem(CLAVE_PERFIL)||'null'); }catch(e){ return null; } }
function borrarPerfilLocal(){ try{ localStorage.removeItem(CLAVE_PERFIL); }catch(e){} }

// Modo local (sin nube): usuarios y contraseñas con hash guardados en el equipo
function login(usuario, pass){
  const sa=(DB.get('superadmins')||[]).find(s=>s.usuario===usuario && verificarPass(s,pass));
  if(sa){
    STATE.user={id:sa.id, nombre:sa.nombre, rol:'superadmin', rolSuper:sa.rolSuper||'dueno'};
    STATE.esSuperAdmin=true; STATE.negocio=null; STATE.page='';
    return {ok:true, tipo:'super'};
  }
  const u=(DB.get('usuarios')||[]).find(x=>x.usuario===usuario && x.activo!==false && verificarPass(x,pass));
  if(!u) return {ok:false, msg:'Usuario o contraseña incorrectos'};
  const neg=(DB.get('negocios')||[]).find(n=>n.id===u.negocioId);
  if(!neg) return {ok:false, msg:'Este usuario no tiene negocio asignado'};
  if(!neg.activo) return {ok:false, msg:'Este negocio está suspendido. Contacta al proveedor.'};
  ponerSesionNegocio(u, neg);
  return {ok:true, tipo:'negocio'};
}
// Estado de un empleado que entra a su negocio (con o sin cuentas de Firebase)
function ponerSesionNegocio(u, neg){
  STATE.user=u; STATE.esSuperAdmin=false; STATE.negocio=neg;
  STATE.pageNeg='';   // la primera pantalla que su rol tenga permitida (ver pantallaValida)
  // Sucursal: la última usada o la primera permitida
  if(neg.sucursales && neg.sucursales.length>1){
    let guardada=null;
    try{ guardada=localStorage.getItem('ws_suc_'+neg.id); }catch(e){}
    const permitidas=(u.sucursales && u.sucursales.length)
      ? neg.sucursales.filter(s=>u.sucursales.indexOf(s.id)>-1)
      : neg.sucursales;
    const valida=permitidas.find(s=>s.id===guardada);
    STATE.sucursal = valida ? valida.id : (permitidas[0]||neg.sucursales[0]).id;
  } else {
    STATE.sucursal='principal';
  }
}
function hacerLogin(){
  const u=(document.getElementById('l-user')||{}).value||'';
  const p=(document.getElementById('l-pass')||{}).value||'';
  if(conCuentasFirebase()){ hacerLoginCuentas(u.trim(), p); return; }
  const r=login(u.trim(), p);
  if(!r.ok){ toast(r.msg,'error'); sonidoError(); return; }
  _facturaReservada=null;
  // Arrancar la sincronización que corresponde
  if(r.tipo==='super'){
    detenerSincNegocio();
    sincronizarTodo();
  } else {
    detenerSincTodo();
    limpiarDatosAjenos(STATE.negocio.id);   // privacidad: fuera datos de otros negocios
    sincronizarNegocio(STATE.negocio.id);
  }
  render();
}
async function hacerLoginCuentas(usuario, pass){
  if(_entrando) return;
  _entrando=true;
  const btn=document.querySelector('.login-btn');
  if(btn){ btn.disabled=true; btn.textContent='Entrando…'; }
  let r;
  try{ r=await servicioSesion().iniciarSesion(usuario, pass, {pedirPassNueva}); }
  catch(e){ r={ok:false, motivo:(e&&e.codigo)||'error'}; }
  _entrando=false;
  if(!r.ok){
    if(btn){ btn.disabled=false; btn.textContent='Entrar'; }
    toast(ServicioSesion.mensajeDeFallo(r.motivo),'error'); sonidoError();
    return;
  }
  if(r.passCambiada) toast('Contraseña actualizada. Desde hoy entras con la nueva.','success');
  await entrarConPerfil(r.uid, r.perfil);
}
// Migración de una cuenta con contraseña de menos de 6 caracteres: se pide una nueva
function pedirPassNueva(){
  return new Promise(resolver=>{
    let listo=false;
    abrirModal({titulo:'🔑 Elige una contraseña nueva', textoBoton:'Guardar y entrar', campos:[
      {id:'n1', label:'Nueva contraseña (mínimo 6 caracteres)', tipo:'password', requerido:true},
      {id:'n2', label:'Repite la nueva contraseña', tipo:'password', requerido:true}
    ], extraHTML:'<p class="nota">El inicio de sesión ahora es más seguro y exige contraseñas de al menos 6 caracteres. Desde hoy entras con la nueva.</p>',
    onGuardar:d=>{
      if((d.n1||'').length<6){ toast('Debe tener al menos 6 caracteres','error'); return; }
      if(d.n1!==d.n2){ toast('Las contraseñas no coinciden','error'); return; }
      listo=true; resolver(d.n1); cerrarModal();
    },
    onCancelar:()=>{ if(!listo){ listo=true; resolver(null); } }});
  });
}
// Entra con el perfil de Firebase y arranca la sincronización que le corresponde
async function entrarConPerfil(uid, perfil){
  guardarPerfilLocal(uid, perfil);
  const u=Dominio.cuentas.usuarioDesdePerfil(perfil, uid);
  const enLinea=(typeof navigator==='undefined' || navigator.onLine!==false);
  _facturaReservada=null;
  if(perfil.rol==='superadmin'){
    Datos.configurarSesion({cuentas:true, superAdmin:true});
    STATE.user=u; STATE.esSuperAdmin=true; STATE.negocio=null; STATE.page='';
    detenerSincNegocio();
    // Fase 2 del Plan B: negocios y usuarios al formato por registro (una sola vez)
    if(enLinea){
      const m=await conTiempo(Datos.migrarTablasGlobales(), 15000, null);
      if(m && m.hecho) toast('Migración: '+m.negocios+' negocio(s) y '+m.usuarios+' usuario(s) pasados al formato nuevo','info');
    }
    sincronizarTodo();
    escucharMiPerfil(uid);
    migrarContrasenasLegado();
    render();
    return;
  }
  Datos.configurarSesion({cuentas:true, superAdmin:false, negId:perfil.negocioId});
  // Con las reglas de transición cualquier ingreso completa la migración; con las cerradas no hace nada
  if(enLinea) await conTiempo(Datos.migrarTablasGlobales(), 15000, null);
  let neg=enLinea ? await conTiempo(Datos.cargarNegocioPropio(perfil.negocioId).catch(()=>null), 10000, undefined) : undefined;
  if(neg===undefined){
    // Sin internet: el negocio que quedó guardado en este equipo
    neg=(DB.get('negocios')||[]).find(n=>n.id===perfil.negocioId)||null;
    if(!enLinea && neg) Datos.cargarNegocioPropio(perfil.negocioId).catch(()=>{});
  }
  if(!neg){ await Cuentas.salir(); borrarPerfilLocal(); toast('No se encontró tu negocio. Habla con el administrador del sistema.','error'); render(); return; }
  if(!neg.activo){ await Cuentas.salir(); borrarPerfilLocal(); toast('Este negocio está suspendido. Contacta al proveedor.','error'); render(); return; }
  ponerSesionNegocio(u, neg);
  detenerSincTodo();
  limpiarDatosAjenos(neg.id);   // privacidad: fuera datos de otros negocios y tablas globales
  sincronizarNegocio(neg.id);
  escucharMiPerfil(uid);
  render();
}
// Cambios del propio perfil en vivo: desactivado o contraseña restablecida → fuera; permisos nuevos → se aplican
function escucharMiPerfil(uid){
  if(_dejarPerfil) _dejarPerfil();
  _dejarPerfil=Cuentas.escucharPerfil(uid, p=>{
    if(!STATE.user) return;
    if(!p || p.activo===false){
      toast('Tu usuario fue desactivado o su contraseña se restableció. Inicia sesión de nuevo.','error');
      logout(); return;
    }
    guardarPerfilLocal(uid, p);
    if(STATE.modoSupervision) return;
    const nuevo=Dominio.cuentas.usuarioDesdePerfil(p, uid);
    if(JSON.stringify(nuevo)!==JSON.stringify(STATE.user)){ STATE.user=nuevo; refrescarSiSePuede(); }
  });
}
// El negocio cambió en la nube (Mi Negocio en otro equipo, o el super-admin lo suspendió)
function negocioCambiado(n){
  if(!STATE.user || STATE.esSuperAdmin || STATE.modoSupervision || !STATE.negocio || STATE.negocio.id!==n.id) return;
  STATE.negocio=JSON.parse(JSON.stringify(n));
  if(!n.activo){ toast('Este negocio fue suspendido. Contacta al proveedor.','error'); logout(); }
}
function logout(){
  STATE.user=null; STATE.negocio=null; STATE.esSuperAdmin=false;
  STATE.modoSupervision=false; STATE.sucursal=null;
  STATE.page=''; STATE.pageNeg='inicio';
  ESCRIBIENDO=false;
  _facturaReservada=null;   // la reserva es del negocio que se deja
  _resumenNeg=null;
  detenerSincNegocio();
  detenerSincTodo();
  if(_dejarPerfil){ _dejarPerfil(); _dejarPerfil=null; }
  if(conCuentasFirebase()){ Datos.configurarSesion({cuentas:true}); borrarPerfilLocal(); Cuentas.salir(); }
  render();
}
// Fuera de producción se dice en qué base se está trabajando (firebase-config.js)
function avisoEntorno(){
  const e=window.FIREBASE_ENTORNO;
  if(!e || e==='produccion') return '';
  const txt={pruebas:'🧪 Entorno de PRUEBAS', emulador:'🧪 Emuladores locales de Firebase',
    local:'💻 Modo local: los datos solo quedan en este navegador'}[e]||e;
  return `<p class="nota" style="text-align:center;margin:-4px 0 12px;">${escapeHtml(txt)}</p>`;
}
function vistaLogin(){
  return `<div class="login-fondo">
    <div class="login-caja">
      <div class="login-emblema">${window.WALLACE_LOGO||''}</div>
      <div class="login-marca">Wallace<span>System</span></div>
      <p class="login-sub">Sistema administrativo para tu negocio</p>
      ${avisoEntorno()}
      <div class="m-row"><label>Usuario</label>
        <input id="l-user" class="campo" placeholder="usuario" onkeydown="if(event.key==='Enter')hacerLogin()"></div>
      <div class="m-row"><label>Contraseña</label>
        <input id="l-pass" type="password" class="campo" placeholder="••••••" onkeydown="if(event.key==='Enter')hacerLogin()"></div>
      <button class="login-btn" onclick="hacerLogin()">Entrar</button>
      <div class="login-pie">WALLACE COMPANY SYSTEM</div>
    </div>
  </div>`;
}
// ---------- Configuración inicial: crear el primer dueño del sistema ----------
// Solo aparece cuando NO existe ningún super-admin y se sabe con certeza que
// la tabla está vacía (se leyó de la nube, o se trabaja sin nube).
function necesitaConfigInicial(){
  if(conCuentasFirebase()) return _configInicial;   // lo averigua arrancarCuentas (Cuentas.necesitaDueno)
  const sas=DB.get('superadmins');
  if(Array.isArray(sas) && sas.length) return false;
  return !FB_READY || GLOBALES_LEIDAS;
}
function vistaConfigInicial(){
  return `<div class="login-fondo">
    <div class="login-caja">
      <div class="login-emblema">${window.WALLACE_LOGO||''}</div>
      <div class="login-marca">Wallace<span>System</span></div>
      <p class="login-sub">Configuración inicial: crea la cuenta del dueño del sistema</p>
      ${avisoEntorno()}
      <div class="m-row"><label>Nombre completo</label><input id="ci-nombre" class="campo"></div>
      <div class="m-row"><label>Usuario</label><input id="ci-user" class="campo" autocomplete="off"></div>
      <div class="m-row"><label>Contraseña (mínimo 8 caracteres)</label><input id="ci-pass" type="password" class="campo" autocomplete="new-password"></div>
      <div class="m-row"><label>Repite la contraseña</label><input id="ci-pass2" type="password" class="campo" autocomplete="new-password" onkeydown="if(event.key==='Enter')crearDuenoInicial()"></div>
      <button class="login-btn" onclick="crearDuenoInicial()">Crear cuenta de dueño</button>
      <div class="login-pie">WALLACE COMPANY SYSTEM</div>
    </div>
  </div>`;
}
function crearDuenoInicial(){
  const v=id=>((document.getElementById(id)||{}).value||'');
  const nombre=v('ci-nombre').trim(), usuario=v('ci-user').trim(), pass=v('ci-pass'), pass2=v('ci-pass2');
  if(!nombre||!usuario){ toast('Escribe nombre y usuario','error'); return; }
  if(pass.length<8){ toast('La contraseña debe tener al menos 8 caracteres','error'); return; }
  if(pass!==pass2){ toast('Las contraseñas no coinciden','error'); return; }
  if(conCuentasFirebase()){ crearDuenoInicialCuentas(nombre, usuario, pass); return; }
  if((DB.get('usuarios')||[]).some(u=>u.usuario===usuario)){ toast('Ese usuario ya existe en un negocio','error'); return; }
  const rec=ponerPass({id:uid(), nombre, usuario, rolSuper:'dueno', creado:now()}, pass);
  // Solo se crea si la tabla sigue vacía (otro equipo no se adelantó)
  Datos.transaccionGlobal('superadmins', cur=>{
    if(cur && Object.keys(cur).length) return;   // ya existe alguien: abortar
    return [JSON.parse(JSON.stringify(rec))];
  }).then(res=>{
    if(!res.committed){ toast('Ya existe un administrador del sistema. Inicia sesión.','error'); }
    else { toast('Cuenta creada. Ya puedes entrar.','success'); }
    render();
  }).catch(e=>{ console.error(e); toast('No se pudo crear la cuenta en la nube','error'); });
}
// Instalación nueva con cuentas: cuenta de Firebase + registro + perfil del dueño
async function crearDuenoInicialCuentas(nombre, usuario, pass){
  try{
    const cuenta=await Cuentas.crearCuentaPropia(pass);
    const rec={id:uid(), nombre, usuario, rolSuper:'dueno', creado:now()};
    const res=await Datos.transaccionGlobal('superadmins', cur=>{
      if(cur && Object.keys(cur).length) return;   // ya existe alguien: abortar
      return [JSON.parse(JSON.stringify(rec))];
    });
    if(!res.committed){ await Cuentas.salir(); _configInicial=false; toast('Ya existe un administrador del sistema. Inicia sesión.','error'); render(); return; }
    const perfil=Dominio.cuentas.perfilDesdeSuperAdmin(rec);
    perfil.migradoEn=now(); perfil.creadoPor=cuenta.uid;
    await Cuentas.guardarCuenta({uid:cuenta.uid, correo:cuenta.correo, usuario, perfil});
    _configInicial=false;
    toast('Cuenta de dueño creada','success');
    await entrarConPerfil(cuenta.uid, perfil);
  }catch(e){ console.error(e); toast('No se pudo crear la cuenta: '+mensajeCuenta(e),'error'); }
}

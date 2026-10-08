// ============================================================
//  ADAPTADOR DE SALIDA · Cuentas con Firebase Authentication (S1, Plan B)
//  Implementa el PuertoCuentas (aplicacion/puertos/cuentas.js).
//
//   · La contraseña la verifica Firebase en sus servidores (correo interno).
//   · login/<claveUsuario> = {correo, uid}: con qué cuenta entra cada usuario.
//   · perfiles/<uid>: negocio, rol y permisos. Es lo que leen las reglas
//     (database.rules.json) para decidir qué datos entrega la base.
//   · Crear cuentas de OTROS sin cerrar la sesión propia: instancia
//     secundaria de Firebase ("altas") sin persistencia.
//
//  Debe iniciarse DESPUÉS del adaptador de datos (que crea la app de Firebase).
// ============================================================
import { ERRORES_CUENTA } from '../../aplicacion/puertos/cuentas.js';

const ESPERA_RED_MS=12000;

/**
 * @param {Object} opc
 * @param {Object} [opc.firebase]  SDK compat (window.firebase) con firebase-auth-compat cargado
 * @param {Object} [opc.config]    window.FIREBASE_CONFIG
 * @param {Object} opc.cuentas     dominio/cuentas.js
 * @param {() => string} opc.aleatorio  texto aleatorio (adaptador de cripto)
 * @param {Object} [opc.emuladores]  {auth:'host:puerto'} para desarrollo local
 */
export function crearAdaptadorCuentas(opc){
  const fb=opc.firebase, dom=opc.cuentas;
  let auth=null, db=null;

  function traducir(e){
    const c=(e&&(e.code||e.codigo))||'';
    const m=String((e&&e.message)||'').toLowerCase();
    let codigo=ERRORES_CUENTA.OTRO;
    if(['auth/wrong-password','auth/user-not-found','auth/invalid-credential','auth/invalid-login-credentials',
        'auth/invalid-email','auth/user-disabled'].indexOf(c)>-1) codigo=ERRORES_CUENTA.CREDENCIALES;
    else if(c==='auth/network-request-failed' || c==='red') codigo=ERRORES_CUENTA.RED;
    else if(c==='auth/too-many-requests') codigo=ERRORES_CUENTA.DEMASIADOS;
    else if(c==='auth/weak-password') codigo=ERRORES_CUENTA.PASS_DEBIL;
    else if(c==='auth/requires-recent-login') codigo=ERRORES_CUENTA.REAUTENTICAR;
    else if(c==='PERMISSION_DENIED' || m.indexOf('permission_denied')>-1 || m.indexOf('permission denied')>-1) codigo=ERRORES_CUENTA.PERMISO;
    const err=new Error((e&&e.message)||codigo);
    err.codigo=codigo; err.original=e;
    return err;
  }
  // Una lectura sin internet puede quedarse esperando para siempre: se corta.
  function conEspera(promesa){
    let t;
    return Promise.race([promesa, new Promise((_,rej)=>{ t=setTimeout(()=>rej({code:'red', message:'Sin respuesta de la nube'}), ESPERA_RED_MS); })])
      .then(v=>{ clearTimeout(t); return v; }, e=>{ clearTimeout(t); throw traducir(e); });
  }
  const leer=ruta=>conEspera(db.ref(ruta).once('value')).then(s=>s.val());
  const correoNuevo=()=>dom.correoInterno(opc.aleatorio());

  function iniciar(){
    try{
      if(!fb || typeof fb.auth!=='function' || !fb.apps || !fb.apps.length) return false;
      auth=fb.auth(); db=fb.database();
      usarEmulador(auth);
      return true;
    }catch(e){ console.error('Firebase Auth no disponible:',e); auth=null; db=null; return false; }
  }
  const disponible=()=>!!auth;
  function usarEmulador(a){
    if(opc.emuladores && opc.emuladores.auth) a.useEmulator('http://'+opc.emuladores.auth, {disableWarnings:true});
  }

  function alCambiarSesion(cb){
    auth.onAuthStateChanged(u=>cb(u?{uid:u.uid}:null));
  }
  function buscarLogin(usuario){
    const clave=dom.claveUsuario(usuario);
    if(!clave) return Promise.resolve(null);
    return leer('login/'+clave).then(v=>(v&&v.correo&&v.uid)?v:null);
  }
  function entrar(correo, pass){
    return conEspera(auth.signInWithEmailAndPassword(correo, pass)).then(c=>({uid:c.user.uid}));
  }
  function salir(){ return auth ? auth.signOut().catch(()=>{}) : Promise.resolve(); }
  function leerPerfil(uid){ return leer('perfiles/'+uid); }
  function escucharPerfil(uid, cb){
    const ref=db.ref('perfiles/'+uid);
    const h=s=>cb(s.val());
    ref.on('value', h, ()=>cb(null));   // permiso negado = sin perfil
    return ()=>{ try{ ref.off('value', h); }catch(e){} };
  }

  // Cuenta del propio usuario (migración): queda con la sesión iniciada
  function crearCuentaPropia(pass){
    const correo=correoNuevo();
    return conEspera(auth.createUserWithEmailAndPassword(correo, pass)).then(c=>({uid:c.user.uid, correo}));
  }
  // Cuenta de otra persona: instancia secundaria, sin cerrar la sesión del super-admin
  function instanciaAltas(){
    const ya=(fb.apps||[]).find(a=>a.name==='altas');
    if(ya) return ya;
    const nueva=fb.initializeApp(opc.config, 'altas');
    usarEmulador(nueva.auth());
    return nueva;
  }
  // Una alta a la vez: la instancia secundaria tiene una sola sesión (p. ej. "crear 5 demos")
  let colaAltas=Promise.resolve();
  function crearCuentaAjena(pass){
    const tarea=colaAltas.then(()=>{
      const altas=instanciaAltas(), a=altas.auth(), correo=correoNuevo();
      return conEspera(a.setPersistence(fb.auth.Auth.Persistence.NONE)
        .then(()=>a.createUserWithEmailAndPassword(correo, pass))
        .then(c=>{ const uid=c.user.uid; return a.signOut().then(()=>({uid, correo})); }));
    });
    colaAltas=tarea.catch(()=>{});
    return tarea;
  }

  // Escribe perfil + índice (+ rutas extra, relativas a la raíz) en una sola operación
  function guardarCuenta(d){
    const u={};
    u['perfiles/'+d.uid]=JSON.parse(JSON.stringify(d.perfil));
    u['login/'+dom.claveUsuario(d.usuario)]={correo:d.correo, uid:d.uid};
    Object.assign(u, d.extra||{});
    return conEspera(db.ref().update(u));
  }
  function borrarCuenta(d){
    const u={};
    if(d.uid) u['perfiles/'+d.uid]=null;
    const clave=dom.claveUsuario(d.usuario);
    // El índice solo se borra si apunta a esta cuenta (no a una que la reemplazó)
    const pre=clave ? buscarLogin(d.usuario).catch(()=>null) : Promise.resolve(null);
    return pre.then(ent=>{
      if(clave && ent && (!d.uid || ent.uid===d.uid)) u['login/'+clave]=null;
      Object.assign(u, d.extra||{});
      if(!Object.keys(u).length) return;
      return conEspera(db.ref().update(u));
    });
  }
  function actualizarPerfil(uid, campos, renombrar){
    const u={};
    Object.keys(campos||{}).forEach(k=>{ u['perfiles/'+uid+'/'+k]=campos[k]===undefined?null:JSON.parse(JSON.stringify(campos[k])); });
    if(renombrar && renombrar.antes!==renombrar.despues){
      u['login/'+dom.claveUsuario(renombrar.antes)]=null;
      u['login/'+dom.claveUsuario(renombrar.despues)]={correo:renombrar.correo, uid};
    }
    if(!Object.keys(u).length) return Promise.resolve();
    return conEspera(db.ref().update(u));
  }
  function cambiarMiPass(actual, nueva){
    const yo=auth.currentUser;
    if(!yo) return Promise.reject(traducir({code:'auth/requires-recent-login'}));
    const cred=fb.auth.EmailAuthProvider.credential(yo.email, actual);
    return conEspera(yo.reauthenticateWithCredential(cred).then(()=>yo.updatePassword(nueva)));
  }

  function leerIndice(){
    return Promise.all([leer('perfiles'), leer('login')]).then(([p,l])=>({perfiles:p||{}, login:l||{}}));
  }
  // Tablas del esquema viejo, con contraseñas. Solo se pueden leer con las
  // reglas de TRANSICIÓN; con las reglas cerradas devuelve null.
  function leerLegado(){
    return Promise.all([leer('data/superadmins'), leer('data/usuarios')])
      .then(([s,u])=>({superadmins:aLista(s), usuarios:aLista(u)}))
      .catch(e=>{ if(e.codigo===ERRORES_CUENTA.PERMISO) return null; throw e; });
  }
  function necesitaDueno(){
    return conEspera(db.ref('data/superadmins').limitToFirst(1).once('value'))
      .then(s=>!s.exists()).catch(()=>false);
  }
  const aLista=v=>Array.isArray(v)?v.filter(Boolean):(v&&typeof v==='object'?Object.values(v).filter(Boolean):[]);

  // Errores traducidos también en las operaciones que no pasan por conEspera
  const envolver=fn=>function(){
    try{ const r=fn.apply(null, arguments); return (r&&r.catch)?r.catch(e=>{ throw (e&&e.codigo)?e:traducir(e); }):r; }
    catch(e){ return Promise.reject(traducir(e)); }
  };
  return {
    iniciar, disponible, alCambiarSesion,
    buscarLogin:envolver(buscarLogin), entrar:envolver(entrar), salir,
    leerPerfil:envolver(leerPerfil), escucharPerfil,
    crearCuentaPropia:envolver(crearCuentaPropia), crearCuentaAjena:envolver(crearCuentaAjena),
    guardarCuenta:envolver(guardarCuenta), borrarCuenta:envolver(borrarCuenta),
    actualizarPerfil:envolver(actualizarPerfil), cambiarMiPass:envolver(cambiarMiPass),
    leerIndice:envolver(leerIndice), leerLegado:envolver(leerLegado), necesitaDueno
  };
}

// Prueba de conexión (prueba.html): revisa si Firebase responde y qué reglas están
// publicadas, sin escribir nada. Archivo aparte (no <script> en línea) para que
// funcione con la Content-Security-Policy (Documentation/-03-architecture/csp.md).
const R=document.getElementById('resultados'), L=document.getElementById('log'), V=document.getElementById('veredicto');
let FB=null, AUTH=null;
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fila(k,v,clase){ R.insertAdjacentHTML('beforeend','<div class="fila"><span>'+esc(k)+'</span><strong class="'+(clase||'')+'">'+esc(v)+'</strong></div>'); }
function log(t){ L.textContent += t+'\n'; }
// Misma codificación que src/dominio/cuentas.js (claveUsuario)
function claveUsuario(u){ return encodeURIComponent(String(u||'').trim()).replace(/\./g,'%2E'); }

// 1) Librerías
const hayApp=typeof firebase!=='undefined' && !!firebase.initializeApp;
fila('Librería Firebase', hayApp?'cargada ✓':'NO CARGÓ', hayApp?'ok':'mal');
fila('Inicio de sesión (Auth)', hayApp && typeof firebase.auth==='function'?'cargado ✓':'NO CARGÓ', hayApp && typeof firebase.auth==='function'?'ok':'mal');
if(!hayApp) log('La librería de Firebase no se descargó. Puede ser el internet o un bloqueador.');

// 2) Configuración y entorno (firebase-config.js elige la base según el dominio)
const cfg=window.FIREBASE_CONFIG, entorno=window.FIREBASE_ENTORNO||'?';
fila('Entorno', {produccion:'PRODUCCIÓN', pruebas:'PRUEBAS', emulador:'Emuladores locales', local:'Modo local (sin nube)'}[entorno]||entorno, entorno==='local'?'esp':'ok');
if(!cfg){
  fila('Base de datos','sin configurar','esp');
  log('Este dominio no tiene base asignada en firebase-config.js: la app funciona en modo local.');
} else {
  fila('Proyecto', cfg.projectId||'?', cfg.projectId?'ok':'mal');
}

// 3) Conectar y averiguar qué reglas hay
if(cfg && hayApp){
  try{
    firebase.initializeApp(cfg);
    FB=firebase.database(); AUTH=firebase.auth();
    const em=window.FIREBASE_EMULADORES;
    if(em){ const [h,p]=em.database.split(':'); FB.useEmulator(h,+p); AUTH.useEmulator('http://'+em.auth,{disableWarnings:true}); }
    R.insertAdjacentHTML('beforeend','<div class="fila"><span>Estado en vivo</span><strong id="estado-con" class="esp">comprobando...</strong></div>');
    FB.ref('.info/connected').on('value', s=>{
      const el=document.getElementById('estado-con');
      if(el){ el.className=s.val()?'ok':'mal'; el.textContent=s.val()?'CONECTADO ✓':'DESCONECTADO'; }
    });
    // Una entrada del índice de login se puede leer sin sesión con las dos versiones de reglas
    FB.ref('login/__diagnostico__').once('value').then(()=>{
      fila('Índice de inicio de sesión','responde ✓','ok');
      // ¿data abierto (transición) o cerrado (final)?
      return FB.ref('data/migracion_s1').once('value').then(s=>{
        fila('Reglas publicadas','de TRANSICIÓN (data abierto)','esp');
        fila('Migración de tablas', s.exists()?'hecha ✓':'pendiente (la hace el primer ingreso)', s.exists()?'ok':'esp');
        log('Con las reglas de transición cualquiera con la URL puede leer data. Ciérralas cuando la migración de cuentas esté completa (Panel → 🔐 Cuentas).');
      }, ()=>{
        fila('Reglas publicadas','CERRADAS ✓ (data protegido)','ok');
        V.innerHTML='<div class="aviso ok"><strong>✅ La base está protegida.</strong><br>Sin sesión no se puede leer ningún dato.</div>';
      });
    }).catch(err=>{
      fila('Índice de inicio de sesión','RECHAZADO','mal');
      log('ERROR: '+err.message);
      V.innerHTML='<div class="aviso mal"><strong>⛔ Las reglas publicadas no son las de Wallace System.</strong><br>Publica database.rules.transicion.json (durante la migración) o database.rules.json (final). Ver Documentation/-00-execution-protocol. <strong>Nunca</strong> publiques reglas abiertas en la raíz.</div>';
    });
  }catch(e){
    fila('Conexión','FALLÓ','mal');
    log('ERROR: '+e.message);
  }
}

// 4) Inicio de sesión de prueba: índice → Firebase Auth → perfil → salir
async function probarSesion(){
  if(!FB || !AUTH){ log('No hay conexión, no se puede probar.'); return; }
  const u=document.getElementById('u').value.trim(), p=document.getElementById('p').value;
  if(!u || !p){ log('Escribe usuario y contraseña.'); return; }
  try{
    const ent=(await FB.ref('login/'+claveUsuario(u)).once('value')).val();
    if(!ent){ fila('Usuario '+u,'sin cuenta todavía (migra al entrar a la app)','esp'); return; }
    await AUTH.setPersistence(firebase.auth.Auth.Persistence.NONE);
    const c=await AUTH.signInWithEmailAndPassword(ent.correo, p);
    const perfil=(await FB.ref('perfiles/'+c.user.uid).once('value')).val();
    fila('Usuario '+u, perfil?('entra ✓ · '+(perfil.rol==='superadmin'?'super-admin':perfil.rol+' de '+perfil.negocioId)+(perfil.activo===false?' · DESACTIVADO':'')):'cuenta SIN perfil', perfil&&perfil.activo!==false?'ok':'mal');
    await AUTH.signOut();
  }catch(e){
    fila('Usuario '+u, /password|credential/i.test(e.code||'')?'contraseña incorrecta':'error: '+(e.code||e.message), 'mal');
  }
}
document.getElementById('b-probar').addEventListener('click', probarSesion);
document.getElementById('b-revisar').addEventListener('click', ()=>location.reload());

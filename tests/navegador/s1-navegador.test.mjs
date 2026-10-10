// Prueba de humo de S1 con la interfaz REAL (index.html + src/adaptadores/entrada/ui/) en Chrome/Edge sin
// ventana, contra los emuladores de Firebase. Datos sintéticos; no toca ninguna base real.
//   npm run test:firebase    (la incluye; requiere Java 11+ y Chrome o Edge instalados)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';

const DB_HOST=process.env.FIREBASE_DATABASE_EMULATOR_HOST, AUTH_HOST=process.env.FIREBASE_AUTH_EMULATOR_HOST;
const NAVEGADORES=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const NAVEGADOR=process.env.CHROME_PATH || NAVEGADORES.find(p=>existsSync(p));
const omitir=!(DB_HOST && AUTH_HOST) ? 'sin emuladores (npm run test:firebase)' : (!NAVEGADOR && 'sin Chrome/Edge (CHROME_PATH)');
const NS='demo-wallace-default-rtdb', PUERTO=3917, URL_APP='http://localhost:'+PUERTO+'/?emulador';
const rest=(ruta, metodo, cuerpo)=>fetch('http://'+DB_HOST+'/'+ruta+'.json?ns='+NS, {method:metodo||'GET',
  headers:{Authorization:'Bearer owner'}, body:cuerpo===undefined?undefined:JSON.stringify(cuerpo)}).then(r=>r.json());
const ponerReglas=a=>rest('.settings/rules','PUT',JSON.parse(readFileSync(new URL('../../'+a, import.meta.url),'utf8')));
const espera=ms=>new Promise(r=>setTimeout(r,ms));

const NEG=(id,nombre)=>({id, nombre, tipo:'Otro', activo:true, plan:'Básico', precioMes:0, creado:'2026-0'+(id==='n1'?1:2)+'-01T00:00:00Z',
  funciones:['ventas','catalogo','caja','facturas','clientes','inventario','reportes'], flujoPedido:'directo', tiposEntrega:['llevar'],
  tema:'oscuro', palabraProducto:'Producto', palabraProductos:'Productos', palabraPedido:'Pedido', palabraPersonal:'Personal', logo:''});
const DATOS={
  negocios:[NEG('n1','Licorera'), NEG('n2','Tienda')],
  usuarios:[
    {id:'u1', negocioId:'n1', usuario:'MARCE', nombre:'Marcela', rol:'admin', pass:'1234', activo:true},
    {id:'u2', negocioId:'n2', usuario:'vapeo', nombre:'Otro', rol:'admin', pass:'vapeo99', activo:true}
  ],
  superadmins:[{id:'s1', usuario:'admin', nombre:'Roldán', rolSuper:'dueno', pass:'clavedueno'}],
  data_n1_productos:[{id:'p1', nombre:'Aguardiente', precio:50000, stock:10, creado:'2026-01-01T00:00:00Z'}],
  data_n2_ventas_r:{v9:{id:'v9', total:9, fecha:'2026-10-01T00:00:00Z'}}
};

let navegador, pagina, servidor;
const errores=[];
async function escribir(sel, texto){ await pagina.waitForSelector(sel, {visible:true, timeout:15000}); await pagina.$eval(sel, e=>{ e.value=''; }); await pagina.type(sel, texto); }
async function textoApp(){ return pagina.$eval('#app', e=>e.innerText); }
async function esperarTexto(t, ms){
  const fin=Date.now()+(ms||20000);
  while(Date.now()<fin){ if((await textoApp()).includes(t)) return; await espera(250); }
  throw new Error('No apareció "'+t+'". Pantalla:\n'+(await textoApp()).slice(0,600));
}
async function entrar(usuario, pass){
  await escribir('#l-user', usuario); await escribir('#l-pass', pass);
  await pagina.click('.login-btn');
}
async function salir(){
  await pagina.evaluate(()=>WS.logout());
  await pagina.waitForSelector('#l-user', {visible:true, timeout:15000});
}

before(async ()=>{
  if(omitir) return;
  await fetch('http://'+AUTH_HOST+'/emulator/v1/projects/demo-wallace/accounts', {method:'DELETE'});
  await ponerReglas('database.rules.transicion.json');
  await rest('', 'PUT', {data:DATOS});
  servidor=spawn('npx serve -s . -l '+PUERTO, {shell:true, stdio:'ignore'});
  for(let i=0;i<60;i++){ try{ await fetch('http://localhost:'+PUERTO+'/'); break; }catch(e){ await espera(500); } }
  const puppeteer=(await import('puppeteer-core')).default;
  navegador=await puppeteer.launch({executablePath:NAVEGADOR, headless:true, args:['--no-sandbox']});
  pagina=await navegador.newPage();
  pagina.on('pageerror', e=>errores.push('pageerror: '+e.message));
  pagina.on('console', m=>{ if(process.env.DEBUG_NAV) console.log('[nav]', m.type(), m.text().slice(0,300)); if(m.type()==='error' && !/permission|PERMISSION|favicon|fonts\.g/i.test(m.text())) errores.push('console: '+m.text()); });
  await pagina.goto(URL_APP, {waitUntil:'networkidle2'});
});
after(async ()=>{
  if(navegador) await navegador.close();
  if(servidor){ try{ if(process.platform==='win32') execSync('taskkill /pid '+servidor.pid+' /T /F', {stdio:'ignore'}); else servidor.kill(); }catch(e){} }
});

test('login con aviso de entorno y migración del dueño del sistema', {skip:omitir}, async ()=>{
  await esperarTexto('Emuladores locales');
  await entrar('admin', 'clavedueno');
  await esperarTexto('Licorera');
  await esperarTexto('Tienda');
  const d=await rest('data');
  assert.ok(d.negocios_r && d.negocios_r.n1, 'negocios_r creado');
  assert.equal(d.superadmins[0].pass, undefined, 'clave vieja del dueño retirada');
  await espera(1500);
  const leg=Object.values((await rest('data/usuarios'))||{});
  assert.ok(leg.every(u=>!u.pass && u.passHash), 'contraseñas viejas pasadas a hash');
  await salir();
});
test('empleado con contraseña corta: elige una nueva y entra a su negocio', {skip:omitir}, async ()=>{
  await entrar('MARCE', '1234');
  await pagina.waitForSelector('#m-n1', {visible:true, timeout:20000});
  await pagina.type('#m-n1', 'marce2026'); await pagina.type('#m-n2', 'marce2026');
  await pagina.click('#modal-ok');
  await esperarTexto('Mi Negocio');
  const yo=await pagina.evaluate(()=>({user:WS.STATE.user, neg:WS.STATE.negocio&&WS.STATE.negocio.id, otros:Object.keys(Datos.cache).filter(k=>k.startsWith('data_n2'))}));
  assert.equal(yo.neg, 'n1'); assert.equal(yo.user.rol, 'admin'); assert.ok(yo.user.uid);
  assert.deepEqual(yo.otros, [], 'sin datos de otros negocios en el equipo');
});
test('Mi Negocio guarda por campo en negocios_r', {skip:omitir}, async ()=>{
  await pagina.evaluate(()=>{ WS.irA('minegocio'); });
  await escribir('#n-nombre', 'Licorera La M');
  await pagina.evaluate(()=>WS.guardarMiNegocio());
  await espera(800);
  assert.equal((await rest('data/negocios_r/n1/nombre')), 'Licorera La M');
  assert.equal((await rest('data/negocios_r/n1/plan')), 'Básico');
});
test('reglas cerradas: al recargar la sesión sigue y no se ve otro negocio', {skip:omitir}, async ()=>{
  await ponerReglas('database.rules.json');
  await pagina.reload({waitUntil:'networkidle2'});
  await esperarTexto('Mi Negocio');
  const r=await pagina.evaluate(()=>Promise.all([
    firebase.database().ref('data/data_n2_ventas_r').once('value').then(()=>'leyó', e=>'negado'),
    firebase.database().ref('data/usuarios').once('value').then(()=>'leyó', e=>'negado'),
    firebase.database().ref('data/data_n1_productos_r').once('value').then(s=>s.exists()?'propio':'vacío', e=>'negado')
  ]));
  assert.deepEqual(r, ['negado','negado','propio']);
  await salir();
});
test('super-admin con reglas cerradas: panel y pantalla de migración', {skip:omitir}, async ()=>{
  await entrar('admin', 'clavedueno');
  await esperarTexto('Licorera La M');
  await pagina.evaluate(()=>WS.abrirMigracion());
  await esperarTexto('cuentas migradas');
  const t=await textoApp();
  assert.match(t, /2 de 3 cuentas migradas · 1 pendientes · 0 por revisar/);
  await salir();
});
test('modo local (sin nube): configuración inicial, crear negocio, F12 de inventario', {skip:omitir}, async ()=>{
  const ctx=await navegador.createBrowserContext();   // localStorage limpio
  const p=await ctx.newPage();
  p.on('pageerror', e=>errores.push('local pageerror: '+e.message));
  const txt=()=>p.$eval('#app', e=>e.innerText);
  const hasta=async t=>{ const fin=Date.now()+15000; while(Date.now()<fin){ if((await txt()).includes(t)) return; await espera(200); } throw new Error('No apareció "'+t+'": '+(await txt()).slice(0,400)); };
  const poner=async (sel,v)=>{ await p.waitForSelector(sel,{visible:true}); await p.$eval(sel,e=>{ e.value=''; }); await p.type(sel,v); };
  await p.goto('http://localhost:'+PUERTO+'/?local', {waitUntil:'networkidle2'});
  await hasta('Modo local');
  await hasta('Configuración inicial');
  await poner('#ci-nombre','Dueño'); await poner('#ci-user','dueno'); await poner('#ci-pass','clave1234'); await poner('#ci-pass2','clave1234');
  await p.evaluate(()=>WS.crearDuenoInicial());
  await p.waitForSelector('#l-user',{visible:true});
  await poner('#l-user','dueno'); await poner('#l-pass','clave1234'); await p.click('.login-btn');
  await p.evaluate(()=>WS.nuevoNegocio());
  await poner('#m-nombre','Local Uno'); await poner('#m-usuario','jefe');
  const planes=await p.$$eval('#m-plan option', os=>os.map(o=>o.value));
  assert.deepEqual(planes, ['Básico','Profesional','Premium']);                 // F6
  await p.click('#modal-ok');
  await hasta('Local Uno');
  await p.evaluate(()=>WS.logout());
  await poner('#l-user','jefe'); await poner('#l-pass','admin123'); await p.click('.login-btn');
  await hasta('Mi Negocio');
  await p.evaluate(()=>WS.irA('minegocio'));
  await p.waitForSelector('#n-inventario');
  await p.$eval('#n-inventario', e=>{ e.checked=false; });
  await p.evaluate(()=>WS.guardarMiNegocio());
  const n=await p.evaluate(()=>({usa:WS.usaInventario(WS.STATE.negocio), fun:WS.STATE.negocio.funciones.indexOf('inventario')>-1, apagado:WS.STATE.negocio.inventarioApagado}));
  assert.deepEqual(n, {usa:false, fun:true, apagado:true});                     // F12: no toca funciones
  await ctx.close();
});
test('R1: el panel no descarga ventas; usa el resumen y supervisar carga el negocio bajo demanda', {skip:omitir}, async ()=>{
  // El equipo de MARCE (n1) publicó su resumen al bajar sus ventas
  const r1=await rest('data/data_n1_resumen');
  assert.ok(r1 && r1.pagadas===0, 'resumen de n1 publicado');
  await entrar('admin', 'clavedueno');
  await esperarTexto('Licorera La M');
  await espera(800);
  const antes=await pagina.evaluate(()=>Object.keys(Datos.cache).filter(k=>/_ventas$/.test(k) && (Datos.cache[k]||[]).length));
  assert.deepEqual(antes, [], 'el panel no tiene ventas de ningún negocio');
  await pagina.evaluate(()=>WS.entrarComoNegocio('n2'));
  await pagina.waitForFunction(()=>datosDe('n2','ventas').length===1, {timeout:15000});
  await pagina.evaluate(()=>WS.volverSuperAdmin());
  await salir();
});
test('sin errores de JavaScript en la página', {skip:omitir}, ()=>{
  assert.deepEqual(errores, []);
});

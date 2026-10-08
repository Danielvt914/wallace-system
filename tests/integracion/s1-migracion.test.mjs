// Ensayo completo de S1 (Plan B) con los adaptadores REALES contra los emuladores
// de Firebase Authentication y Realtime Database. Datos sintéticos con la misma
// forma que producción (negocios en array, contraseñas en texto plano y cortas).
//   npm run test:firebase     (levanta los emuladores; requiere Java 11+)
// Con "npm test" a secas se omite.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import { crearAdaptadorFirebase } from '../../src/adaptadores/salida/firebase-datos.js';
import { crearAdaptadorCuentas } from '../../src/adaptadores/salida/firebase-cuentas.js';
import { crearAlmacenLocal } from '../../src/adaptadores/salida/almacen-local.js';
import { crearServicioSesion } from '../../src/aplicacion/servicios/sesion.js';
import * as cuentas from '../../src/dominio/cuentas.js';
import * as contrasenas from '../../src/dominio/contrasenas.js';
import { nuevaSal } from '../../src/adaptadores/salida/cripto-navegador.js';

const DB_HOST=process.env.FIREBASE_DATABASE_EMULATOR_HOST, AUTH_HOST=process.env.FIREBASE_AUTH_EMULATOR_HOST;
const omitir=!(DB_HOST && AUTH_HOST) && 'sin emuladores (npm run test:firebase)';
const PROYECTO='demo-wallace', NS=PROYECTO+'-default-rtdb';
const CONFIG={apiKey:'demo-key', authDomain:PROYECTO+'.firebaseapp.com', projectId:PROYECTO, databaseURL:'https://'+NS+'.firebaseio.com'};
const PANT={admin:['inicio','config'], cajero:['inicio','ventas'], dueno:['inicio','config']};

// REST del emulador con permisos de dueño (sin reglas)
const rest=(ruta, metodo, cuerpo)=>fetch('http://'+DB_HOST+'/'+ruta+'.json?ns='+NS, {method:metodo||'GET',
  headers:{Authorization:'Bearer owner'}, body:cuerpo===undefined?undefined:JSON.stringify(cuerpo)}).then(r=>r.json());
const ponerReglas=archivo=>rest('.settings/rules', 'PUT', JSON.parse(readFileSync(new URL('../../'+archivo, import.meta.url),'utf8')));
const borrarCuentasAuth=()=>fetch('http://'+AUTH_HOST+'/emulator/v1/projects/'+PROYECTO+'/accounts', {method:'DELETE'});

// Firebase "envuelto": toda app que se cree apunta a los emuladores
const fb=Object.create(firebase);
fb.initializeApp=(cfg, nombre)=>{
  const app=firebase.initializeApp(cfg, nombre);
  const [h,p]=DB_HOST.split(':'); app.database().useEmulator(h, +p);
  app.auth().useEmulator('http://'+AUTH_HOST, {disableWarnings:true});
  return app;
};
function memoria(){ const m=new Map(); return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)),
  removeItem:k=>m.delete(k), key:i=>[...m.keys()][i]??null, get length(){ return m.size; }}; }

let datos, C, sesion;
const LEGADO={
  negocios:[
    {id:'n1', nombre:'Licorera', activo:true, plan:'Básico', funciones:['ventas','inventario'], creado:'2026-01-01T00:00:00Z', logo:'data:x'},
    {id:'n2', nombre:'Tienda', activo:true, plan:'Premium', funciones:['ventas'], creado:'2026-02-01T00:00:00Z'}
  ],
  usuarios:[
    {id:'u1', negocioId:'n1', usuario:'BURGOS', nombre:'Alejo', rol:'dueno', pass:'burgos1', activo:true},
    {id:'u2', negocioId:'n1', usuario:'MARCE', nombre:'Marcela', rol:'dueno', pass:'1234', activo:true},
    {id:'u3', negocioId:'n2', usuario:'vapeo', nombre:'Admin', rol:'admin', pass:'vape', activo:true}
  ],
  superadmins:[{id:'s1', usuario:'admin', nombre:'Roldán', rolSuper:'dueno', pass:'clavedueno'}],
  data_n1_ventas:[{id:'v1', total:1000, fecha:'2026-10-01T10:00:00Z'}],
  data_n2_ventas_r:{v9:{id:'v9', total:9}}
};

before(async ()=>{
  if(omitir) return;
  await borrarCuentasAuth();
  await ponerReglas('database.rules.transicion.json');
  await rest('', 'PUT', {data:LEGADO});
  datos=crearAdaptadorFirebase({local:crearAlmacenLocal(memoria(),'ws_'), firebase:fb, config:CONFIG, ganchos:{}});
  assert.equal(datos.iniciar(), true);
  C=crearAdaptadorCuentas({firebase:fb, config:CONFIG, cuentas, aleatorio:nuevaSal});
  assert.equal(C.iniciar(), true);
  datos.configurarSesion({cuentas:true});
  sesion=crearServicioSesion({cuentas:C, dominio:{cuentas, contrasenas}, pantallasPorRol:PANT,
    leerUsuarioNegocio:(n,id)=>datos.leerRegistro(n,'usuarios',id),
    retirarClaveVieja:({tipo,id})=>tipo==='super'
      ? datos.transaccionGlobal('superadmins', cur=>{ if(cur===null) return null; const l=Object.values(cur); const x=l.find(s=>s.id===id); cuentas.CAMPOS_PASS.forEach(k=>delete x[k]); return l; })
      : datos.modificarUsuariosLegado(l=>l.filter(x=>x.id!==id))});
});
after(async ()=>{ if(omitir) return; await C.salir(); await Promise.all(firebase.apps.map(a=>a.delete())); });

test('fase 2: el dueño del sistema migra su cuenta y las tablas globales', {skip:omitir}, async ()=>{
  const r=await sesion.iniciarSesion('admin', 'clavedueno');
  assert.equal(r.ok, true, r.motivo); assert.equal(r.perfil.rol, 'superadmin');
  datos.configurarSesion({cuentas:true, superAdmin:true});
  const m=await datos.migrarTablasGlobales();
  assert.deepEqual([m.hecho, m.negocios, m.usuarios], [true, 2, 3]);
  const d=await rest('data');
  assert.equal(d.negocios, undefined); assert.ok(d.negocios_bk);
  assert.equal(d.negocios_r.n1.nombre, 'Licorera');
  assert.equal(d.data_n1_usuarios_r.u2.usuario, 'MARCE');
  for(const k of cuentas.CAMPOS_PASS) assert.equal(k in d.data_n1_usuarios_r.u2, false);
  assert.equal(d.superadmins[0].pass, undefined);               // su clave vieja se retiró
  assert.equal((await datos.migrarTablasGlobales()).motivo, 'ya_migrado');
  await C.salir();
});
test('fase 2: un empleado migra con su misma contraseña; otro con contraseña corta elige una nueva', {skip:omitir}, async ()=>{
  const r=await sesion.iniciarSesion('BURGOS', 'burgos1');
  assert.equal(r.ok, true, r.motivo); assert.equal(r.perfil.negocioId, 'n1'); assert.equal(r.perfil.editaNegocio, true);
  await C.salir();
  const r2=await sesion.iniciarSesion('vapeo', 'vape', {pedirPassNueva:async ()=>'vapeo2026'});
  assert.equal(r2.ok, true, r2.motivo); assert.equal(r2.passCambiada, true);
  await C.salir();
  assert.equal((await sesion.iniciarSesion('vapeo', 'vape')).motivo, 'credenciales');   // la vieja ya no sirve
  const d=await rest('data/usuarios');
  assert.deepEqual(Object.values(d).map(u=>u.usuario), ['MARCE']);                        // solo queda el pendiente
});
test('fase 4: con reglas cerradas cada negocio queda aislado', {skip:omitir}, async ()=>{
  await ponerReglas('database.rules.json');
  const r=await sesion.iniciarSesion('BURGOS', 'burgos1');
  assert.equal(r.ok, true, r.motivo);
  datos.configurarSesion({cuentas:true, superAdmin:false, negId:'n1'});
  const neg=await datos.cargarNegocioPropio('n1');
  assert.equal(neg.nombre, 'Licorera');
  const db=firebase.database();
  await assert.rejects(db.ref('data/data_n2_ventas_r').once('value'));
  await assert.rejects(db.ref('data/usuarios').once('value'));
  await assert.rejects(db.ref('data/negocios_r/n2').once('value'));
  assert.equal((await db.ref('data/data_n1_ventas').once('value')).val().length, 1);   // tabla vieja de su negocio: legible para migrarla
  // Mi Negocio: solo se envían los campos permitidos (el plan se ignora sin romper el resto)
  datos.set('negocios', [Object.assign({}, neg, {nombre:'Licorera La M', plan:'Premium', inventarioApagado:true})]);
  await new Promise(res=>setTimeout(res, 400));
  const n1=await rest('data/negocios_r/n1');
  assert.deepEqual([n1.nombre, n1.plan, n1.inventarioApagado], ['Licorera La M', 'Básico', true]);
  datos.detenerSincNegocio();
  await C.salir();
  // Quien no migró antes del cierre ya no puede migrar solo
  assert.equal((await sesion.iniciarSesion('MARCE', '1234', {pedirPassNueva:async ()=>'marce2026'})).motivo, 'credenciales');
});
test('fase 3/4: el super-admin crea la cuenta del pendiente sin perder su sesión', {skip:omitir}, async ()=>{
  const r=await sesion.iniciarSesion('admin', 'clavedueno');
  assert.equal(r.ok, true, r.motivo);
  const marce={id:'u2', negocioId:'n1', usuario:'MARCE', nombre:'Marcela', rol:'dueno', activo:true};
  const cuenta=await C.crearCuentaAjena('marce2026');
  const perfil=cuentas.perfilDesdeUsuario(marce, PANT); perfil.migradoEn=new Date().toISOString();
  await C.guardarCuenta({uid:cuenta.uid, correo:cuenta.correo, usuario:'MARCE', perfil});
  assert.equal(firebase.auth().currentUser.uid, r.uid);          // sigue siendo el super-admin
  const ix=await C.leerIndice();
  const filas=cuentas.estadoMigracion({superadmins:[{id:'s1', usuario:'admin', rolSuper:'dueno'}],
    usuarios:Object.values((await rest('data/data_n1_usuarios_r'))).concat(Object.values(await rest('data/data_n2_usuarios_r'))),
    perfiles:ix.perfiles, login:ix.login});
  assert.deepEqual(cuentas.resumenMigracion(filas), {total:4, migradas:4, pendientes:0, revisar:0});
  await C.salir();
  const r2=await sesion.iniciarSesion('MARCE', 'marce2026');
  assert.equal(r2.ok, true, r2.motivo);
  await C.salir();
});
test('desactivar un perfil corta el acceso aunque la contraseña sea correcta', {skip:omitir}, async ()=>{
  await sesion.iniciarSesion('admin', 'clavedueno');
  const ent=await C.buscarLogin('BURGOS');
  await C.actualizarPerfil(ent.uid, {activo:false});
  await C.salir();
  assert.equal((await sesion.iniciarSesion('BURGOS', 'burgos1')).motivo, 'inactivo');
});

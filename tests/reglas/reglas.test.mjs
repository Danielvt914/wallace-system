// Pruebas de las reglas de Realtime Database (S1) contra el EMULADOR de Firebase.
// No tocan ninguna base real: proyecto "demo-wallace", solo en memoria.
//   npm run test:firebase      (levanta el emulador, corre esto y lo apaga; requiere Java 11+)
// Con "npm test" a secas se omiten (no hay emulador).
import { test, describe, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const HAY_EMULADOR=!!process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const reglas=archivo=>readFileSync(new URL('../../'+archivo, import.meta.url), 'utf8');

// Datos de prueba: dos negocios (N1 activo, N10 para probar prefijos), perfiles de cada tipo
const PERFILES={
  sa:      {rol:'superadmin', rolSuper:'dueno', usuario:'dueno', activo:true},
  saOff:   {rol:'superadmin', rolSuper:'ayudante', usuario:'viejo', activo:false},
  admin1:  {rol:'admin', usuario:'admin1', negocioId:'N1', activo:true, editaNegocio:true},
  cajero1: {rol:'cajero', usuario:'caja1', negocioId:'N1', activo:true, editaNegocio:false},
  cajeroOff:{rol:'cajero', usuario:'caja2', negocioId:'N1', activo:false, editaNegocio:false},
  cajero10:{rol:'cajero', usuario:'caja10', negocioId:'N10', activo:true, editaNegocio:false}
};
function datosBase(n1Activo){
  return {
    perfiles:PERFILES,
    login:{admin1:{correo:'ua@x.app', uid:'admin1'}, caja1:{correo:'uc@x.app', uid:'cajero1'}},
    data:{
      negocios_r:{
        N1:{id:'N1', nombre:'Uno', activo:n1Activo, plan:'Básico', funciones:['ventas']},
        N10:{id:'N10', nombre:'Diez', activo:true}
      },
      superadmins:[{id:'s1', usuario:'dueno'}],
      usuarios:[{id:'u1', usuario:'caja1', passHash:'x'}],
      data_N1_ventas_r:{v1:{id:'v1', total:1000}},
      data_N1_usuarios_r:{u1:{id:'u1', usuario:'caja1', rol:'cajero'}},
      data_N1_factura_seq:7,
      data_N10_ventas_r:{v9:{id:'v9', total:9}}
    }
  };
}

describe('reglas cerradas (database.rules.json)', {skip:!HAY_EMULADOR && 'sin emulador (npm run test:firebase)'}, ()=>{
  let env;
  const db=uid=>uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database();
  const sembrar=n1Activo=>env.withSecurityRulesDisabled(c=>c.database().ref().set(datosBase(n1Activo)));
  before(async ()=>{ env=await initializeTestEnvironment({projectId:'demo-wallace', database:{rules:reglas('database.rules.json')}}); });
  after(async ()=>{ if(env) await env.cleanup(); });
  beforeEach(async ()=>{ await env.clearDatabase(); await sembrar(true); });

  test('sin sesión no se lee nada salvo una entrada del índice de login', async ()=>{
    await assertFails(db(null).ref('data').once('value'));
    await assertFails(db(null).ref('data/negocios_r/N1').once('value'));
    await assertFails(db(null).ref('perfiles').once('value'));
    await assertFails(db(null).ref('login').once('value'));          // no se puede listar
    await assertSucceeds(db(null).ref('login/caja1').once('value'));
    await assertFails(db(null).ref('login/nuevo').set({correo:'a@b', uid:'z'}));
  });
  test('un empleado solo lee y escribe las tablas de su negocio', async ()=>{
    const d=db('cajero1');
    await assertSucceeds(d.ref('data/data_N1_ventas_r').once('value'));
    await assertSucceeds(d.ref('data/data_N1_ventas_r/v2').set({id:'v2', total:5}));
    await assertFails(d.ref('data/data_N10_ventas_r').once('value'));   // N1 no es prefijo de N10
    await assertFails(d.ref('data/data_N10_ventas_r/v3').set({id:'v3'}));
    await assertSucceeds(d.ref('data').update({'data_N1_ventas_r/v4':{id:'v4'}, 'data_N1_auditoria_r/a1':{id:'a1'}}));
  });
  test('una ruta prohibida en un update de varias rutas hace fallar todo el update', async ()=>{
    await assertFails(db('cajero1').ref('data').update({'data_N1_ventas_r/v5':{id:'v5'}, 'data_N10_ventas_r/v6':{id:'v6'}}));
  });
  test('transacción del consecutivo de factura', async ()=>{
    const r=await assertSucceeds(db('cajero1').ref('data/data_N1_factura_seq').transaction(c=>(c||0)+1));
    if(r.snapshot.val()!==8) throw new Error('esperaba 8, llegó '+r.snapshot.val());
  });
  test('un empleado lee los usuarios de su negocio pero no los modifica', async ()=>{
    const d=db('admin1');
    await assertSucceeds(d.ref('data/data_N1_usuarios_r').once('value'));
    await assertFails(d.ref('data/data_N1_usuarios_r/u1/rol').set('admin'));
    await assertFails(d.ref('data/data_N1_usuarios_x/u1').set(1));
  });
  test('ni credenciales ni tablas globales ni perfiles ajenos', async ()=>{
    const d=db('admin1');
    await assertFails(d.ref('data/usuarios').once('value'));
    await assertFails(d.ref('data/superadmins').once('value'));
    await assertFails(d.ref('perfiles/cajero1').once('value'));
    await assertSucceeds(d.ref('perfiles/admin1').once('value'));
    await assertFails(d.ref('perfiles/admin1/rol').set('superadmin'));
    await assertFails(d.ref('perfiles/admin1/negocioId').set('N10'));
    await assertFails(d.ref('login/admin1').set({correo:'x@y', uid:'admin1'}));
  });
  test('negocio: lo lee su gente; el admin edita Mi Negocio pero no estado, plan ni ventanas', async ()=>{
    await assertSucceeds(db('cajero1').ref('data/negocios_r/N1').once('value'));
    await assertFails(db('cajero1').ref('data/negocios_r/N10').once('value'));
    await assertFails(db('cajero1').ref('data/negocios_r/N1/nombre').set('X'));   // sin editaNegocio
    const a=db('admin1');
    await assertSucceeds(a.ref('data/negocios_r/N1/nombre').set('Uno SAS'));
    await assertSucceeds(a.ref('data').update({'negocios_r/N1/logo':'data:...', 'negocios_r/N1/inventarioApagado':true}));
    for(const campo of ['activo','plan','funciones','precioMes','sucursales','vendedorId','esDemo','id']){
      await assertFails(a.ref('data/negocios_r/N1/'+campo).set(campo==='activo'));
    }
    await assertFails(a.ref('data/negocios_r/N1').set({id:'N1', nombre:'todo'}));   // registro entero: solo super-admin
    await assertFails(a.ref('data/negocios_r/N10/nombre').set('ajeno'));
  });
  test('negocio suspendido: sus empleados pierden los datos pero ven el negocio', async ()=>{
    await env.clearDatabase(); await sembrar(false);
    await assertFails(db('cajero1').ref('data/data_N1_ventas_r').once('value'));
    await assertFails(db('cajero1').ref('data/data_N1_ventas_r/v7').set({id:'v7'}));
    await assertSucceeds(db('cajero1').ref('data/negocios_r/N1').once('value'));
    await assertFails(db('admin1').ref('data/negocios_r/N1/nombre').set('X'));
  });
  test('usuario desactivado: sin acceso', async ()=>{
    await assertFails(db('cajeroOff').ref('data/data_N1_ventas_r').once('value'));
    await assertFails(db('cajeroOff').ref('data/negocios_r/N1').once('value'));
  });
  test('una cuenta sin perfil (reemplazada o ajena) no lee nada', async ()=>{
    await assertFails(db('fantasma').ref('data/data_N1_ventas_r').once('value'));
    await assertFails(db('fantasma').ref('data/negocios_r/N1').once('value'));
    await assertFails(db('fantasma').ref('perfiles/fantasma').set({rol:'superadmin', usuario:'x'}));
  });
  test('el super-admin lee y escribe todo; inactivo, nada', async ()=>{
    const s=db('sa');
    await assertSucceeds(s.ref('data').once('value'));
    await assertSucceeds(s.ref('perfiles').once('value'));
    await assertSucceeds(s.ref('login').once('value'));
    await assertSucceeds(s.ref('perfiles/nuevo').set({rol:'cajero', usuario:'n', negocioId:'N1', activo:true}));
    await assertSucceeds(s.ref('login/n').set({correo:'n@x.app', uid:'nuevo'}));
    await assertSucceeds(s.ref('data/negocios_r/N1/activo').set(false));
    await assertFails(s.ref('perfiles/malo').set({sinRol:true}));     // validación
    await assertFails(db('saOff').ref('data').once('value'));
    await assertFails(db('saOff').ref('perfiles/x').set({rol:'superadmin', usuario:'x'}));
  });
});

describe('reglas de transición (database.rules.transicion.json)', {skip:!HAY_EMULADOR && 'sin emulador (npm run test:firebase)'}, ()=>{
  let env;
  const db=uid=>uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database();
  before(async ()=>{ env=await initializeTestEnvironment({projectId:'demo-wallace', database:{rules:reglas('database.rules.transicion.json')}}); });
  after(async ()=>{ if(env) await env.cleanup(); });
  beforeEach(async ()=>{ await env.clearDatabase(); await env.withSecurityRulesDisabled(c=>c.database().ref().set(datosBase(true))); });

  test('data sigue abierto como hoy (la app vieja y la migración lo necesitan)', async ()=>{
    await assertSucceeds(db(null).ref('data/usuarios').once('value'));
    await assertSucceeds(db(null).ref('data/negocios_r/N1/nombre').set('X'));
  });
  test('migración: cada uno crea SU perfil y SU entrada del índice una sola vez', async ()=>{
    const d=db('nuevoUid');
    await assertSucceeds(d.ref().update({
      'perfiles/nuevoUid':{rol:'cajero', usuario:'pepe', negocioId:'N1', activo:true},
      'login/pepe':{correo:'u1@x.app', uid:'nuevoUid'}
    }));
    await assertFails(d.ref('perfiles/nuevoUid/rol').set('superadmin'));   // ya existe: no puede subirse de rol
    await assertFails(d.ref('login/pepe').set({correo:'otro@x.app', uid:'nuevoUid'}));
  });
  test('nadie toma el índice o el perfil de otro', async ()=>{
    await assertFails(db('intruso').ref('login/caja1').set({correo:'i@x.app', uid:'intruso'}));
    await assertFails(db('intruso').ref('perfiles/cajero1').set({rol:'admin', usuario:'caja1'}));
    await assertFails(db(null).ref('perfiles/x').set({rol:'cajero', usuario:'x'}));
    await assertFails(db('cajero1').ref('perfiles').once('value'));
  });
  test('el super-admin administra perfiles e índice', async ()=>{
    const s=db('sa');
    await assertSucceeds(s.ref('perfiles/cajero1/activo').set(false));
    await assertSucceeds(s.ref('login/caja1').set({correo:'nuevo@x.app', uid:'otro'}));
    await assertSucceeds(s.ref('perfiles').once('value'));
  });
});

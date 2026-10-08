// Recorrido de TODA la interfaz en Chrome/Edge sin ventana (modo local, sin nube):
// crea los demos de todas las plantillas, dibuja cada pantalla del super-admin y
// cada pantalla del menú de cada negocio, y hace una venta completa en cada uno.
// Falla ante cualquier excepción o "Error en pantalla" (que la app atrapa y oculta).
//   npm run test:firebase      (requiere Chrome o Edge; no necesita emuladores)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';

const NAVEGADORES=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const NAVEGADOR=process.env.CHROME_PATH || NAVEGADORES.find(p=>existsSync(p));
const omitir=(!NAVEGADOR && 'sin Chrome/Edge (CHROME_PATH)') || (!process.env.FIREBASE_DATABASE_EMULATOR_HOST && 'se corre con npm run test:firebase');
const PUERTO=3918;
const espera=ms=>new Promise(r=>setTimeout(r,ms));
let navegador, pagina, servidor;
const errores=[];

before(async ()=>{
  if(omitir) return;
  servidor=spawn('npx serve -s . -l '+PUERTO, {shell:true, stdio:'ignore'});
  for(let i=0;i<60;i++){ try{ await fetch('http://localhost:'+PUERTO+'/'); break; }catch(e){ await espera(500); } }
  const puppeteer=(await import('puppeteer-core')).default;
  navegador=await puppeteer.launch({executablePath:NAVEGADOR, headless:true, args:['--no-sandbox']});
  pagina=await navegador.newPage();
  pagina.on('pageerror', e=>errores.push('pageerror: '+e.message));
  pagina.on('console', m=>{ if(m.type()==='error' && !/favicon|fonts\.g|net::ERR/i.test(m.text())) errores.push('console: '+m.text()); });
  pagina.on('dialog', d=>d.accept());
  // Impresiones: ventana falsa (sin ventanas emergentes reales)
  await pagina.evaluateOnNewDocument(()=>{ window.open=()=>({document:{open(){},write(){},close(){}}, print(){}, focus(){}, close(){}}); });
  await pagina.goto('http://localhost:'+PUERTO+'/', {waitUntil:'networkidle2'});
  await pagina.waitForFunction(()=>typeof crearDuenoInicial==='function' && document.getElementById('ci-user'));
  await pagina.evaluate(()=>{
    document.getElementById('ci-nombre').value='Dueño'; document.getElementById('ci-user').value='dueno';
    document.getElementById('ci-pass').value='clave1234'; document.getElementById('ci-pass2').value='clave1234';
    crearDuenoInicial();
  });
  await pagina.waitForSelector('#l-user', {visible:true});
  await pagina.evaluate(()=>{
    document.getElementById('l-user').value='dueno'; document.getElementById('l-pass').value='clave1234';
    hacerLogin();
  });
  await pagina.waitForFunction(()=>STATE.esSuperAdmin===true);
});
after(async ()=>{
  if(navegador) await navegador.close();
  if(servidor){ try{ if(process.platform==='win32') execSync('taskkill /pid '+servidor.pid+' /T /F', {stdio:'ignore'}); else servidor.kill(); }catch(e){} }
});

test('se crean los demos de todas las plantillas', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(()=>{
    const tipos=Object.keys(DEMO_PLANTILLAS);
    const hechos=tipos.filter(t=>crearDemoDeTipo(t,false));
    render();
    return {tipos:tipos.length, hechos:hechos.length, negocios:(DB.get('negocios')||[]).length};
  });
  assert.equal(r.hechos, r.tipos); assert.equal(r.negocios, r.tipos);
});
test('pantallas del super-admin: panel, administradores, configuración (todas las pestañas) y usuarios', {skip:omitir}, async ()=>{
  const fallas=await pagina.evaluate(()=>{
    const f=[];
    const probar=(nombre, fn)=>{ try{ fn(); render(); if(!document.getElementById('app').innerText.trim()) f.push(nombre+': vacía'); }catch(e){ f.push(nombre+': '+e.message); } };
    probar('panel', ()=>{ STATE.page=''; });
    probar('superadmins', ()=>{ STATE.page='superadmins'; });
    (DB.get('negocios')||[]).forEach(n=>{
      ['datos','comercial','operacion','ventanas','sucursales'].forEach(t=>probar('config '+n.nombre+' '+t, ()=>{ STATE.page='config:'+n.id; _cfgTab=t; }));
      probar('usuarios '+n.nombre, ()=>{ STATE.page='usuarios:'+n.id; });
    });
    STATE.page=''; _cfgTab='datos'; render();
    return f;
  });
  assert.deepEqual(fallas, []);
});
test('cada pantalla del menú de cada negocio se dibuja sin errores', {skip:omitir}, async t=>{
  const r=await pagina.evaluate(()=>{
    const f=[]; let n=0;
    (DB.get('negocios')||[]).forEach(neg=>{
      entrarComoNegocio(neg.id);
      armarMenu().filter(m=>m.id).forEach(m=>{
        n++;
        try{
          STATE.pageNeg=m.id; render();
          const t=(document.querySelector('.main .contenido')||{}).innerText||'';
          if(/Ocurrió un error al mostrar/.test(t)) f.push(neg.nombre+' → '+m.id+': error atrapado');
          else if(/Pantalla no disponible/.test(t)) f.push(neg.nombre+' → '+m.id+': sin pantalla');
        }catch(e){ f.push(neg.nombre+' → '+m.id+': '+e.message); }
      });
      cerrarModal();
      volverSuperAdmin();
    });
    return {f, n};
  });
  t.diagnostic('pantallas recorridas: '+r.n);
  assert.ok(r.n>100, 'se recorrieron '+r.n+' pantallas');
  assert.deepEqual(r.f, []);
});
test('en cada negocio: venta con cobro dividido, anulación (stock de vuelta) y cierre de caja', {skip:omitir}, async ()=>{
  const ids=await pagina.evaluate(()=>(DB.get('negocios')||[]).map(n=>n.id));
  const fallas=[];
  for(const id of ids){
    const r=await pagina.evaluate(async id=>{
      const esperar=ms=>new Promise(r=>setTimeout(r,ms));
      entrarComoNegocio(id);
      const neg=STATE.negocio;
      if(!cajaDe(misDatos('caja_actual'))) return {omitido:'sin caja abierta'};
      const p=misDatos('productos').find(x=>!x.esCombo && (x.stock==null || x.stock>2));
      if(!p) return {omitido:'sin productos'};
      const antes=misDatos('productos').find(x=>x.id===p.id).stock;
      const nVentas=misDatos('ventas').length;
      STATE.pageNeg='ventas'; render();
      vaciarCarrito();
      agregarAlCarrito(p.id); agregarAlCarrito(p.id);
      Object.assign(_vCli, {nombre:'Cliente Prueba', tel:'3001112233', dir:'Calle 1 # 2-3', barrio:'Centro', ciudad:'Bucaramanga'});
      let tituloModal='';
      if(neg.flujoPedido==='dos_pasos'){
        if(neg.usaMesas) _vTipo=(neg.tiposEntrega||[])[0]||'llevar';
        _vMesa='1';
        confirmarPedido(); await esperar(50); cerrarModal();
        const v=misDatos('ventas').find(x=>x.estado!=='pagada' && !x.anulada && (x.items||[]).some(i=>i.prodId===p.id));
        if(!v) return {error:'no quedó el pedido confirmado'};
        cobrarPedido(v.id);
      } else {
        cobrarDirecto();
      }
      await esperar(50);
      if(!document.getElementById('pg-efectivo')){
        const avisos=((document.getElementById('toasts')||{}).innerText||'').trim().split(/\n/);
        return {error:'no abrió el cobro · aviso: '+avisos.pop()+' · flujo '+neg.flujoPedido+' · tipo '+_vTipo};
      }
      pagoRapido('mitad');
      document.getElementById('modal-ok').click();
      // F16: la pregunta "¿imprimir?" llega 400 ms después; si ya hay otro modal abierto no debe taparlo
      await esperar(30);
      abrirModal({titulo:'Modal de prueba F16', campos:[]});
      await esperar(650);
      tituloModal=((document.querySelector('.modal-cab h3')||{}).innerText||'');
      cerrarModal();
      const ventas=misDatos('ventas');
      const v=ventas.find(x=>x.estado==='pagada' && (x.items||[]).some(i=>i.prodId===p.id) && x.pagos && x.pagos.banco>0);
      const despues=misDatos('productos').find(x=>x.id===p.id).stock;
      const res={neg:neg.nombre, pagada:!!v, nuevas:ventas.length-nVentas, antes, despues, usaInv:usaInventario(neg), factura:v&&v.factura, f16:tituloModal==='Modal de prueba F16'};
      if(v){
        // Anular: el stock vuelve y queda en auditoría
        anularPedido(v.id); document.getElementById('modal-ok').click(); await esperar(50);
        const va=misDatos('ventas').find(x=>x.id===v.id);
        res.anulada=va && va.estado==='anulada';
        res.trasAnular=misDatos('productos').find(x=>x.id===p.id).stock;
        res.auditada=misDatos('auditoria').some(a=>/Anuló/.test(a.accion||'') && (a.detalle||'').includes(v.factura));
        // Cerrar caja: queda un cierre y la caja vacía
        const cierres=misDatos('cierres').length;
        STATE.pageNeg='caja'; render();
        cerrarCaja(); await esperar(50);
        if(document.getElementById('m-contado')){ document.getElementById('modal-ok').click(); await esperar(900); cerrarModal(); }
        res.cerrada=!cajaDe(misDatos('caja_actual')) && misDatos('cierres').length===cierres+1;
      }
      volverSuperAdmin();
      return res;
    }, id);
    if(r.omitido) continue;
    if(r.error){ fallas.push(id+': '+r.error); continue; }
    if(!r.pagada) fallas.push(r.neg+': la venta no quedó pagada con pago dividido');
    if(r.usaInv && r.antes!=null && r.despues!==r.antes-2) fallas.push(r.neg+': stock '+r.antes+' → '+r.despues+' (se esperaba −2)');
    if(!/^F-\d{5}$/.test(r.factura||'')) fallas.push(r.neg+': factura "'+r.factura+'"');
    if(!r.f16) fallas.push(r.neg+': la pregunta de imprimir tapó otro modal (F16)');
    if(r.pagada){
      if(!r.anulada) fallas.push(r.neg+': no quedó anulada');
      if(r.usaInv && r.antes!=null && r.trasAnular!==r.antes) fallas.push(r.neg+': al anular el stock quedó en '+r.trasAnular+' (antes '+r.antes+')');
      if(!r.auditada) fallas.push(r.neg+': la anulación no quedó en auditoría');
      if(!r.cerrada) fallas.push(r.neg+': la caja no se cerró');
    }
  }
  assert.deepEqual(fallas, []);
});
test('F1: dos sedes con caja, pedidos y cierre propios; F11: editar stock deja ajuste', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(async ()=>{
    const esperar=ms=>new Promise(res=>setTimeout(res,ms));
    const negs=DB.get('negocios')||[];
    const n=negs.find(x=>x.flujoPedido==='directo' && (x.funciones||[]).includes('caja') && Dominio.negocio.usaInventario(x));
    n.sucursales=[{id:'principal', nombre:'Principal'},{id:'s2', nombre:'Norte'}];
    DB.set('negocios', negs);
    entrarComoNegocio(n.id);
    const out={};
    if(!cajaActual()){   // la prueba anterior cerró las cajas: se abre la principal
      STATE.pageNeg='caja'; render();
      const b=document.getElementById('caja-base'); if(b) b.value='10000';
      abrirCaja(); await esperar(100);
    }
    out.principalAbierta=!!cajaActual();
    cambiarSucursal('s2');
    out.s2SinCaja=!cajaActual();
    STATE.pageNeg='caja'; render();
    const inp=document.getElementById('caja-base'); if(inp) inp.value='20000';
    abrirCaja(); await esperar(100);
    out.s2Abierta=!!cajaActual() && cajaActual().base===20000;
    out.principalSigue=!!cajaDe(misDatos('caja_actual'),'principal');
    // Venta en la sede Norte
    const p=misDatos('productos').find(x=>!x.esCombo && x.stock>3);
    STATE.pageNeg='ventas'; render(); vaciarCarrito(); agregarAlCarrito(p.id);
    Object.assign(_vCli,{nombre:'Norte', tel:'3005556677', dir:'x', barrio:'y'});
    cobrarDirecto(); await esperar(50); pagoRapido('efectivo'); document.getElementById('modal-ok').click(); await esperar(700); cerrarModal();
    const v=misDatos('ventas').find(x=>x.cliNombre==='Norte');
    out.ventaS2=v && v.sucursalId;
    out.enPedidosS2=ventasJornada(false).some(x=>x.id===v.id);
    cambiarSucursal('principal');
    out.enPedidosPrincipal=ventasJornada(false).some(x=>x.id===v.id);
    // Cerrar la caja de Norte: la principal sigue abierta
    cambiarSucursal('s2'); STATE.pageNeg='caja'; render();
    cerrarCaja(); await esperar(50); document.getElementById('modal-ok').click(); await esperar(900); cerrarModal();
    out.s2Cerrada=!cajaActual();
    out.principalSigueTrasCierre=!!cajaDe(misDatos('caja_actual'),'principal');
    out.cierreS2=(misDatos('cierres')[0]||{}).sucursalId;
    // F11: editar el stock del producto
    cambiarSucursal('principal');
    const antes=misDatos('productos').find(x=>x.id===p.id).stock;
    editarProducto(p.id); await esperar(50);
    document.getElementById('m-stock').value=String(antes+5);
    document.getElementById('modal-ok').click(); await esperar(50);
    out.stockEditado=misDatos('productos').find(x=>x.id===p.id).stock-antes;
    out.movAjuste=misDatos('movimientos').some(m=>m.productoId===p.id && m.tipo==='ajuste' && m.cantidad===5);
    out.audAjuste=misDatos('auditoria').some(a=>/Ajustó stock/.test(a.accion||''));
    volverSuperAdmin();
    return out;
  });
  assert.deepEqual(r, {principalAbierta:true, s2SinCaja:true, s2Abierta:true, principalSigue:true, ventaS2:'s2',
    enPedidosS2:true, enPedidosPrincipal:false, s2Cerrada:true, principalSigueTrasCierre:true, cierreS2:'s2',
    stockEditado:5, movAjuste:true, audAjuste:true});
});
test('F8/F9: cita con apartados → cobro con pago dividido, sin descontar dos veces y con movimientos', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(async ()=>{
    const esperar=ms=>new Promise(res=>setTimeout(res,ms));
    const n=(DB.get('negocios')||[]).find(x=>x.usaCitas && (x.funciones||[]).includes('citas') && Dominio.negocio.usaInventario(x) && (x.funciones||[]).includes('caja'));
    if(!n) return {omitido:true};
    entrarComoNegocio(n.id);
    const p=misDatos('productos').find(x=>!x.esCombo && x.stock>3);
    const antes=p.stock;
    const apartados=[{prodId:p.id, nombre:p.nombre, precio:p.precio, cantidad:2}];
    descontarApartado(apartados, 'Apartado · prueba');
    const citas=misDatos('citas');
    const cita={id:uid(), cliente:'Cliente Cita', tel:'3001234567', fechaHora:today()+'T10:00:00', apartados, stockDescontado:true, estado:'pendiente', creado:now()};
    citas.push(cita); guardarMisDatos('citas', citas);
    const trasApartar=misDatos('productos').find(x=>x.id===p.id).stock;
    // F9: con la caja cerrada no se cobra la entrega
    let sinCajaRechaza=null;
    if(!cajaActual()){
      marcarCita(cita.id,'atendida'); await esperar(50);
      sinCajaRechaza=!document.getElementById('pg-efectivo') && misDatos('citas').find(x=>x.id===cita.id).estado==='pendiente';
      STATE.pageNeg='caja'; render();
      const b=document.getElementById('caja-base'); if(b) b.value='10000';
      abrirCaja(); await esperar(100);
    }
    marcarCita(cita.id,'atendida'); await esperar(50);
    const abrioCobro=!!document.getElementById('pg-efectivo');
    pagoRapido('mitad'); document.getElementById('modal-ok').click(); await esperar(700); cerrarModal();
    const c=misDatos('citas').find(x=>x.id===cita.id);
    const v=misDatos('ventas').find(x=>x.origenCita===cita.id);
    const out={sinCajaRechaza:sinCajaRechaza!==false, abrioCobro, apartadoDescontado:antes-trasApartar, trasCobro:misDatos('productos').find(x=>x.id===p.id).stock-trasApartar,
      atendida:c.estado, ventaLigada:!!v && c.ventaId===v.id, dividido:!!(v && v.pagos && v.pagos.banco>0 && v.pagos.efectivo>0),
      movApartado:misDatos('movimientos').some(m=>m.productoId===p.id && /Apartado/.test(m.motivo||''))};
    volverSuperAdmin();
    return out;
  });
  if(r.omitido) return;
  assert.deepEqual(r, {sinCajaRechaza:true, abrioCobro:true, apartadoDescontado:2, trasCobro:0, atendida:'atendida', ventaLigada:true, dividido:true, movApartado:true});
});
test('sin errores de JavaScript en todo el recorrido', {skip:omitir}, ()=>{
  assert.deepEqual(errores, []);
});

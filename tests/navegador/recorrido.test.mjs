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
  await pagina.goto('http://localhost:'+PUERTO+'/?local', {waitUntil:'networkidle2'});
  await pagina.waitForFunction(()=>typeof (window.WS||{}).crearDuenoInicial==='function' && document.getElementById('ci-user'));
  await pagina.evaluate(()=>{
    document.getElementById('ci-nombre').value='Dueño'; document.getElementById('ci-user').value='dueno';
    document.getElementById('ci-pass').value='clave1234'; document.getElementById('ci-pass2').value='clave1234';
    WS.crearDuenoInicial();
  });
  await pagina.waitForSelector('#l-user', {visible:true});
  await pagina.evaluate(()=>{
    document.getElementById('l-user').value='dueno'; document.getElementById('l-pass').value='clave1234';
    WS.hacerLogin();
  });
  await pagina.waitForFunction(()=>WS.STATE.esSuperAdmin===true);
});
after(async ()=>{
  if(navegador) await navegador.close();
  if(servidor){ try{ if(process.platform==='win32') execSync('taskkill /pid '+servidor.pid+' /T /F', {stdio:'ignore'}); else servidor.kill(); }catch(e){} }
});

test('se crean los demos de todas las plantillas', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(()=>{
    const tipos=Object.keys(WS.DEMO_PLANTILLAS);
    const hechos=tipos.filter(t=>WS.crearDemoDeTipo(t,false));
    WS.render();
    return {tipos:tipos.length, hechos:hechos.length, negocios:(DB.get('negocios')||[]).length};
  });
  assert.equal(r.hechos, r.tipos); assert.equal(r.negocios, r.tipos);
});
test('pantallas del super-admin: panel, administradores, configuración (todas las pestañas) y usuarios', {skip:omitir}, async ()=>{
  const fallas=await pagina.evaluate(()=>{
    const f=[];
    const probar=(nombre, fn)=>{ try{ fn(); WS.render(); if(!document.getElementById('app').innerText.trim()) f.push(nombre+': vacía'); }catch(e){ f.push(nombre+': '+e.message); } };
    probar('panel', ()=>{ WS.STATE.page=''; });
    probar('superadmins', ()=>{ WS.STATE.page='superadmins'; });
    (DB.get('negocios')||[]).forEach(n=>{
      ['datos','comercial','operacion','ventanas','sucursales'].forEach(t=>probar('config '+n.nombre+' '+t, ()=>{ WS.STATE.page='config:'+n.id; WS.cfgTab(t); }));
      probar('usuarios '+n.nombre, ()=>{ WS.STATE.page='usuarios:'+n.id; });
    });
    WS.STATE.page=''; WS.cfgTab('datos');
    return f;
  });
  assert.deepEqual(fallas, []);
});
test('cada pantalla del menú de cada negocio se dibuja sin errores', {skip:omitir}, async t=>{
  const r=await pagina.evaluate(()=>{
    const f=[]; let n=0, acciones=0;
    // Eventos delegados (fase 8) en el HTML ya dibujado: sin onclick="…" y cada
    // data-click/… es una llamada a una acción que existe, con argumentos que se pueden leer
    const ATTRS=WS.EVENTOS_DELEGADOS.map(x=>x.attr).concat('data-enter');
    const revisarAcciones=donde=>{
      if(document.querySelector('[onclick],[oninput],[onchange],[onkeydown],[onblur],[onfocus],[onmousedown]')) f.push(donde+': quedó un manejador en línea');
      document.querySelectorAll(ATTRS.map(a=>'['+a+']').join(',')).forEach(el=>ATTRS.forEach(a=>{
        const c=el.getAttribute(a); if(!c) return; acciones++;
        const m=/^\s*([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)\s*;?\s*$/.exec(c);
        if(!m || typeof WS.accionDelegada(m[1])!=='function'){ f.push(donde+': acción rota '+a+'="'+c+'"'); return; }
        try{ WS.argumentosDelegados(m[2], el, null); }catch(e){ f.push(donde+': '+a+'="'+c+'" → '+e.message); }
      }));
    };
    (DB.get('negocios')||[]).forEach(neg=>{
      WS.entrarComoNegocio(neg.id);
      WS.armarMenu().filter(m=>m.id).forEach(m=>{
        n++;
        try{
          WS.STATE.pageNeg=m.id; WS.render();
          const t=(document.querySelector('.main .contenido')||{}).innerText||'';
          revisarAcciones(neg.nombre+' → '+m.id);
          if(/Ocurrió un error al mostrar/.test(t)) f.push(neg.nombre+' → '+m.id+': error atrapado');
          else if(/Pantalla no disponible/.test(t)) f.push(neg.nombre+' → '+m.id+': sin pantalla');
        }catch(e){ f.push(neg.nombre+' → '+m.id+': '+e.message); }
      });
      WS.cerrarModal();
      WS.volverSuperAdmin();
    });
    return {f, n, acciones};
  });
  t.diagnostic('pantallas recorridas: '+r.n+' · acciones delegadas revisadas: '+r.acciones);
  assert.ok(r.n>100, 'se recorrieron '+r.n+' pantallas');
  assert.ok(r.acciones>1000, 'se revisaron '+r.acciones+' acciones');
  assert.deepEqual(r.f, []);
});
test('en cada negocio: venta con cobro dividido, anulación (stock de vuelta) y cierre de caja', {skip:omitir}, async ()=>{
  const ids=await pagina.evaluate(()=>(DB.get('negocios')||[]).map(n=>n.id));
  const fallas=[];
  for(const id of ids){
    const r=await pagina.evaluate(async id=>{
      const esperar=ms=>new Promise(r=>setTimeout(r,ms));
      WS.entrarComoNegocio(id);
      const neg=WS.STATE.negocio;
      if(!cajaDe(misDatos('caja_actual'))) return {omitido:'sin caja abierta'};
      const p=misDatos('productos').find(x=>!x.esCombo && (x.stock==null || x.stock>2));
      if(!p) return {omitido:'sin productos'};
      const antes=misDatos('productos').find(x=>x.id===p.id).stock;
      const nVentas=misDatos('ventas').length;
      WS.STATE.pageNeg='ventas'; WS.render();
      WS.vaciarCarrito();
      WS.agregarAlCarrito(p.id); WS.agregarAlCarrito(p.id);
      Object.assign(WS._vCli, {nombre:'Cliente Prueba', tel:'3001112233', dir:'Calle 1 # 2-3', barrio:'Centro', ciudad:'Bucaramanga'});
      let tituloModal='';
      if(neg.flujoPedido==='dos_pasos'){
        if(neg.usaMesas) WS.elegirTipoEntrega((neg.tiposEntrega||[])[0]||'llevar');
        WS.ponerMesa('1');
        WS.confirmarPedido(); await esperar(50); WS.cerrarModal();
        const v=misDatos('ventas').find(x=>x.estado!=='pagada' && !x.anulada && (x.items||[]).some(i=>i.prodId===p.id));
        if(!v) return {error:'no quedó el pedido confirmado'};
        WS.cobrarPedido(v.id);
      } else {
        WS.cobrarDirecto();
      }
      await esperar(50);
      if(!document.getElementById('pg-efectivo')){
        const avisos=((document.getElementById('toasts')||{}).innerText||'').trim().split(/\n/);
        return {error:'no abrió el cobro · aviso: '+avisos.pop()+' · flujo '+neg.flujoPedido+' · tipo '+WS._vTipo};
      }
      WS.pagoRapido('mitad');
      document.getElementById('modal-ok').click();
      // F16: la pregunta "¿imprimir?" llega 400 ms después; si ya hay otro modal abierto no debe taparlo
      await esperar(30);
      WS.abrirModal({titulo:'Modal de prueba F16', campos:[]});
      await esperar(650);
      tituloModal=((document.querySelector('.modal-cab h3')||{}).innerText||'');
      WS.cerrarModal();
      const ventas=misDatos('ventas');
      const v=ventas.find(x=>x.estado==='pagada' && (x.items||[]).some(i=>i.prodId===p.id) && x.pagos && x.pagos.banco>0);
      const despues=misDatos('productos').find(x=>x.id===p.id).stock;
      const res={neg:neg.nombre, pagada:!!v, nuevas:ventas.length-nVentas, antes, despues, usaInv:WS.usaInventario(neg), factura:v&&v.factura, f16:tituloModal==='Modal de prueba F16'};
      if(v){
        // Anular: el stock vuelve y queda en auditoría
        WS.anularPedido(v.id); document.getElementById('modal-ok').click(); await esperar(50);
        const va=misDatos('ventas').find(x=>x.id===v.id);
        res.anulada=va && va.estado==='anulada';
        res.trasAnular=misDatos('productos').find(x=>x.id===p.id).stock;
        res.auditada=misDatos('auditoria').some(a=>/Anuló/.test(a.accion||'') && (a.detalle||'').includes(v.factura));
        // Cerrar caja: queda un cierre y la caja vacía
        const cierres=misDatos('cierres').length;
        WS.STATE.pageNeg='caja'; WS.render();
        WS.cerrarCaja(); await esperar(50);
        if(document.getElementById('m-contado')){ document.getElementById('modal-ok').click(); await esperar(900); WS.cerrarModal(); }
        res.cerrada=!cajaDe(misDatos('caja_actual')) && misDatos('cierres').length===cierres+1;
      }
      WS.volverSuperAdmin();
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
    WS.entrarComoNegocio(n.id);
    const out={};
    if(!WS.cajaActual()){   // la prueba anterior cerró las cajas: se abre la principal
      WS.STATE.pageNeg='caja'; WS.render();
      const b=document.getElementById('caja-base'); if(b) b.value='10000';
      WS.abrirCaja(); await esperar(100);
    }
    out.principalAbierta=!!WS.cajaActual();
    WS.cambiarSucursal('s2');
    out.s2SinCaja=!WS.cajaActual();
    WS.STATE.pageNeg='caja'; WS.render();
    const inp=document.getElementById('caja-base'); if(inp) inp.value='20000';
    WS.abrirCaja(); await esperar(100);
    out.s2Abierta=!!WS.cajaActual() && WS.cajaActual().base===20000;
    out.principalSigue=!!cajaDe(misDatos('caja_actual'),'principal');
    // Venta en la sede Norte
    const p=misDatos('productos').find(x=>!x.esCombo && x.stock>3);
    WS.STATE.pageNeg='ventas'; WS.render(); WS.vaciarCarrito(); WS.agregarAlCarrito(p.id);
    Object.assign(WS._vCli,{nombre:'Norte', tel:'3005556677', dir:'x', barrio:'y'});
    WS.cobrarDirecto(); await esperar(50); WS.pagoRapido('efectivo'); document.getElementById('modal-ok').click(); await esperar(700); WS.cerrarModal();
    const v=misDatos('ventas').find(x=>x.cliNombre==='Norte');
    out.ventaS2=v && v.sucursalId;
    out.enPedidosS2=WS.ventasJornada(false).some(x=>x.id===v.id);
    WS.cambiarSucursal('principal');
    out.enPedidosPrincipal=WS.ventasJornada(false).some(x=>x.id===v.id);
    // Cerrar la caja de Norte: la principal sigue abierta
    WS.cambiarSucursal('s2'); WS.STATE.pageNeg='caja'; WS.render();
    WS.cerrarCaja(); await esperar(50); document.getElementById('modal-ok').click(); await esperar(900); WS.cerrarModal();
    out.s2Cerrada=!WS.cajaActual();
    out.principalSigueTrasCierre=!!cajaDe(misDatos('caja_actual'),'principal');
    out.cierreS2=(misDatos('cierres')[0]||{}).sucursalId;
    // F11: editar el stock del producto
    WS.cambiarSucursal('principal');
    const antes=misDatos('productos').find(x=>x.id===p.id).stock;
    WS.editarProducto(p.id); await esperar(50);
    document.getElementById('m-stock').value=String(antes+5);
    document.getElementById('modal-ok').click(); await esperar(50);
    out.stockEditado=misDatos('productos').find(x=>x.id===p.id).stock-antes;
    out.movAjuste=misDatos('movimientos').some(m=>m.productoId===p.id && m.tipo==='ajuste' && m.cantidad===5);
    out.audAjuste=misDatos('auditoria').some(a=>/Ajustó stock/.test(a.accion||''));
    WS.volverSuperAdmin();
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
    WS.entrarComoNegocio(n.id);
    const p=misDatos('productos').find(x=>!x.esCombo && x.stock>3);
    const antes=p.stock;
    const apartados=[{prodId:p.id, nombre:p.nombre, precio:p.precio, cantidad:2}];
    WS.descontarApartado(apartados, 'Apartado · prueba');
    const citas=misDatos('citas');
    const cita={id:uid(), cliente:'Cliente Cita', tel:'3001234567', fechaHora:today()+'T10:00:00', apartados, stockDescontado:true, estado:'pendiente', creado:WS.now()};
    citas.push(cita); guardarMisDatos('citas', citas);
    const trasApartar=misDatos('productos').find(x=>x.id===p.id).stock;
    // F9: con la caja cerrada no se cobra la entrega
    let sinCajaRechaza=null;
    if(!WS.cajaActual()){
      WS.marcarCita(cita.id,'atendida'); await esperar(50);
      sinCajaRechaza=!document.getElementById('pg-efectivo') && misDatos('citas').find(x=>x.id===cita.id).estado==='pendiente';
      WS.STATE.pageNeg='caja'; WS.render();
      const b=document.getElementById('caja-base'); if(b) b.value='10000';
      WS.abrirCaja(); await esperar(100);
    }
    WS.marcarCita(cita.id,'atendida'); await esperar(50);
    const abrioCobro=!!document.getElementById('pg-efectivo');
    WS.pagoRapido('mitad'); document.getElementById('modal-ok').click(); await esperar(700); WS.cerrarModal();
    const c=misDatos('citas').find(x=>x.id===cita.id);
    const v=misDatos('ventas').find(x=>x.origenCita===cita.id);
    const out={sinCajaRechaza:sinCajaRechaza!==false, abrioCobro, apartadoDescontado:antes-trasApartar, trasCobro:misDatos('productos').find(x=>x.id===p.id).stock-trasApartar,
      atendida:c.estado, ventaLigada:!!v && c.ventaId===v.id, dividido:!!(v && v.pagos && v.pagos.banco>0 && v.pagos.efectivo>0),
      movApartado:misDatos('movimientos').some(m=>m.productoId===p.id && /Apartado/.test(m.motivo||''))};
    WS.volverSuperAdmin();
    return out;
  });
  if(r.omitido) return;
  assert.deepEqual(r, {sinCajaRechaza:true, abrioCobro:true, apartadoDescontado:2, trasCobro:0, atendida:'atendida', ventaLigada:true, dividido:true, movApartado:true});
});
test('eventos delegados: clics y escritura reales llegan a las acciones (menú, categoría con comilla, producto, cantidad, búsqueda)', {skip:omitir}, async ()=>{
  const id=await pagina.evaluate(async ()=>{
    const esperar=ms=>new Promise(res=>setTimeout(res,ms));
    const n=(DB.get('negocios')||[]).find(x=>['ventas','caja','inventario'].every(f=>(x.funciones||[]).includes(f)) && x.flujoPedido!=='dos_pasos');
    if(!n) return null;
    WS.entrarComoNegocio(n.id);
    if(!WS.cajaActual()){ WS.STATE.pageNeg='caja'; WS.render(); const b=document.getElementById('caja-base'); if(b) b.value='10000'; WS.abrirCaja(); await esperar(100); }
    // Una categoría con comilla: con onclick="…'${c}'…" rompía el botón
    const ps=misDatos('productos'); const p=ps.find(x=>!x.esCombo && (x.stock==null || x.stock>2));
    p.categoria="Niño's"; guardarMisDatos('productos', ps);
    WS.vaciarCarrito(); WS.elegirCategoriaVenta('Todas'); WS.buscarEnVenta(''); WS.STATE.pageNeg='inicio'; WS.render();
    return n.id;
  });
  if(!id) return;
  await pagina.setViewport({width:1366, height:900});   // escritorio: menú lateral visible
  // Los avisos salen abajo a la derecha, encima del botón "quitar": que no atrapen el clic
  await pagina.addStyleTag({content:'#toasts{pointer-events:none !important}'});
  const clic=async sel=>{ await pagina.waitForSelector(sel, {visible:true}); await pagina.click(sel); };
  const cumple=(fn, arg)=>pagina.waitForFunction(fn, {timeout:3000}, arg).then(()=>true, ()=>false);
  const r={};
  await clic(`.nav-item[data-click="irA('ventas')"]`);
  r.pagina=await cumple(()=>WS.STATE.pageNeg==='ventas' && !!document.querySelector('.cat'));
  const cat=await pagina.evaluateHandle(()=>[...document.querySelectorAll('.cat')].find(b=>b.dataset.cat==="Niño's"));
  await cat.asElement().click();
  r.categoria=await cumple(()=>WS._vCat==="Niño's");
  await clic('.prod'); await cumple(()=>WS._carrito.length>0);
  await clic('.prod');
  r.enCarrito=await cumple(()=>WS._carrito.reduce((a,i)=>a+i.qty,0)===2);
  const lineas=await pagina.evaluate(()=>WS._carrito.length);
  await clic('.item-quitar');
  r.quitoUna=await cumple(n=>WS._carrito.length===n-1, lineas);
  await pagina.evaluate(()=>{ const b=document.querySelector('.busca-grande:not(#escaner-venta)'); b.value='zzz-no-existe'; b.dispatchEvent(new Event('input', {bubbles:true})); });
  r.busqueda=await cumple(()=>WS._vBusca==='zzz-no-existe' && !document.querySelector('.prod'));
  await pagina.evaluate(()=>{ WS.buscarEnVenta(''); WS.elegirCategoriaVenta('Todas'); WS.volverSuperAdmin(); });
  assert.deepEqual(r, {pagina:true, categoria:true, enCarrito:true, quitoUna:true, busqueda:true});
});
// ---------- Segunda revisión (2026-10-12): D6, D7, D8, F19, F20, F22, C3 ----------
// Ayudantes dentro de la página: abrir y cerrar la caja como lo haría el cajero
const AYUDA_CAJA=`
  window.__esperar=ms=>new Promise(res=>setTimeout(res,ms));
  window.__abrirCaja=async ()=>{ if(WS.cajaActual()) return; WS.STATE.pageNeg='caja'; WS.render(); const b=document.getElementById('caja-base'); if(b) b.value='10000'; WS.abrirCaja(); await __esperar(150); };
  window.__cerrarCaja=async ()=>{ WS.STATE.pageNeg='caja'; WS.render(); WS.cerrarCaja(); await __esperar(60); if(document.getElementById('m-contado')){ document.getElementById('modal-ok').click(); await __esperar(900); WS.cerrarModal(); } };
`;
test('D6/F19: un pedido sin cobrar pasa al turno siguiente y su cobro entra en el cierre nuevo; sin caja no se cobra', {skip:omitir}, async ()=>{
  await pagina.evaluate(AYUDA_CAJA);
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>x.flujoPedido==='dos_pasos' && (x.funciones||[]).includes('caja'));
    WS.entrarComoNegocio(n.id);
    await __abrirCaja();
    const caja1=WS.cajaActual().id;
    const p=misDatos('productos').find(x=>!x.esCombo && (x.stock==null || x.stock>3));
    WS.STATE.pageNeg='ventas'; WS.render(); WS.vaciarCarrito(); WS.agregarAlCarrito(p.id);
    Object.assign(WS._vCli, {nombre:'Cliente Turno', tel:'3009998877', dir:'Calle 9', barrio:'Centro'});
    if(n.usaMesas) WS.elegirTipoEntrega((n.tiposEntrega||[])[0]||'llevar');
    WS.ponerMesa('7'); WS.confirmarPedido(); await __esperar(60); WS.cerrarModal();
    const ped=misDatos('ventas').find(v=>v.estado==='abierta' && v.cliTel==='3009998877');
    // Cerrar con el pedido pendiente: el cierre lo avisa
    WS.STATE.pageNeg='caja'; WS.render(); WS.cerrarCaja(); await __esperar(60);
    const avisa=/sin cobrar/.test(document.getElementById('modal-container').innerText);
    document.getElementById('modal-ok').click(); await __esperar(900); WS.cerrarModal();
    const sinCaja=!WS.cajaActual();
    WS.cobrarPedido(ped.id); await __esperar(60);
    const noCobraSinCaja=!document.getElementById('pg-efectivo');
    WS.cerrarModal();
    await __abrirCaja();
    const caja2=WS.cajaActual().id;
    const visible=WS.ventasJornada(false).some(v=>v.id===ped.id);
    WS.cobrarPedido(ped.id); await __esperar(60);
    WS.pagoRapido('efectivo'); document.getElementById('modal-ok').click(); await __esperar(700); WS.cerrarModal();
    const v=misDatos('ventas').find(x=>x.id===ped.id);
    const enCierre=WS.ventasJornada(true).some(x=>x.id===ped.id);
    WS.volverSuperAdmin();
    return {hayPedido:!!ped, avisa, sinCaja, noCobraSinCaja, visible, pagada:v.estado==='pagada', cajaNueva:v.cajaId===caja2 && caja2!==caja1, enCierre};
  });
  assert.deepEqual(r, {hayPedido:true, avisa:true, sinCaja:true, noCobraSinCaja:true, visible:true, pagada:true, cajaNueva:true, enCierre:true});
});
test('F20: anular una venta de una caja cerrada registra la devolución en la caja abierta', {skip:omitir}, async ()=>{
  await pagina.evaluate(AYUDA_CAJA);
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>x.flujoPedido==='dos_pasos' && (x.funciones||[]).includes('caja'));
    WS.entrarComoNegocio(n.id);
    const v=misDatos('ventas').find(x=>x.estado==='pagada' && x.cliTel==='3009998877');   // la de la prueba anterior
    const efectivo=Math.round(pagosDe(v).efectivo);
    await __cerrarCaja(); await __abrirCaja();
    const caja=WS.cajaActual().id;
    WS.anularPedido(v.id); await __esperar(60);
    const avisaDevolucion=/caja ya cerrada/.test(document.getElementById('modal-container').innerText);
    document.getElementById('modal-ok').click(); await __esperar(300);
    const mov=(WS.cajaActual().movimientos||[]).find(m=>m.tipo==='retiro' && /Devolución por anulación/.test(m.concepto));
    const anulada=misDatos('ventas').find(x=>x.id===v.id).estado==='anulada';
    WS.volverSuperAdmin();
    return {avisaDevolucion, anulada, devolucion:mov?mov.valor:null, esperada:efectivo, mismaCaja:WS.cajaActual?true:true, caja:!!caja};
  });
  assert.equal(r.avisaDevolucion, true); assert.equal(r.anulada, true);
  assert.ok(r.esperada>0); assert.equal(r.devolucion, r.esperada);
});
test('D7: un gasto de caja se guarda en la caja (transacción) y en Gastos del negocio', {skip:omitir}, async ()=>{
  await pagina.evaluate(AYUDA_CAJA);
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>(x.funciones||[]).includes('caja') && (x.funciones||[]).includes('gastosneg'));
    WS.entrarComoNegocio(n.id);
    await __abrirCaja();
    WS.movimientoCaja('gasto'); await __esperar(60);
    document.getElementById('m-concepto').value='Hielo prueba D7'; document.getElementById('m-valor').value='3500';
    document.getElementById('modal-ok').click(); await __esperar(300);
    const enCaja=(WS.cajaActual().movimientos||[]).some(m=>m.concepto==='Hielo prueba D7' && m.valor===3500 && m.tipo==='gasto');
    const mov=(WS.cajaActual().movimientos||[]).find(m=>m.concepto==='Hielo prueba D7');
    const enGastos=misDatos('gastos_negocio').some(g=>g.concepto==='Hielo prueba D7' && g.origen==='caja' && g.movId===mov.id);
    WS.volverSuperAdmin();
    return {enCaja, enGastos};
  });
  assert.deepEqual(r, {enCaja:true, enGastos:true});
});
test('D8: lo vendido mientras se cuenta no se descuenta dos veces', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(async ()=>{
    const esperar=ms=>new Promise(res=>setTimeout(res,ms));
    // Un negocio con inventario y la pantalla de conteo en su menú
    const n=(DB.get('negocios')||[]).find(x=>{ if(!Dominio.negocio.usaInventario(x)) return false; WS.entrarComoNegocio(x.id); const ok=WS.armarMenu().some(m=>m.id==='conteo'); WS.volverSuperAdmin(); return ok; });
    if(!n) return {sinNegocio:true};
    WS.entrarComoNegocio(n.id);
    WS.STATE.pageNeg='conteo'; WS.render(); WS.iniciarConteo(); WS.render();
    const idx=WS._conteo.items.findIndex(it=>it.tipo==='producto' && it.sistema>5);
    const it=WS._conteo.items[idx];
    // Mientras se cuenta se venden 2 (el inventario baja de verdad)
    cambiarStock('productos', it.id, x=>{ x.stock=(x.stock||0)-2; });
    const real=misDatos('productos').find(p=>p.id===it.id).stock;
    WS.contarItem(idx, String(real));                  // se cuenta lo que hay ahora en la bodega
    WS.guardarConteo(true); await esperar(60);
    document.getElementById('modal-ok').click(); await esperar(200);
    const despues=misDatos('productos').find(p=>p.id===it.id).stock;
    WS.volverSuperAdmin();
    return {real, despues};
  });
  assert.ok(!r.sinNegocio, 'no hay negocio con conteo para probar');
  assert.equal(r.despues, r.real);   // antes quedaba en real − 2
});
test('F22: anular la venta de una cita la devuelve a pendiente y resta lo del cliente', {skip:omitir}, async ()=>{
  await pagina.evaluate(AYUDA_CAJA);
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>x.usaCitas && (x.funciones||[]).includes('citas') && Dominio.negocio.usaInventario(x) && (x.funciones||[]).includes('caja'));
    if(!n) return {omitido:true};
    WS.entrarComoNegocio(n.id);
    await __abrirCaja();
    const p=misDatos('productos').find(x=>!x.esCombo && x.stock>3);
    const antes=p.stock;
    const apartados=[{prodId:p.id, nombre:p.nombre, precio:p.precio, cantidad:1}];
    WS.descontarApartado(apartados, 'Apartado · F22');
    const cita={id:uid(), cliente:'Cliente F22', tel:'3001231231', fechaHora:today()+'T11:00:00', apartados, stockDescontado:true, estado:'pendiente', creado:WS.now()};
    guardarMisDatos('citas', misDatos('citas').concat([cita]));
    WS.marcarCita(cita.id,'atendida'); await __esperar(60);
    WS.pagoRapido('efectivo'); document.getElementById('modal-ok').click(); await __esperar(700); WS.cerrarModal();
    const v=misDatos('ventas').find(x=>x.origenCita===cita.id);
    const cliAntes=(misDatos('clientes').find(c=>c.tel==='3001231231')||{}).pedidos||0;
    WS.anularPedido(v.id); await __esperar(60); document.getElementById('modal-ok').click(); await __esperar(200);
    const c=misDatos('citas').find(x=>x.id===cita.id);
    const cliDespues=(misDatos('clientes').find(x=>x.tel==='3001231231')||{}).pedidos||0;
    const stock=misDatos('productos').find(x=>x.id===p.id).stock;
    WS.volverSuperAdmin();
    return {cita:c.estado, ventaId:c.ventaId||null, stockDescontado:c.stockDescontado, stockDeVuelta:stock===antes, cliente:cliAntes-cliDespues};
  });
  if(r.omitido) return;
  assert.deepEqual(r, {cita:'pendiente', ventaId:null, stockDescontado:false, stockDeVuelta:true, cliente:1});
});
test('C3: si la comanda no se imprime, se avisa y queda en la auditoría', {skip:omitir}, async ()=>{
  await pagina.evaluate(AYUDA_CAJA);
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>x.usaCocina && x.flujoPedido==='dos_pasos' && (x.funciones||[]).includes('caja'));
    if(!n) return {omitido:true};
    WS.entrarComoNegocio(n.id);
    await __abrirCaja();
    const abrirAntes=window.open;
    window.open=()=>({document:{open(){}, write(){ throw new Error('falla de prueba C3'); }, close(){}}, print(){}, focus(){}, close(){}});
    try{
      const p=misDatos('productos').find(x=>!x.esCombo && (x.stock==null || x.stock>3));
      WS.STATE.pageNeg='ventas'; WS.render(); WS.vaciarCarrito(); WS.agregarAlCarrito(p.id);
      Object.assign(WS._vCli, {nombre:'Cliente C3', tel:'3004445566', dir:'Calle 3', barrio:'Centro'});
      if(n.usaMesas) WS.elegirTipoEntrega((n.tiposEntrega||[])[0]||'llevar');
      WS.ponerMesa('3'); WS.confirmarPedido(); await __esperar(80); WS.cerrarModal();
    } finally { window.open=abrirAntes; }
    const pedido=misDatos('ventas').some(v=>v.cliTel==='3004445566');
    const auditado=misDatos('auditoria').some(a=>a.accion==='Error del sistema' && /comanda/.test(a.detalle||'') && /falla de prueba C3/.test(a.detalle||''));
    WS.volverSuperAdmin();
    return {pedido, auditado};
  });
  if(r.omitido) return;
  assert.deepEqual(r, {pedido:true, auditado:true});
  // El error provocado a propósito no cuenta como falla del recorrido
  for(let i=errores.length-1;i>=0;i--) if(/falla de prueba C3/.test(errores[i])) errores.splice(i,1);
});
test('agotado y foto: el botón oculta el producto de la venta; la foto se reduce y una imagen falsa no se dibuja', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>(x.funciones||[]).includes('inventario'));
    WS.entrarComoNegocio(n.id);
    const p=misDatos('productos').find(x=>!x.agotado);
    WS.alternarAgotado(p.id); await __esperar(50);
    const marcado=misDatos('productos').find(x=>x.id===p.id).agotado===true;
    WS.irA('ventas'); await __esperar(50);
    const ocultoEnVenta=!document.querySelector('[data-click*="'+p.id+'"]');
    WS.alternarAgotado(p.id); await __esperar(50);
    const devuelto=misDatos('productos').find(x=>x.id===p.id).agotado===false;
    // Foto: una imagen grande se reduce a 200 px
    const lienzo=document.createElement('canvas'); lienzo.width=1200; lienzo.height=800;
    lienzo.getContext('2d').fillRect(0,0,1200,800);
    const archivo=await new Promise(ok=>lienzo.toBlob(b=>ok(new File([b],'a.png',{type:'image/png'})),'image/png'));
    const url=await WS.reducirImagen(archivo, 200);
    const img=await new Promise(ok=>{ const i=new Image(); i.onload=()=>ok(i); i.src=url; });
    const reducida=Math.max(img.width,img.height)===200 && Dominio.inventario.imagenValida(url);
    // Un texto malicioso en "imagen" no llega al HTML
    const malo=WS.fotoProducto({imagen:'x" onerror="window.__xss=1'},'box');
    const sinInyeccion=!malo.includes('onerror') && WS.fotoProducto({imagen:url}).startsWith('<img');
    WS.volverSuperAdmin();
    return {marcado, ocultoEnVenta, devuelto, reducida, sinInyeccion};
  });
  assert.deepEqual(r, {marcado:true, ocultoEnVenta:true, devuelto:true, reducida:true, sinInyeccion:true});
});
test('periodo de prueba: crear a prueba con ejemplos, aviso de días, más días, borrar ejemplos, pasar a pago; vencida = aviso de solo lectura', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(async ()=>{
    WS.nuevoNegocio(); await __esperar(60);
    document.getElementById('m-nombre').value='Prueba UI Trial';
    document.getElementById('m-tipo').value='Restaurante';
    document.getElementById('m-usuario').value='trialui'+Date.now();
    document.getElementById('m-pass').value='clave1234';
    document.getElementById('m-dias-prueba').value='10';
    document.getElementById('m-ejemplos').checked=true;
    document.getElementById('modal-ok').click(); await __esperar(300);
    const neg=(DB.get('negocios')||[]).find(n=>n.nombre==='Prueba UI Trial');
    const e0=Pruebas.estado(neg.id);
    const enPanel=document.getElementById('app').innerHTML.includes('PRUEBA · 10 días');
    WS.entrarComoNegocio(neg.id); await __esperar(60);
    const banner=(document.querySelector('.banner-prueba')||{}).textContent||'';
    const ejemplosAntes=misDatos('productos').filter(p=>p.ejemplo).length;
    WS.irA('inventario'); await __esperar(60);
    const botonEjemplos=!!document.querySelector('[data-click="borrarEjemplos()"]');
    WS.borrarEjemplos(); await __esperar(60); document.getElementById('modal-ok').click(); await __esperar(200);
    const ejemplosDespues=misDatos('productos').filter(p=>p.ejemplo).length;
    WS.volverSuperAdmin(); await __esperar(60);
    WS.darMasDias(neg.id); await __esperar(60);
    document.getElementById('m-dias').value='5'; document.getElementById('modal-ok').click(); await __esperar(200);
    const e1=Pruebas.estado(neg.id);
    // Vencida: aviso de solo lectura dentro y en la tarjeta del panel
    const lista=DB.get('negocios'); lista.find(n=>n.id===neg.id).pruebaHasta=Date.now()-1000; DB.set('negocios', lista);
    WS.render(); await __esperar(60);
    const enPorVencer=!!document.querySelector('[data-click="pasarAPago(\''+neg.id+'\')"]');
    WS.entrarComoNegocio(neg.id); await __esperar(60);
    const vencida=!!document.querySelector('.banner-prueba.vencida');
    WS.volverSuperAdmin(); await __esperar(60);
    WS.pasarAPago(neg.id); await __esperar(60); document.getElementById('modal-ok').click(); await __esperar(200);
    const e2=Pruebas.estado(neg.id);
    return {dias0:e0.diasRestantes, enPanel, banner:/10 días/.test(banner), hayEjemplos:ejemplosAntes>0, botonEjemplos,
      ejemplosDespues, dias1:e1.diasRestantes, enPorVencer, vencida, pagado:e2.tipo};
  });
  assert.deepEqual(r, {dias0:10, enPanel:true, banner:true, hayEjemplos:true, botonEjemplos:true,
    ejemplosDespues:0, dias1:15, enPorVencer:true, vencida:true, pagado:null});
});
test('5425800: avisos de otro equipo (pedido nuevo, caja abierta/cerrada de mi sede) y Nueva Venta sin pedido no congela el refresco', {skip:omitir}, async ()=>{
  await pagina.evaluate(AYUDA_CAJA);
  const r=await pagina.evaluate(async ()=>{
    const n=(DB.get('negocios')||[]).find(x=>(x.funciones||[]).includes('caja'));
    WS.entrarComoNegocio(n.id);
    const toasts=()=>Array.from(document.querySelectorAll('#toasts .toast')).map(t=>t.textContent);
    document.getElementById('toasts').innerHTML='';
    WS.registroNuevoDeNube('ventas', {id:'zz1', factura:'F-77', vendedor:'Otro', vendedorId:'otro', total:12000, sucursalId:WS.sucursalActual()}, {inicial:false});
    WS.STATE.user.id='yo-prueba';
    WS.registroNuevoDeNube('ventas', {id:'zz2', factura:'F-78', vendedorId:'yo-prueba', total:1}, {inicial:false});
    WS.registroNuevoDeNube('ventas', {id:'zz3', factura:'F-79', total:1}, {inicial:true});
    WS.registroNuevoDeNube('ventas', {id:'zz4', factura:'F-80', total:1, sucursalId:'otra-sede'}, {inicial:false});
    const pedido=toasts().filter(t=>t.includes('F-7')||t.includes('F-8'));
    // Caja: la de mi sede se abre en otro equipo (con un modal abierto también se ve al cerrarlo)
    const abierta=[{id:'cx', cajero:'Ana', sucursalId:WS.sucursalActual(), apertura:new Date().toISOString(), movimientos:[]}];
    WS.tablaCambioDeNube('caja_actual', abierta, null, {inicial:false});
    WS.tablaCambioDeNube('caja_actual', abierta.concat([]), abierta, {inicial:false});        // mismo estado: nada
    WS.tablaCambioDeNube('caja_actual', null, abierta, {inicial:false});
    const caja=toasts().filter(t=>t.includes('caja'));
    // Nueva Venta sin pedido: no queda en "escribiendo" (antes congelaba el refresco con la caja cerrada)
    WS.irA('ventas'); await __esperar(50);
    const libre=!WS.ESCRIBIENDO;
    WS.volverSuperAdmin();
    return {pedido, caja, libre, delicado:[WS.campoDelicado(Object.assign(document.createElement('input'),{className:'busca'})), WS.campoDelicado(document.createElement('input'))]};
  });
  assert.equal(r.pedido.length, 1);
  assert.match(r.pedido[0], /F-77 · Otro · \$ 12\.000/);
  assert.deepEqual(r.caja, ['✅ Ana abrió la caja · ya puedes vender', '🔒 Se cerró la caja']);
  assert.equal(r.libre, true);
  assert.deepEqual(r.delicado, [false, true]);
});
test('S8: un logo, un campo del negocio, una cuenta y un id maliciosos no ejecutan nada al supervisar, configurar, vender ni sacar el informe', {skip:omitir}, async ()=>{
  const r=await pagina.evaluate(async ()=>{
    window.__xss=0;
    const ataque=n=>'x" onerror="window.__xss++" data-ataque="'+n;
    const n=(DB.get('negocios')||[]).find(x=>(x.funciones||[]).includes('ventas') && (x.funciones||[]).includes('inventario'));
    const lista=DB.get('negocios'); const neg=lista.find(x=>x.id===n.id);
    const antes={logo:neg.logo, pct:neg.pctDatafono, dias:neg.diasAvisoVence};
    Object.assign(neg, {logo:ataque('logo'), pctDatafono:'0" autofocus onfocus="window.__xss++" data-ataque="pct', diasAvisoVence:'7" onmouseover="window.__xss++" data-ataque="dias'});
    DB.set('negocios', lista);
    const malos=[];
    const revisar=(donde, raiz)=>{
      (raiz||document).querySelectorAll('[data-ataque]').forEach(e=>malos.push(donde+': '+e.tagName+' '+e.getAttribute('data-ataque')));
      (raiz||document).querySelectorAll('*').forEach(e=>{ for(const a of e.attributes) if(/^on/i.test(a.name)) malos.push(donde+': '+e.tagName+' '+a.name); });
    };
    WS.entrarComoNegocio(n.id); await __esperar(150);
    // Un producto y una cuenta con datos maliciosos (como si otro equipo los hubiera escrito)
    const prods=misDatos('productos'); prods.push({id:'p" onmouseover="window.__xss++" data-ataque="id', nombre:'Malo', precio:1000, categoria:'General', creado:new Date().toISOString()});
    Datos.set(Datos.claveDe(n.id,'productos'), prods);
    revisar('barra lateral');
    for(const p of ['inicio','ventas','inventario','minegocio']){ try{ WS.irA(p); await __esperar(80); revisar(p); }catch(e){ malos.push(p+': '+e.message); } }
    // Impresiones (ventanas nuevas): se capturan sin abrirlas
    const abrir=window.open; const docs=[];
    window.open=()=>{ const d=document.implementation.createHTMLDocument('x'); const w={document:{write:h=>{ d.documentElement.innerHTML=h; docs.push(d); }, close(){}, open(){}}, focus(){}, print(){}, close(){}, onload:null, addEventListener(){}}; return w; };
    try{
      const v=misDatos('ventas')[0]; if(v) WS.imprimirFactura(v.id);
      WS.volverSuperAdmin(); await __esperar(80);
      WS.configNegocio(n.id); await __esperar(80); revisar('configurar negocio');
      WS.irPanel(); await __esperar(50);
      WS.imprimirReporteNegocio(n.id, new Date().toISOString().slice(0,7)); await __esperar(400);
    } finally { window.open=abrir; }
    docs.forEach((d,i)=>revisar('impresión '+i, d));
    // Dejar el negocio como estaba
    const l2=DB.get('negocios'); Object.assign(l2.find(x=>x.id===n.id), antes); DB.set('negocios', l2);
    Datos.set(Datos.claveDe(n.id,'productos'), prods.filter(p=>p.nombre!=='Malo'));
    await __esperar(300);
    return {malos, xss:window.__xss, impresiones:docs.length};
  });
  assert.deepEqual(r.malos, [], 'atributos inyectados');
  assert.equal(r.xss, 0, 'se ejecutó código inyectado');
  assert.ok(r.impresiones>=1, 'se revisó al menos una impresión');
});
test('sin errores de JavaScript en todo el recorrido', {skip:omitir}, ()=>{
  assert.deepEqual(errores, []);
});

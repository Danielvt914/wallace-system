// ============================================================
//  INTERFAZ · Cuentas abiertas
//  Cuentas por mesa o cliente que se cobran al final.
//  Adaptador de entrada: módulo ES. Lo que exporta lo importan otros módulos
//  y lo llaman los data-click del HTML generado (nucleo/eventos.js). Lo carga
//  ui/manifiesto.js (cargarInterfaz). Doc: Documentation/02-pos-catalog/02-pos-catalog.md
// ============================================================
import { STATE, escapeHtml, fijarEscribiendo, fmtMoney, now } from '../nucleo/estado.js';
import { tienePermiso, usaInventario } from '../nucleo/permisos.js';
import { abrirModal, cerrarModal, confirmarModal, ic, pProds, toast } from '../nucleo/componentes.js';
import { sonidoError, sonidoPedido } from '../nucleo/sonidos.js';
import { render } from '../nucleo/navegacion.js';
import { logAudit } from '../usuarios/auditoria.js';
import { _carrito, _guardando, _vObs, armarVenta, bloquearBoton, cargarPedidoEnVenta, fijarGuardando, limpiarPedido, validarClientePedido } from './nueva-venta.js';
import { ventasJornada } from './pedidos.js';
import { imprimirComanda } from '../cocina/comanda.js';
import { ajustarStockPorEdicion, descontarStock, devolverStock, faltantesPara, requerimientos } from '../inventario/motor.js';


// ============================================================
//  CUENTAS ABIERTAS
//  Para licoreras, bares y restaurantes: se abre una cuenta por mesa o
//  por cliente, se le van agregando productos durante la noche y se cobra
//  al final. Cada producto que se agrega descuenta inventario al cobrar.
// ============================================================
// ¿El inventario se descuenta apenas se pide, o hasta que se cobra?
// En una licorera o un bar el producto YA salió de la nevera al pedirlo,
// así que el stock debe bajar de una. En otros negocios puede convenir
// esperar al cobro. Se elige en Mi Negocio.
export function descuentaAlPedir(){
  const n=STATE.negocio;
  if(!n || !usaInventario()) return false;
  if(n.descontarAlPedir!==undefined) return !!n.descontarAlPedir;
  return hayPedidosAbiertos();   // por defecto: sí, donde hay pedidos sin cobrar
}
export function usaCuentas(){
  const n=STATE.negocio;
  // Es OPCIONAL: solo aparece si el negocio la habilita en Mi Negocio.
  // Hay negocios que cobran de una y no necesitan cuentas.
  return !!(n && n.usaCuentas===true);
}
// ¿En este negocio existen pedidos sin cobrar? (cuentas abiertas o flujo de dos pasos)
export function hayPedidosAbiertos(){
  const n=STATE.negocio;
  return !!(n && (n.usaCuentas===true || n.flujoPedido==='dos_pasos'));
}
export function cuentasAbiertas(){
  return ventasJornada(false).filter(v=>v.estado==='abierta')
    .sort((a,b)=>new Date(a.fecha||0)-new Date(b.fecha||0));
}
export function nombreCuenta(v){
  if(!v) return 'cuenta';
  if(v.mesa) return v.mesa;
  if(v.cliNombre) return v.cliNombre;
  return v.factura||'Cuenta';
}
export function minutosAbierta(v){
  return Math.max(0, Math.floor((Date.now()-new Date(v.fecha||Date.now()).getTime())/60000));
}
export function tiempoTxt(min){
  if(min<60) return min+' min';
  const h=Math.floor(min/60), m=min%60;
  return h+'h '+(m?m+'m':'');
}
// Abre la cuenta con lo que hay en el carrito (negocios de cobro directo)
export function abrirCuentaNueva(){
  if(!_carrito.length){ toast('Agrega productos primero','error'); return; }
  if(!validarClientePedido()) return;
  if(_guardando) return;
  if(descuentaAlPedir()){
    const faltan=faltantesPara(requerimientos(_carrito));
    if(faltan.length){ toast('⛔ No alcanza el inventario: '+faltan.join(', '),'error'); sonidoError(); return; }
  }
  fijarGuardando(true);
  try{
    const venta=armarVenta('abierta');
    venta.estado='abierta';
    venta.esCuenta=true;
    if(descuentaAlPedir()) descontarStock(venta);   // el producto ya salió: baja el stock
    const ventas=misDatos('ventas');
    ventas.unshift(venta);
    guardarMisDatos('ventas',ventas);
    logAudit('Abrió cuenta', (venta.factura||'')+' · '+nombreCuenta(venta)+(venta.stockAplicado?' · inventario descontado':''));
    sonidoPedido();
    if(STATE.negocio.usaCocina){ try{ imprimirComanda(venta); }catch(e){} }
    limpiarPedido(); fijarEscribiendo(false); STATE.pageNeg='cuentas'; render();
    toast('Cuenta abierta: '+nombreCuenta(venta),'success');
  }catch(e){ console.error(e); toast('Error al abrir la cuenta','error'); }
  finally{ fijarGuardando(false); }
}
// Entra al modo "agregar productos a esta cuenta"
export function irAgregarACuenta(id){
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Cuenta no encontrada','error'); return; }
  if(v.estado!=='abierta'){ toast('Esa cuenta ya fue cobrada','error'); return; }
  if(STATE.editandoVentaId){ toast('Termina la edición que tienes abierta','error'); return; }
  STATE.agregandoCuentaId=id;
  cargarPedidoEnVenta(v, false);
  fijarEscribiendo(true);
  STATE.pageNeg='ventas';
  render();
  toast('Agregando a '+nombreCuenta(v),'info');
}
export function salirDeCuenta(){
  STATE.agregandoCuentaId=null;
  limpiarPedido(); fijarEscribiendo(false); STATE.pageNeg='cuentas'; render();
}
// Suma lo del carrito a la cuenta (no la reemplaza)
export function agregarACuenta(){
  if(_guardando) return;
  const id=STATE.agregandoCuentaId;
  if(!id){ toast('No hay ninguna cuenta abierta seleccionada','error'); return; }
  if(!_carrito.length){ toast('Agrega productos primero','error'); return; }
  const ventas=misDatos('ventas');
  const v=ventas.find(x=>x.id===id);
  if(!v){ toast('Esa cuenta ya no existe','error'); salirDeCuenta(); return; }
  if(v.estado!=='abierta'){ toast('Esa cuenta ya fue cobrada','error'); salirDeCuenta(); return; }
  // Si el inventario ya se había descontado (raro en cuentas), revisar que alcance
  if(v.stockAplicado===true){
    const faltan=faltantesPara(requerimientos(_carrito));
    if(faltan.length){ toast('⛔ No alcanza el inventario: '+faltan.join(', '),'error'); sonidoError(); return; }
  }
  fijarGuardando(true);
  bloquearBoton('btn-confirmar','Guardando…');
  try{
    const nuevos=JSON.parse(JSON.stringify(_carrito));
    const items=(v.items||[]).slice();
    nuevos.forEach(n=>{
      const ya=items.find(i=>i.prodId===n.prodId && i.precio===n.precio && (i.obs||'')===(n.obs||''));
      if(ya) ya.qty+=n.qty; else items.push(n);
    });
    v.items=items;
    const bruto=items.reduce((a,i)=>a+i.precio*i.qty,0);
    v.subtotalBruto=bruto;
    v.subtotal=Math.max(0,bruto-(v.descuento||0));
    v.total=v.subtotal+(v.valorDom||0)+(v.propina||0)+(v.recargo||0);
    v.agregadoPor=STATE.user.nombre; v.agregadoEn=now();
    if(_vObs) v.obs=((v.obs?v.obs+' · ':'')+_vObs);
    if(v.stockAplicado===true) ajustarStockPorEdicion([], nuevos, v.factura);
    if(STATE.negocio.usaCocina && v.estadoCocina && v.estadoCocina!=='entregado') v.estadoCocina='pendiente';
    guardarMisDatos('ventas',ventas);
    logAudit('Agregó a la cuenta', (v.factura||'')+' · '+nuevos.reduce((a,i)=>a+i.qty,0)+' und · total '+fmtMoney(v.total));
    sonidoPedido();
    // Comanda solo de lo NUEVO, para que cocina no repita lo anterior
    if(STATE.negocio.usaCocina){
      try{ imprimirComanda(Object.assign({}, v, {items:nuevos, obs:'AGREGADO A '+nombreCuenta(v)})); }catch(e){}
    }
    const nom=nombreCuenta(v), tot=v.total;
    STATE.agregandoCuentaId=null;
    limpiarPedido(); fijarEscribiendo(false); STATE.pageNeg='cuentas'; render();
    toast('Agregado a '+nom+' · va en '+fmtMoney(tot),'success');
  }catch(e){ console.error(e); toast('Error al agregar','error'); }
  finally{ fijarGuardando(false); }
}
// Cambiar el nombre o la mesa de una cuenta
export function renombrarCuenta(id){
  const v=misDatos('ventas').find(x=>x.id===id); if(!v) return;
  abrirModal({titulo:'Nombre de la cuenta', textoBoton:'Guardar', campos:[
    {id:'nombre', label:'Mesa o nombre del cliente', valor:v.mesa||v.cliNombre||'', requerido:true, placeholder:'Ej: Mesa 4, Don Jorge'}
  ], onGuardar:(d)=>{
    const ventas=misDatos('ventas');
    const x=ventas.find(y=>y.id===id); if(!x){ cerrarModal(); return; }
    if(x.tipo==='mesa') x.mesa=d.nombre.trim(); else x.cliNombre=d.nombre.trim();
    guardarMisDatos('ventas',ventas);
    cerrarModal(); toast('Cuenta renombrada','success'); render();
  }});
}
export function cuentas(){
  fijarEscribiendo(false);
  if(!usaCuentas()){
    return `<div class="tarjeta centro-msg"><div class="msg-ico">🧾</div>
      <div class="t-tit centrado">Las cuentas abiertas están apagadas</div>
      <p class="gris">Este negocio cobra de una y no usa cuentas. Si quieres ir agregando productos y cobrar al final (como en un bar o una licorera), actívalo en <strong>Mi Negocio → Usar cuentas abiertas</strong>.</p>
      ${(STATE.user.rol==='admin'||STATE.user.esSupervisor)?`<button class="btn btn-gold" data-click="irA('minegocio')">Ir a Mi Negocio</button>`:''}</div>`;
  }
  const lista=cuentasAbiertas();
  const total=lista.reduce((a,v)=>a+(v.total||0),0);
  const und=lista.reduce((a,v)=>a+(v.items||[]).reduce((x,i)=>x+i.qty,0),0);
  return `
    <div class="stats">
      <div class="stat gold"><div class="stat-ico gold">${ic('report')}</div><div class="stat-lbl">Cuentas abiertas</div><div class="stat-val">${lista.length}</div><div class="stat-sub">sin cobrar</div></div>
      <div class="stat verde"><div class="stat-ico verde">${ic('cash')}</div><div class="stat-lbl">Por cobrar</div><div class="stat-val">${fmtMoney(total)}</div><div class="stat-sub">${und} ${pProds()}</div></div>
      ${lista.length?`<div class="stat azul"><div class="stat-ico azul">${ic('history')}</div><div class="stat-lbl">La más antigua</div><div class="stat-val fs-19">${tiempoTxt(minutosAbierta(lista[0]))}</div><div class="stat-sub">${escapeHtml(nombreCuenta(lista[0]))}</div></div>`:''}
    </div>
    <div class="tarjeta">
      <div class="t-cab">
        <div><span class="t-tit">🧾 Cuentas abiertas</span>
          <p class="gris">Se les va agregando durante la noche y se cobran al final. Toca una para agregarle más.${usaInventario()?(descuentaAlPedir()?' El inventario se descuenta apenas se agrega el producto.':' El inventario se descuenta al cobrar.'):''}</p></div>
        <button class="btn btn-gold" data-click="nuevaCuentaDesdeCero()">+ Abrir cuenta</button>
      </div>
      ${lista.length?`<div class="kds-grid">
        ${lista.map(v=>{
          const min=minutosAbierta(v);
          const cls=min<60?'krono-verde':min<180?'krono-amar':'krono-rojo';
          return `<div class="kds-card ${cls}">
            <div class="kds-top">
              <span class="kds-ref">${escapeHtml(nombreCuenta(v))}</span>
              <span class="kds-krono">${fmtMoney(v.total||0)}</span>
            </div>
            <div class="kds-tipo">${escapeHtml(v.factura||'')} · abierta hace ${tiempoTxt(min)}${v.vendedor?' · '+escapeHtml(v.vendedor):''}</div>
            <div class="kds-items">
              ${(v.items||[]).slice(0,6).map(i=>`<div class="kds-item"><strong>${i.qty}×</strong> ${escapeHtml(i.nombre)} <span class="gris">${fmtMoney(i.precio*i.qty)}</span></div>`).join('')}
              ${(v.items||[]).length>6?`<div class="gris chico">+ ${(v.items||[]).length-6} más…</div>`:''}
            </div>
            <div class="kds-acc">
              <button class="btn btn-sm btn-verde" data-click="irAgregarACuenta('${v.id}')">➕ Agregar</button>
              ${tienePermiso('cobrar')?`<button class="btn btn-sm btn-gold" data-click="cobrarPedido('${v.id}')">💵 Cobrar</button>`:''}
              ${tienePermiso('imprimir')?`<button class="btn btn-sm" data-click="imprimirFactura('${v.id}')" title="Imprimir la cuenta para que la revise el cliente">🧾</button>`:''}
              <button class="btn btn-sm btn-ghost" data-click="renombrarCuenta('${v.id}')" title="Cambiar mesa o nombre">✏️</button>
              ${tienePermiso('anular')?`<button class="btn btn-sm btn-rojo" data-click="cancelarCuenta('${v.id}')" title="Se fueron sin consumir o sin pagar">🚫 Cancelar</button>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>`:`<div class="centro-msg"><div class="msg-ico">🧾</div>
        <p class="gris">No hay cuentas abiertas. Abre una y ve agregándole productos; se cobra cuando el cliente se va.</p>
        <button class="btn btn-gold" data-click="nuevaCuentaDesdeCero()">+ Abrir cuenta</button></div>`}
    </div>`;
}
// Cancelar una cuenta: no consumieron o no pagaron. Devuelve el producto al
// inventario (si ya se había descontado) y queda registrado quién la canceló.
export function cancelarCuenta(id){
  if(!tienePermiso('anular')){ toast('No tienes permiso para cancelar cuentas','error'); return; }
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Cuenta no encontrada','error'); return; }
  if(v.estado!=='abierta'){ toast('Esa cuenta ya fue cobrada. Usa Anular desde Pedidos.','error'); return; }
  const und=(v.items||[]).reduce((a,i)=>a+i.qty,0);
  const devuelve = v.stockAplicado===true && usaInventario();
  confirmarModal('¿Cancelar la cuenta de '+nombreCuenta(v)+' por '+fmtMoney(v.total||0)+'?'
    +(devuelve?' Los '+und+' producto(s) vuelven al inventario.':''),()=>{
    const ventas=misDatos('ventas');
    const x=ventas.find(y=>y.id===id); if(!x) return;
    if(devuelve) devolverStock(x, 'Cuenta cancelada · '+nombreCuenta(x));
    x.estado='anulada'; x.anulada=now(); x.anuladaPor=STATE.user.nombre; x.motivoAnulacion='Cuenta cancelada';
    guardarMisDatos('ventas',ventas);
    logAudit('Canceló cuenta abierta', (x.factura||'')+' · '+nombreCuenta(x)+' · '+fmtMoney(x.total||0)+(devuelve?' · inventario devuelto':''));
    toast('Cuenta cancelada'+(devuelve?' · producto devuelto al inventario':''),'info');
    render();
  },'Sí, cancelar');
}
export function nuevaCuentaDesdeCero(){
  STATE.agregandoCuentaId=null;
  limpiarPedido();
  STATE.pageNeg='ventas';
  fijarEscribiendo(true);
  render();
  toast('Arma el pedido y usa "Dejar como cuenta abierta"','info');
}

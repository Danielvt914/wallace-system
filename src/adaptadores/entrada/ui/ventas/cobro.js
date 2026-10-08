// ============================================================
//  INTERFAZ · Cobro y edición de ventas
//  Pago dividido, verificación de transferencias, anular, editar, ajustar cobro.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/02-pos-catalog/02-pos-catalog.md
// ============================================================


// ============================================================
//  PAGO DIVIDIDO
//  El cliente puede pagar con varias formas a la vez: parte en efectivo,
//  parte por transferencia, parte con tarjeta. Cada venta guarda cuánto
//  entró por cada forma en v.pagos, y de ahí salen caja, reportes y contable.
// ============================================================
function detallePagos(v){
  const p=pagosDe(v);
  const et={efectivo:'Efectivo',banco:'Banco',tarjeta:'Tarjeta'};
  return Object.keys(p).filter(k=>p[k]>0).map(k=>et[k]+' '+fmtMoney(p[k])).join(' · ');
}
// ---------- Verificación de transferencias ----------
// Un empleado puede decir "pagó por transferencia" sin que el dinero llegue.
// Si el negocio activa esta opción, esas ventas quedan marcadas hasta que
// alguien confirme el comprobante.
function exigeVerificarBanco(){ return !!(STATE.negocio && STATE.negocio.verificarBanco); }
function ventasPorVerificar(lista){ return (lista||[]).filter(bancoPendiente); }
function marcarVerificada(id){
  if(!(tienePermiso('cobrar')||tienePermiso('cambiarpago'))){ toast('No tienes permiso para verificar pagos','error'); return; }
  const v=misDatos('ventas').find(x=>x.id===id); if(!v) return;
  confirmarModal('¿Confirmas que la transferencia de '+fmtMoney(pagosDe(v).banco)+' de '+(v.factura||'')+' YA llegó a la cuenta?',()=>{
    const ventas=misDatos('ventas');
    const x=ventas.find(y=>y.id===id); if(!x) return;
    x.bancoVerificado=true; x.verificadoPor=STATE.user.nombre; x.verificadoEn=now();
    guardarMisDatos('ventas',ventas);
    logAudit('Verificó transferencia', (x.factura||'')+' · '+fmtMoney(pagosDe(x).banco));
    toast('Pago verificado','success'); render();
  },'Sí, ya llegó');
}

// ---------- COBRAR ----------
function cobrarPedido(id){
  if(!exigirPermiso('cobrar','No tienes permiso para cobrar')) return;
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  if(v.estado==='pagada'){ toast('Ya fue cobrado','info'); return; }
  abrirCobro(v,false);
}

// Modal de cobro. esNuevo=true cuando viene de "Cobrar ahora" (flujo directo)
// opc (cobros que no salen del carrito, p. ej. la entrega de una cita):
//   sinCarrito: no limpiar el pedido que se esté armando en Nueva Venta
//   alCobrar(venta): se llama con la venta ya guardada
//   pantalla: a dónde ir después (por defecto Pedidos)
function abrirCobro(v, esNuevo, opc){
  opc=opc||{};
  const neg=STATE.negocio;
  const base=v.subtotal||0;
  const dom=v.valorDom||0;
  const usaPropina=(neg.usaPropina!==undefined?neg.usaPropina:neg.usaCocina);
  const pct=neg.pctDatafono||0;
  const campos=[];
  if(usaPropina) campos.push({id:'propina', label:'Propina (del personal, no es del negocio)', tipo:'number', valor:'0'});
  campos.push({id:'recargo', label:'Recargo del datáfono (lo cobra el banco)', tipo:'number', valor:'0'});
  const totalIni=base+dom;

  abrirModal({titulo:'Cobrar '+(v.factura||'')+' · '+fmtMoney(totalIni), textoBoton:'Confirmar cobro',
    campos,
    extraHTML:`<div class="cobro-caja">
      <div class="c-row"><span>${escapeHtml(neg.palabraProductos||'Productos')}</span><strong>${fmtMoney(v.subtotalBruto!==undefined?v.subtotalBruto:base)}</strong></div>
      ${v.descuento>0?`<div class="c-row"><span>Descuento${v.descMotivo?' · '+escapeHtml(v.descMotivo):''}</span><strong class="rojo">−${fmtMoney(v.descuento)}</strong></div>`:''}
      ${dom>0?`<div class="c-row"><span>${v.tipo==='envio'?'Envío':'Domicilio'}</span><strong>${fmtMoney(dom)}</strong></div>`:''}
      <div class="c-row" id="r-prop" style="display:none;"><span>Propina</span><strong id="v-prop">$ 0</strong></div>
      <div class="c-row" id="r-rec" style="display:none;"><span>Recargo datáfono</span><strong id="v-rec">$ 0</strong></div>
      <div class="c-row c-total"><span>TOTAL A COBRAR</span><strong id="v-total">${fmtMoney(totalIni)}</strong></div>
    </div>
    <div class="cobro-caja" style="margin-top:12px;">
      <strong>¿Cómo paga el cliente?</strong>
      <p class="nota" style="margin:6px 0 10px;">Puede pagar con varias formas a la vez. Escribe cuánto entra por cada una; deja en 0 las que no use.</p>
      <div class="botones-fila">
        <button type="button" class="btn btn-sm btn-verde" onclick="pagoRapido('efectivo')">Todo en efectivo</button>
        <button type="button" class="btn btn-sm" onclick="pagoRapido('banco')">Todo por banco</button>
        <button type="button" class="btn btn-sm" onclick="pagoRapido('tarjeta')">Todo con tarjeta</button>
        <button type="button" class="btn btn-sm btn-ghost" onclick="pagoRapido('mitad')">Mitad y mitad</button>
      </div>
      <div class="form2" style="margin-top:6px;">
        <div class="m-row" style="margin-bottom:8px;"><label>💵 Efectivo</label>
          <input type="number" id="pg-efectivo" class="campo" value="${totalIni}" inputmode="decimal"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>🏦 Transferencia / Banco</label>
          <input type="number" id="pg-banco" class="campo" value="0" inputmode="decimal"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>💳 Tarjeta / Datáfono</label>
          <input type="number" id="pg-tarjeta" class="campo" value="0" inputmode="decimal"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>Falta / sobra</label>
          <div class="campo" id="pg-estado" style="display:flex;align-items:center;font-weight:800;">$ 0</div></div>
      </div>
      <div class="c-nota" id="c-nota"></div>
    </div>`,
    onAbrir:()=>{
      window._cobroTotal=totalIni;
      const recalc=()=>{
        const prop=parseFloat((document.getElementById('m-propina')||{}).value)||0;
        const rec=parseFloat((document.getElementById('m-recargo')||{}).value)||0;
        const total=base+dom+prop+rec;
        window._cobroTotal=total;
        const set=(id,val)=>{ const e=document.getElementById(id); if(e) e.textContent=val; };
        const ver=(id,on)=>{ const e=document.getElementById(id); if(e) e.style.display=on?'flex':'none'; };
        set('v-prop',fmtMoney(prop)); ver('r-prop',prop>0);
        set('v-rec',fmtMoney(rec));  ver('r-rec',rec>0);
        set('v-total',fmtMoney(total));
        pintarEstadoPago();
      };
      ['m-propina','m-recargo'].forEach(id=>{ const e=document.getElementById(id); if(e) e.addEventListener('input',recalc); });
      ['pg-efectivo','pg-banco','pg-tarjeta'].forEach(id=>{ const e=document.getElementById(id); if(e) e.addEventListener('input',pintarEstadoPago); });
      // Si usan tarjeta y hay % de datáfono configurado, se sugiere el recargo
      const t=document.getElementById('pg-tarjeta');
      if(t && pct>0) t.addEventListener('change',()=>{
        const r=document.getElementById('m-recargo');
        const val=parseFloat(t.value)||0;
        if(r && val>0 && !parseFloat(r.value)){ r.value=Math.round(val*pct/100); recalc(); }
      });
      recalc();
    },
    onGuardar:(d)=>{
      if(_guardando) return;
      const propina=parseFloat(d.propina)||0;
      const recargo=parseFloat(d.recargo)||0;
      const total=(v.subtotal||0)+(v.valorDom||0)+propina+recargo;
      // Reglas del cobro (faltante; el exceso es cambio y solo sale del efectivo): src/dominio/pagos.js
      const liq=Dominio.pagos.liquidarCobro(total, leerPagos());
      if(!liq.ok){
        toast(liq.error==='sin_pago'?'Escribe cuánto paga el cliente'
          :liq.error==='faltan'?'Faltan '+fmtMoney(liq.faltan)+' por cubrir'
          :'Solo se puede dar cambio del efectivo. Revisa los montos.','error');
        return;
      }
      const pagos=liq.pagos, cambio=liq.cambio;
      _guardando=true;
      try{
        const ventas=misDatos('ventas');
        let venta;
        if(esNuevo){
          venta=v; venta.estado='pagada';
          const yaEsta=ventas.findIndex(x=>x.id===venta.id);
          if(yaEsta>-1) ventas[yaEsta]=venta; else ventas.unshift(venta);   // evita duplicados al editar
        } else {
          venta=ventas.find(x=>x.id===v.id);
          if(!venta){ toast('El pedido ya no existe','error'); cerrarModal(); _guardando=false; return; }
          venta.estado='pagada';
        }
        venta.pagos={efectivo:Math.round(pagos.efectivo), banco:Math.round(pagos.banco), tarjeta:Math.round(pagos.tarjeta)};
        venta.metodo=metodoPrincipal(venta.pagos);
        // Transferencias: quedan por verificar si el negocio lo exige
        if(exigeVerificarBanco() && venta.pagos.banco>0){ if(venta.bancoVerificado!==true) venta.bancoVerificado=false; }
        else if(venta.pagos.banco<=0){ delete venta.bancoVerificado; }
        venta.propina=propina; venta.recargo=recargo;
        venta.total=total;
        venta.cambio=Math.round(cambio);
        venta.cobrado=now(); venta.cobradoPor=STATE.user.nombre;
        descontarStock(venta);                 // marca la venta como descontada
        guardarMisDatos('ventas',ventas);      // se guarda DESPUÉS, con la marca
        guardarClienteAuto(venta);
        sonidoVenta();
        avisarStockBajo(venta);
        if(esNuevo && !opc.sinCarrito){ limpiarPedido(); ESCRIBIENDO=false; }
        if(opc.alCobrar){ try{ opc.alCobrar(venta); }catch(e){ console.error('alCobrar',e); } }
        cerrarModal();
        toast('Cobrado: '+fmtMoney(venta.total)+(cambio>0?' · Cambio '+fmtMoney(cambio):''),'success');
        if(cambio>0) setTimeout(()=>toast('💵 Devuelve '+fmtMoney(cambio)+' de cambio','info'),500);
        if((neg.funciones||[]).indexOf('facturas')>-1){
          const fid=venta.id;
          preguntarDespues('¿Imprimir factura?',()=>imprimirFactura(fid),'Imprimir');
        }
        STATE.pageNeg=opc.pantalla||'pedidos';
        render();
      }catch(e){ console.error(e); toast('Error al cobrar','error'); }
      finally{ _guardando=false; }
    }});
}
function leerPagos(){
  const n=id=>parseFloat((document.getElementById(id)||{}).value)||0;
  return {efectivo:n('pg-efectivo'), banco:n('pg-banco'), tarjeta:n('pg-tarjeta')};
}
// Muestra si falta plata, si está exacto o cuánto hay que devolver
function pintarEstadoPago(){
  const el=document.getElementById('pg-estado'); if(!el) return;
  const total=window._cobroTotal||0;
  const p=leerPagos();
  const suma=p.efectivo+p.banco+p.tarjeta;
  const dif=suma-total;
  if(Math.abs(dif)<0.5){ el.innerHTML='<span class="verde">✓ Exacto</span>'; }
  else if(dif<0){ el.innerHTML='<span class="rojo">Faltan '+fmtMoney(-dif)+'</span>'; }
  else { el.innerHTML='<span class="oro">Cambio '+fmtMoney(dif)+'</span>'; }
  const n=document.getElementById('c-nota');
  if(n){
    if(p.tarjeta>0){ n.innerHTML='💳 El recargo del datáfono lo cobra el banco, <strong>no es ingreso del negocio</strong>.'; n.style.display='block'; }
    else n.style.display='none';
  }
}
function pagoRapido(tipo){
  const total=window._cobroTotal||0;
  const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.value=v; };
  if(tipo==='mitad'){ set('pg-efectivo',Math.round(total/2)); set('pg-banco',total-Math.round(total/2)); set('pg-tarjeta',0); }
  else { set('pg-efectivo',tipo==='efectivo'?total:0); set('pg-banco',tipo==='banco'?total:0); set('pg-tarjeta',tipo==='tarjeta'?total:0); }
  pintarEstadoPago();
}

// ---------- ANULAR ----------
function anularPedido(id){
  if(!exigirPermiso('anular','No tienes permiso para anular')) return;
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  if(v.estado==='anulada'){ toast('Ya está anulado','info'); return; }
  confirmarModal('¿Anular el pedido '+(v.factura||'')+' de '+fmtMoney(v.total)+'? Si ya estaba cobrado, se devuelve el stock.', ()=>{
    const ventas=misDatos('ventas');
    const venta=ventas.find(x=>x.id===id);
    if(!venta){ toast('El pedido ya no existe','error'); return; }
    const teniaStock = venta.stockAplicado===true || (venta.stockAplicado===undefined && venta.estado==='pagada');
    venta.estado='anulada';
    venta.anulada=now();
    venta.anuladaPor=STATE.user.nombre;
    if(teniaStock) devolverStock(venta, 'Anulación del pedido '+(venta.factura||''));   // devuelve y deja constancia
    guardarMisDatos('ventas',ventas);
    logAudit('Anuló pedido', (venta.factura||'')+' · '+fmtMoney(venta.total));
    toast('Pedido anulado','info');
    render();
  },'Sí, anular');
}

// ---------- EDITAR PEDIDO ----------
function editarPedido(id){
  if(!tienePermiso('editar')){ toast('No tienes permiso para editar pedidos','error'); return; }
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  if(v.estado==='anulada'){ toast('No se puede editar un pedido anulado','error'); return; }
  // Una venta de una caja YA CERRADA no se toca: descuadraría ese cierre
  const cajaAb=cajaActual();
  if(v.estado==='pagada' && v.cajaId && (!cajaAb || cajaAb.id!==v.cajaId)){
    toast('Ese pedido es de una caja ya cerrada. Para corregirlo, anúlalo y haz uno nuevo.','error');
    return;
  }
  if(v.estado==='pagada' && !cajaAb){
    toast('Abre la caja antes de editar un pedido ya cobrado','error'); return;
  }
  STATE._itemsAntes=JSON.parse(JSON.stringify(v.items||[]));
  STATE._totalAntes=v.total||0;
  // Cargar el pedido en el carrito para modificarlo
  _carrito=(v.items||[]).map(i=>({prodId:i.prodId, nombre:i.nombre, precio:i.precio, qty:i.qty, obs:i.obs||''}));
  _vTipo=v.tipo||'llevar'; _vMesa=v.mesa||''; _vObs=v.obs||'';
  _desc=v.descuento||0; _descMot=v.descMotivo||v.descMot||'';
  _vCli={nombre:v.cliNombre||'', tel:v.cliTel||'', dir:v.cliDir||'', barrio:v.cliBarrio||'',
    ciudad:v.cliCiudad||'', depto:v.cliDepto||'', transportadora:v.transportadora||'',
    domiciliario:v.domiciliario||'', valorDom:v.valorDom||0};
  STATE.editandoVentaId=id;   // marca que estamos editando, no creando
  ESCRIBIENDO=true;
  STATE.pageNeg='ventas';
  toast('Editando '+(v.factura||'pedido')+(v.estado==='pagada'?' (ya cobrado: se ajustará el pago)':'')+'. Guarda para aplicar cambios.','info');
  render();
}
// Cuando se edita un pedido YA COBRADO y cambia el total, hay que decir
// cómo queda el pago. Hay dos formas, según lo que elija el negocio en
// Mi Negocio → "Al editar un pedido ya cobrado":
//  · "diferencia": solo se registra lo que el cliente debe o lo que hay que devolverle.
//  · "total": se vuelve a repartir el total completo entre las formas de pago.
function modoAjusteCobro(){
  const n=STATE.negocio;
  return (n && n.ajusteCobro==='total') ? 'total' : 'diferencia';
}
function ajustarPagoVenta(id, modoForzado){
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  const p=pagosDe(v);
  const pagado=Math.round(p.efectivo+p.banco+p.tarjeta);
  const total=Math.round(v.total||0);
  const dif=total-pagado;                       // + el cliente debe · − hay que devolverle
  const modo=modoForzado||modoAjusteCobro();

  // ---------- MODO TOTAL: se cobra el total nuevo, como una venta normal ----------
  // No habla de deudas: muestra el total nuevo y el cajero lo cobra completo.
  // El pago anterior se REEMPLAZA, así que la caja no cuenta nada dos veces.
  if(modo==='total' || dif===0){
    abrirModal({titulo:'Cobrar '+(v.factura||'')+' · '+fmtMoney(total), textoBoton:'Confirmar cobro', campos:[],
      extraHTML:`<div class="cobro-caja">
        <div class="c-row"><span>${escapeHtml((STATE.negocio.palabraProductos)||'Productos')}</span><span>${fmtMoney(v.subtotal||0)}</span></div>
        ${(v.valorDom||0)>0?`<div class="c-row"><span>Domicilio</span><span>${fmtMoney(v.valorDom)}</span></div>`:''}
        ${(v.propina||0)>0?`<div class="c-row"><span>Propina</span><span>${fmtMoney(v.propina)}</span></div>`:''}
        ${(v.recargo||0)>0?`<div class="c-row"><span>Recargo datáfono</span><span>${fmtMoney(v.recargo)}</span></div>`:''}
        <div class="c-row c-total"><span>TOTAL A COBRAR</span><strong>${fmtMoney(total)}</strong></div>
      </div>
      <div class="cobro-caja" style="margin-top:12px;">
        <strong>¿Cómo paga el cliente?</strong>
        <p class="nota" style="margin:6px 0 10px;">Cobra el total completo de ${fmtMoney(total)}. Esto reemplaza el pago anterior del pedido, así que la caja queda con el valor correcto.</p>
        <div class="botones-fila">
          <button type="button" class="btn btn-sm btn-verde" onclick="pagoRapido('efectivo')">Todo en efectivo</button>
          <button type="button" class="btn btn-sm" onclick="pagoRapido('banco')">Todo por banco</button>
          <button type="button" class="btn btn-sm" onclick="pagoRapido('tarjeta')">Todo con tarjeta</button>
          <button type="button" class="btn btn-sm btn-ghost" onclick="pagoRapido('mitad')">Mitad y mitad</button>
        </div>
        <div class="form2" style="margin-top:6px;">
          <div class="m-row" style="margin-bottom:8px;"><label>💵 Efectivo</label><input type="number" id="pg-efectivo" class="campo" value="${total}"></div>
          <div class="m-row" style="margin-bottom:8px;"><label>🏦 Banco</label><input type="number" id="pg-banco" class="campo" value="0"></div>
          <div class="m-row" style="margin-bottom:8px;"><label>💳 Tarjeta</label><input type="number" id="pg-tarjeta" class="campo" value="0"></div>
          <div class="m-row" style="margin-bottom:8px;"><label>Falta / sobra</label><div class="campo" id="pg-estado" style="display:flex;align-items:center;font-weight:800;">$ 0</div></div>
        </div>
        ${dif!==0?`<button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="cerrarModal();ajustarPagoVenta('${id}','diferencia')">↔ Cobrar solo la diferencia (${fmtMoney(Math.abs(dif))})</button>`:''}
        <div class="c-nota" id="c-nota"></div>
      </div>`,
    onAbrir:()=>{
      window._cobroTotal=total;
      ['pg-efectivo','pg-banco','pg-tarjeta'].forEach(x=>{ const e=document.getElementById(x); if(e) e.addEventListener('input',pintarEstadoPago); });
      pintarEstadoPago();
    },
    onGuardar:()=>{
      const nuevos=leerPagos();
      const suma=nuevos.efectivo+nuevos.banco+nuevos.tarjeta;
      if(Math.abs(suma-total)>0.5){ toast('La suma debe dar exactamente '+fmtMoney(total),'error'); return; }
      guardarAjusteCobro(id, {efectivo:Math.round(nuevos.efectivo), banco:Math.round(nuevos.banco), tarjeta:Math.round(nuevos.tarjeta)});
    }});
    return;
  }

  // ---------- MODO DIFERENCIA: solo lo que falta cobrar o devolver ----------
  const cobra=dif>0;
  const monto=Math.abs(dif);
  const tope={efectivo:Math.round(p.efectivo), banco:Math.round(p.banco), tarjeta:Math.round(p.tarjeta)};
  abrirModal({titulo:(cobra?'Cobrar la diferencia · ':'Devolver al cliente · ')+(v.factura||''),
    textoBoton:cobra?'Registrar el cobro':'Registrar la devolución', campos:[],
    extraHTML:`<div class="cobro-caja">
      <div class="c-row"><span>Total anterior</span><span>${fmtMoney(pagado)}</span></div>
      <div class="c-row"><span>Total nuevo</span><span>${fmtMoney(total)}</span></div>
      <div class="c-row c-total"><span>${cobra?'EL CLIENTE DEBE':'HAY QUE DEVOLVERLE'}</span><strong class="${cobra?'oro':'rojo'}">${fmtMoney(monto)}</strong></div>
    </div>
    <div class="cobro-caja" style="margin-top:12px;">
      <strong>${cobra?'¿Con qué paga esa diferencia?':'¿De dónde sale la devolución?'}</strong>
      <p class="nota" style="margin:6px 0 10px;">Solo registra ${fmtMoney(monto)}. El resto del pago queda como estaba.${cobra?'':' No puedes devolver por una forma más de lo que se pagó por ella.'}</p>
      <div class="botones-fila">
        <button type="button" class="btn btn-sm btn-verde" onclick="pagoRapido('efectivo')">Todo en efectivo</button>
        <button type="button" class="btn btn-sm" onclick="pagoRapido('banco')">Todo por banco</button>
        <button type="button" class="btn btn-sm" onclick="pagoRapido('tarjeta')">Todo con tarjeta</button>
      </div>
      <div class="form2" style="margin-top:6px;">
        <div class="m-row" style="margin-bottom:8px;"><label>💵 Efectivo${cobra?'':' (pagado: '+fmtMoney(tope.efectivo)+')'}</label><input type="number" id="pg-efectivo" class="campo" value="${monto}"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>🏦 Banco${cobra?'':' (pagado: '+fmtMoney(tope.banco)+')'}</label><input type="number" id="pg-banco" class="campo" value="0"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>💳 Tarjeta${cobra?'':' (pagado: '+fmtMoney(tope.tarjeta)+')'}</label><input type="number" id="pg-tarjeta" class="campo" value="0"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>Falta / sobra</label><div class="campo" id="pg-estado" style="display:flex;align-items:center;font-weight:800;">$ 0</div></div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="cerrarModal();ajustarPagoVenta('${id}','total')">↔ Mejor repartir el total completo</button>
      <div class="c-nota" id="c-nota"></div>
    </div>`,
  onAbrir:()=>{
    window._cobroTotal=monto;
    ['pg-efectivo','pg-banco','pg-tarjeta'].forEach(x=>{ const e=document.getElementById(x); if(e) e.addEventListener('input',pintarEstadoPago); });
    pintarEstadoPago();
  },
  onGuardar:()=>{
    const d=leerPagos();
    const suma=d.efectivo+d.banco+d.tarjeta;
    if(Math.abs(suma-monto)>0.5){ toast('Debe sumar exactamente '+fmtMoney(monto),'error'); return; }
    const signo=cobra?1:-1;
    const fin={efectivo:Math.round(p.efectivo+signo*d.efectivo),
               banco:Math.round(p.banco+signo*d.banco),
               tarjeta:Math.round(p.tarjeta+signo*d.tarjeta)};
    if(fin.efectivo<0||fin.banco<0||fin.tarjeta<0){
      toast('No puedes devolver por una forma más de lo que se pagó por ella','error'); return;
    }
    guardarAjusteCobro(id, fin, (cobra?'Cobró ':'Devolvió ')+fmtMoney(monto));
  }});
}
// Guarda el nuevo reparto del pago en la venta
function guardarAjusteCobro(id, pagos, detalleExtra){
  const ventas=misDatos('ventas');
  const x=ventas.find(y=>y.id===id); if(!x){ cerrarModal(); return; }
  const antes=detallePagos(x);
  x.pagos=pagos;
  x.metodo=metodoPrincipal(pagos);
  if(exigeVerificarBanco() && pagos.banco>0){ if(x.bancoVerificado!==true) x.bancoVerificado=false; }
  else if(pagos.banco<=0){ delete x.bancoVerificado; }
  x.pagoDescuadrado=false;
  x.pagoEditadoPor=STATE.user.nombre; x.pagoEditadoEn=now();
  guardarMisDatos('ventas',ventas);
  logAudit('Ajustó el cobro tras editar', (x.factura||'')+': '+antes+' → '+detallePagos(x)+(detalleExtra?' · '+detalleExtra:''));
  cerrarModal();
  toast(detalleExtra?detalleExtra:'Cobro ajustado','success');
  render();
}

// ---------- CAMBIAR FORMA DE PAGO (después de cobrado) ----------
function cambiarFormaPago(id){
  if(!tienePermiso('cambiarpago')){ toast('No tienes permiso para cambiar la forma de pago','error'); return; }
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  if(v.estado!=='pagada'){ toast('Solo aplica a pedidos ya cobrados','error'); return; }
  const p=pagosDe(v);
  const total=v.total||0;
  abrirModal({titulo:'Corregir la forma de pago', textoBoton:'Guardar', campos:[],
    extraHTML:`<p class="nota">Total cobrado: <strong>${fmtMoney(total)}</strong>. Reparte ese valor entre las formas de pago reales.</p>
    <div class="cobro-caja">
      <div class="form2">
        <div class="m-row" style="margin-bottom:8px;"><label>💵 Efectivo</label><input type="number" id="pg-efectivo" class="campo" value="${Math.round(p.efectivo)}"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>🏦 Banco</label><input type="number" id="pg-banco" class="campo" value="${Math.round(p.banco)}"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>💳 Tarjeta</label><input type="number" id="pg-tarjeta" class="campo" value="${Math.round(p.tarjeta)}"></div>
        <div class="m-row" style="margin-bottom:8px;"><label>Falta / sobra</label><div class="campo" id="pg-estado" style="display:flex;align-items:center;font-weight:800;">$ 0</div></div>
      </div>
      <div class="c-nota" id="c-nota"></div>
    </div>`,
  onAbrir:()=>{
    window._cobroTotal=total;
    ['pg-efectivo','pg-banco','pg-tarjeta'].forEach(x=>{ const e=document.getElementById(x); if(e) e.addEventListener('input',pintarEstadoPago); });
    pintarEstadoPago();
  },
  onGuardar:()=>{
    const nuevos=leerPagos();
    const suma=nuevos.efectivo+nuevos.banco+nuevos.tarjeta;
    if(Math.abs(suma-total)>0.5){ toast('La suma debe dar exactamente '+fmtMoney(total),'error'); return; }
    const ventas=misDatos('ventas');
    const x=ventas.find(y=>y.id===id);
    if(!x){ cerrarModal(); return; }
    const antes=detallePagos(x);
    x.pagos={efectivo:Math.round(nuevos.efectivo), banco:Math.round(nuevos.banco), tarjeta:Math.round(nuevos.tarjeta)};
    x.metodo=metodoPrincipal(x.pagos);
    if(exigeVerificarBanco() && x.pagos.banco>0){ if(x.bancoVerificado!==true) x.bancoVerificado=false; }
    else if(x.pagos.banco<=0){ delete x.bancoVerificado; }
    x.pagoEditadoPor=STATE.user.nombre; x.pagoEditadoEn=now();
    guardarMisDatos('ventas',ventas);
    logAudit('Cambió forma de pago', (x.factura||'')+': '+antes+' → '+detallePagos(x));
    cerrarModal(); toast('Forma de pago actualizada','success'); render();
  }});
}

// ---------- REIMPRIMIR COMANDA (cocina) ----------
function reimprimirComanda(id){
  if(!tienePermiso('comanda')){ toast('No tienes permiso para imprimir comandas','error'); return; }
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  imprimirComanda(v);
}

// ---------- ELIMINAR DEFINITIVAMENTE ----------
function eliminarDefinitivo(id){
  if(!tienePermiso('eliminar')){ toast('No tienes permiso para eliminar','error'); return; }
  const v=misDatos('ventas').find(x=>x.id===id);
  if(!v){ toast('Pedido no encontrado','error'); return; }
  confirmarModal('⚠️ Eliminar PERMANENTEMENTE '+(v.factura||'este pedido')+' ('+fmtMoney(v.total)+'). Se descuenta de ventas, caja y reportes. No se puede deshacer. ¿Continuar?', ()=>{
    const teniaStock = v.stockAplicado===true || (v.stockAplicado===undefined && v.estado==='pagada');
    if(teniaStock) devolverStock(v, 'Eliminación del pedido '+(v.factura||''));
    eliminarMisDatos('ventas',id);
    logAudit('Eliminó definitivamente', (v.factura||'')+' · '+fmtMoney(v.total));
    toast('Pedido eliminado por completo','error'); render();
  },'Sí, eliminar');
}

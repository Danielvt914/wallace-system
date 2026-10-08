// ============================================================
//  INTERFAZ · Pedidos
//  Lista de pedidos de la jornada y cambio de estado.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/02-pos-catalog/02-pos-catalog.md
// ============================================================


// ============================================================
//  PEDIDOS
// ============================================================
let _pBusca='';

// Ventas de la jornada: desde que se abrió la caja, sin importar el dispositivo
function ventasJornada(soloPagadas){
  const cajaAbierta=cajaActual();
  let vs=misDatos('ventas');
  // F1: con sucursales, cada sede ve sus pedidos y su caja
  if(usaSucursales(STATE.negocio)){ const suc=sucursalActual(); vs=vs.filter(v=>Dominio.caja.deSucursal(v,suc)); }
  if(cajaAbierta && cajaAbierta.apertura){
    const desde=new Date(cajaAbierta.apertura).getTime();
    vs=vs.filter(v=> v.cajaId===cajaAbierta.id || new Date(v.fecha||0).getTime()>=desde);
  } else {
    const h=today();
    vs=vs.filter(v=>jornadaDe(v)===h);
  }
  return soloPagadas ? vs.filter(v=>v.estado==='pagada') : vs;
}

function pedidos(){
  const neg=STATE.negocio;
  ESCRIBIENDO=false;
  const cajaAbierta=cajaActual();
  let vs=ventasJornada(false).filter(v=>v.estado!=='anulada');
  if(_pBusca){
    const q=_pBusca.toLowerCase();
    vs=vs.filter(v=>(v.factura||'').toLowerCase().includes(q)
      ||(v.cliNombre||'').toLowerCase().includes(q)
      ||(v.cliTel||'').includes(q)
      ||(v.domiciliario||'').toLowerCase().includes(q)
      ||(v.mesa||'').toLowerCase().includes(q));
  }
  vs=vs.sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  const etiq={mesa:'Mesa',llevar:'Para llevar',domicilio:'Domicilio',envio:'Envío',entrega:'Entrega',despacho:'Despacho'};
  const usaCocina=neg.usaCocina;
  const esLog=neg.esLogistica;
  // Columnas que dependen del tipo de negocio
  const tiposCfg=(neg.tiposEntrega&&neg.tiposEntrega.length)?neg.tiposEntrega:['llevar'];
  const colTipo = tiposCfg.length>1;                 // solo si hay más de un tipo de entrega
  const usaMesas = neg.usaMesas;
  const usaDomi = (neg.usaDomicilios!==undefined?neg.usaDomicilios:tiposCfg.indexOf('domicilio')>-1);
  const colDinero = !esLog;                          // logística no muestra dinero
  const doms=misDatos('domiciliarios');
  const uniDe=v=>(v.items||[]).reduce((a,i)=>a+(i.qty||0),0);
  // Badge de cocina
  const cocBadge=(e)=>{
    const m={pendiente:['pill-gold','Pendiente'],preparando:['pill-azul','Preparando'],listo:['pill-verde','Listo'],entregado:['pill','Entregado']};
    const x=m[e||'pendiente']; return `<span class="pill ${x[0]}">${x[1]}</span>`;
  };
  const selDom=(v)=>{
    if(!doms.length) return '—';
    return `<select class="busca" style="min-width:auto;padding:5px 8px;" onchange="asignarDomiciliario('${v.id}',this.value)"><option value="">Asignar…</option>${doms.map(d=>`<option ${v.domiciliario===d.nombre?'selected':''}>${escapeHtml(d.nombre)}</option>`).join('')}</select>`;
  };
  // Encabezados dinámicos
  const cols=[];
  cols.push(esLog?pPedido(true)+' / '+pPersonal(true):pPedido(true)+(usaDomi?' / Mensajero':''));
  if(colTipo) cols.push('Tipo');
  cols.push('Cliente'+(usaMesas?'/Mesa':''));
  cols.push(colDinero?'Total':'Unidades');
  if(colDinero) cols.push('Cobro');
  if(usaCocina) cols.push('Cocina');
  cols.push('Estado');
  if(usaDomi) cols.push('Domiciliario');
  cols.push('Acciones');
  const nCols=cols.length;
  const fila=(v)=>{
    const abierta=v.estado==='abierta';
    let tds='';
    tds+=`<td><strong class="oro">${escapeHtml(v.factura||'—')}</strong>${v.editadoPor?`<br><span class="gris chico">editado: ${escapeHtml(v.editadoPor)}</span>`:''}</td>`;
    if(colTipo) tds+=`<td>${etiq[v.tipo]||'—'}${v.mesa?'<br><span class="gris chico">'+escapeHtml(v.mesa)+'</span>':''}</td>`;
    tds+=`<td>${escapeHtml(v.cliNombre||v.mesa||'—')}${v.cliTel?`<br><span class="gris chico">${escapeHtml(v.cliTel)}</span>`:''}</td>`;
    tds+=colDinero?`<td class="negrita">${fmtMoney(v.total)}</td>`:`<td class="negrita">${uniDe(v)} und</td>`;
    if(colDinero) tds+=`<td>${abierta?'<span class="pill pill-gold">Abierta</span>':'<span class="pill pill-verde">Pagada</span>'}${v.estado==='pagada'?`<br><span class="gris chico" title="${escapeHtml(detallePagos(v))}">${escapeHtml(metodoTexto(v))}</span>`:''}${v.pagoDescuadrado?`<br><span class="pill pill-rojo" style="margin-top:3px;">Revisar pago</span>`:''}${bancoPendiente(v)?`<br><span class="pill pill-gold" style="margin-top:3px;">Transferencia sin verificar</span>`:''}</td>`;
    if(usaCocina) tds+=`<td>${cocBadge(v.estadoCocina)}</td>`;
    tds+=`<td><select class="busca" style="min-width:auto;padding:5px 8px;" onchange="setEstadoPedido('${v.id}',this.value)"><option value="activo" ${v.estadoPedido!=='entregado'?'selected':''}>Activo</option><option value="entregado" ${v.estadoPedido==='entregado'?'selected':''}>Entregado</option></select></td>`;
    if(usaDomi) tds+=`<td>${v.tipo==='domicilio'?selDom(v):'—'}</td>`;
    tds+=`<td class="acciones">
      ${abierta&&colDinero&&tienePermiso('cobrar')?`<button class="btn btn-sm btn-verde" onclick="cobrarPedido('${v.id}')" title="Cobrar">💵 Cobrar</button>`:''}
      ${tienePermiso('editar')?`<button class="btn btn-sm" onclick="editarPedido('${v.id}')" title="Editar">✏️</button>`:''}
      ${usaCocina&&tienePermiso('comanda')?`<button class="btn btn-sm" onclick="reimprimirComanda('${v.id}')" title="Comanda de cocina">👨‍🍳</button>`:''}
      ${tienePermiso('imprimir')?`<button class="btn btn-sm" onclick="imprimirFactura('${v.id}')" title="${esLog?'Reimprimir remisión':(v.estado==='pagada'?'Reimprimir factura':'Imprimir cuenta (cobro pendiente)')}">🖨️</button>`:''}
      ${v.pagoDescuadrado&&tienePermiso('cobrar')?`<button class="btn btn-sm btn-naranja" onclick="ajustarPagoVenta('${v.id}')" title="El total cambió: ajustar el cobro">⚠ Ajustar cobro</button>`:''}
      ${bancoPendiente(v)?`<button class="btn btn-sm btn-verde" onclick="marcarVerificada('${v.id}')" title="Confirmar que la transferencia llegó">✔ Verificar</button>`:''}
      ${colDinero&&v.estado==='pagada'&&tienePermiso('cambiarpago')?`<button class="btn btn-sm" onclick="cambiarFormaPago('${v.id}')" title="Cambiar forma de pago">💳</button>`:''}
      ${tienePermiso('anular')?`<button class="btn btn-sm btn-rojo" onclick="anularPedido('${v.id}')" title="Anular">🚫</button>`:''}
      ${tienePermiso('eliminar')?`<button class="btn btn-sm btn-rojo" onclick="eliminarDefinitivo('${v.id}')" title="Eliminar por completo">🗑️</button>`:''}
    </td>`;
    return `<tr class="${abierta?'fila-pend':''}">${tds}</tr>`;};

  return `
    <div class="tarjeta">
      <div class="t-cab">
        <span class="t-tit">${ic('report')} ${pPedidos(true)} <span class="gris chico" style="font-weight:normal;">${cajaAbierta?('jornada del '+fechaLocal(cajaAbierta.apertura)):'(hoy)'}</span></span>
        <div class="t-acc">
          <input type="text" class="busca" placeholder="🔍 ${esLog?'Remisión':'Factura'}, cliente${usaDomi?', teléfono':''}..." value="${escapeHtml(_pBusca)}" oninput="_pBusca=this.value;render()">
          <button class="btn btn-sm" onclick="refrescarDeLaNube()">🔄 Actualizar</button>
          ${usaCuentas()?`<button class="btn btn-sm" onclick="irA('cuentas')">🧾 Cuentas abiertas</button>`:''}
          <button class="btn btn-gold" onclick="irA('ventas')">+ ${pPedido(true)}</button>
        </div>
      </div>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${vs.length? vs.slice(0,100).map(fila).join('')
          : `<tr><td colspan="${nCols}" class="gris">Sin ${pPedidos()} en esta jornada.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}
// Cambiar estado del pedido (activo/entregado) desde la tabla
function setEstadoPedido(id, estado){
  if(!puedeVerPantalla('pedidos')){ toast('No tienes acceso a Pedidos','error'); return; }
  const arr=misDatos('ventas');
  const v=arr.find(x=>x.id===id); if(!v) return;
  v.estadoPedido=estado;
  if(estado==='entregado' && v.estadoCocina && v.estadoCocina!=='entregado') v.estadoCocina='entregado';
  guardarMisDatos('ventas',arr);
  toast(estado==='entregado'?'Pedido entregado':'Pedido activo','info');
  render();
}
// Asignar domiciliario a un pedido desde la tabla
// F15: la venta guarda el id del domiciliario (el nombre queda para mostrar)
function idDomiciliario(nombre){
  if(!nombre) return null;
  const d=misDatos('domiciliarios').find(x=>x.nombre===nombre);
  return d ? d.id : null;
}
function asignarDomiciliario(id, nombre){
  if(!puedeVerPantalla('pedidos')){ toast('No tienes acceso a Pedidos','error'); return; }
  const arr=misDatos('ventas');
  const v=arr.find(x=>x.id===id); if(!v) return;
  v.domiciliario=nombre;
  v.domiciliarioId=idDomiciliario(nombre);
  guardarMisDatos('ventas',arr);
  logAudit('Asignó domiciliario', (v.factura||'')+' → '+nombre);
  toast(nombre?'Domiciliario asignado':'Domiciliario quitado','success');
  render();
}

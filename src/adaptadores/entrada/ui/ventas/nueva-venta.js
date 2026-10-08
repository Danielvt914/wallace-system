// ============================================================
//  INTERFAZ · Nueva venta
//  Carrito, cliente, descuento, consecutivo de factura, confirmar y cobrar directo.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/02-pos-catalog/02-pos-catalog.md
// ============================================================


// ============================================================
//  NUEVA VENTA
// ============================================================
let _carrito=[];
let _vTipo='llevar';
let _vCli={nombre:'',tel:'',dir:'',barrio:'',ciudad:'',depto:'',transportadora:'',domiciliario:'',valorDom:0};
let _vMesa='';
let _vObs='';
let _vCat='Todas';
let _vBusca='';
let _desc=0;
let _descMot='';
let _guardando=false;   // bloquea doble clic

function nuevaVenta(){
  const neg=STATE.negocio;
  ESCRIBIENDO=true;   // proteger: no refrescar mientras arma el pedido
  // Venta rápida: si usa cliente predeterminado y aún no hay datos, precargarlos
  if(neg.usaClienteFijo && !_vCli.nombre && !_vCli.tel && !STATE.editandoVentaId){
    _vCli.nombre=neg.clienteFijoNombre||'Consumidor Final';
    _vCli.tel=neg.clienteFijoTel||'0000000';
  }
  const cajaAbierta=cajaActual();
  if((neg.funciones||[]).indexOf('caja')>-1 && !cajaAbierta){
    return `<div class="tarjeta centro-msg">
      <div class="msg-ico">🔒</div>
      <div class="t-tit centrado">Caja cerrada</div>
      <p class="gris">Nadie puede vender hasta que se abra la caja. ${usaSucursales(neg)?'Cada sede tiene <strong>su propia caja</strong>: cuando alguien abra la de esta sede, todos los de aquí podrán vender.':'Es <strong>una sola caja para todo el negocio</strong>: cuando alguien la abra, todos podrán vender.'}</p>
      <button class="btn btn-gold" onclick="irA('caja')">Ir a abrir caja</button>
      <button class="btn btn-ghost btn-sm" onclick="refrescarDeLaNube()">🔄 Ya la abrieron, actualizar</button>
    </div>`;
  }
  let productos=misDatos('productos').filter(p=>!p.agotado);
  // Un combo sin unidades suficientes queda de último y marcado
  productos=productos.slice().sort((a,b)=>{
    const da=esCombo(a)?(disponiblesCombo(a)||0):1, db=esCombo(b)?(disponiblesCombo(b)||0):1;
    return (da===0?1:0)-(db===0?1:0);
  });
  if(_vCat!=='Todas') productos=productos.filter(p=>(p.categoria||'General')===_vCat);
  if(_vBusca){ const q=_vBusca.toLowerCase(); productos=productos.filter(p=>(p.nombre||'').toLowerCase().includes(q)); }
  const cats=['Todas'].concat(Array.from(new Set(misDatos('productos').filter(p=>!p.agotado).map(p=>p.categoria||'General'))));
  const bruto=_carrito.reduce((a,i)=>a+i.precio*i.qty,0);
  const total=Math.max(0,bruto-_desc);
  const tiposCfg=(neg.tiposEntrega&&neg.tiposEntrega.length)?neg.tiposEntrega:['llevar'];
  if(tiposCfg.indexOf(_vTipo)<0) _vTipo=tiposCfg[0];
  const etiquetas={mesa:'Mesa',llevar:'Para llevar',domicilio:'Domicilio',envio:'Envío nacional'};
  const valorDom=(_vTipo==='domicilio'||_vTipo==='envio')?(parseFloat(_vCli.valorDom)||0):0;
  const dosPasos = neg.flujoPedido==='dos_pasos';

  return `
    ${usaSucursales(neg)?`<div class="caja-aviso">📍 ${escapeHtml((sucursalesDe(neg).find(s=>s.id===sucursalActual())||{}).nombre||'')}</div>`:''}
    <div class="venta-grid">
      <div class="venta-izq">
        ${neg.usaCodBarras?`<input type="text" id="escaner-venta" class="busca-grande" style="border-color:var(--verde);box-shadow:0 0 14px rgba(var(--acc-rgb),.25);" placeholder="📷 Escanea el código de barras aquí..." onkeydown="if(event.key==='Enter'){escanearProducto(this.value);this.value='';event.preventDefault();}" autocomplete="off">`:''}
        <input type="text" class="busca-grande" placeholder="🔍 Buscar ${escapeHtml((neg.palabraProducto||'producto').toLowerCase())}..." value="${escapeHtml(_vBusca)}" oninput="_vBusca=this.value;render()">
        ${cats.length>1?`<div class="cats">${cats.map(c=>`<button class="cat ${_vCat===c?'on':''}" onclick="_vCat='${escapeHtml(c)}';render()">${escapeHtml(c)}</button>`).join('')}</div>`:''}
        ${productos.length?`<div class="prods">
          ${productos.map(p=>`<div class="prod" onclick="agregarAlCarrito('${p.id}')">
            <div class="prod-ico">${p.imagen?`<img src="${p.imagen}" alt="">`:ic('box')}</div>
            <div class="prod-nom">${escapeHtml(p.nombre)}</div>
            <div class="prod-pre">${fmtMoney(p.precio)}</div>
            ${esCombo(p)?(()=>{ const d=disponiblesCombo(p); return d===null?'':`<div class="prod-stock ${d<=0?'sin':d<=3?'poco':''}">${d<=0?'No alcanza':'Alcanzan para '+d}</div>`; })()
              :(p.stock!=null?`<div class="prod-stock ${p.stock<=0?'sin':p.stock<=(p.stockMin||0)?'poco':''}">${p.stock<=0?'Sin stock':'Stock: '+p.stock}</div>`:'')}
          </div>`).join('')}
        </div>`:`<p class="gris">${_vBusca||_vCat!=='Todas'?'No se encontraron.':'Sin '+escapeHtml((neg.palabraProductos||'productos').toLowerCase())+'. Agrégalos en Inventario.'}</p>`}
      </div>
      <div class="tarjeta carrito">
        <div class="carrito-cab">
          ${STATE.agregandoCuentaId?(()=>{ const cu=misDatos('ventas').find(x=>x.id===STATE.agregandoCuentaId)||{};
            return `<div class="tarjeta-pend" style="padding:10px 12px;border-radius:10px;margin-bottom:10px;">
              <div class="flex-between" style="gap:8px;flex-wrap:wrap;">
                <span class="oro negrita">🧾 Agregando a ${escapeHtml(nombreCuenta(cu))}</span>
                <button class="btn btn-sm btn-ghost" onclick="salirDeCuenta()">Salir</button>
              </div>
              <div class="gris chico" style="margin-top:4px;">La cuenta ya tiene ${(cu.items||[]).reduce((a,i)=>a+i.qty,0)} und por ${fmtMoney(cu.total||0)}. Lo que agregues aquí se le suma.</div>
            </div>`; })():''}
          ${STATE.editandoVentaId?(()=>{ const ed=misDatos('ventas').find(x=>x.id===STATE.editandoVentaId)||{};
            return `<div class="tarjeta-pend" style="padding:10px 12px;border-radius:10px;margin-bottom:10px;">
              <div class="flex-between" style="gap:8px;flex-wrap:wrap;">
                <span class="oro negrita">✏️ Editando ${escapeHtml(ed.factura||'pedido')}${ed.estado==='pagada'?' (ya cobrado)':''}</span>
                <button class="btn btn-sm btn-ghost" onclick="cancelarEdicionPedido()">Cancelar</button>
              </div>
              <div class="gris chico" style="margin-top:4px;">Antes: ${fmtMoney(ed.total||0)} · ${(ed.items||[]).reduce((a,i)=>a+i.qty,0)} und${ed.estado==='pagada'?' · si cambia el total te pedirá ajustar el cobro':''}</div>
            </div>`; })():''}
          <div class="t-cab" style="margin-bottom:12px;">
            <span class="t-tit">${ic('cart')} ${pPedido(true)}</span>
            ${_carrito.length?`<button class="btn btn-sm btn-ghost" onclick="vaciarCarrito()" title="Vaciar">🗑</button>`:''}
          </div>
          ${tiposCfg.length>1?`<div class="tipos">
            ${tiposCfg.map(t=>`<button class="tipo ${_vTipo===t?'on':''}" onclick="_vTipo='${t}';render()">${etiquetas[t]||t}</button>`).join('')}
          </div>`:''}
          <div class="carrito-datos">${camposCliente()}</div>
        </div>
        <div class="items">
          ${_carrito.length? _carrito.map((i,idx)=>`<div class="item">
            <div class="item-info"><div class="item-nom">${escapeHtml(i.nombre)}</div><div class="item-uni">${fmtMoney(i.precio)} c/u</div></div>
            <div class="item-qty">
              <button onclick="cambiarQty(${idx},-1)">−</button>
              <span>${i.qty}</span>
              <button onclick="cambiarQty(${idx},1)">+</button>
            </div>
            <div class="item-tot-wrap">
              <div class="item-tot">${neg.esLogistica?(i.qty+' und'):fmtMoney(i.precio*i.qty)}</div>
              <button class="item-quitar" onclick="quitarItemCarrito(${idx})">quitar</button>
            </div>
          </div>`).join('') : '<div class="carrito-vacio">🛒<p>Toca un producto para agregarlo</p></div>'}
        </div>
        ${_carrito.length?`<div class="carrito-pie">
          ${neg.esLogistica?`
            <div class="total"><span>A DESPACHAR</span><span>${_carrito.reduce((a,i)=>a+i.qty,0)} und</span></div>
          `:`
          ${_desc>0?`<div class="linea"><span>Subtotal</span><span>${fmtMoney(bruto)}</span></div>
            <div class="linea desc"><span>Descuento${_descMot?' · '+escapeHtml(_descMot):''}</span>
              <span>−${fmtMoney(_desc)} <button class="mini-x" onclick="quitarDescuento()">×</button></span></div>`
           :(tienePermiso('descuento')?`<button class="btn btn-ghost btn-block btn-sm" onclick="abrirDescuento()">% Aplicar descuento</button>`:'')}
          <div id="linea-dom">${valorDom>0?`<div class="linea"><span>${_vTipo==='envio'?'Envío':'Domicilio'}</span><span>${fmtMoney(valorDom)}</span></div>`:''}</div>
          <div class="total"><span>TOTAL</span><span id="venta-total">${fmtMoney(total+valorDom)}</span></div>
          `}
          ${STATE.agregandoCuentaId?`
            <button class="btn btn-verde btn-block btn-grande" id="btn-confirmar" onclick="agregarACuenta()">➕ Agregar a la cuenta</button>
          `:`
            <button class="btn btn-gold btn-block btn-grande" id="btn-confirmar" onclick="${STATE.editandoVentaId?'guardarEdicionPedido()':(neg.esLogistica?'registrarSalida()':(dosPasos?'confirmarPedido()':'cobrarDirecto()'))}">
              ${STATE.editandoVentaId?'💾 Guardar cambios':(neg.esLogistica?'📦 Registrar salida':(dosPasos?'✓ Confirmar pedido':'💵 Cobrar ahora'))}
            </button>
            ${(usaCuentas()&&!dosPasos&&!STATE.editandoVentaId&&!neg.esLogistica)?`
              <button class="btn btn-block btn-sm" style="margin-top:8px;" onclick="abrirCuentaNueva()">🧾 Dejar como cuenta abierta (cobrar después)</button>`:''}
          `}
        </div>`:''}
      </div>
    </div>`;
}

function camposCliente(){
  const c=_vCli;
  const neg=STATE.negocio;
  // Venta rápida: cliente fijo. Solo mostramos una etiqueta compacta y las
  // observaciones; no se piden datos del cliente (salvo domicilio/envío).
  if(neg && neg.usaClienteFijo && _vTipo!=='domicilio' && _vTipo!=='envio'){
    return `<div class="cli-fijo">👤 ${escapeHtml(c.nombre||neg.clienteFijoNombre||'Consumidor Final')} <span class="gris chico">· venta rápida</span></div>
      ${_vTipo==='mesa'?`<input type="text" class="campo" placeholder="Número de mesa" value="${escapeHtml(_vMesa)}" oninput="_vMesa=this.value">`:''}
      <input type="text" class="campo" placeholder="Observaciones..." value="${escapeHtml(_vObs)}" oninput="_vObs=this.value">`;
  }
  if(_vTipo==='mesa'){
    return `<input type="text" class="campo" placeholder="Número de mesa" value="${escapeHtml(_vMesa)}" oninput="_vMesa=this.value">
      <input type="text" class="campo" placeholder="Observaciones..." value="${escapeHtml(_vObs)}" oninput="_vObs=this.value">`;
  }
  if(_vTipo==='domicilio'){
    const doms=misDatos('domiciliarios');
    return `<div class="cli-busca-wrap">
      <input type="text" class="campo" placeholder="Nombre del cliente" value="${escapeHtml(c.nombre)}" oninput="_vCli.nombre=this.value;sugerirClientes(this.value)" onfocus="sugerirClientes(this.value)" onblur="setTimeout(ocultarSugerenciasCliente,180)">
      <input type="tel" class="campo" placeholder="Teléfono" value="${escapeHtml(c.tel)}" oninput="_vCli.tel=this.value;sugerirClientes(this.value)" onfocus="sugerirClientes(this.value)" onblur="setTimeout(ocultarSugerenciasCliente,180)">
      <div id="cli-sugerencias" class="cli-sugerencias"></div>
      <input type="text" class="campo" placeholder="Dirección" value="${escapeHtml(c.dir)}" oninput="_vCli.dir=this.value">
      <input type="text" class="campo" placeholder="Barrio" value="${escapeHtml(c.barrio)}" oninput="_vCli.barrio=this.value">
      <input type="number" class="campo" placeholder="Valor del domicilio" value="${c.valorDom||''}" oninput="_vCli.valorDom=this.value;actualizarTotalVenta()">
      ${doms.length?`<select class="campo" onchange="_vCli.domiciliario=this.value">
        <option value="">Domiciliario...</option>
        ${doms.map(d=>`<option ${c.domiciliario===d.nombre?'selected':''}>${escapeHtml(d.nombre)}</option>`).join('')}
      </select>`:''}
      <input type="text" class="campo" placeholder="Observaciones..." value="${escapeHtml(_vObs)}" oninput="_vObs=this.value">`;
  }
  if(_vTipo==='envio'){
    return `<div class="cli-busca-wrap">
      <input type="text" class="campo" placeholder="Nombre del cliente" value="${escapeHtml(c.nombre)}" oninput="_vCli.nombre=this.value;sugerirClientes(this.value)" onfocus="sugerirClientes(this.value)" onblur="setTimeout(ocultarSugerenciasCliente,180)">
      <input type="tel" class="campo" placeholder="Teléfono / WhatsApp" value="${escapeHtml(c.tel)}" oninput="_vCli.tel=this.value;sugerirClientes(this.value)" onfocus="sugerirClientes(this.value)" onblur="setTimeout(ocultarSugerenciasCliente,180)">
      <div id="cli-sugerencias" class="cli-sugerencias"></div>
      <input type="text" class="campo" placeholder="Dirección" value="${escapeHtml(c.dir)}" oninput="_vCli.dir=this.value">
      <input type="text" class="campo" placeholder="Ciudad" value="${escapeHtml(c.ciudad)}" oninput="_vCli.ciudad=this.value">
      <input type="text" class="campo" placeholder="Departamento" value="${escapeHtml(c.depto)}" oninput="_vCli.depto=this.value">
      <input type="text" class="campo" placeholder="Transportadora" value="${escapeHtml(c.transportadora)}" oninput="_vCli.transportadora=this.value">
      <input type="number" class="campo" placeholder="Valor del envío" value="${c.valorDom||''}" oninput="_vCli.valorDom=this.value;actualizarTotalVenta()">
      <input type="text" class="campo" placeholder="Observaciones..." value="${escapeHtml(_vObs)}" oninput="_vObs=this.value">`;
  }
  return `<div class="cli-busca-wrap">
    <input type="text" class="campo" placeholder="Nombre del cliente (opcional)" value="${escapeHtml(c.nombre)}" oninput="_vCli.nombre=this.value;sugerirClientes(this.value)" onfocus="sugerirClientes(this.value)" onblur="setTimeout(ocultarSugerenciasCliente,180)">
    <input type="tel" class="campo" placeholder="Teléfono (obligatorio)" value="${escapeHtml(c.tel)}" oninput="_vCli.tel=this.value;sugerirClientes(this.value)" onfocus="sugerirClientes(this.value)" onblur="setTimeout(ocultarSugerenciasCliente,180)">
    <div id="cli-sugerencias" class="cli-sugerencias"></div>
    <input type="text" class="campo" placeholder="Observaciones..." value="${escapeHtml(_vObs)}" oninput="_vObs=this.value">`;
}

// ---------- Autocompletar / recomendar clientes ya registrados al tomar el pedido ----------
function sugerirClientes(texto){
  const cont=document.getElementById('cli-sugerencias');
  if(!cont) return;
  const q=(texto||'').trim().toLowerCase();
  if(q.length<2){ cont.innerHTML=''; cont.classList.remove('abierta'); return; }
  const clientes=misDatos('clientes');
  const match=clientes.filter(c=>(c.nombre||'').toLowerCase().includes(q) || (c.tel||'').includes(q))
    .sort((a,b)=>(b.pedidos||0)-(a.pedidos||0))   // primero los más frecuentes
    .slice(0,6);
  if(!match.length){ cont.innerHTML=''; cont.classList.remove('abierta'); return; }
  cont.innerHTML=match.map(c=>`<div class="cli-sug-item" onmousedown="elegirClienteSugerido('${c.id}')">
      <span class="cli-sug-nom">${escapeHtml(c.nombre||'(sin nombre)')}</span>
      <span class="cli-sug-tel">${escapeHtml(c.tel||'')}</span>
      ${c.dir?`<span class="cli-sug-dir">${escapeHtml(c.dir)}${c.barrio?' · '+escapeHtml(c.barrio):''}</span>`:''}
      ${c.pedidos?`<span class="cli-sug-ped">${c.pedidos} pedido${c.pedidos===1?'':'s'}</span>`:''}
    </div>`).join('');
  cont.classList.add('abierta');
}
function ocultarSugerenciasCliente(){
  const cont=document.getElementById('cli-sugerencias');
  if(cont){ cont.innerHTML=''; cont.classList.remove('abierta'); }
}
function elegirClienteSugerido(id){
  const c=misDatos('clientes').find(x=>x.id===id); if(!c) return;
  _vCli.nombre=c.nombre||''; _vCli.tel=c.tel||''; _vCli.dir=c.dir||'';
  _vCli.barrio=c.barrio||''; _vCli.ciudad=c.ciudad||''; _vCli.depto=c.depto||'';
  ocultarSugerenciasCliente();
  toast('Cliente: '+c.nombre+(c.pedidos?' ('+c.pedidos+' pedidos)':''),'success');
  render();
}

// Actualiza SOLO el total y la línea de domicilio en la pantalla de venta,
// sin redibujar todo (así no se pierde el foco del campo = no se sale el teclado).
function actualizarTotalVenta(){
  const bruto=_carrito.reduce((a,i)=>a+i.precio*i.qty,0);
  const total=Math.max(0,bruto-_desc);
  const valorDom=(_vTipo==='domicilio'||_vTipo==='envio')?(parseFloat(_vCli.valorDom)||0):0;
  const elTot=document.getElementById('venta-total');
  if(elTot) elTot.textContent=fmtMoney(total+valorDom);
  const elDom=document.getElementById('linea-dom');
  if(elDom) elDom.innerHTML = valorDom>0?`<div class="linea"><span>${_vTipo==='envio'?'Envío':'Domicilio'}</span><span>${fmtMoney(valorDom)}</span></div>`:'';
}

// Escanear con pistola: busca el producto por su código de barras y lo agrega al carrito
function escanearProducto(codigo){
  codigo=(codigo||'').trim();
  if(!codigo) return;
  const productos=misDatos('productos');
  const p=productos.find(x=>x.codBarras && String(x.codBarras).trim()===codigo);
  if(!p){
    toast('Código no registrado: '+codigo+'. Asígnalo a un producto en Inventario.','error');
    sonidoError();
    // Mantener el foco en el escáner para seguir pistoleando
    setTimeout(()=>{ const e=document.getElementById('escaner-venta'); if(e) e.focus(); },50);
    return;
  }
  agregarAlCarrito(p.id);
  // Devolver el foco al escáner para el siguiente producto
  setTimeout(()=>{ const e=document.getElementById('escaner-venta'); if(e) e.focus(); },50);
}

function agregarAlCarrito(id){
  const neg=STATE.negocio;
  const p=misDatos('productos').find(x=>x.id===id); if(!p) return;
  // Combos y productos sueltos: se revisa el stock REAL contando todo el carrito
  if(usaInventario()){
    const faltan=faltantesParaAgregar(id);
    if(faltan.length){
      toast('⛔ No alcanza para '+p.nombre+': '+faltan.join(', '),'error');
      sonidoError(); return;
    }
  } else if(p.stock!=null && p.stock<=0){ toast('Sin existencias: '+p.nombre,'error'); sonidoError(); return; }
  // Plato de restaurante: revisar los insumos de su receta
  if(neg.usaRecetas && p.receta && p.receta.length){
    const insumos=misDatos('insumos');
    const yaEnCarrito=(_carrito.find(i=>i.prodId===id)||{}).qty||0;
    const faltantes=[];
    p.receta.forEach(r=>{
      const ins=insumos.find(x=>x.id===r.insumoId);
      if(ins){
        const necesita=r.cantidad*(yaEnCarrito+1);
        if((ins.stock||0)<necesita) faltantes.push(ins.nombre+(ins.stock<=0?' (agotado)':' (solo quedan '+ins.stock+' '+(ins.unidad||'')+')'));
      }
    });
    if(faltantes.length){
      toast('⛔ No se puede pedir '+p.nombre+': falta '+faltantes.join(', '),'error');
      sonidoError(); return;
    }
  }
  const ex=_carrito.find(i=>i.prodId===id);
  if(ex) ex.qty++; else _carrito.push({prodId:id, nombre:p.nombre, precio:p.precio, qty:1});
  render();
}
function cambiarQty(idx,delta){
  if(!_carrito[idx]) return;
  _carrito[idx].qty+=delta;
  if(_carrito[idx].qty<=0) _carrito.splice(idx,1);
  render();
}
function quitarItemCarrito(idx){
  if(!_carrito[idx]) return;
  _carrito.splice(idx,1);
  render();
}
function vaciarCarrito(){ _carrito=[]; _desc=0; _descMot=''; render(); }
function limpiarPedido(){
  _carrito=[]; _vObs=''; _desc=0; _descMot=''; _vMesa='';
  STATE.editandoVentaId=null; STATE.agregandoCuentaId=null;
  const neg=STATE.negocio;
  // Venta rápida: precargar el cliente predeterminado (tiendas de alto flujo)
  if(neg && neg.usaClienteFijo){
    _vCli={nombre:neg.clienteFijoNombre||'Consumidor Final', tel:neg.clienteFijoTel||'0000000',
      dir:'',barrio:'',ciudad:'',depto:'',transportadora:'',domiciliario:'',valorDom:0};
  } else {
    _vCli={nombre:'',tel:'',dir:'',barrio:'',ciudad:'',depto:'',transportadora:'',domiciliario:'',valorDom:0};
  }
}
function abrirDescuento(){
  if(!exigirPermiso('descuento','No tienes permiso para aplicar descuentos')) return;
  const bruto=_carrito.reduce((a,i)=>a+i.precio*i.qty,0);
  abrirModal({titulo:'Aplicar descuento', textoBoton:'Aplicar', campos:[
    {id:'tipo', label:'Tipo', tipo:'select', opciones:[{valor:'valor',label:'Valor fijo ($)'},{valor:'pct',label:'Porcentaje (%)'}]},
    {id:'cantidad', label:'Cantidad', tipo:'number', requerido:true, placeholder:'Ej: 5000 o 10'},
    {id:'motivo', label:'Motivo (opcional)'}
  ], extraHTML:`<p class="nota">Subtotal actual: <strong>${fmtMoney(bruto)}</strong></p>`,
  onGuardar:(d)=>{
    const c=parseFloat(d.cantidad)||0;
    if(c<=0){ toast('Cantidad inválida','error'); return; }
    const desc = d.tipo==='pct' ? Math.round(bruto*c/100) : c;
    if(desc>bruto){ toast('El descuento no puede superar el total','error'); return; }
    _desc=desc; _descMot=d.motivo||(d.tipo==='pct'?c+'%':'');
    cerrarModal(); toast('Descuento aplicado','success'); render();
  }});
}
function quitarDescuento(){ _desc=0; _descMot=''; render(); }
function cancelarEdicionPedido(){
  confirmarModal('¿Salir sin guardar los cambios del pedido?',()=>{
    limpiarPedido(); ESCRIBIENDO=false; STATE.pageNeg='pedidos'; render();
    toast('Edición cancelada','info');
  },'Sí, salir');
}

// ---------- Consecutivo de factura (sin repetidos entre equipos) ----------
// Antes cada equipo tomaba "la mayor factura que yo veo + 1": dos equipos
// vendiendo a la vez (o uno sin internet) sacaban el mismo número.
// Ahora cada equipo RESERVA su próximo número con una transacción sobre
// data_<negocio>_factura_seq, que Firebase serializa. Así el número queda
// listo de antemano y armarVenta sigue siendo instantánea.
// Si un equipo cierra sin usar su número reservado, ese número queda sin usar
// (puede haber saltos, nunca repetidos mientras haya conexión).

let _facturaReservada=null, _reservandoFactura=false;
function maxFacturaLocal(){ return Dominio.facturas.mayorNumero(misDatos('ventas')); }
function reservarFactura(){
  if(!FB_READY || !STATE.negocio || _reservandoFactura || _facturaReservada!==null) return;
  const negId=STATE.negocio.id;
  _reservandoFactura=true;
  Datos.reservarConsecutivo(negId, maxFacturaLocal())
    .then(n=>{ if(n && STATE.negocio && STATE.negocio.id===negId) _facturaReservada=n; })
    .catch(e=>console.warn('Reserva de factura:',e&&e.message))
    .then(()=>{ _reservandoFactura=false; });
}
function siguienteFactura(){
  const seq=parseInt(DB.get(claveDe(STATE.negocio.id,'factura_seq')))||0;
  const n=Dominio.facturas.elegirNumero(_facturaReservada, maxFacturaLocal(), seq);
  _facturaReservada=null;
  setTimeout(reservarFactura,0);   // dejar listo el siguiente
  return Dominio.facturas.formatearFactura(n);
}

// ---------- Crear la venta (base común) ----------
function armarVenta(estado){
  const neg=STATE.negocio;
  const cajaAbierta=cajaActual();
  const bruto=_carrito.reduce((a,i)=>a+i.precio*i.qty,0);
  const total=Math.max(0,bruto-_desc);
  const valorDom=(_vTipo==='domicilio'||_vTipo==='envio')?(parseFloat(_vCli.valorDom)||0):0;
  const ventas=misDatos('ventas');
  // Si estamos EDITANDO un pedido, reusamos su id, factura, fecha y caja
  const orig = STATE.editandoVentaId ? ventas.find(x=>x.id===STATE.editandoVentaId) : null;
  let factura, id, fecha, cajaId;
  if(orig){
    id=orig.id; factura=orig.factura; fecha=orig.fecha; cajaId=orig.cajaId;
  } else {
    id=uid(); factura=siguienteFactura(); fecha=now(); cajaId=cajaAbierta?cajaAbierta.id:null;
  }
  const propina=orig?(orig.propina||0):0;
  const recargo=orig?(orig.recargo||0):0;
  // Al editar se CONSERVA todo lo que ya tenía la venta (pagos, cobro, horas…)
  // y solo se reemplaza lo que el usuario cambió. Antes se perdía el registro
  // del pago y la venta quedaba descuadrada.
  return Object.assign({}, orig||{}, {
    id:id, factura:factura,
    jornada: (orig&&orig.jornada) ? orig.jornada : jornadaActual(),
    items:_carrito.slice(),
    subtotal:total, subtotalBruto:bruto, descuento:_desc, descMotivo:_descMot,
    valorDom, propina, recargo,
    total: total+valorDom+propina+recargo,
    metodo:orig?orig.metodo:'', estado: orig?orig.estado:estado,
    tipo:_vTipo, cajaId:cajaId, sucursalId:orig?(orig.sucursalId||'principal'):sucursalActual(),
    vendedor:orig?orig.vendedor:STATE.user.nombre, vendedorId:orig?(orig.vendedorId||null):(STATE.user.id||null), fecha:fecha,
    editadoPor: orig?STATE.user.nombre:undefined,
    editadoEn: orig?now():undefined,
    obs:_vObs, mesa:_vTipo==='mesa'?_vMesa:'',
    cliNombre:_vCli.nombre||'', cliTel:_vCli.tel||'', cliDir:_vCli.dir||'', cliBarrio:_vCli.barrio||'',
    cliCiudad:_vCli.ciudad||'', cliDepto:_vCli.depto||'',
    transportadora:_vCli.transportadora||'', domiciliario:_vCli.domiciliario||'', domiciliarioId:idDomiciliario(_vCli.domiciliario),
    estadoCocina: orig?(orig.estadoCocina||''):(neg.usaCocina?'pendiente':'')
  });
}

// Valida datos mínimos del cliente según el tipo de pedido.
// Teléfono obligatorio en Llevar y Domicilio (para poder guardar el cliente).
function validarClientePedido(){
  const neg=STATE.negocio;
  // Con cliente predeterminado (venta rápida) no se piden datos del cliente
  if(neg && neg.usaClienteFijo && _vTipo!=='domicilio' && _vTipo!=='envio') return true;
  const tel=(_vCli.tel||'').trim();
  if((_vTipo==='llevar'||_vTipo==='domicilio'||_vTipo==='envio')){
    if(!tel){ toast('El teléfono es obligatorio para '+(_vTipo==='llevar'?'pedidos para llevar':'domicilios')+' (así se guarda el cliente)','error'); return false; }
    if(tel.replace(/\D/g,'').length<7){ toast('Escribe un teléfono válido','error'); return false; }
  }
  if(_vTipo==='domicilio' && !(_vCli.dir||'').trim()){ toast('La dirección es obligatoria para domicilios','error'); return false; }
  return true;
}

// ---------- LOGÍSTICA: registrar salida/entrega de mercancía (sin dinero) ----------
function registrarSalida(){
  if(_guardando) return;
  if(!_carrito.length){ toast('Agrega productos primero','error'); return; }
  if(!validarClientePedido()) return;
  _guardando=true;
  bloquearBoton('btn-confirmar','Guardando…');
  try{
    const venta=armarVenta('pagada');   // en logística la "salida" queda cerrada de una
    venta.esSalida=true; venta.metodo='—';
    venta.cobrado=now(); venta.cobradoPor=STATE.user.nombre;
    const ventas=misDatos('ventas');
    ventas.unshift(venta);
    descontarStock(venta);
    guardarMisDatos('ventas',ventas);
    guardarClienteAuto(venta);
    logAudit('Registró salida', (venta.factura||'')+' · '+(venta.cliNombre||''));
    sonidoPedido();
    avisarStockBajo(venta);
    limpiarPedido(); ESCRIBIENDO=false;
    STATE.pageNeg='pedidos'; render();
    toast('Salida '+venta.factura+' registrada','success');
    // Logística: la remisión siempre se ofrece (no depende de la ventana Facturas)
    preguntarDespues('¿Imprimir remisión de entrega?',()=>imprimirFactura(venta.id),'Imprimir');
  }catch(e){ console.error(e); toast('Error al registrar salida','error'); }
  finally{ _guardando=false; }
}

// ---------- FLUJO A: confirmar ahora, cobrar después ----------
// Guardar los cambios de un pedido que se está editando.
// Vale para los dos flujos (cobro directo y confirmar→cobrar).
function guardarEdicionPedido(){
  if(_guardando) return;
  if(!STATE.editandoVentaId){ toast('No hay ningún pedido en edición','error'); return; }
  if(!_carrito.length){ toast('El pedido no puede quedar vacío. Si quieres borrarlo, anúlalo.','error'); return; }
  if(!validarClientePedido()) return;
  const ventasPrev=misDatos('ventas');
  const orig=ventasPrev.find(x=>x.id===STATE.editandoVentaId);
  if(!orig){ toast('Ese pedido ya no existe','error'); limpiarPedido(); ESCRIBIENDO=false; render(); return; }
  const yaDescontado = orig.stockAplicado===true || (orig.stockAplicado===undefined && orig.estado==='pagada');
  if(yaDescontado){
    const d=difRequerimientos(requerimientos(orig.items), requerimientos(_carrito));
    const faltan=faltantesPara(d);
    if(faltan.length){ toast('⛔ No alcanza el inventario: '+faltan.join(', '),'error'); sonidoError(); return; }
  }
  _guardando=true;
  bloquearBoton('btn-confirmar','Guardando…');
  try{
    const itemsAntes=JSON.parse(JSON.stringify(orig.items||[]));
    const totalAntes=orig.total||0;
    const estadoAntes=orig.estado;
    const venta=armarVenta(orig.estado||'abierta');
    venta.stockAplicado = yaDescontado ? true : (orig.stockAplicado===true);
    const ventas=misDatos('ventas');
    const i=ventas.findIndex(x=>x.id===venta.id);
    if(i>-1) ventas[i]=venta; else ventas.unshift(venta);     // NUNCA duplicar
    const cambiaronItems = JSON.stringify(itemsAntes)!==JSON.stringify(venta.items);
    // Inventario: solo la diferencia, y solo si ya se había descontado
    if(yaDescontado && cambiaronItems) ajustarStockPorEdicion(itemsAntes, venta.items, venta.factura);
    // Cocina: si cambió lo pedido, hay que volver a prepararlo
    if(STATE.negocio.usaCocina && cambiaronItems && venta.estadoCocina && venta.estadoCocina!=='entregado'){
      venta.estadoCocina='pendiente';
    }
    // Caja: si ya estaba cobrado y cambió el total, el pago queda por ajustar
    if(estadoAntes==='pagada' && Math.abs((venta.total||0)-totalAntes)>0.5) venta.pagoDescuadrado=true;
    guardarMisDatos('ventas',ventas);
    logAudit('Editó pedido', (venta.factura||'')+': '+fmtMoney(totalAntes)+' → '+fmtMoney(venta.total||0)
      +' · '+itemsAntes.reduce((a,x)=>a+x.qty,0)+' → '+venta.items.reduce((a,x)=>a+x.qty,0)+' und');
    const idG=venta.id, ajustar=!!venta.pagoDescuadrado;
    limpiarPedido(); ESCRIBIENDO=false; STATE.pageNeg='pedidos'; render();
    sonidoPedido();
    toast('Pedido '+venta.factura+' actualizado'+(cambiaronItems?' · inventario ajustado':''),'success');
    if(ajustar){ setTimeout(()=>ajustarPagoVenta(idG),450); }
    else if(cambiaronItems && STATE.negocio.usaCocina){
      preguntarDespues('Cambió el pedido. ¿Imprimir la comanda corregida para cocina?',
        ()=>{ const vv=misDatos('ventas').find(x=>x.id===idG); if(vv) imprimirComanda(vv); },'Imprimir',450);
    }
  }catch(e){ console.error(e); toast('Error al guardar los cambios','error'); }
  finally{ _guardando=false; }
}

function confirmarPedido(){
  if(_guardando) return;
  if(!_carrito.length){ toast('Agrega productos primero','error'); return; }
  if(!validarClientePedido()) return;
  const editando=!!STATE.editandoVentaId;
  if(!editando && descuentaAlPedir()){
    const faltan=faltantesPara(requerimientos(_carrito));
    if(faltan.length){ toast('⛔ No alcanza el inventario: '+faltan.join(', '),'error'); sonidoError(); return; }
  }
  const ventasPrev=misDatos('ventas');
  const orig = editando ? ventasPrev.find(x=>x.id===STATE.editandoVentaId) : null;
  const yaDescontado = !!(orig && orig.stockAplicado===true);
  // Si el pedido ya había descontado inventario, revisar que alcance para lo nuevo
  if(yaDescontado){
    const d=difRequerimientos(requerimientos(orig.items), requerimientos(_carrito));
    const faltan=faltantesPara(d);
    if(faltan.length){ toast('⛔ No alcanza el inventario: '+faltan.join(', '),'error'); sonidoError(); return; }
  }
  _guardando=true;
  bloquearBoton('btn-confirmar','Guardando…');
  try{
    const itemsAntes = orig ? JSON.parse(JSON.stringify(orig.items||[])) : null;
    const totalAntes = orig ? (orig.total||0) : 0;
    const estadoAntes = orig ? orig.estado : null;
    const venta=armarVenta('abierta');
    // Si el negocio descuenta al pedir, el inventario sale ya mismo
    if(!editando && descuentaAlPedir()) descontarStock(venta);
    const ventas=misDatos('ventas');
    if(editando){
      const i=ventas.findIndex(x=>x.id===venta.id);
      if(i>-1) ventas[i]=venta; else ventas.unshift(venta);
      // El inventario se ajusta SOLO por la diferencia, si ya se había descontado
      if(yaDescontado) ajustarStockPorEdicion(itemsAntes, venta.items, venta.factura);
      // Si cambió lo que pidieron, la cocina lo tiene que volver a ver
      if(STATE.negocio.usaCocina && JSON.stringify(itemsAntes)!==JSON.stringify(venta.items)
         && venta.estadoCocina && venta.estadoCocina!=='entregado'){
        venta.estadoCocina='pendiente';
      }
      // Si ya estaba cobrado y cambió el total, el pago queda pendiente de ajuste
      if(estadoAntes==='pagada' && Math.abs((venta.total||0)-totalAntes)>0.5){
        venta.pagoDescuadrado=true;
      }
      logAudit('Editó pedido', (venta.factura||'')+': '+fmtMoney(totalAntes)+' → '+fmtMoney(venta.total||0)
        +' · '+(itemsAntes||[]).reduce((a,i)=>a+i.qty,0)+' → '+venta.items.reduce((a,i)=>a+i.qty,0)+' und');
    } else {
      ventas.unshift(venta);
    }
    guardarMisDatos('ventas',ventas);
    sonidoPedido();
    if(!editando && STATE.negocio.usaCocina){ try{ imprimirComanda(venta); }catch(e){} }
    const idGuardada=venta.id, hayQueAjustar=!!venta.pagoDescuadrado, cambiaronItems=editando&&JSON.stringify(itemsAntes)!==JSON.stringify(venta.items);
    limpiarPedido();
    ESCRIBIENDO=false;
    STATE.pageNeg='pedidos';
    STATE._itemsAntes=null;
    render();
    toast('Pedido '+venta.factura+(editando?' actualizado':' confirmado'),'success');
    if(hayQueAjustar){ setTimeout(()=>ajustarPagoVenta(idGuardada),450); }
    else if(editando && cambiaronItems && STATE.negocio.usaCocina){
      preguntarDespues('Cambió el pedido. ¿Imprimir la comanda corregida para cocina?',
        ()=>{ const vv=misDatos('ventas').find(x=>x.id===idGuardada); if(vv) imprimirComanda(vv); },'Imprimir',450);
    }
  }catch(e){
    console.error(e); toast('Error al guardar','error');
  }finally{ _guardando=false; }
}

// ---------- FLUJO B: cobrar de una vez ----------
function cobrarDirecto(){
  if(!exigirPermiso('cobrar','No tienes permiso para cobrar. Pide a un cajero que lo cobre.')) return;
  if(_guardando) return;
  if(!_carrito.length){ toast('Agrega productos primero','error'); return; }
  if(!validarClientePedido()) return;
  const venta=armarVenta('abierta');
  abrirCobro(venta, true);
}

function bloquearBoton(id,texto){
  try{
    const b=document.getElementById(id);
    if(b){ b.disabled=true; b.style.opacity='.55'; b.style.pointerEvents='none'; b.textContent=texto; }
  }catch(e){}
}

// ============================================================
//  INTERFAZ · Catálogo e inventario
//  Productos, recetas, entradas, salidas y lotes.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/06-inventory-recipes/06-inventory-recipes.md
// ============================================================


// ============================================================
//  INVENTARIO / CATÁLOGO
// ============================================================
let _iBusca='';
let _iCat='Todas';

function inventario(){
  ESCRIBIENDO=false;
  const neg=STATE.negocio;
  const esResto=!!neg.usaRecetas;
  const todos=misDatos('productos').filter(p=>!esCombo(p));   // los combos van en Menú y Combos
  const insumos=esResto?misDatos('insumos'):[];
  const pp=esResto?'Plato':(neg.palabraProducto||'Producto');
  const pps=esResto?'Platos':(neg.palabraProductos||'Productos');
  let lista=todos;
  if(_iCat!=='Todas') lista=lista.filter(p=>(p.categoria||'General')===_iCat);
  if(_iBusca){ const q=_iBusca.toLowerCase(); lista=lista.filter(p=>(p.nombre||'').toLowerCase().includes(q)); }
  const cats=['Todas'].concat(Array.from(new Set(todos.map(p=>p.categoria||'General'))));

  // ----- MODO RESTAURANTE: menú de platos (sin stock propio) -----
  if(esResto){
    const conReceta=todos.filter(p=>(p.receta||[]).length).length;
    return `
      <div class="stats">
        <div class="stat gold"><div class="stat-ico gold">${ic('chef')}</div><div class="stat-lbl">${pProds(true)} en el catálogo</div><div class="stat-val">${todos.length}</div><div class="stat-sub">${cats.length-1} categoría(s)</div></div>
        <div class="stat verde"><div class="stat-ico verde">${ic('box')}</div><div class="stat-lbl">Con receta</div><div class="stat-val">${conReceta}</div><div class="stat-sub">descuentan insumos</div></div>
        <div class="stat"><div class="stat-ico">${ic('cart')}</div><div class="stat-lbl">Insumos disponibles</div><div class="stat-val">${insumos.length}</div><div class="stat-sub">para armar recetas</div></div>
      </div>
      <div class="tarjeta">
        <div class="t-cab">
          <span class="t-tit">${ic('chef')} ${neg.usaRecetas?'Menú':'Catálogo'} de ${pProds()}</span>
          <div class="t-acc">
            <input type="text" class="busca" placeholder="🔍 Buscar ${pProd()}..." value="${escapeHtml(_iBusca)}" oninput="_iBusca=this.value;render()">
            ${tienePermiso('editarprod')?`<button class="btn btn-gold" onclick="editarProducto(null)">+ Agregar ${pProd()}</button>`:''}
          </div>
        </div>
        <p class="nota">Estos ${pProds()} son los que aparecen en <strong>Nueva Venta</strong>.${neg.usaRecetas?' Cada '+pProd()+' puede tener una receta que descuenta insumos al venderse.':''}</p>
        ${cats.length>1?`<div class="cats">${cats.map(c=>`<button class="cat ${_iCat===c?'on':''}" onclick="_iCat='${escapeHtml(c)}';render()">${escapeHtml(c)}${c!=='Todas'?' ('+todos.filter(p=>(p.categoria||'General')===c).length+')':''}</button>`).join('')}</div>`:''}
        ${lista.length?`<div class="prods inv">
          ${lista.map(p=>{
            const nRec=(p.receta||[]).length;
            return `<div class="prod">
              <div class="prod-ico">${p.imagen?`<img src="${p.imagen}" alt="">`:ic('chef')}</div>
              <div class="prod-nom">${escapeHtml(p.nombre)}</div>
              <div class="prod-cat">${escapeHtml(p.categoria||'General')}</div>
              <div class="prod-pre">${fmtMoney(p.precio)}</div>
              <div class="prod-stock ${nRec?'':'poco'}">${nRec?nRec+' insumo(s)':'Sin receta'}</div>
              <div class="prod-acc">
                ${tienePermiso('editarprod')?`<button class="btn btn-sm btn-verde" onclick="editarProducto('${p.id}')">Receta</button>`:''}
                ${tienePermiso('editarprod')?`<button class="btn btn-sm btn-rojo" onclick="eliminarProducto('${p.id}')">×</button>`:''}
              </div>
            </div>`;
          }).join('')}
        </div>`:`<p class="gris">${_iBusca||_iCat!=='Todas'?'No se encontraron '+pProds()+'.':'Sin '+pProds()+' aún. Agrega el primero con "+ Agregar '+pProd()+'".'}</p>`}
      </div>`;
  }

  // ----- MODO NORMAL: inventario por producto (con stock) -----
  const conStock=todos.filter(p=>p.stock!=null);
  const agotados=conStock.filter(p=>p.stock<=0);
  const bajos=conStock.filter(p=>p.stock>0 && p.stock<=(p.stockMin||0));
  const vi=Dominio.inventario.valorInventario(conStock), valor=vi.valor;   // F14: a costo
  // Alertas de vencimiento por lotes
  const alVence=lotesAlerta();
  const vencidos=alVence.filter(x=>x.dias<0);
  const porVencer=alVence.filter(x=>x.dias>=0);
  const usaLotesAlgun=todos.some(p=>p.usaLotes);

  return `
    ${conStock.length?`<div class="stats">
      <div class="stat"><div class="stat-lbl">${escapeHtml(pps)}</div><div class="stat-val">${todos.length}</div><div class="stat-sub">${conStock.reduce((a,p)=>a+p.stock,0)} unidades</div></div>
      <div class="stat gold"><div class="stat-lbl">Valor del inventario</div><div class="stat-val">${fmtMoney(valor)}</div><div class="stat-sub">${vi.sinCosto?(vi.conCosto?'a costo · '+vi.sinCosto+' sin costo, a precio de venta':'a precio de venta (carga el costo de cada '+escapeHtml(pProd())+')'):'a costo'}</div></div>
      <div class="stat ${bajos.length?'rojo':''}"><div class="stat-lbl">Quedan pocos</div><div class="stat-val">${bajos.length}</div><div class="stat-sub">por agotarse</div></div>
      ${usaLotesAlgun
        ?`<div class="stat ${vencidos.length?'rojo':porVencer.length?'gold':''}"><div class="stat-lbl">Por vencer / vencidos</div><div class="stat-val">${porVencer.length+vencidos.length}</div><div class="stat-sub">lotes con alerta</div></div>`
        :`<div class="stat ${agotados.length?'rojo':''}"><div class="stat-lbl">Agotados</div><div class="stat-val">${agotados.length}</div><div class="stat-sub">sin unidades</div></div>`}
    </div>`:''}
    ${(()=>{ const m=misDatos('movimientos').slice(0,8); if(!m.length) return '';
      return `<div class="tarjeta">
        <span class="t-tit">${ic('history')} Últimos movimientos de inventario</span>
        <p class="nota">Aquí queda todo lo que entra y sale <strong>sin ser una venta normal</strong>: compras, ajustes de conteo, daños, ediciones de pedidos y <strong>devoluciones por anular o cancelar</strong>. Las ventas del día se ven en ${pPedidos(true)} e Historial.</p>
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Motivo</th><th>Quién</th><th>Fecha</th></tr></thead>
          <tbody>${m.map(x=>`<tr>
            <td><strong>${escapeHtml(x.nombre||'—')}</strong></td>
            <td>${String(x.tipo||'').indexOf('entrada')===0?'<span class="pill pill-verde">Entrada</span>':String(x.tipo)==='ajuste'?'<span class="pill pill-azul">Ajuste</span>':'<span class="pill pill-rojo">Salida</span>'}</td>
            <td class="negrita">${x.cantidad}</td>
            <td class="gris">${escapeHtml(x.motivo||'—')}</td>
            <td class="gris chico">${escapeHtml(x.por||'—')}</td>
            <td class="gris chico">${fmtDate(x.fecha)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`; })()}
    ${(agotados.length||bajos.length)?`<div class="tarjeta alerta">
      <span class="t-tit chico">⚠️ Alertas de inventario</span>
      ${agotados.length?`<p><strong class="rojo">AGOTADOS (${agotados.length}):</strong> ${agotados.map(p=>escapeHtml(p.nombre)).join(', ')}</p>`:''}
      ${bajos.length?`<p><strong class="oro">Quedan pocos (${bajos.length}):</strong> ${bajos.map(p=>escapeHtml(p.nombre)+' ('+p.stock+')').join(', ')}</p>`:''}
    </div>`:''}
    ${(vencidos.length||porVencer.length)?`<div class="tarjeta alerta">
      <span class="t-tit chico">📅 Alertas de vencimiento</span>
      ${vencidos.length?`<p><strong class="rojo">YA VENCIERON (${vencidos.length}):</strong> ${vencidos.map(x=>escapeHtml(x.producto.nombre)+' ('+x.lote.cantidad+' und, venció '+fmtSoloFecha(x.lote.vence)+')').join(', ')}</p>`:''}
      ${porVencer.length?`<p><strong class="oro">POR VENCER (${porVencer.length}):</strong> ${porVencer.map(x=>escapeHtml(x.producto.nombre)+' ('+x.lote.cantidad+' und, '+(x.dias===0?'vence hoy':'en '+x.dias+'d')+')').join(', ')}</p>`:''}
      <p class="nota">Al vender, el sistema saca primero los lotes más próximos a vencer.</p>
    </div>`:''}
    <div class="tarjeta">
      <div class="t-cab">
        <span class="t-tit">${ic('box')} Inventario de ${escapeHtml(pps)}</span>
        <div class="t-acc">
          <input type="text" class="busca" placeholder="🔍 Buscar..." value="${escapeHtml(_iBusca)}" oninput="_iBusca=this.value;render()">
          ${tienePermiso('editarprod')?`<button class="btn btn-gold" onclick="editarProducto(null)">+ Agregar ${escapeHtml(pp.toLowerCase())}</button>`:''}
        </div>
      </div>
      ${cats.length>1?`<div class="cats">${cats.map(c=>`<button class="cat ${_iCat===c?'on':''}" onclick="_iCat='${escapeHtml(c)}';render()">${escapeHtml(c)}${c!=='Todas'?' ('+todos.filter(p=>(p.categoria||'General')===c).length+')':''}</button>`).join('')}</div>`:''}
      ${lista.length?`<div class="prods inv">
        ${lista.map(p=>{
          const sin=p.stock!=null&&p.stock<=0;
          const poco=p.stock!=null&&p.stock>0&&p.stock<=(p.stockMin||0);
          // Lote más próximo a vencer (si maneja lotes)
          let vencePill='';
          if(p.usaLotes && (p.lotes||[]).length){
            const conFecha=ordenarLotes(p.lotes.filter(l=>l.vence && (l.cantidad||0)>0));
            if(conFecha.length){
              const d=diasHasta(conFecha[0].vence);
              const clase = d<0?'pill-rojo':d<=diasAvisoVence()?'pill-gold':'pill-verde';
              const txt = d<0?('venció '+fmtSoloFecha(conFecha[0].vence)):d===0?'vence hoy':('vence en '+d+'d');
              vencePill=`<div style="margin-top:4px;"><span class="pill ${clase} chico">📅 ${txt}</span></div>`;
            }
          }
          return `<div class="prod ${p.agotado||sin?'off':''}">
            <div class="prod-ico">${p.imagen?`<img src="${p.imagen}" alt="">`:ic('box')}
              ${p.agotado?'<span class="badge-off">AGOTADO</span>':sin?'<span class="badge-off">SIN STOCK</span>':poco?'<span class="badge-off amarillo">POCOS</span>':''}</div>
            <div class="prod-nom">${escapeHtml(p.nombre)}${p.usaLotes?' <span class="gris chico">📦 lotes</span>':''}</div>
            <div class="prod-cat">${escapeHtml(p.categoria||'General')}</div>
            <div class="prod-pre">${fmtMoney(p.precio)}</div>
            ${p.stock!=null?`<div class="prod-stock ${sin?'sin':poco?'poco':''}">Stock: ${p.stock}</div>`:''}
            ${vencePill}
            <div class="prod-acc">
              ${(p.stock!=null&&tienePermiso('editarstock'))?`<button class="btn btn-sm btn-verde" onclick="entradaStock('${p.id}')">+ Stock</button>`:''}
              ${(p.stock!=null&&tienePermiso('editarstock'))?`<button class="btn btn-sm btn-naranja" onclick="salidaStock('${p.id}')" title="Sacar sin vender: daño, vencido, consumo interno">− Salida</button>`:''}
              ${p.usaLotes?`<button class="btn btn-sm" onclick="verLotes('${p.id}')" title="Ver lotes">📦 Lotes</button>`:''}
              ${tienePermiso('editarprod')?`<button class="btn btn-sm" onclick="editarProducto('${p.id}')">Editar</button>`:''}
              ${tienePermiso('editarprod')?`<button class="btn btn-sm btn-rojo" onclick="eliminarProducto('${p.id}')">×</button>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>`:`<p class="gris">${_iBusca||_iCat!=='Todas'?'No se encontraron.':'Sin '+escapeHtml(pps.toLowerCase())+'. Agrega el primero.'}</p>`}
    </div>`;
}

let _recetaTmp=[];   // receta que se está armando en el modal del plato
function editarProducto(id){
  if(!tienePermiso('editarprod')){ toast('No tienes permiso para crear o editar productos','error'); return; }
  const productos=misDatos('productos');
  const p=id?productos.find(x=>x.id===id):null;
  const neg=STATE.negocio;
  const esResto=!!neg.usaRecetas;
  const cats=Array.from(new Set(productos.map(x=>x.categoria||'General')));
  _recetaTmp = p&&p.receta ? JSON.parse(JSON.stringify(p.receta)) : [];

  const campos=[
    {id:'nombre', label:'Nombre', valor:p?p.nombre:'', requerido:true},
    {id:'precio', label:'Precio de venta', tipo:'number', valor:p?String(p.precio):'', requerido:true},
    ...(esResto?[]:[{id:'costo', label:'Costo por unidad (opcional: valora el inventario y el conteo)', tipo:'number', valor:p&&p.costo>0?String(p.costo):''}]),
    {id:'categoria', label:'Categoría', valor:p?(p.categoria||''):'', placeholder:cats.length?cats.join(', '):'Ej: Bebidas'}
  ];
  // Código de barras: si el negocio usa lector, se pide el código (se escanea con la pistola)
  if(neg.usaCodBarras){
    campos.push({id:'codbarras', label:'📷 Código de barras (escanéalo con la pistola)', valor:p?(p.codBarras||''):'', placeholder:'Escanea o escribe el código'});
  }
  // Solo los negocios SIN recetas manejan stock por producto.
  // En restaurante el plato no tiene stock propio: se controla por sus insumos.
  const usaLotes = !!(p && p.usaLotes);
  const esNuevo = !p;
  const llevaStock = usaInventario();   // si el negocio no lleva inventario, no se pide stock
  if(!esResto && llevaStock){
    campos.push({id:'stock', label:usaLotes?'Stock total (se maneja por lotes)':'Stock (deja vacío si no llevas inventario)', tipo:'number', valor:p&&p.stock!=null?String(p.stock):''});
    campos.push({id:'stockmin', label:'Avisar cuando queden menos de', tipo:'number', valor:p&&p.stockMin!=null?String(p.stockMin):'5'});
    // En el PRIMER ingreso (producto nuevo) se pide la fecha de vencimiento directamente.
    // Si la llenan, el producto pasa a manejarse por lotes automáticamente.
    if(esNuevo){
      campos.push({id:'vence', label:'Fecha de vencimiento (opcional — si es perecedero)', tipo:'date', valor:''});
    }
  }

  // Nota informativa (solo negocios con stock).
  // - Producto nuevo: explica que la fecha crea el primer lote.
  // - Producto que YA usa lotes: recuerda cómo se agregan más lotes.
  let extraLotes = '';
  if(!esResto && llevaStock){
    if(esNuevo){
      extraLotes = `<div class="cobro-caja" style="margin-top:14px;">
        <p class="nota" style="margin:0;">📅 Si el producto se vence (comida, medicamentos, etc.), pon la <strong>fecha de vencimiento</strong> arriba. Se guardará como el primer lote y podrás ir agregando más lotes con el botón <strong>"+ Stock"</strong>. El sistema venderá primero lo que esté más próximo a vencer y te avisará antes de que se dañe.</p>
      </div>`;
    } else if(usaLotes){
      extraLotes = `<div class="cobro-caja" style="margin-top:14px;">
        <p class="nota" style="margin:0;">📦 Este producto se maneja <strong>por lotes con vencimiento</strong>. Para ingresar más mercancía con su fecha, usa el botón <strong>"+ Stock"</strong>. Para ver o retirar lotes, usa <strong>"📦 Lotes"</strong>.</p>
      </div>`;
    }
  }

  abrirModal({
    titulo:(p?'Editar':'Nuevo')+' '+(neg.palabraProducto||'producto').toLowerCase(),
    textoBoton:'Guardar', campos:campos,
    extraHTML: esResto ? recetaEditorHTML() : extraLotes,
    onGuardar:(d)=>{
      const arr=misDatos('productos');
      const datos={
        nombre:d.nombre, precio:parseFloat(d.precio)||0,
        ...(d.costo!==undefined?{costo:parseFloat(d.costo)||0}:{}),
        categoria:(d.categoria||'General').trim()||'General'
      };
      if(neg.usaCodBarras && d.codbarras!==undefined){ datos.codBarras=(d.codbarras||'').trim(); }
      if(esResto || !llevaStock){
        datos.stock=null;                                  // sin control de existencias
        if(esResto) datos.receta=_recetaTmp.filter(r=>r.insumoId && r.cantidad>0);
        datos.usaLotes=false; datos.lotes=[];
      } else {
        datos.stock = d.stock===''?null:(parseFloat(d.stock)||0);
        datos.stockMin = parseFloat(d.stockmin)||0;
        if(esNuevo){
          // Primer ingreso: si pusieron fecha de vencimiento, arranca como lotes.
          const vence = (d.vence||'').trim();
          if(vence && datos.stock!=null && datos.stock>0){
            datos.usaLotes = true;
            datos.lotes = [{id:uid(), cantidad:datos.stock, vence:vence, ingresado:now(), motivo:'Stock inicial'}];
          } else {
            datos.usaLotes = false;
            datos.lotes = [];
          }
        } else {
          // Edición de un producto existente: conservar su manejo de lotes tal cual.
          const x0 = arr.find(y=>y.id===id);
          datos.usaLotes = !!(x0 && x0.usaLotes);
          const lotesPrev = (x0 && x0.lotes) ? x0.lotes : [];
          if(datos.usaLotes){
            datos.lotes = lotesPrev;
            // El stock total refleja la suma de los lotes existentes.
            if(lotesPrev.length) datos.stock = lotesPrev.reduce((a,l)=>a+(l.cantidad||0),0);
          } else {
            datos.lotes = [];
          }
        }
      }
      // F11: al editar, el stock NO se fija como valor (pisaría ventas hechas en otros
      // equipos, D2): se aplica la DIFERENCIA con transacción y queda en Movimientos y Auditoría.
      let ajuste=null, nuevo=null;
      if(p){
        const x=arr.find(y=>y.id===id);
        if(x){
          const antes=x.stock, despues=datos.stock;
          if(!datos.usaLotes && antes!=null && despues!=null && despues!==antes){
            ajuste={antes, despues, nombre:datos.nombre};
            delete datos.stock;
          }
          Object.assign(x,datos);
        }
      } else {
        nuevo=Object.assign({id:uid(), agotado:false, creado:now(), imagen:''}, datos);
        arr.unshift(nuevo);
      }
      guardarMisDatos('productos',arr);
      if(ajuste){
        const dif=ajuste.despues-ajuste.antes;
        cambiarStock('productos', id, y=>{ y.stock=(y.stock||0)+dif; });
        registrarMovimientos([{id:uid(), productoId:id, nombre:ajuste.nombre, tipo:'ajuste', cantidad:dif,
          motivo:'Ajuste al editar ('+ajuste.antes+' → '+ajuste.despues+')', por:STATE.user.nombre, fecha:now()}]);
        logAudit('Ajustó stock al editar', ajuste.nombre+': '+ajuste.antes+' → '+ajuste.despues);
      }
      if(nuevo && nuevo.stock>0){
        registrarMovimientos([{id:uid(), productoId:nuevo.id, nombre:nuevo.nombre, tipo:'entrada', cantidad:nuevo.stock,
          motivo:'Stock inicial', por:STATE.user.nombre, fecha:now()}]);
      }
      if(p) logAudit('Editó '+(neg.palabraProducto||'producto').toLowerCase(), datos.nombre);
      else logAudit('Creó '+(neg.palabraProducto||'producto').toLowerCase(), datos.nombre+(nuevo&&nuevo.stock!=null?' · stock '+nuevo.stock:''));
      _recetaTmp=[];
      cerrarModal(); toast('Guardado','success'); render();
    }});
}

// --- Editor de receta (se muestra dentro del modal del plato) ---
function recetaEditorHTML(){
  const insumos=misDatos('insumos');
  if(!insumos.length){
    return `<div class="cobro-caja" style="margin-top:14px;">
      <strong>Receta</strong>
      <p class="nota" style="margin-top:8px;">Aún no tienes insumos. Ve a <strong>Insumos</strong> y agrega arroz, pollo, etc. Luego podrás armar la receta de este ${pProd()}. Sin receta, el ${pProd()} se vende sin descontar inventario.</p>
    </div>`;
  }
  return `<div class="cobro-caja" style="margin-top:14px;">
    <strong>Receta <span class="gris chico">(opcional — qué insumos gasta este plato)</span></strong>
    <div id="receta-lista" style="margin:10px 0;">${recetaFilasHTML()}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <select id="rec-insumo" class="campo" style="flex:2;min-width:130px;margin:0;">
        ${insumos.map(i=>`<option value="${i.id}">${escapeHtml(i.nombre)}${i.unidad?' ('+escapeHtml(i.unidad)+')':''}</option>`).join('')}
      </select>
      <input id="rec-cant" type="number" class="campo" placeholder="Cant." style="flex:1;min-width:70px;margin:0;">
      <button type="button" class="btn btn-verde btn-sm" onclick="agregarInsumoReceta()">+ Añadir</button>
    </div>
  </div>`;
}
function recetaFilasHTML(){
  const insumos=misDatos('insumos');
  if(!_recetaTmp.length) return `<p class="nota">Sin insumos en la receta. Este ${escapeHtml(pProd())} se venderá sin descontar inventario.</p>`;
  return _recetaTmp.map((r,idx)=>{
    const ins=insumos.find(i=>i.id===r.insumoId);
    return `<div class="c-row" style="padding:6px 0;">
      <span>${ins?escapeHtml(ins.nombre):'(insumo eliminado)'}</span>
      <span><strong>${r.cantidad}</strong> ${ins?escapeHtml(ins.unidad||''):''}
        <button type="button" class="mini-x" onclick="quitarInsumoReceta(${idx})">×</button></span>
    </div>`;
  }).join('');
}
function agregarInsumoReceta(){
  const sel=document.getElementById('rec-insumo');
  const cant=parseFloat((document.getElementById('rec-cant')||{}).value)||0;
  if(!sel||!sel.value){ toast('Elige un insumo','error'); return; }
  if(cant<=0){ toast('Escribe la cantidad','error'); return; }
  const ya=_recetaTmp.find(r=>r.insumoId===sel.value);
  if(ya){ ya.cantidad=cant; } else { _recetaTmp.push({insumoId:sel.value, cantidad:cant}); }
  const cont=document.getElementById('receta-lista');
  if(cont) cont.innerHTML=recetaFilasHTML();
  const ci=document.getElementById('rec-cant'); if(ci) ci.value='';
}
function quitarInsumoReceta(idx){
  _recetaTmp.splice(idx,1);
  const cont=document.getElementById('receta-lista');
  if(cont) cont.innerHTML=recetaFilasHTML();
}
function eliminarProducto(id){
  if(!tienePermiso('editarprod')){ toast('No tienes permiso para borrar productos','error'); return; }
  const p=misDatos('productos').find(x=>x.id===id);
  confirmarModal('¿Eliminar "'+(p?p.nombre:'')+'"?',()=>{
    eliminarMisDatos('productos',id);
    toast('Eliminado','info'); render();
  },'Eliminar');
}
// Sacar mercancía sin vender: daño, vencido, consumo interno, regalo.
// Es la causa #1 de descuadres cuando no queda registrado.
function salidaStock(id){
  if(!tienePermiso('editarstock')){ toast('No tienes permiso para modificar el stock','error'); return; }
  const productos=misDatos('productos');
  const p=productos.find(x=>x.id===id); if(!p) return;
  abrirModal({titulo:'Salida de inventario · '+p.nombre, textoBoton:'Registrar salida', campos:[
    {id:'cant', label:'¿Cuántas unidades salen?', tipo:'number', requerido:true},
    {id:'motivo', label:'Motivo', tipo:'select', opciones:[
      {valor:'Producto dañado',label:'Producto dañado'},
      {valor:'Producto vencido',label:'Producto vencido'},
      {valor:'Consumo interno',label:'Consumo interno'},
      {valor:'Regalo / cortesía',label:'Regalo / cortesía'},
      {valor:'Faltante detectado',label:'Faltante detectado'},
      {valor:'Otro',label:'Otro'}]},
    {id:'nota', label:'Detalle (opcional)'}
  ], extraHTML:`<p class="nota">Existencias actuales: <strong>${p.stock||0}</strong>. Esto NO es una venta: no entra plata, solo sale mercancía.</p>`,
  onGuardar:(d)=>{
    const cant=parseFloat(d.cant)||0;
    if(cant<=0){ toast('Cantidad inválida','error'); return; }
    if(cant>(p.stock||0)){ toast('Solo hay '+(p.stock||0)+' unidades','error'); return; }
    const req={prod:{},ins:{}}; req.prod[id]=cant;
    moverInventario(req, -1, d.motivo+(d.nota?' · '+d.nota:''), true);
    logAudit('Salida de inventario', p.nombre+' ×'+cant+' · '+d.motivo);
    cerrarModal(); toast('Salida registrada','info'); render();
  }});
}
function entradaStock(id){
  if(!tienePermiso('editarstock')){ toast('No tienes permiso para modificar el stock','error'); return; }
  const productos=misDatos('productos');
  const p=productos.find(x=>x.id===id); if(!p) return;
  const campos=[
    {id:'cant', label:'¿Cuántas unidades entran?', tipo:'number', requerido:true},
    {id:'motivo', label:'Motivo', valor:'Compra'}
  ];
  // Siempre se ofrece la fecha de vencimiento (opcional).
  // Si el producto ya maneja lotes, se agrega como un lote más.
  // Si aún NO los maneja y ponen una fecha, se convierte a lotes desde este ingreso.
  campos.push({id:'vence', label:p.usaLotes?'Fecha de vencimiento de este lote (opcional)':'Fecha de vencimiento (opcional — si es perecedero)', tipo:'date', valor:''});
  const lotesHTML = p.usaLotes ? lotesDetalleHTML(p) : '';
  abrirModal({titulo:'Entrada de stock · '+p.nombre, textoBoton:'Agregar', campos:campos,
  extraHTML:`<p class="nota">Stock actual: <strong>${p.stock||0}</strong></p>${lotesHTML}`,
  onGuardar:(d)=>{
    const cant=parseFloat(d.cant)||0;
    if(cant<=0){ toast('Cantidad inválida','error'); return; }
    const vence=(d.vence||'').trim();
    // Ids y fecha fuera de la función: la transacción puede repetirla
    const idLoteAnt=uid(), idLote=uid(), cuando=now();
    cambiarStock('productos', id, x=>{
      // Si aún no usaba lotes pero ahora ponen fecha, activarlo y convertir el stock previo en un lote sin fecha
      if(!x.usaLotes && vence){
        x.usaLotes=true;
        x.lotes = (x.lotes && x.lotes.length) ? x.lotes : [];
        if((x.stock||0)>0){
          x.lotes.push({id:idLoteAnt, cantidad:x.stock, vence:'', ingresado:cuando, motivo:'Stock anterior'});
        }
      }
      x.stock=(x.stock||0)+cant;
      if(x.usaLotes){
        if(!x.lotes) x.lotes=[];
        x.lotes.push({id:idLote, cantidad:cant, vence:vence, ingresado:cuando, motivo:d.motivo});
      }
    });
    registrarMovimientos([{id:uid(), productoId:id, nombre:p.nombre, tipo:'entrada', cantidad:cant,
      motivo:d.motivo+(vence?' · vence '+vence:''), por:STATE.user.nombre, fecha:cuando}]);
    logAudit('Entrada de stock', p.nombre+' +'+cant+' · '+(d.motivo||'')+(vence?' · vence '+vence:''));
    cerrarModal(); toast('Stock actualizado','success'); render();
  }});
}
// Muestra el detalle de lotes de un producto (dentro de un modal)
function lotesDetalleHTML(p){
  const lotes=ordenarLotes(p.lotes||[]).filter(l=>(l.cantidad||0)>0);
  if(!lotes.length) return `<p class="nota" style="margin-top:8px;">Sin lotes registrados. La cantidad que ingreses creará el primer lote.</p>`;
  return `<div class="cobro-caja" style="margin-top:12px;">
    <strong class="chico">Lotes actuales <span class="gris">(se vende primero el que vence antes)</span></strong>
    <div style="margin-top:8px;">
      ${lotes.map(l=>{
        const d=l.vence?diasHasta(l.vence):null;
        const clase = d==null?'' : d<0?'pill-rojo' : d<=diasAvisoVence()?'pill-gold':'pill-verde';
        const txt = !l.vence?'sin fecha' : d<0?('venció hace '+Math.abs(d)+'d') : d===0?'vence hoy' : ('vence en '+d+'d');
        return `<div class="c-row" style="padding:5px 0;">
          <span>${l.cantidad} und ${l.vence?'· '+fmtSoloFecha(l.vence):''}</span>
          <span><span class="pill ${clase}">${txt}</span></span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
// Modal para ver y gestionar (retirar) los lotes de un producto
function verLotes(id){
  const p=misDatos('productos').find(x=>x.id===id); if(!p) return;
  const lotes=ordenarLotes(p.lotes||[]).filter(l=>(l.cantidad||0)>0);
  const cuerpo = lotes.length ? `
    <div style="margin-top:6px;">
      ${lotes.map(l=>{
        const d=l.vence?diasHasta(l.vence):null;
        const clase = d==null?'' : d<0?'pill-rojo' : d<=diasAvisoVence()?'pill-gold':'pill-verde';
        const txt = !l.vence?'sin fecha' : d<0?('venció hace '+Math.abs(d)+'d') : d===0?'vence hoy' : ('vence en '+d+'d');
        return `<div class="c-row" style="padding:8px 0;border-bottom:1px solid var(--linea2);">
          <span><strong>${l.cantidad} und</strong> ${l.vence?'· '+fmtSoloFecha(l.vence):''}<br><span class="gris chico">${escapeHtml(l.motivo||'')}</span></span>
          <span style="text-align:right;">
            <span class="pill ${clase}">${txt}</span><br>
            ${tienePermiso('editarstock')?`<button class="btn btn-sm btn-rojo" style="margin-top:5px;" onclick="retirarLote('${p.id}','${l.id}')">Retirar</button>`:''}
          </span>
        </div>`;
      }).join('')}
    </div>
    <p class="nota" style="margin-top:10px;">Usa <strong>Retirar</strong> para sacar del inventario un lote vencido o dañado. Al vender, el sistema descuenta primero el lote más próximo a vencer.</p>`
    : `<p class="nota">Este producto no tiene lotes con existencias. Registra una entrada de stock para crear un lote.</p>`;
  abrirModal({titulo:'Lotes · '+p.nombre, textoBoton:'Cerrar', campos:[],
    extraHTML:`<p class="nota">Stock total: <strong>${p.stock||0}</strong></p>${cuerpo}`,
    onGuardar:()=>{ cerrarModal(); }});
}
// Retira (elimina) un lote y descuenta su cantidad del stock total
function retirarLote(prodId, loteId){
  if(!tienePermiso('editarstock')){ toast('No tienes permiso para modificar el stock','error'); return; }
  const arr=misDatos('productos');
  const p=arr.find(x=>x.id===prodId); if(!p||!p.lotes) return;
  const l=p.lotes.find(x=>x.id===loteId); if(!l) return;
  confirmarModal('¿Retirar del inventario este lote de '+l.cantidad+' unidad(es)'+(l.vence?' que vence '+fmtSoloFecha(l.vence):'')+'?',()=>{
    // Se retira el lote tal como esté en el servidor (si otro equipo ya vendió de él, se usa esa cantidad)
    cambiarStock('productos', prodId, x=>{
      const lote=(x.lotes||[]).find(y=>y.id===loteId); if(!lote) return;
      x.stock=Math.max(0,(x.stock||0)-(lote.cantidad||0));
      x.lotes=(x.lotes||[]).filter(y=>y.id!==loteId);
    });
    registrarMovimientos([{id:uid(), productoId:prodId, nombre:p.nombre, tipo:'retiro_lote', cantidad:l.cantidad,
      motivo:'Retiro de lote'+(l.vence?' vencido/dañado ('+l.vence+')':''), por:STATE.user.nombre, fecha:now()}]);
    logAudit('Retiró lote', p.nombre+' · '+l.cantidad+' und'+(l.vence?' · vence '+l.vence:''));
    cerrarModal(); toast('Lote retirado','info'); render();
  },'Retirar');
}

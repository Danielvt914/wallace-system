// ============================================================
//  INTERFAZ · Combos
//  Combos armados con productos del inventario.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/06-inventory-recipes/06-inventory-recipes.md
// ============================================================



// ============================================================
//  MENÚ / COMBOS
//  Un combo se arma con productos que YA están en el inventario.
//  Ejemplo: Six Pack = 6 Poker en lata · Cubetazo = 10 cervezas.
//  Se vende a su propio precio y al cobrarlo se descuentan las unidades
//  reales del inventario. Aparece solo en Nueva Venta junto a lo demás.
// ============================================================
// ¿Cuántos combos alcanzan con el stock que hay?
function disponiblesCombo(p, productos){ return Dominio.inventario.disponiblesCombo(p, productos||misDatos('productos')); }
// ¿Se puede agregar uno más sin pasarse del stock real?
function faltantesParaAgregar(prodId){
  return Dominio.inventario.faltantesParaAgregar(_carrito, prodId, misDatos('productos'))
    .map(f=>f.nombre+(f.hay<=0?' (agotado)':' (solo quedan '+f.hay+')'));
}
// Lo que costaría comprando cada cosa por separado (para mostrar el ahorro)
function precioSuelto(p, productos){ return Dominio.inventario.precioSuelto(p, productos||misDatos('productos')); }

let _comboTmp=[];      // componentes que se están armando en el modal
let _comboBusca='';

function combos(){
  ESCRIBIENDO=false;
  const neg=STATE.negocio;
  const productos=misDatos('productos');
  const sueltos=productos.filter(p=>!esCombo(p));
  let lista=productos.filter(esCombo);
  if(_comboBusca){ const q=_comboBusca.toLowerCase(); lista=lista.filter(p=>(p.nombre||'').toLowerCase().includes(q)); }
  const puede=tienePermiso('editarprod');
  if(!sueltos.length){
    return `<div class="tarjeta centro-msg"><div class="msg-ico">${ic('box')}</div>
      <div class="t-tit centrado">Primero necesitas ${pProds()}</div>
      <p class="gris">Los combos se arman con lo que tengas en el inventario. Agrega primero los ${pProds()} sueltos (por ejemplo la cerveza en lata) y después vuelve aquí a armar el six pack o el cubetazo.</p>
      <button class="btn btn-gold" onclick="irA('inventario')">Ir al inventario</button></div>`;
  }
  return `
    <div class="tarjeta">
      <div class="t-cab">
        <div><span class="t-tit">${ic('cart')} Menú y Combos</span>
          <p class="gris">Arma paquetes con lo que ya tienes en inventario y ponles su propio precio. Al venderlos se descuentan solas las unidades del stock.</p></div>
        <div class="t-acc">
          <input type="text" class="busca" placeholder="🔍 Buscar combo..." value="${escapeHtml(_comboBusca)}" oninput="_comboBusca=this.value;render()">
          ${puede?`<button class="btn btn-gold" onclick="editarCombo(null)">+ Crear combo</button>`:''}
        </div>
      </div>
      ${lista.length?`<div class="prods inv">
        ${lista.map(p=>{
          const disp=disponiblesCombo(p,productos);
          const suelto=precioSuelto(p,productos);
          const ahorro=suelto-(p.precio||0);
          return `<div class="prod ${disp===0?'off':''}">
            <div class="prod-ico">${p.imagen?`<img src="${p.imagen}" alt="">`:ic('cart')}
              ${disp===0?'<span class="badge-off">NO ALCANZA</span>':''}</div>
            <div class="prod-nom">${escapeHtml(p.nombre)}</div>
            <div class="prod-cat">${escapeHtml(p.categoria||'Combos')}</div>
            <div class="prod-pre">${fmtMoney(p.precio)}</div>
            ${ahorro>0?`<div class="prod-stock" style="color:var(--verde-c);">Ahorra ${fmtMoney(ahorro)}</div>`
              :ahorro<0?`<div class="prod-stock poco">Cuesta ${fmtMoney(-ahorro)} más que suelto</div>`:''}
            <div class="gris chico" style="margin-top:6px;line-height:1.5;">
              ${(p.componentes||[]).map(cp=>{
                const base=productos.find(x=>x.id===cp.prodId);
                return (cp.cantidad||1)+' × '+escapeHtml(base?base.nombre:'(borrado)');
              }).join('<br>')}
            </div>
            <div class="prod-stock ${disp===0?'sin':(disp!==null&&disp<=3)?'poco':''}" style="margin-top:6px;">
              ${disp===null?'Sin límite de stock':'Alcanzan para '+disp}
            </div>
            ${puede?`<div class="prod-acc">
              <button class="btn btn-sm btn-verde" onclick="editarCombo('${p.id}')">Editar</button>
              <button class="btn btn-sm btn-rojo" onclick="eliminarProducto('${p.id}')">×</button>
            </div>`:''}
          </div>`;
        }).join('')}
      </div>`:`<p class="gris">${_comboBusca?'No se encontraron combos.':'Todavía no hay combos. Crea el primero: por ejemplo "Six Pack" con 6 cervezas a mejor precio.'}</p>`}
    </div>
    ${lista.length?`<div class="tarjeta">
      <span class="t-tit">${ic('box')} Qué se descuenta del inventario</span>
      <p class="nota">Cada vez que vendas un combo, el sistema saca estas unidades del stock real.</p>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Combo</th><th>Precio</th><th>Suelto costaría</th><th>Lleva</th><th>Alcanzan</th></tr></thead>
        <tbody>${lista.map(p=>{
          const disp=disponiblesCombo(p,productos);
          return `<tr>
          <td><strong>${escapeHtml(p.nombre)}</strong></td>
          <td class="oro negrita">${fmtMoney(p.precio)}</td>
          <td class="gris">${fmtMoney(precioSuelto(p,productos))}</td>
          <td>${(p.componentes||[]).map(cp=>{const b=productos.find(x=>x.id===cp.prodId);return (cp.cantidad||1)+' × '+escapeHtml(b?b.nombre:'(borrado)');}).join('<br>')}</td>
          <td class="negrita ${disp===0?'rojo':''}">${disp===null?'—':disp}</td>
        </tr>`;}).join('')}</tbody>
      </table></div>
    </div>`:''}`;
}

function editarCombo(id){
  if(!tienePermiso('editarprod')){ toast('No tienes permiso para crear combos','error'); return; }
  const productos=misDatos('productos');
  const p=id?productos.find(x=>x.id===id):null;
  _comboTmp = p&&p.componentes ? JSON.parse(JSON.stringify(p.componentes)) : [];
  const cats=Array.from(new Set(productos.map(x=>x.categoria||'General')));
  abrirModal({titulo:(p?'Editar':'Nuevo')+' combo', textoBoton:'Guardar', campos:[
    {id:'nombre', label:'Nombre del combo', valor:p?p.nombre:'', requerido:true, placeholder:'Ej: Six Pack, Cubetazo'},
    {id:'precio', label:'Precio de venta del combo', tipo:'number', valor:p?String(p.precio):'', requerido:true},
    {id:'categoria', label:'Categoría', valor:p?(p.categoria||'Combos'):'Combos', placeholder:cats.join(', ')}
  ], extraHTML:comboEditorHTML(),
  onGuardar:(d)=>{
    const comps=_comboTmp.filter(c=>c.prodId && c.cantidad>0);
    if(!comps.length){ toast('Agrega al menos un '+pProd()+' al combo','error'); return; }
    const arr=misDatos('productos');
    const datos={nombre:d.nombre.trim(), precio:parseFloat(d.precio)||0,
      categoria:(d.categoria||'Combos').trim()||'Combos',
      esCombo:true, componentes:comps, stock:null, usaLotes:false, lotes:[]};
    if(p){ const x=arr.find(y=>y.id===id); if(x) Object.assign(x,datos); }
    else { arr.unshift(Object.assign({id:uid(), agotado:false, creado:now(), imagen:''}, datos)); }
    guardarMisDatos('productos',arr);
    logAudit(p?'Editó combo':'Creó combo', datos.nombre+' · '+fmtMoney(datos.precio));
    _comboTmp=[];
    cerrarModal(); toast('Combo guardado','success'); render();
  }});
}
function comboEditorHTML(){
  const sueltos=misDatos('productos').filter(x=>!esCombo(x));
  return `<div class="cobro-caja" style="margin-top:14px;">
    <strong>¿Qué lleva el combo? <span class="gris chico">(sale del inventario)</span></strong>
    <div id="combo-lista" style="margin:10px 0;">${comboFilasHTML()}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <select id="cb-prod" class="campo" style="flex:2;min-width:140px;margin:0;">
        ${sueltos.map(x=>`<option value="${x.id}">${escapeHtml(x.nombre)}${x.stock!=null?' (hay '+x.stock+')':''}</option>`).join('')}
      </select>
      <input id="cb-cant" type="number" min="1" class="campo" placeholder="Cant." style="flex:1;min-width:70px;margin:0;">
      <button type="button" class="btn btn-verde btn-sm" onclick="agregarAComboTmp()">+ Añadir</button>
    </div>
    <p class="nota" id="cb-resumen" style="margin-top:10px;"></p>
  </div>`;
}
function comboFilasHTML(){
  const prods=misDatos('productos');
  if(!_comboTmp.length) return '<p class="nota">Vacío. Agrega lo que lleva, por ejemplo 6 × Cerveza en lata.</p>';
  return _comboTmp.map((c,idx)=>{
    const b=prods.find(x=>x.id===c.prodId);
    return `<div class="c-row" style="padding:6px 0;">
      <span>${b?escapeHtml(b.nombre):'(producto borrado)'}</span>
      <span><strong>${c.cantidad}</strong> und
        <button type="button" class="mini-x" onclick="quitarDeComboTmp(${idx})">×</button></span>
    </div>`;
  }).join('');
}
function pintarResumenCombo(){
  const el=document.getElementById('cb-resumen'); if(!el) return;
  const prods=misDatos('productos');
  const suelto=_comboTmp.reduce((a,c)=>{ const b=prods.find(x=>x.id===c.prodId); return a+(b?(b.precio||0):0)*(c.cantidad||1); },0);
  const precio=parseFloat((document.getElementById('m-precio')||{}).value)||0;
  if(!_comboTmp.length){ el.textContent=''; return; }
  const ahorro=suelto-precio;
  el.innerHTML='Comprado suelto costaría <strong>'+fmtMoney(suelto)+'</strong>.'+
    (precio>0?(ahorro>0?' El cliente ahorra <strong class="verde">'+fmtMoney(ahorro)+'</strong>.'
      :ahorro<0?' <span class="rojo">Ojo: el combo cuesta '+fmtMoney(-ahorro)+' más que suelto.</span>'
      :' Cuesta lo mismo que suelto.'):'');
}
function agregarAComboTmp(){
  const sel=document.getElementById('cb-prod');
  const cant=parseFloat((document.getElementById('cb-cant')||{}).value)||0;
  if(!sel||!sel.value){ toast('Elige un '+pProd(),'error'); return; }
  if(cant<=0){ toast('Escribe cuántas unidades lleva','error'); return; }
  const ya=_comboTmp.find(c=>c.prodId===sel.value);
  if(ya) ya.cantidad=cant; else _comboTmp.push({prodId:sel.value, cantidad:cant});
  const cont=document.getElementById('combo-lista');
  if(cont) cont.innerHTML=comboFilasHTML();
  const ci=document.getElementById('cb-cant'); if(ci) ci.value='';
  pintarResumenCombo();
}
function quitarDeComboTmp(idx){
  _comboTmp.splice(idx,1);
  const cont=document.getElementById('combo-lista');
  if(cont) cont.innerHTML=comboFilasHTML();
  pintarResumenCombo();
}

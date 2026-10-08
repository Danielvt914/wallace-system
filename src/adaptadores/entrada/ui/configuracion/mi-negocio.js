// ============================================================
//  INTERFAZ · Mi Negocio
//  Datos y preferencias que edita el propio negocio.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/11-business-settings/11-business-settings.md
// ============================================================

// ============================================================
//  MI NEGOCIO (lo edita el propio administrador)
// ============================================================
function minegocio(){
  ESCRIBIENDO=false;
  const neg=STATE.negocio;
  return `
    <div class="tarjeta">
      <span class="t-tit">${ic('building')} Datos de tu negocio</span>
      <p class="gris">Esta información sale en las facturas que entregas a tus clientes.</p>
      <div class="form2" style="margin-top:14px;">
        <div class="m-row"><label>Nombre del negocio</label><input id="n-nombre" class="campo" value="${escapeHtml(neg.nombre||'')}"></div>
        <div class="m-row"><label>NIT / Cédula</label><input id="n-nit" class="campo" value="${escapeHtml(neg.nit||'')}" placeholder="Ej: 900123456-7"></div>
        <div class="m-row"><label>Teléfono</label><input id="n-tel" class="campo" value="${escapeHtml(neg.tel||'')}" placeholder="Ej: 3125214210"></div>
        <div class="m-row"><label>Dirección</label><input id="n-dir" class="campo" value="${escapeHtml(neg.dir||'')}" placeholder="Ej: Calle 45 #23-11"></div>
        <div class="m-row"><label>Ciudad</label><input id="n-ciudad" class="campo" value="${escapeHtml(neg.ciudad||'')}"></div>
        <div class="m-row"><label>Eslogan (opcional)</label><input id="n-eslogan" class="campo" value="${escapeHtml(neg.eslogan||'')}" placeholder="Ej: Accesorios con estilo"></div>
      </div>
    </div>
    <div class="tarjeta">
      <span class="t-tit">${ic('box')} Logo del negocio</span>
      <p class="gris">Aparece en el menú lateral y en todas las facturas. Usa una imagen cuadrada.</p>
      <div class="logo-zona">
        <div class="logo-vista" id="logo-vista">
          ${neg.logo?`<img src="${neg.logo}" alt="logo">`:`<div class="logo-vacio">Sin logo</div>`}
        </div>
        <div class="logo-acc">
          <input type="file" id="n-logo" accept="image/*" onchange="cargarLogo(this)" style="display:none;">
          <button class="btn btn-gold" onclick="document.getElementById('n-logo').click()">Subir logo</button>
          ${neg.logo?`<button class="btn btn-rojo btn-sm" onclick="quitarLogo()">Quitar</button>`:''}
          <p class="nota">La imagen se reduce sola para no pesar.</p>
        </div>
      </div>
    </div>
    <div class="tarjeta">
      <span class="t-tit">${ic('cog')} Preferencias</span>
      <div class="form2">
        <div class="m-row"><label>Apariencia del sistema</label>
          <select id="n-tema" class="campo">
            <option value="oscuro" ${neg.tema!=='claro'?'selected':''}>Oscuro neón</option>
            <option value="claro" ${neg.tema==='claro'?'selected':''}>Claro / fondo blanco</option>
          </select></div>
        <div class="m-row"><label>Color principal</label>
          <input id="n-color" type="color" class="campo" style="height:46px;padding:5px;cursor:pointer;" value="${/^#[0-9a-fA-F]{6}$/.test(neg.colorTema||'')?neg.colorTema:'#01c38e'}">
          <p class="nota">Pinta botones, menú y detalles en todos los equipos. El verde original es #01c38e.</p></div>
        <div class="m-row"><label>Tamaño de la factura</label>
          <select id="n-fact" class="campo">
            <option value="pos" ${neg.tipoFactura==='pos'?'selected':''}>Tirilla POS (80mm)</option>
            <option value="media" ${neg.tipoFactura==='media'?'selected':''}>Media hoja</option>
            <option value="carta" ${neg.tipoFactura==='carta'?'selected':''}>Hoja completa</option>
          </select></div>
        <div class="m-row"><label>Recargo del datáfono (%)</label>
          <input id="n-pct" type="number" step="0.1" class="campo" value="${neg.pctDatafono||0}" placeholder="Ej: 4"></div>
        <div class="m-row"><label>Al editar un pedido ya cobrado</label>
          <select id="n-ajustecobro" class="campo">
            <option value="diferencia" ${(neg.ajusteCobro!=='total')?'selected':''}>Cobrar solo la diferencia (dice cuánto debe o cuánto devolver)</option>
            <option value="total" ${(neg.ajusteCobro==='total')?'selected':''}>Cobrar el total nuevo completo (como una venta normal)</option>
          </select>
          <p class="nota"><strong>Solo la diferencia:</strong> el cajero registra únicamente lo que falta cobrar o devolver; el resto del pago queda como estaba.<br><strong>Total nuevo completo:</strong> muestra el total actualizado y se cobra entero, reemplazando el pago anterior. Con las dos formas la caja queda cuadrada.</p></div>
        <div class="m-row"><label>Base fija del cajón (lo que se deja todos los días)</label>
          <input id="n-basefija" type="number" class="campo" value="${neg.baseFija!=null?neg.baseFija:''}" placeholder="Ej: 100000">
          <p class="nota">Al cerrar caja se sugiere dejar esta cantidad y retirar el resto. Déjalo vacío si cada día es distinto.</p></div>
      </div>
      <div class="checks">
        <label class="chk"><input type="checkbox" id="n-sonidos" ${neg.sonidos!==false?'checked':''}> Sonidos al vender</label>
        <label class="chk"><input type="checkbox" id="n-alerta" ${neg.alertaStock!==false?'checked':''}> Avisar cuando se agote un producto</label>
        <label class="chk"><input type="checkbox" id="n-alertavence" ${neg.alertaVence!==false?'checked':''}> Avisar productos por vencer</label>
        <label class="chk"><input type="checkbox" id="n-inventario" ${usaInventario(neg)?'checked':''} ${inventarioHabilitado(neg)?'':'disabled title="Tu plan no incluye inventario. Pídelo a tu proveedor."'}> Llevar control de inventario (stock)${inventarioHabilitado(neg)?'':' <span class="gris chico">(no incluido en tu plan)</span>'}</label>
        <label class="chk"><input type="checkbox" id="n-verificarbanco" ${neg.verificarBanco?'checked':''}> Exigir verificar las transferencias</label>
        <label class="chk"><input type="checkbox" id="n-cuentas" ${neg.usaCuentas?'checked':''}> Usar cuentas abiertas (agregar y cobrar al final)</label>
        <label class="chk"><input type="checkbox" id="n-descontarpedir" ${descuentaAlPedir()?'checked':''}> Descontar el inventario apenas se pide (no al cobrar)</label>
      </div>
      <p class="nota" style="margin-top:8px;">Si apagas el control de inventario, los ${pProds()} no llevan existencias: no se descuentan al vender ni aparecen alertas. Útil para servicios o negocios que no manejan stock.</p>
      <p class="nota" style="margin-top:8px;">🧾 <strong>Cuentas abiertas:</strong> agrega una ventana para llevar cuentas por mesa o por cliente, irles sumando productos y cobrar al final. Es para bares, licoreras y restaurantes. Si tu negocio cobra de una, déjala apagada y no aparece.</p>
      <p class="nota" style="margin-top:8px;">🍺 <strong>Descontar al pedir:</strong> apenas se agrega el producto a una cuenta o pedido, sale del inventario. Es lo correcto en licoreras y bares, donde el producto ya se entregó. Si lo apagas, el stock baja solo cuando se cobra.</p>
      <div class="m-row" style="margin-top:12px;">
        <label>Avisar cuántos días antes de que un producto se venza</label>
        <input id="n-diasvence" type="number" min="0" class="campo" value="${neg.diasAvisoVence!=null?neg.diasAvisoVence:7}" placeholder="Ej: 7"></div>
      <button class="btn btn-ghost btn-sm" style="margin-top:12px;" onclick="sonidoVenta()">🔊 Probar sonido</button>
    </div>
    <div class="tarjeta">
      <button class="btn btn-gold btn-block btn-grande" onclick="guardarMiNegocio()">Guardar cambios</button>
      <p class="nota centrado" style="margin-top:10px;">Los cambios se ven en todos los equipos al instante.</p>
    </div>`;
}
function cargarLogo(input){
  const f=input.files && input.files[0];
  if(!f) return;
  if(f.size>5*1024*1024){ toast('La imagen es muy pesada (máx 5MB)','error'); return; }
  const lector=new FileReader();
  lector.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      // Reducir a 300px de ancho máximo para que no pese
      const max=300;
      let w=img.width, h=img.height;
      if(w>max){ h=Math.round(h*max/w); w=max; }
      const lienzo=document.createElement('canvas');
      lienzo.width=w; lienzo.height=h;
      lienzo.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl=lienzo.toDataURL('image/png');
      const vista=document.getElementById('logo-vista');
      if(vista) vista.innerHTML='<img src="'+dataUrl+'" alt="logo">';
      window._logoNuevo=dataUrl;
      toast('Logo listo. Dale a Guardar cambios.','info');
    };
    img.src=e.target.result;
  };
  lector.readAsDataURL(f);
}
function quitarLogo(){
  window._logoNuevo='';
  const vista=document.getElementById('logo-vista');
  if(vista) vista.innerHTML='<div class="logo-vacio">Sin logo</div>';
  toast('Logo quitado. Dale a Guardar cambios.','info');
}
function guardarMiNegocio(){
  if(!puedeVerPantalla('minegocio')){ toast('No tienes permiso para cambiar los datos del negocio','error'); return; }
  const val=id=>{ const e=document.getElementById(id); return e?e.value:''; };
  const chk=id=>{ const e=document.getElementById(id); return e?e.checked:false; };
  const negocios=JSON.parse(JSON.stringify(DB.get('negocios')||[]));
  const i=negocios.findIndex(n=>n.id===STATE.negocio.id);
  if(i<0){ toast('No se encontró el negocio','error'); return; }
  const n=negocios[i];
  n.nombre=val('n-nombre').trim()||n.nombre;
  n.nit=val('n-nit').trim();
  n.tel=val('n-tel').trim();
  n.dir=val('n-dir').trim();
  n.ciudad=val('n-ciudad').trim();
  n.eslogan=val('n-eslogan').trim();
  n.tipoFactura=val('n-fact');
  n.tema=val('n-tema')||'oscuro';
  const _col=val('n-color');
  n.colorTema=/^#[0-9a-fA-F]{6}$/.test(_col)?_col:'#01c38e';
  n.pctDatafono=parseFloat(val('n-pct'))||0;
  { const bf=val('n-basefija'); n.baseFija = (bf===''||bf==null) ? null : (parseFloat(bf)||0); }
  n.ajusteCobro = val('n-ajustecobro')==='total' ? 'total' : 'diferencia';
  n.sonidos=chk('n-sonidos');
  n.alertaStock=chk('n-alerta');
  n.alertaVence=chk('n-alertavence');
  n.verificarBanco=chk('n-verificarbanco');
  n.usaCuentas=chk('n-cuentas');
  n.descontarAlPedir=chk('n-descontarpedir');
  // Encender/apagar el control de inventario: solo si el proveedor habilitó la ventana.
  // No toca "funciones" (eso es del super-admin y las reglas de la base lo bloquean).
  if(inventarioHabilitado(n)) n.inventarioApagado=!chk('n-inventario');
  { const dv=parseInt(val('n-diasvence'),10); n.diasAvisoVence=isNaN(dv)?7:Math.max(0,dv); }
  if(window._logoNuevo!==undefined){ n.logo=window._logoNuevo; window._logoNuevo=undefined; }
  negocios[i]=n;
  DB.set('negocios',negocios);
  STATE.negocio=JSON.parse(JSON.stringify(n));
  toast('Datos guardados','success');
  render();
}

// ============================================================
//  INTERFAZ · Reimpresiones
//  Centro de impresión.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/12-invoice-printing/12-invoice-printing.md
// ============================================================



// ============================================================
//  REIMPRESIONES (Centro de Impresión)
// ============================================================
let _reimpBusca='';
function reimpresiones(){
  ESCRIBIENDO=false;
  const neg=STATE.negocio;
  const cajaAbierta=cajaActual();
  // Solo los pedidos de la CAJA ACTUAL. Al cerrar caja y abrir otra, esta
  // lista queda vacía y se llena solo con los pedidos de la nueva jornada.
  let vs=ventasJornada(false).filter(v=>v.estado!=='anulada')
    .slice().sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  if(_reimpBusca){ const q=_reimpBusca.toLowerCase();
    vs=vs.filter(v=>(v.factura||'').toLowerCase().includes(q)||(v.cliNombre||'').toLowerCase().includes(q)||(v.mesa||'').toLowerCase().includes(q)); }
  vs=vs.slice(0,60);
  const etiq={mesa:'Mesa',llevar:'Para llevar',domicilio:'Domicilio',envio:'Envío',rapida:'Directa'};
  return `
    <div class="tarjeta">
      <div class="t-cab">
        <div><span class="t-tit">🖨️ Centro de Impresión <span class="pill ${cajaAbierta?'pill-verde':'pill-gold'}">${cajaAbierta?'Caja actual':'Sin caja abierta'}</span></span>
          <p class="gris">Pedidos de la caja actual. Al cerrar caja, esta lista se reinicia para la nueva jornada. Las cuentas sin cobrar salen marcadas como "cobro pendiente".</p></div>
        <input type="text" class="busca" placeholder="🔍 Factura, cliente, mesa..." value="${escapeHtml(_reimpBusca)}" oninput="_reimpBusca=this.value;render()">
      </div>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Pedido</th><th>Tipo</th><th>Cliente/Mesa</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Reimprimir</th></tr></thead>
        <tbody>${vs.length?vs.map(v=>`<tr>
          <td><strong class="oro">${escapeHtml(v.factura||'—')}</strong></td>
          <td>${etiq[v.tipo]||'—'}${v.mesa?' '+escapeHtml(v.mesa):''}</td>
          <td>${escapeHtml(v.cliNombre||v.mesa||'—')}</td>
          <td class="negrita">${fmtMoney(v.total)}</td>
          <td>${v.estado==='pagada'?'<span class="pill pill-verde">Pagada</span>':'<span class="pill pill-gold">Por cobrar</span>'}</td>
          <td class="gris chico">${fmtDate(v.fecha)}</td>
          <td class="acciones">
            <button class="btn btn-sm" onclick="imprimirFactura('${v.id}')" title="${v.estado==='pagada'?'Factura':'Cuenta (cobro pendiente)'}">${v.estado==='pagada'?'🧾 Factura':'🧾 Cuenta'}</button>
            ${neg.usaCocina?`<button class="btn btn-sm" onclick="reimprimirComanda('${v.id}')" title="Comanda de cocina">👨‍🍳</button>`:''}
          </td>
        </tr>`).join(''):'<tr><td colspan="7" class="gris">No hay pedidos para reimprimir.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

// ============================================================
//  INTERFAZ · Auditoría
//  Registro de acciones importantes (logAudit) y su pantalla.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/10-users-roles/10-users-roles.md
// ============================================================


// ============================================================
//  AUDITORÍA (registro de acciones importantes)
// ============================================================
function logAudit(accion, detalle){
  try{
    if(!STATE.negocio || !STATE.user) return;
    // Se conserva TODO el registro: un recorte aquí no borraba nada en la nube
    // (el guardado fusiona por id) y una auditoría no debe perder historia.
    // La pantalla solo muestra los 300 más recientes.
    guardarMisDatos('auditoria', [{id:uid(), usuario:STATE.user.nombre||'—', rol:STATE.user.rol||'',
      accion:accion||'', detalle:detalle||'', fecha:now()}]);
  }catch(e){}
}

// ============================================================
//  AUDITORÍA (solo admin/supervisor)
// ============================================================
let _aFiltro='';
function auditoria(){
  ESCRIBIENDO=false;
  const u=STATE.user;
  if(!(u.rol==='admin'||u.esSupervisor)){
    return `<div class="tarjeta"><p class="gris">🔒 Solo el administrador puede ver la auditoría.</p></div>`;
  }
  const logs=misDatos('auditoria');
  const usuarios=Array.from(new Set(logs.map(l=>l.usuario))).sort();
  const filtrados=_aFiltro?logs.filter(l=>l.usuario===_aFiltro):logs;
  return `
    <div class="tarjeta">
      <div class="t-cab">
        <span class="t-tit">${ic('history')} Registro de auditoría</span>
        <div class="t-acc">
          <select class="busca" onchange="_aFiltro=this.value;render()">
            <option value="">Todos los usuarios</option>
            ${usuarios.map(us=>`<option value="${escapeHtml(us)}" ${us===_aFiltro?'selected':''}>${escapeHtml(us)}</option>`).join('')}
          </select>
          <span class="pill pill-gold">${filtrados.length} registros</span>
        </div>
      </div>
      <p class="nota">Queda registro de quién anula, edita, cambia pagos o elimina pedidos.</p>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Usuario</th><th>Acción</th><th>Detalle</th><th>Fecha</th></tr></thead>
        <tbody>${filtrados.length? filtrados.slice(0,300).map(l=>`<tr>
          <td><strong>${escapeHtml(l.usuario)}</strong>${l.rol?`<br><span class="gris chico">${escapeHtml(l.rol)}</span>`:''}</td>
          <td>${escapeHtml(l.accion)}</td>
          <td class="gris chico">${escapeHtml(l.detalle||'—')}</td>
          <td class="gris chico">${fmtDate(l.fecha)}</td>
        </tr>`).join('') : '<tr><td colspan="4" class="gris">Sin registros aún.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

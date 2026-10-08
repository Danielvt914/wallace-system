// ============================================================
//  INTERFAZ · Administradores del sistema
//  Super-admins: crear, editar, eliminar, mi contraseña.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/01-super-admin-panel/01-super-admin-panel.md
// ============================================================


// ============================================================
//  GESTIÓN DE SUPER ADMINS (solo el dueño del sistema)
// ============================================================
function pantallaSuperAdmins(){
  const esDueno = STATE.user.rolSuper==='dueno';
  const sas=DB.get('superadmins')||[];
  return `
  <div class="topbar">
    <h1><span class="sa-marca">👥 Administradores del sistema</span></h1>
    <div class="tb-der">
      <button class="btn btn-ghost btn-sm" onclick="STATE.page='';render()">← Volver</button>
    </div>
  </div>
  <div class="contenido">
    ${!esDueno?`<div class="tarjeta"><p class="gris">🔒 Solo el dueño del sistema puede gestionar administradores.</p></div>`:`
    <div class="tarjeta">
      <div class="t-cab">
        <span class="t-tit">👥 Súper administradores</span>
        <button class="btn btn-gold" onclick="editarSuperAdmin(null)">+ Crear administrador</button>
      </div>
      <p class="nota">El <strong>dueño</strong> puede todo (crear negocios, otros admins, respaldos). El <strong>ayudante</strong> puede gestionar negocios pero no crear ni borrar otros administradores.</p>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Creado</th><th></th></tr></thead>
        <tbody>${sas.map(s=>`<tr>
          <td class="negrita">${escapeHtml(s.nombre)}</td>
          <td>${escapeHtml(s.usuario)}</td>
          <td>${s.rolSuper==='dueno'?'<span class="pill pill-oro">Dueño</span>':s.rolSuper==='vendedor'?'<span class="pill pill-verde">Vendedor</span>':'<span class="pill pill-azul">Ayudante</span>'}</td>
          <td class="gris chico">${s.creado?fmtDate(s.creado):'—'}</td>
          <td class="acciones">
            <button class="btn btn-sm" onclick="editarSuperAdmin('${s.id}')">Editar</button>
            ${s.rolSuper!=='dueno'||sas.filter(x=>x.rolSuper==='dueno').length>1?`<button class="btn btn-sm btn-rojo" onclick="eliminarSuperAdmin('${s.id}')">×</button>`:''}
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`}
  </div>`;
}
function editarSuperAdmin(id){
  if(STATE.user.rolSuper!=='dueno'){ toast('Solo el dueño puede crear administradores','error'); return; }
  const sas=DB.get('superadmins')||[];
  const s=id?sas.find(x=>x.id===id):null;
  abrirModal({titulo:(s?'Editar':'Crear')+' administrador', textoBoton:'Guardar', campos:[
    {id:'nombre', label:'Nombre completo', valor:s?s.nombre:'', requerido:true},
    {id:'usuario', label:'Usuario para entrar', valor:s?s.usuario:'', requerido:true},
    {id:'pass', label:s?'Nueva contraseña (vacío = no cambiar)':'Contraseña', tipo:'password', valor:'', requerido:!s},
    {id:'rolSuper', label:'Rol', tipo:'select', valor:s?s.rolSuper:'ayudante',
      opciones:[{valor:'vendedor',label:'Vendedor (solo crea y muestra demos)'},{valor:'ayudante',label:'Ayudante (gestiona negocios)'},{valor:'dueno',label:'Dueño (control total)'}]}
  ], onGuardar:(d)=>{
    const usuario=d.usuario.trim();
    // No permitir usuarios repetidos (ni con empleados de negocios)
    const dup=(DB.get('superadmins')||[]).some(x=>x.usuario===usuario && (!s||x.id!==s.id))
           || (DB.get('usuarios')||[]).some(u=>u.usuario===usuario);
    if(dup){ toast('Ese usuario ya existe','error'); return; }
    const nuevaPass=d.pass.trim();
    const cuentas=conCuentasFirebase(), minPass=cuentas?6:5;
    if((!s || nuevaPass) && nuevaPass.length<minPass){ toast('La contraseña debe tener al menos '+minPass+' caracteres','error'); return; }
    const list=DB.get('superadmins')||[];
    if(s){
      const x=list.find(y=>y.id===id);
      // Evitar quitar el último dueño
      if(x.rolSuper==='dueno' && d.rolSuper!=='dueno' && list.filter(y=>y.rolSuper==='dueno').length<=1){
        toast('Debe quedar al menos un dueño','error'); return;
      }
      const antes=x.usuario;
      Object.assign(x,{nombre:d.nombre.trim(), usuario:usuario, rolSuper:d.rolSuper});
      if(nuevaPass && !cuentas) ponerPass(x, nuevaPass);
      if(nuevaPass && cuentas) Dominio.cuentas.CAMPOS_PASS.forEach(k=>{ delete x[k]; });   // la clave vieja ya no sirve
      DB.set('superadmins',list);
      if(cuentas) trasGuardarCuenta(x, true, antes, nuevaPass);
    } else {
      const rec={id:uid(), nombre:d.nombre.trim(), usuario:usuario, rolSuper:d.rolSuper, creado:now()};
      if(cuentas){
        crearCuentaPara(rec, nuevaPass, true).then(()=>{
          const l=DB.get('superadmins')||[]; l.push(rec); DB.set('superadmins',l);
          cerrarModal(); toast('Administrador creado','success'); render();
        }).catch(e=>toast('No se pudo crear la cuenta: '+mensajeCuenta(e),'error'));
        return;
      }
      list.push(ponerPass(rec, nuevaPass));
      DB.set('superadmins',list);
    }
    cerrarModal(); toast('Administrador guardado','success'); render();
  }});
}
function eliminarSuperAdmin(id){
  if(STATE.user.rolSuper!=='dueno'){ toast('Solo el dueño puede eliminar','error'); return; }
  const sas=DB.get('superadmins')||[];
  const s=sas.find(x=>x.id===id); if(!s) return;
  if(s.id===STATE.user.id){ toast('No puedes eliminarte a ti mismo','error'); return; }
  if(s.rolSuper==='dueno' && sas.filter(x=>x.rolSuper==='dueno').length<=1){ toast('Debe quedar al menos un dueño','error'); return; }
  confirmarModal('¿Eliminar al administrador "'+s.nombre+'"? No podrá volver a entrar.',()=>{
    DB.set('superadmins', sas.filter(x=>x.id!==id));
    if(conCuentasFirebase()) borrarCuentaDe(s.usuario).catch(e=>toast('No se pudo borrar su cuenta de acceso: '+mensajeCuenta(e),'error'));
    toast('Administrador eliminado','info'); render();
  },'Eliminar');
}
function cambiarMiPassSuper(){
  if(conCuentasFirebase()){ cambiarMiPassCuenta(); return; }
  const sas=DB.get('superadmins')||[];
  const yo=sas.find(x=>x.id===STATE.user.id);
  if(!yo){ toast('No se encontró tu cuenta','error'); return; }
  abrirModal({titulo:'🔑 Cambiar mi contraseña', textoBoton:'Guardar', campos:[
    {id:'actual', label:'Contraseña actual', tipo:'password', requerido:true},
    {id:'nueva', label:'Nueva contraseña', tipo:'password', requerido:true},
    {id:'nueva2', label:'Repite la nueva contraseña', tipo:'password', requerido:true}
  ], onGuardar:(d)=>{
    if(!verificarPass(yo, d.actual)){ toast('La contraseña actual no coincide','error'); return; }
    if(d.nueva.trim().length<5){ toast('La nueva debe tener al menos 5 caracteres','error'); return; }
    if(d.nueva!==d.nueva2){ toast('Las contraseñas nuevas no coinciden','error'); return; }
    const list=DB.get('superadmins')||[];
    const x=list.find(y=>y.id===yo.id);
    if(x){ ponerPass(x, d.nueva.trim()); DB.set('superadmins',list); }
    cerrarModal(); toast('Contraseña actualizada','success');
  }});
}

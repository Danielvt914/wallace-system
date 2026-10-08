// ============================================================
//  INTERFAZ · Usuarios de un negocio (super-admin)
//  Crear, editar, desactivar y eliminar empleados.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/10-users-roles/10-users-roles.md
// ============================================================


// ---------- Usuarios del negocio ----------
function pantallaUsuarios(negId){
  const neg=(DB.get('negocios')||[]).find(n=>n.id===negId);
  if(!neg) return '<div class="tarjeta">Negocio no encontrado</div>';
  const us=(DB.get('usuarios')||[]).filter(u=>u.negocioId===negId);
  return `
  <div class="topbar">
    <h1>${ic('users')} Usuarios de ${escapeHtml(neg.nombre)}</h1>
    <div class="tb-der"><button class="btn btn-ghost btn-sm" onclick="STATE.page='';render()">← Volver</button></div>
  </div>
  <div class="contenido">
    <div class="tarjeta">
      <div class="t-cab">
        <span class="t-tit">Empleados</span>
        <button class="btn btn-gold" onclick="editarUsuario('${negId}',null)">+ Crear usuario</button>
      </div>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Sucursales</th><th>Estado</th><th></th></tr></thead>
        <tbody>${us.length?us.map(u=>`<tr>
          <td><strong>${escapeHtml(u.nombre)}</strong></td>
          <td>${escapeHtml(u.usuario)}</td>
          <td>${escapeHtml((ROLES.find(r=>r[0]===u.rol)||['',u.rol])[1])}</td>
          <td class="gris chico">${(u.sucursales&&u.sucursales.length)?u.sucursales.length+' asignada(s)':'todas'}</td>
          <td>${u.activo!==false?'<span class="pill pill-verde">Activo</span>':'<span class="pill pill-rojo">Inactivo</span>'}</td>
          <td class="acciones">
            <button class="btn btn-sm" onclick="editarUsuario('${negId}','${u.id}')">Editar</button>
            <button class="btn btn-sm btn-rojo" onclick="eliminarUsuario('${u.id}')">×</button>
          </td>
        </tr>`).join(''):'<tr><td colspan="7" class="gris">Sin usuarios. Crea el primero.</td></tr>'}</tbody>
      </table></div>
    </div>
  </div>`;
}
function editarUsuario(negId,userId){
  const neg=(DB.get('negocios')||[]).find(n=>n.id===negId);
  const u=userId?(DB.get('usuarios')||[]).find(x=>x.id===userId):null;
  const sugerido = u?u.usuario:(neg.nombre||'').toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,8);
  // Pantallas y permisos actuales del usuario (o los del rol por defecto)
  const pantActuales = (u&&u.pantallas&&u.pantallas.length)?u.pantallas:(PANTALLAS_POR_ROL[(u?u.rol:'cajero')]||[]);
  const permActuales = (u&&u.permisos&&u.permisos.length)?u.permisos:(PERMISOS_POR_ROL[(u?u.rol:'cajero')]||[]);
  const TODAS_PANTALLAS=[['inicio','Dashboard'],['ventas','Nueva Venta'],['pedidos','Pedidos'],
    ['catalogo','Menú / Inventario'],['caja','Caja'],['cocina','Cocina'],['citas','Agendar'],
    ['domicilios','Domicilios'],['clientes','Clientes'],['cuentas','Cuentas Abiertas'],['combos','Menú y Combos'],['conteo','Conteo de Inventario'],['reimpresiones','Reimpresiones'],
    ['tiempos','Tiempos de Entrega'],['reportes','Reportes'],['historial','Historial'],
    ['contable','Contable'],['gastosneg','Gastos'],['auditoria','Auditoría'],
    ['usuarios','Usuarios'],['config','Configuración']];
  const sucHTML=(neg.sucursales&&neg.sucursales.length>1)?`<div class="m-row">
      <label>Sucursales a las que puede entrar (vacío = todas)</label>
      <div class="checks">${neg.sucursales.map(s=>`<label class="chk"><input type="checkbox" class="u-suc" value="${escapeHtml(s.id)}" ${(u&&u.sucursales&&u.sucursales.indexOf(s.id)>-1)?'checked':''}> 📍 ${escapeHtml(s.nombre)}</label>`).join('')}</div>
    </div>`:'';
  const permisosHTML=`
    <div class="cobro-caja" style="margin-top:14px;">
      <strong>Ventanas que puede ver <span class="gris chico">(según lo que necesite)</span></strong>
      <div class="checks" style="margin-top:8px;">${TODAS_PANTALLAS.map(p=>`<label class="chk"><input type="checkbox" class="u-pant" value="${p[0]}" ${pantActuales.indexOf(p[0])>-1?'checked':''}> ${escapeHtml(p[1])}</label>`).join('')}</div>
    </div>
    <div class="cobro-caja" style="margin-top:12px;">
      <strong>Acciones que puede hacer</strong>
      <div class="checks" style="margin-top:8px;">${ACCIONES.map(a=>`<label class="chk"><input type="checkbox" class="u-perm" value="${a[0]}" ${permActuales.indexOf(a[0])>-1?'checked':''}> ${escapeHtml(a[1])}</label>`).join('')}</div>
      <p class="nota" style="margin-top:8px;">Si el rol es <strong>Administrador</strong>, puede hacer todo sin importar estas casillas.</p>
    </div>`;
  abrirModal({titulo:(u?'Editar':'Crear')+' usuario', textoBoton:'Guardar', campos:[
    {id:'nombre', label:'Nombre completo', valor:u?u.nombre:'', requerido:true},
    {id:'usuario', label:'Usuario para entrar', valor:sugerido, requerido:true},
    {id:'pass', label:u?'Nueva contraseña (vacío = no cambiar)':'Contraseña', tipo:'password', valor:'', requerido:!u},
    {id:'rol', label:'Rol (define permisos por defecto)', tipo:'select', valor:u?u.rol:'cajero',
      opciones:ROLES.map(r=>({valor:r[0],label:r[1]}))}
  ], extraHTML: `<label class="chk" style="margin-bottom:10px;"><input type="checkbox" id="u-activo" ${(!u||u.activo!==false)?'checked':''}> Usuario activo (si se desmarca, no puede entrar)</label>` + sucHTML + permisosHTML,
  onGuardar:(d)=>{
    if(!esAdminSistema()){ toast('Solo el administrador del sistema gestiona usuarios','error'); return; }
    const existe=(DB.get('usuarios')||[]).find(x=>x.usuario===d.usuario && (!u||x.id!==u.id))
              || (DB.get('superadmins')||[]).some(s=>s.usuario===d.usuario);
    if(existe){ toast('Ese usuario ya existe','error'); return; }
    const nuevaPass=(d.pass||'').trim();
    const cuentas=conCuentasFirebase(), minPass=cuentas?6:4;
    if((!u || nuevaPass) && nuevaPass.length<minPass){ toast('La contraseña debe tener al menos '+minPass+' caracteres','error'); return; }
    const activo=!!(document.getElementById('u-activo')||{}).checked;
    const sucs=Array.prototype.slice.call(document.querySelectorAll('.u-suc:checked')).map(c=>c.value);
    const pants=Array.prototype.slice.call(document.querySelectorAll('.u-pant:checked')).map(c=>c.value);
    const perms=Array.prototype.slice.call(document.querySelectorAll('.u-perm:checked')).map(c=>c.value);
    const usuarios=DB.get('usuarios')||[];
    if(u){
      const x=usuarios.find(y=>y.id===userId);
      if(x){
        const antes=x.usuario;
        Object.assign(x,{nombre:d.nombre,usuario:d.usuario,rol:d.rol,sucursales:sucs,pantallas:pants,permisos:perms,activo:activo});
        if(nuevaPass && !cuentas) ponerPass(x, nuevaPass);
        DB.set('usuarios',usuarios);
        if(cuentas) trasGuardarCuenta(x, false, antes, nuevaPass);
      }
    } else {
      const rec={id:uid(), negocioId:negId, nombre:d.nombre, usuario:d.usuario,
        rol:d.rol, sucursales:sucs, pantallas:pants, permisos:perms, activo:activo, creado:now()};
      if(cuentas){
        crearCuentaPara(rec, nuevaPass, false).then(c=>{
          rec.uid=c.uid;
          const l=DB.get('usuarios')||[]; l.push(rec); DB.set('usuarios',l);
          cerrarModal(); toast('Usuario creado','success'); render();
        }).catch(e=>toast('No se pudo crear la cuenta: '+mensajeCuenta(e),'error'));
        return;
      }
      usuarios.push(ponerPass(rec, nuevaPass));
      DB.set('usuarios',usuarios);
    }
    cerrarModal(); toast('Usuario guardado','success'); render();
  }});
}
function eliminarUsuario(id){
  if(!esAdminSistema()){ toast('No tienes permiso para eliminar usuarios','error'); return; }
  confirmarModal('¿Eliminar este usuario?',()=>{
    const rec=(DB.get('usuarios')||[]).find(u=>u.id===id);
    if(rec && conCuentasFirebase()){
      borrarCuentaDe(rec.usuario).catch(e=>toast('No se pudo borrar su cuenta de acceso: '+mensajeCuenta(e),'error'));
      quitarUsuarioLegado(id);
    }
    DB.set('usuarios',(DB.get('usuarios')||[]).filter(u=>u.id!==id));
    toast('Eliminado','info'); render();
  },'Eliminar');
}

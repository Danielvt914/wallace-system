// ============================================================
//  INTERFAZ · Negocios
//  Crear, suspender, eliminar, asignar vendedor y supervisar un negocio.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/01-super-admin-panel/01-super-admin-panel.md
// ============================================================


// ---------- Crear negocio ----------
function nuevoNegocio(){
  if(STATE.user&&STATE.user.rolSuper==='vendedor'){ toast('Como vendedor solo puedes crear demos','error'); return; }
  abrirModal({titulo:'Crear negocio', textoBoton:'Crear', campos:[
    {id:'nombre', label:'Nombre del negocio', requerido:true, placeholder:'Ej: MANILLASNET'},
    {id:'tipo', label:'Tipo de negocio', tipo:'select', opciones:Object.keys(PERFILES).map(t=>({valor:t,label:t}))},
    {id:'ciudad', label:'Ciudad'},
    {id:'plan', label:'Plan', tipo:'select', opciones:[...PLANES.map(x=>({valor:x,label:x}))]},
    {id:'precio', label:'Precio mensual', tipo:'number', valor:'149900'},
    {id:'usuario', label:'Usuario del administrador', requerido:true, placeholder:'admin'},
    {id:'pass', label:'Contraseña', requerido:true, valor:'admin123'},
    {id:'vendedor', label:'Vendedor a cargo', tipo:'select',
      opciones:[{valor:'',label:'— Sin asignar —'}].concat((DB.get('superadmins')||[]).map(v=>({valor:v.id,label:v.nombre})))}
  ], extraHTML:`<div class="m-row"><label>¿Cómo cobra este negocio?</label>
      <select id="m-flujo">
        <option value="directo">Cobro directo (tienda: se cobra al instante)</option>
        <option value="dos_pasos">Confirmar y luego cobrar (restaurante: se toma el pedido y se cobra después)</option>
      </select>
      <p class="nota">Esto se puede cambiar después en Configurar.</p>
    </div>`,
  onGuardar:(d)=>{
    const perfil=JSON.parse(JSON.stringify(PERFILES[d.tipo]||PERFILES['Otro']));
    const flujo=(document.getElementById('m-flujo')||{}).value||perfil.flujoPedido;
    const existe=(DB.get('usuarios')||[]).some(u=>u.usuario===d.usuario)
              || (DB.get('superadmins')||[]).some(s=>s.usuario===d.usuario);
    if(existe){ toast('Ese usuario ya existe','error'); return; }
    if(conCuentasFirebase() && (d.pass||'').length<6){ toast('La contraseña debe tener al menos 6 caracteres','error'); return; }
    const negId=uid();
    const negocio={
      id:negId, nombre:d.nombre, tipo:d.tipo, ciudad:d.ciudad||'',
      plan:d.plan, precioMes:parseInt(d.precio)||0, activo:true,
      logo:'', nit:'', tel:'', dir:'', eslogan:'',
      palabraProducto:perfil.palabraProducto, palabraProductos:perfil.palabraProductos,
      palabraPedido:perfil.palabraPedido||'Pedido', palabraPersonal:perfil.palabraPersonal||'Personal',
      usaMesas:perfil.usaMesas, usaCocina:perfil.usaCocina,
      usaRecetas:perfil.usaRecetas, usaCitas:perfil.usaCitas,
      usaCaja: perfil.usaCaja!==false, esLogistica: !!perfil.esLogistica,
      flujoPedido:flujo,
      tiposEntrega:perfil.tiposEntrega.slice(),
      funciones:perfil.funciones.slice(),
      tipoFactura:'pos', pctDatafono:0, sonidos:true, tema:'claro',
      sucursales:[], creado:now(),
      vendedorId:d.vendedor||null,
      vendedorNombre:((DB.get('superadmins')||[]).find(v=>v.id===d.vendedor)||{}).nombre||''
    };
    const admin={id:uid(), negocioId:negId, nombre:'Administrador', usuario:d.usuario, rol:'admin', activo:true, creado:now()};
    const guardarTodo=()=>{
      const negocios=DB.get('negocios')||[]; negocios.push(negocio); DB.set('negocios',negocios);
      const usuarios=DB.get('usuarios')||[]; usuarios.push(admin); DB.set('usuarios',usuarios);
      cerrarModal();
      toast('Negocio creado: '+d.nombre,'success');
      render();
    };
    if(conCuentasFirebase()){
      crearCuentaPara(admin, d.pass, false).then(c=>{ admin.uid=c.uid; guardarTodo(); })
        .catch(e=>toast('No se pudo crear la cuenta del administrador: '+mensajeCuenta(e),'error'));
      return;
    }
    ponerPass(admin, d.pass);
    guardarTodo();
  }});
}

// Asignar o cambiar el vendedor a cargo de un negocio
function asignarVendedor(id){
  if(!esAdminSistema()){ toast('No tienes permiso para asignar vendedores','error'); return; }
  const negocios=DB.get('negocios')||[];
  const n=negocios.find(x=>x.id===id); if(!n) return;
  const sas=DB.get('superadmins')||[];
  abrirModal({titulo:'Vendedor a cargo de '+n.nombre, textoBoton:'Guardar', campos:[
    {id:'vend', label:'Vendedor', tipo:'select', valor:n.vendedorId||'',
      opciones:[{valor:'',label:'— Sin asignar —'}].concat(sas.map(v=>({valor:v.id,label:v.nombre+(v.rolSuper==='vendedor'?' (vendedor)':'')})))},
    {id:'notas', label:'Notas comerciales (opcional)', valor:n.notasComerciales||''}
  ], extraHTML:`<p class="nota">Queda registrado quién atiende este cliente. Se puede filtrar la lista por vendedor y sale en el informe mensual.</p>`,
  onGuardar:(d)=>{
    const arr=DB.get('negocios')||[];
    const x=arr.find(y=>y.id===id); if(!x){ cerrarModal(); return; }
    x.vendedorId=d.vend||null;
    const v=sas.find(y=>y.id===x.vendedorId);
    x.vendedorNombre=v?v.nombre:'';
    x.notasComerciales=d.notas||'';
    DB.set('negocios',arr);
    cerrarModal(); toast(x.vendedorId?('Asignado a '+x.vendedorNombre):'Vendedor quitado','success'); render();
  }});
}
function toggleNegocio(id){
  const negocios=DB.get('negocios')||[];
  const n=negocios.find(x=>x.id===id); if(!n) return;
  if(!STATE.esSuperAdmin){ toast('No tienes permiso','error'); return; }
  // El vendedor solo pausa/activa SUS demos, nunca un negocio real
  if(STATE.user.rolSuper==='vendedor' && (!n.esDemo || (n.demoDe && n.demoDe!==STATE.user.id))){
    toast('Como vendedor solo puedes pausar tus demos','error'); return;
  }
  n.activo=!n.activo;
  DB.set('negocios',negocios);
  toast(n.activo?'Negocio activado':'Negocio suspendido','info');
  render();
}
function eliminarNegocio(id){
  if(STATE.user.rolSuper!=='dueno'){ toast('Solo el dueño del sistema puede eliminar empresas','error'); return; }
  const negocios=DB.get('negocios')||[];
  const n=negocios.find(x=>x.id===id); if(!n) return;
  const nUsuarios=(DB.get('usuarios')||[]).filter(u=>u.negocioId===id).length;
  // Primera confirmación
  confirmarModal(
    '⚠️ Vas a ELIMINAR la empresa "'+n.nombre+'".\n\nSe borrarán TODOS sus datos: '+nUsuarios+' usuario(s), productos, ventas, inventario, caja e historial. Esto NO se puede deshacer.\n\n¿Continuar?',
  ()=>{
    // Segunda confirmación: escribir el nombre
    abrirModal({titulo:'Confirmar eliminación', textoBoton:'Eliminar definitivamente', campos:[
      {id:'conf', label:'Escribe el nombre exacto de la empresa para confirmar', valor:'', requerido:true, placeholder:n.nombre}
    ], extraHTML:`<p class="nota rojo">Empresa a eliminar: <strong>${escapeHtml(n.nombre)}</strong></p>`,
    onGuardar:(d)=>{
      if((d.conf||'').trim()!==n.nombre){ toast('El nombre no coincide. No se eliminó nada.','error'); return; }
      // Borrar las cuentas de acceso de sus usuarios (antes de perder la lista)
      if(conCuentasFirebase()) borrarCuentasDeNegocio(id);
      // Borrar la empresa
      DB.set('negocios', (DB.get('negocios')||[]).filter(x=>x.id!==id));
      // Borrar sus usuarios
      DB.set('usuarios', (DB.get('usuarios')||[]).filter(u=>u.negocioId!==id));
      // Borrar TODAS sus tablas de datos (data_<id>_*), local y nube
      Datos.borrarDatosNegocio(id);
      cerrarModal();
      toast('Empresa "'+n.nombre+'" eliminada por completo','error');
      render();
    }});
  },'Sí, continuar');
}
function entrarComoNegocio(id){
  const neg=(DB.get('negocios')||[]).find(n=>n.id===id); if(!neg) return;
  // Seguridad: un vendedor solo puede entrar a DEMOS, nunca a negocios reales de clientes
  if(STATE.user.rolSuper==='vendedor' && !neg.esDemo){
    toast('Como vendedor solo puedes entrar a negocios de demostración','error'); return;
  }
  STATE.negocio=neg;
  STATE._superUser=STATE.user;   // recordar quién es el super-admin (para volver con su rol)
  STATE.user={nombre:'Supervisor', rol:'admin', negocioId:id, esSupervisor:true};
  STATE.esSuperAdmin=false;
  STATE.modoSupervision=true;
  STATE.sucursal=(sucursalesDe(neg)[0]||{id:'principal'}).id;
  STATE.pageNeg='inicio';
  _facturaReservada=null; reservarFactura();
  // R1: con cuentas el panel no tiene los datos del negocio: se escuchan mientras se supervisa
  if(conCuentasFirebase()) sincronizarNegocio(id);
  toast('Supervisando '+neg.nombre,'info');
  render();
}
function volverSuperAdmin(){
  STATE.esSuperAdmin=true; STATE.modoSupervision=false;
  STATE.negocio=null; STATE.sucursal=null;
  _facturaReservada=null; _resumenNeg=null;
  if(conCuentasFirebase()) detenerSincNegocio();
  // Restaurar el super-admin original (conserva su rolSuper: dueno/ayudante/vendedor)
  STATE.user=STATE._superUser||{nombre:'Súper Administrador', rol:'superadmin', rolSuper:'dueno'};
  STATE._superUser=null;
  STATE.page='';
  render();
}

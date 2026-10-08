// ============================================================
//  INTERFAZ · Panel del super-admin
//  Métricas, lista de negocios, panel del vendedor y respaldo.
//  Adaptador de entrada: script clásico, sus funciones son globales porque
//  las llaman los onclick del HTML generado. Lo carga src/arranque.js en el
//  orden de ui/manifiesto.js. Doc: Documentation/01-super-admin-panel/01-super-admin-panel.md
// ============================================================


// ============================================================
//  PANEL DE SUPER-ADMIN
// ============================================================
function panelSuperAdmin(){
  const negocios=DB.get('negocios')||[];
  // Los negocios DEMO son de práctica (dinero ficticio): NO cuentan en las métricas reales
  const reales=negocios.filter(n=>!n.esDemo);
  const idsReales={}; reales.forEach(n=>idsReales[n.id]=true);
  const activos=reales.filter(n=>n.activo).length;
  const ingreso=reales.filter(n=>n.activo).reduce((a,n)=>a+(n.precioMes||0),0);
  const usuarios=(DB.get('usuarios')||[]).filter(u=>idsReales[u.negocioId]).length;
  let ventasHoy=0, ventasTot=0, top={nombre:'—',total:0};
  const hoy=today();
  // R1: las cifras salen del resumen que publica cada negocio (reportes/resumen.js),
  // no de descargar las ventas de todos los negocios
  let sinCifras=0;
  reales.forEach(n=>{
    const r=resumenDe(n.id);
    if(!r){ sinCifras++; return; }
    const suma=r.total||0;
    ventasTot+=suma;
    ventasHoy+=(r.dias||{})[hoy]||0;
    if(suma>top.total) top={nombre:n.nombre, total:suma};
  });
  const q=(STATE.buscaNegocio||'').toLowerCase();
  let lista=q?negocios.filter(n=>(n.nombre||'').toLowerCase().includes(q)||(n.tipo||'').toLowerCase().includes(q)
      ||(n.ciudad||'').toLowerCase().includes(q)||(n.vendedorNombre||'').toLowerCase().includes(q)):negocios;
  // Filtro por vendedor a cargo
  if(STATE.filtroVendedor){
    lista = STATE.filtroVendedor==='sin' ? lista.filter(n=>!n.vendedorId) : lista.filter(n=>n.vendedorId===STATE.filtroVendedor);
  }
  const sas=DB.get('superadmins')||[];
  const nombreVend=id=>{ const v=sas.find(x=>x.id===id); return v?v.nombre:''; };
  const antig=n=>{ if(!n.creado) return '—'; const d=Math.floor((Date.now()-new Date(n.creado).getTime())/86400000);
    return d<30?d+' d':(Math.floor(d/30)+' mes'+(Math.floor(d/30)===1?'':'es')); };

  // ===== PANEL PARA VENDEDORES (equipo comercial): solo demos =====
  if(STATE.user.rolSuper==='vendedor'){
    const misClientes=negocios.filter(n=>!n.esDemo && n.vendedorId===STATE.user.id);
    const demos=(q?lista:negocios).filter(n=>n.esDemo);
    const misDemos=demos.filter(n=>!n.demoDe || n.demoDe===STATE.user.id);   // sus demos (o todos los demos si no hay dueño marcado)
    return `
    <div class="topbar">
      <h1><span class="sa-emblema">${window.WALLACE_LOGO||''}</span>
        <span class="sa-marca">Panel de <span>Ventas</span></span>
        <span class="pill pill-azul">Vendedor</span></h1>
      <div class="tb-der">
        <span class="fb-dot off" id="fb-status" title="Conexión"></span>
        <span class="reloj" id="reloj"></span>
        <button class="btn btn-sm" onclick="cambiarMiPassSuper()">🔑 Mi contraseña</button>
        <button class="btn btn-ghost btn-sm" onclick="logout()">${ic('logout')} Salir</button>
      </div>
    </div>
    <div class="contenido">
      <div class="tarjeta" style="background:linear-gradient(135deg,rgba(var(--acc-rgb),.12),transparent);">
        <span class="t-tit">👋 Hola, ${escapeHtml(STATE.user.nombre)}</span>
        <p class="gris" style="margin-top:6px;">Aquí puedes crear negocios de demostración para mostrarle el sistema a tus clientes. Crea uno, entra y muéstralo funcionando. Estos demos son solo de práctica y no afectan a los clientes reales.</p>
      </div>
      <div class="stats">
        <div class="stat azul"><div class="stat-ico azul">${ic('box')}</div><div class="stat-lbl">Tus demos</div><div class="stat-val">${misDemos.length}</div><div class="stat-sub">para mostrar</div></div>
        <div class="stat verde"><div class="stat-ico verde">${ic('building')}</div><div class="stat-lbl">Clientes a tu cargo</div><div class="stat-val">${misClientes.length}</div><div class="stat-sub">${misClientes.filter(n=>n.activo).length} activo(s)</div></div>
        <div class="stat gold"><div class="stat-ico gold">${ic('cash')}</div><div class="stat-lbl">Tu cartera al mes</div><div class="stat-val">${fmtMoney(misClientes.filter(n=>n.activo).reduce((a,n)=>a+(n.precioMes||0),0))}</div><div class="stat-sub">de los que están activos</div></div>
      </div>
      ${misClientes.length?`<div class="tarjeta">
        <span class="t-tit">${ic('building')} Tus clientes</span>
        <p class="gris">Negocios reales que tú vendiste. No puedes entrar a sus datos, solo ver cómo van.</p>
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th>Negocio</th><th>Ciudad</th><th>Plan</th><th>Desde</th><th>Estado</th></tr></thead>
          <tbody>${misClientes.map(n=>`<tr>
            <td><strong>${escapeHtml(n.nombre)}</strong></td>
            <td class="gris">${escapeHtml(n.ciudad||'—')}</td>
            <td>${escapeHtml(n.plan||'—')}<br><span class="gris chico">${fmtMoney(n.precioMes||0)}/mes</span></td>
            <td class="gris chico">${n.creado?(n.creado||'').split('T')[0]:'—'}</td>
            <td>${n.activo?'<span class="pill pill-verde">Activo</span>':'<span class="pill pill-rojo">Suspendido</span>'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`:''}
      <div class="tarjeta">
        <div class="t-cab">
          <span class="t-tit">${ic('building')} Mis demostraciones</span>
          <div class="t-acc">
            <button class="btn btn-ghost" onclick="crearNegocioDemo()">✨ Crear demo</button>
          </div>
        </div>
        <div class="tabla-wrap"><table class="tabla tabla-cards">
          <thead><tr><th>Negocio demo</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
          ${misDemos.length? misDemos.map(n=>`<tr>
            <td data-label="Negocio"><strong>${escapeHtml(n.nombre)}</strong> <span class="pill pill-azul" style="font-size:9px;">DEMO</span>${n.ciudad?`<br><span class="gris">${escapeHtml(n.ciudad)}</span>`:''}</td>
            <td data-label="Tipo">${escapeHtml(n.tipo)}</td>
            <td data-label="Estado">${n.activo?'<span class="pill pill-verde">Activo</span>':'<span class="pill pill-rojo">Pausado</span>'}</td>
            <td class="acciones" data-label="Acciones">
              <button class="btn btn-sm btn-verde" onclick="entrarComoNegocio('${n.id}')">Entrar</button>
              <button class="btn btn-sm ${n.activo?'btn-naranja':'btn-verde'}" onclick="toggleNegocio('${n.id}')">${n.activo?'Pausar':'Activar'}</button>
              <button class="btn btn-sm btn-rojo" onclick="eliminarDemoVendedor('${n.id}')" title="Borrar este demo">🗑️</button>
            </td>
          </tr>`).join('') : '<tr><td colspan="4" class="gris">Aún no tienes demos. Crea el primero con "✨ Crear demo".</td></tr>'}
          </tbody>
        </table></div>
      </div>
    </div>`;
  }

  return `
  <div class="topbar">
    <h1><span class="sa-emblema">${window.WALLACE_LOGO||''}</span>
      <span class="sa-marca">Panel de <span>Super-Admin</span></span>
      <span class="pill pill-oro">Dueño del sistema</span></h1>
    <div class="tb-der">
      <span class="fb-dot off" id="fb-status" title="Conexión"></span>
      <span class="reloj" id="reloj"></span>
      <button class="btn btn-sm" onclick="descargarRespaldo()">💾 Respaldo</button>
      ${sinCifras?`<button class="btn btn-sm btn-naranja" onclick="calcularResumenes()" title="Negocios sin cifras publicadas todavía">📊 Calcular cifras (${sinCifras})</button>`:''}
      ${(STATE.user.rolSuper==='dueno')?`<button class="btn btn-sm" onclick="STATE.page='superadmins';render()">👥 Administradores</button>`:''}
      ${(conCuentasFirebase() && esAdminSistema())?`<button class="btn btn-sm" onclick="abrirMigracion()">🔐 Cuentas</button>`:''}
      <button class="btn btn-sm" onclick="cambiarMiPassSuper()">🔑 Mi contraseña</button>
      <button class="btn btn-ghost btn-sm" onclick="logout()">${ic('logout')} Salir</button>
    </div>
  </div>
  <div class="contenido">
    <div class="stats">
      <div class="stat gold"><div class="stat-ico gold">${ic('box')}</div><div class="stat-lbl">Negocios activos</div><div class="stat-val">${activos}</div><div class="stat-sub">de ${reales.length} en total</div></div>
      <div class="stat verde"><div class="stat-ico verde">${ic('cash')}</div><div class="stat-lbl">Ingreso mensual</div><div class="stat-val">${fmtMoney(ingreso)}</div><div class="stat-sub">suma de planes activos</div></div>
      <div class="stat naranja"><div class="stat-ico naranja">${ic('history')}</div><div class="stat-lbl">Suspendidos</div><div class="stat-val">${reales.length-activos}</div><div class="stat-sub">no pagan / pausados</div></div>
      <div class="stat azul"><div class="stat-ico azul">${ic('users')}</div><div class="stat-lbl">Usuarios totales</div><div class="stat-val">${usuarios}</div><div class="stat-sub">empleados en el sistema</div></div>
    </div>
    <div class="stats">
      <div class="stat gold"><div class="stat-ico gold">${ic('report')}</div><div class="stat-lbl">Ventas hoy (todos)</div><div class="stat-val">${fmtMoney(ventasHoy)}</div><div class="stat-sub">movimiento del sistema</div></div>
      <div class="stat verde"><div class="stat-ico verde">${ic('cash')}</div><div class="stat-lbl">Ventas históricas</div><div class="stat-val">${fmtMoney(ventasTot)}</div><div class="stat-sub">todos los negocios</div></div>
      <div class="stat gold"><div class="stat-ico gold">${ic('building')}</div><div class="stat-lbl">Negocio con más ventas</div><div class="stat-val" style="font-size:19px;">${escapeHtml(top.nombre)}</div><div class="stat-sub">${fmtMoney(top.total)}</div></div>
    </div>
    ${(()=>{ const sas2=DB.get('superadmins')||[];
      const porVend={};
      reales.forEach(n=>{ const k=n.vendedorId||'sin'; if(!porVend[k]) porVend[k]={n:0,mes:0,activos:0};
        porVend[k].n++; if(n.activo){ porVend[k].activos++; porVend[k].mes+=(n.precioMes||0); } });
      const filas=Object.keys(porVend);
      if(filas.length<=1 && filas[0]==='sin') return '';
      return `<div class="tarjeta">
        <span class="t-tit">${ic('users')} Cartera por vendedor</span>
        <p class="gris">Cuántos clientes atiende cada uno y cuánto factura su cartera al mes.</p>
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th>Vendedor</th><th>Negocios</th><th>Activos</th><th>Factura al mes</th></tr></thead>
          <tbody>${filas.map(k=>{
            const v=sas2.find(x=>x.id===k);
            return `<tr>
              <td><strong>${k==='sin'?'<span class="rojo">Sin asignar</span>':escapeHtml(v?v.nombre:'(eliminado)')}</strong>${v&&v.rolSuper==='vendedor'?' <span class="pill pill-verde chico">vendedor</span>':''}</td>
              <td class="negrita">${porVend[k].n}</td>
              <td class="verde">${porVend[k].activos}</td>
              <td class="oro negrita">${fmtMoney(porVend[k].mes)}</td>
            </tr>`;}).join('')}</tbody>
        </table></div>
      </div>`; })()}
    <div class="tarjeta">
      <div class="t-cab">
        <span class="t-tit">${ic('building')} Negocios</span>
        <div class="t-acc">
          <input type="text" class="busca" placeholder="🔍 Buscar negocio, ciudad o vendedor..." value="${escapeHtml(STATE.buscaNegocio||'')}" oninput="STATE.buscaNegocio=this.value;render()">
          <select class="busca" onchange="STATE.filtroVendedor=this.value;render()">
            <option value="">Todos los vendedores</option>
            <option value="sin" ${STATE.filtroVendedor==='sin'?'selected':''}>Sin asignar</option>
            ${sas.map(v=>`<option value="${v.id}" ${STATE.filtroVendedor===v.id?'selected':''}>${escapeHtml(v.nombre)}</option>`).join('')}
          </select>
          <button class="btn btn-ghost" onclick="crearNegocioDemo()" title="Crea un negocio de ejemplo ya lleno para mostrar">✨ Crear demo</button>
          <button class="btn btn-gold" onclick="nuevoNegocio()">${ic('plus')} Crear negocio</button>
        </div>
      </div>
      <div class="tabla-wrap"><table class="tabla tabla-cards">
        <thead><tr><th>Negocio</th><th>Tipo</th><th>Vendedor</th><th>Desde</th><th>Plan</th><th>Precio/mes</th><th>Usuarios</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
        ${lista.length? lista.map(n=>`<tr>
          <td data-label="Negocio"><strong>${escapeHtml(n.nombre)}</strong>${n.esDemo?' <span class="pill pill-azul" style="font-size:9px;">DEMO</span>':''}${n.ciudad?`<br><span class="gris">${escapeHtml(n.ciudad)}</span>`:''}${(n.sucursales&&n.sucursales.length>1)?`<br><span class="gris">📍 ${n.sucursales.length} sedes</span>`:''}</td>
          <td data-label="Tipo">${escapeHtml(n.tipo)}</td>
          <td data-label="Vendedor">${n.vendedorId?escapeHtml(nombreVend(n.vendedorId)||n.vendedorNombre||'—'):'<span class="pill pill-rojo chico">Sin asignar</span>'}</td>
          <td data-label="Desde" class="gris chico">${n.creado?(n.creado||'').split('T')[0]:'—'}<br>${antig(n)}</td>
          <td data-label="Plan">${escapeHtml(n.plan||'—')}</td>
          <td data-label="Precio/mes">${fmtMoney(n.precioMes)}</td>
          <td data-label="Usuarios">${(DB.get('usuarios')||[]).filter(u=>u.negocioId===n.id).length}</td>
          <td data-label="Estado">${n.activo?'<span class="pill pill-verde">Activo</span>':'<span class="pill pill-rojo">Suspendido</span>'}</td>
          <td class="acciones" data-label="Acciones">
            <button class="btn btn-sm btn-verde" onclick="entrarComoNegocio('${n.id}')">Entrar</button>
            <button class="btn btn-sm" onclick="configNegocio('${n.id}')">Configurar</button>
            <button class="btn btn-sm" onclick="usuariosNegocio('${n.id}')">Usuarios</button>
            <button class="btn btn-sm" onclick="reporteMensualNegocio('${n.id}')" title="Informe mensual en PDF">📄 Informe</button>
            <button class="btn btn-sm" onclick="asignarVendedor('${n.id}')" title="Asignar vendedor a cargo">👤 Vendedor</button>
            <button class="btn btn-sm ${n.activo?'btn-naranja':'btn-verde'}" onclick="toggleNegocio('${n.id}')">${n.activo?'Suspender':'Activar'}</button>
            ${STATE.user.rolSuper==='dueno'?`<button class="btn btn-sm btn-rojo" onclick="eliminarNegocio('${n.id}')" title="Eliminar empresa">🗑️</button>`:''}
          </td>
        </tr>`).join('') : '<tr><td colspan="8" class="gris">No hay negocios. Crea el primero.</td></tr>'}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ---------- Respaldo (copia de seguridad de TODO el sistema) ----------
function descargarRespaldo(){
  if(!esAdminSistema()){ toast('No tienes permiso para descargar el respaldo','error'); return; }
  toast('Preparando respaldo...','info');
  const bajar=(data)=>{
    try{
      const respaldo={
        sistema:'Wallace System',
        fecha:new Date().toISOString(),
        datos:data
      };
      const blob=new Blob([JSON.stringify(respaldo,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const f=new Date();
      const nombre='respaldo-wallace-'+f.getFullYear()+'-'
        +String(f.getMonth()+1).padStart(2,'0')+'-'
        +String(f.getDate()).padStart(2,'0')+'.json';
      a.href=url; a.download=nombre;
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },500);
      toast('Respaldo descargado: '+nombre,'success');
    }catch(e){ console.error(e); toast('No se pudo generar el respaldo','error'); }
  };
  Datos.exportarTodo().then(r=>{
    if(r.origen==='local' && FB_READY) toast('Sin nube: respaldo con datos locales','info');
    bajar(r.datos);
  });
}

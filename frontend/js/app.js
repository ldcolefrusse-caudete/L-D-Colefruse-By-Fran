var TOKEN=null,ROL=null,NOMBRE=null,UID=null;
var CL={},ZONE_OBS={},ZONE_INC={},ZONE_TIMERS={},ZONAS_INT_NT={},_timers={},_asigTab='zona';
var ZCOLORS=['linear-gradient(135deg,#6C63FF,#9F97FF)','linear-gradient(135deg,#FF6584,#FF9AAD)','linear-gradient(135deg,#43C59E,#6DDBB5)','linear-gradient(135deg,#F7A440,#FFC470)','linear-gradient(135deg,#4ECDC4,#7EDDD6)','linear-gradient(135deg,#FF6B6B,#FF9B9B)','linear-gradient(135deg,#A855F7,#C084FC)','linear-gradient(135deg,#3B82F6,#60A5FA)'];
var ZEMOJIS=['🤢','⚙️','🧹','🔧','🏗️','💧','🔬','🏠'];
var FREQS={diaria:'Diaria',semanal:'Semanal',quincenal:'Quincenal',mensual:'Mensual',trimestral:'Trimestral',semestral:'Semestral',anual:'Anual'};

function G(id){return document.getElementById(id);}
function safeHora(h){if(!h)return'--:--';var s=String(h);if(s.indexOf('T')>0){var p=s.split('T')[1].split(':');return p[0]+':'+p[1];}return s.slice(0,5)||'--:--';}
function safeColor(col,fallback){var s=String(col||'');return /^#[0-9A-Fa-f]{3,8}$/.test(s)?s:(fallback||'#E0E0E0');}
function pc(h){G('main').innerHTML=h;}
function sp(){pc('<div class="spin"></div>');}
function today(){var d=new Date();return d.getFullYear()+'-'+(('0'+(d.getMonth()+1)).slice(-2))+'-'+(('0'+d.getDate()).slice(-2));}
function fmtT(s){s=parseInt(s)||0;var m=Math.floor(s/60),sc=s%60;return(m<10?'0':'')+m+':'+(sc<10?'0':'')+sc;}
function fmtIso(d){return d.getFullYear()+'-'+(('0'+(d.getMonth()+1)).slice(-2))+'-'+(('0'+d.getDate()).slice(-2));}

// FUNCIÓN API CORREGIDA (Evita "Uncaught Gs")
function api(action,payload,cb){
  try {
    var safePayload = payload ? JSON.parse(JSON.stringify(payload)) : {};
    google.script.run
      .withSuccessHandler(function(r){if(cb)cb(r);})
      .withFailureHandler(function(e){
        var msg=e&&e.message?e.message:String(e);
        var main=G('main');
        if(main&&action==='getDashboard'){main.innerHTML='<div class="card" style="color:var(--danger);padding:20px"><strong>Error:</strong> '+msg+'</div>';}
        toast(msg,false);if(cb)cb(null);
      })
      .api(TOKEN,action,safePayload);
  } catch(err) {
    console.error(err); toast("Error interno de datos", false);
  }
}

function toast(msg,ok){var t=document.createElement('div');t.className='toast';t.style.background=ok===false?'var(--danger)':ok==='warn'?'var(--warn)':'var(--tx)';t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},3200);}
function modal(title,bodyEl,btns){
  closeModal();var mbg=document.createElement('div');mbg.className='mbg';mbg.id='AM';
  var mbox=document.createElement('div');mbox.className='mbox';
  var mt=document.createElement('div');mt.className='mtitle';mt.textContent=title;
  var ma=document.createElement('div');ma.className='mact';
  btns.forEach(function(x){var b=document.createElement('button');b.className='btn '+(x.p?'btn-p':x.d?'btn-d':'');b.textContent=x.label;b.onclick=x.fn;ma.appendChild(b);});
  mbox.appendChild(mt);if(typeof bodyEl==='string'){var d=document.createElement('div');d.innerHTML=bodyEl;mbox.appendChild(d);}else mbox.appendChild(bodyEl);
  mbox.appendChild(ma);mbg.appendChild(mbox);mbg.addEventListener('click',function(e){if(e.target===mbg)closeModal();});G('mc').appendChild(mbg);
}
function closeModal(){var m=G('AM');if(m)m.remove();}
function mkFg(lbl,inputHtml){var d=document.createElement('div');d.className='fg';d.innerHTML='<label>'+lbl+'</label>'+inputHtml;return d;}

// APP Y LOGIN
G('lpp').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
function doLogin(){
  var u=G('luu').value.trim(),p=G('lpp').value;var err=G('lerr'),btn=G('lbtn');err.style.display='none';
  if(!u||!p){err.textContent='Introduce usuario y contraseña';err.style.display='block';return;}
  btn.textContent='Verificando...';btn.disabled=true;
  google.script.run.withSuccessHandler(function(r){
    btn.textContent='Iniciar sesión';btn.disabled=false;
    if(!r||!r.ok){err.textContent=r?r.msg:'Sin respuesta';err.style.display='block';return;}
    TOKEN=r.token;ROL=(r.usuario.rol||'').toLowerCase().replace(/ /g,'_');NOMBRE=r.usuario.nombre;UID=r.usuario.id;
    startApp(r.usuario);
  }).withFailureHandler(function(e){btn.textContent='Iniciar sesión';btn.disabled=false;err.textContent='Error: '+(e.message||String(e));err.style.display='block';}).login(u,p);
}
function startApp(u){
  G('ls').style.display='none';
  G('app').style.display='flex';
  var ini=(u.iniciales||u.nombre.slice(0,2)).toUpperCase(), col=u.color||'rgba(255,255,255,.25)';
  G('tav').textContent=ini; G('tav').style.background=col; G('tav').style.color='white';
  G('tnm').textContent=u.nombre; G('sbav').textContent=ini; G('sbav').style.background=col; G('sbav').style.color='white'; G('sbnm').textContent=u.nombre;
  var rn={admin:'Administrador',supervisor:'Supervisor',worker:'Trabajador',consultor:'Consultor',mantenimiento:'Mantenimiento',jefe_mantenimiento:'Jefe Mantenimiento',laboratorio:'Laboratorio'};
  G('sbrole').textContent=rn[u.rol]||u.rol; 
  applyRoles(u.rol);
  
  // 🔥 REDIRECCIÓN INICIAL
  if(u.rol === 'mantenimiento' || u.rol === 'jefe_mantenimiento') goTo('incidencias');
  else if(u.rol === 'laboratorio') goTo('luminometro');
  else if(u.rol === 'consultor') goTo('informes');
  else if(u.rol === 'worker') goTo('checklist'); // ✅ El trabajador va directo a sus tareas
  else goTo('dashboard');
}
function applyRoles(rol){
  var isW=rol==='worker',isA=rol==='admin',isSup=rol==='supervisor'||isA,isC=rol==='consultor',isMant=rol==='mantenimiento',isJefeMant=rol==='jefe_mantenimiento',isLab=rol==='laboratorio';
  
  document.querySelectorAll('.r-check').forEach(function(el){el.style.display=isC?'none':'';});
  document.querySelectorAll('.r-sup').forEach(function(el){el.style.display=isSup?'':'none';});
  document.querySelectorAll('.r-adm').forEach(function(el){el.style.display=isA?'':'none';});
  document.querySelectorAll('.r-lum').forEach(function(el){el.style.display=(isSup||isLab)?'':'none';});
  document.querySelectorAll('.r-inf').forEach(function(el){el.style.display=(isW||isMant)?'none':'';});
  document.querySelectorAll('.r-mant').forEach(function(el){el.style.display=(isMant||isJefeMant||isSup)?'':'none';});
  
  if(isMant){document.querySelectorAll('.sni,.sns').forEach(function(el){if(el.id!=='ni-incidencias')el.style.display='none';});}
  if(isLab){document.querySelectorAll('.sni,.sns').forEach(function(el){if(el.id!=='ni-luminometro')el.style.display='none';});}
  if(isC){document.querySelectorAll('.sni,.sns').forEach(function(el){if(el.id!=='ni-informes')el.style.display='none';});}
  
  // 🔥 OCULTAR BOTÓN DASHBOARD PARA TRABAJADORES
  if(isW) {
     var btnDash = document.getElementById('ni-dashboard');
     if(btnDash) btnDash.style.display = 'none';
  }
}
function showUserMenu(){
  var wrap=document.createElement('div');var rp=document.createElement('p');rp.style.cssText='color:var(--tx2);margin-bottom:16px';rp.innerHTML='Rol: <strong>'+ROL+'</strong>';
  var f1=mkFg('Nueva contraseña','<input type="password" id="np1">');var f2=mkFg('Confirmar contraseña','<input type="password" id="np2">');
  wrap.appendChild(rp);wrap.appendChild(f1);wrap.appendChild(f2);
  modal('Mi cuenta',wrap,[{label:'Cerrar sesión',fn:doLogout,d:true},{label:'Cambiar contraseña',fn:chgPass,p:true}]);
}
function chgPass(){var p1=G('np1').value,p2=G('np2').value;if(!p1||p1!==p2){toast('No coinciden','warn');return;}api('cambiarPassword',{id:UID,newPassword:p1},function(r){toast(r&&r.ok?'Cambiado':'Error',r&&r.ok);if(r&&r.ok)closeModal();});}
function doLogout(){google.script.run.withSuccessHandler(function(){TOKEN=null;closeModal();G('app').style.display='none';G('ls').style.display='flex';G('luu').value='';G('lpp').value='';G('lerr').style.display='none';}).logout(TOKEN);}
function togSB(){G('sbar').classList.toggle('open');G('sov').classList.toggle('open');}
function goTo(page){
  var res={worker:['dashboard','zonas','usuarios','config','periodicidades','informes','incidencias','luminometro','vacaciones','residuos','asignaciones'],consultor:['checklist','zonas','usuarios','config','periodicidades','incidencias','vacaciones','dashboard','historial','luminometro','residuos','asignaciones'],mantenimiento:['checklist','zonas','usuarios','config','periodicidades','informes','historial','dashboard','luminometro','vacaciones','residuos','asignaciones'],jefe_mantenimiento:[],laboratorio:['checklist','zonas','usuarios','config','periodicidades','informes','incidencias','dashboard','historial','residuos','asignaciones']};
  if(res[ROL]&&res[ROL].indexOf(page)>=0)return;
  document.querySelectorAll('.sni').forEach(function(n){n.classList.remove('active');});
  var ni=G('ni-'+page);if(ni)ni.classList.add('active');
  var tit={dashboard:'Dashboard',checklist:'Checklist Diario',historial:'Mi Historial',periodicidades:'Periodicidades',zonas:'Zonas',vacaciones:'Vacaciones',usuarios:'Usuarios',informes:'Informes',incidencias:'Incidencias',residuos:'Residuos',config:'Configuración',luminometro:'Luminómetro ATP', asignaciones:'Asignación Rápida'};
  G('ptitle').textContent=tit[page]||page;G('sbar').classList.remove('open');G('sov').classList.remove('open');sp();
  ({dashboard:pgDash,checklist:pgCheck,historial:pgHist,periodicidades:pgPeri,zonas:pgZonas,vacaciones:pgVacaciones,usuarios:pgUsers,informes:pgInformes,incidencias:pgIncidencias,residuos:pgResiduos,config:pgConfig,luminometro:pgLuminometro, asignaciones:pgAsignaciones})[page]();
}

// ============================================================
// VARIABLES GLOBALES DEL CHECKLIST
// ============================================================
var CL = {}; // Almacena el estado temporal de los botones
var ZONE_TIMERS = {}; // Almacena la hora de inicio de cada zona
var ZONAS_RECIEN_VALIDADAS = {}; // Memoria temporal para la vista del supervisor

// ============================================================
// CHECKLIST DIARIO (ENTRY POINT)
// ============================================================
function pgCheck(){
  api('getChecklist',{},function(r){
    if(!r||!r.ok){pc('<div class="card" style="padding:20px;text-align:center;color:red">Error cargando checklist</div>');return;}
    if(!r.data.length){pc('<div class="card" style="padding:40px;text-align:center;color:var(--tx3)"><div style="font-size:40px;margin-bottom:10px">☕</div><h3>Sin tareas pendientes</h3><p>No tienes zonas asignadas o ya las has completado todas.</p></div>');return;}
    
    CL = {}; // Reiniciamos estado al cargar
    
    if(ROL==='admin'||ROL==='supervisor') renderCheckSup(r.data);
    else renderCheckWorker(r.data);
  });
}

// ============================================================
// VISTA: SUPERVISOR (VALIDAR / RECHAZAR)
// ============================================================
function renderCheckSup(zonas) {
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">';
  h += '<div><h2 style="font-size:17px;font-weight:800">Validación del día</h2>';
  h += '<p style="font-size:12px;color:var(--tx3)">' + new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p></div>';
  
  // Botón Validar Todo
  h += '<button id="btn-val-todo" class="btn btn-p" style="background:var(--g); border:none; padding:10px 20px; font-weight:800" onclick="validarTodoCheck()">✅ Validar Todo</button></div>';
  
  var hayRegistros = false;

  zonas.forEach(function (z, idx) {
    var realizadas = [];
    if (z.subzonasDirectas) z.subzonasDirectas.forEach(function(s) { if (s.registrado) realizadas.push(s); });
    if (z.intermedias) {
      z.intermedias.forEach(function(si) {
        if (si.subzonas) si.subzonas.forEach(function(s) {
          var sConInt = Object.assign({}, s);
          sConInt.nombre = '📁 ' + si.nombre + ' - ' + s.nombre;
          if (s.registrado) realizadas.push(sConInt);
        });
      });
    }

    if (!realizadas.length) return;
    hayRegistros = true;

    var grad = ZCOLORS[idx % ZCOLORS.length];
    
    // Comprobamos si viene validada del servidor O si la acabamos de validar localmente
    var yaValidadaEnServer = realizadas.some(function(s) { return !!s.validadoPor; });
    var yaValidadaLocal = !!ZONAS_RECIEN_VALIDADAS[z.zona];
    var yaValidada = yaValidadaEnServer || yaValidadaLocal;
    
    var validadorNombre = yaValidadaEnServer 
      ? realizadas.find(function(s) { return !!s.validadoPor; }).validadoPor 
      : (yaValidadaLocal ? 'Ti (procesando...)' : '');

    var bg = yaValidada ? '#f0fff8' : 'var(--sur)';
    var bord = yaValidada ? '#86efac' : 'var(--bd)';

    h += '<div class="card-check ' + (yaValidada ? '' : 'is-expanded') + '" id="card-sup-' + idx + '" data-zona-nombre="'+z.zona+'" style="border:2px solid ' + bord + '; background:' + bg + '">';
    h += '<div class="card-header-clickable" ondblclick="toggleCard(this.parentElement)" style="background:' + grad + '; padding:14px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; cursor:pointer">';
    h += '  <strong style="color:white; font-size:14px; flex:1">' + z.zona + '</strong>';
    h += '  <span style="background:rgba(255,255,255,.25); color:white; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700">' + realizadas.length + ' tareas hechas</span>';
    
    if (yaValidada) {
      h += '  <button class="btn btn-sm btn-status-val" disabled style="background:#dcfce7; color:#166534; font-weight:800; border:none; opacity:1; cursor:not-allowed">✅ Validada: ' + validadorNombre + '</button>';
    } else {
      h += '  <div style="display:flex;gap:6px" class="btn-container">';
      h += '    <button class="btn btn-sm btn-rechazar" style="background:#fee2e2; color:#991b1b; font-weight:800; border:none" onclick="event.stopPropagation(); procesarZonaCheck(\'' + z.zona + '\', this, \'rechazar\')">❌ Rechazar</button>';
      h += '    <button class="btn btn-sm btn-validar" style="background:white; color:var(--g); font-weight:800; border:none" onclick="event.stopPropagation(); procesarZonaCheck(\'' + z.zona + '\', this, \'validar\')">✅ Validar</button>';
      h += '  </div>';
    }
    h += '</div>';
    
    h += '<div class="tw"><table style="font-size:13px; width:100%; border-collapse:collapse;"><thead><tr style="background:rgba(0,0,0,0.02)"><th style="padding:10px; text-align:left; border-bottom:1px solid var(--bd)">Subzona</th><th style="padding:10px; text-align:left; border-bottom:1px solid var(--bd)">Personal</th><th style="padding:10px; text-align:center; border-bottom:1px solid var(--bd)">Tipo</th><th style="padding:10px; text-align:center; border-bottom:1px solid var(--bd)">Hora</th><th style="padding:10px; text-align:center; border-bottom:1px solid var(--bd)">OK</th><th style="padding:10px; text-align:left; border-bottom:1px solid var(--bd)">Observaciones</th></tr></thead><tbody>';
    
    realizadas.forEach(function (s) {
      var tipoDisplay = s.tipo ? '<span class="' + (s.tipo === 'GRUESO' ? 'tg' : 'tl') + '">' + s.tipo + '</span>' : '—';
      var okDisplay = (s.ok === 'SÍ' || s.ok === true) ? '<span class="bg-g">OK</span>' : '<span class="bg-gr">—</span>';
      h += '<tr style="border-bottom:1px solid var(--bd)"><td style="padding:10px; font-weight:700">' + s.nombre + '</td><td style="padding:10px; color:var(--tx2); font-size:12px">' + (s.personal_real || s.personal || '—') + '</td><td style="padding:10px; text-align:center">' + tipoDisplay + '</td><td style="padding:10px; text-align:center; color:var(--tx3); font-size:12px; font-family:monospace">' + (s.hora || '—') + '</td><td style="padding:10px; text-align:center">' + okDisplay + '</td><td style="padding:10px; font-size:12px; color:var(--tx2); max-width:200px">' + (s.comentario || '—') + '</td></tr>';
    });
    
    h += '</tbody></table></div></div>';
  });

  if (!hayRegistros) h += '<div class="card" style="text-align:center; padding:40px; color:var(--tx3)">Aún no hay tareas para validar.</div>';
  pc(h);
}

// ----------------------------------------------------
// ACCIONES DEL SUPERVISOR
// ----------------------------------------------------
async function validarTodoCheck() {
  var btnTodo = document.getElementById('btn-val-todo');
  var containers = document.querySelectorAll('.card-check:not(.is-validated) .btn-validar'); 
  
  if (containers.length === 0) { alert("No hay zonas pendientes de validar."); return; }
  if (!confirm("¿Deseas validar todas las zonas pendientes (" + containers.length + ") de golpe?")) return;

  btnTodo.disabled = true;
  btnTodo.textContent = "⌛ Procesando todo...";

  for (var btn of containers) {
    var card = btn.closest('.card-check');
    var zonaNombre = card.getAttribute('data-zona-nombre');
    await new Promise(resolve => {
      ZONAS_RECIEN_VALIDADAS[zonaNombre] = true; 
      api('validarZona', {zona: zonaNombre}, function() { resolve(); });
    });
  }
  toast("✅ Todas las zonas han sido validadas");
  setTimeout(pgCheck, 1500); 
}

function procesarZonaCheck(zona, btn, accion){
  var container = btn.parentElement;
  if(btn){
    btn.disabled = true;
    btn.textContent = '⏳...';
    Array.from(container.children).forEach(function(b) { b.disabled = true; });
  }
  
  var endpoint = accion === 'validar' ? 'validarZona' : 'rechazarZona'; 
  if(accion === 'validar') ZONAS_RECIEN_VALIDADAS[zona] = true;
  else delete ZONAS_RECIEN_VALIDADAS[zona];

  api(endpoint, {zona: zona}, function(r){
    if (r && r.ok) {
      if(accion === 'validar') {
         btn.textContent = '✅ Validada por ti';
         btn.style.background = '#dcfce7';
         btn.style.color = '#166534';
         var rechazarBtn = container.querySelector('.btn-rechazar');
         if(rechazarBtn) rechazarBtn.style.display = 'none';
      }
      setTimeout(pgCheck, 2000); 
    } else {
      delete ZONAS_RECIEN_VALIDADAS[zona]; 
      toast(r ? r.msg : 'Error', false);
      if(btn){
        Array.from(container.children).forEach(function(b) { b.disabled = false; });
        btn.textContent = accion === 'validar' ? '✅ Validar' : '❌ Rechazar';
      }
    }
  });
}

// ============================================================
// VISTA: TRABAJADOR (CHECKLIST Y BOTONES)
// ============================================================
function renderCheckWorker(zonas){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">';
  h+='<div><h2 style="font-size:18px;font-weight:800">Tareas de hoy</h2><p style="font-size:12px;color:var(--tx3)">Reporta el trabajo realizado</p></div>';
  h+='<button id="btn-save-main" class="btn btn-p" onclick="saveCheck()">💾 Guardar Todo</button></div>';
  
  zonas.forEach(function(z,idx){
    var grad=ZCOLORS[idx%ZCOLORS.length];
    
    // Contamos si hay algo PENDIENTE en esta zona
    var todas = [];
    if(z.subzonasDirectas) todas = todas.concat(z.subzonasDirectas);
    z.intermedias.forEach(si => { todas = todas.concat(si.subzonas); });
    
    var hayPendientes = todas.some(s => s.registrado === false);

    h+='<div class="zcard"><div class="zhdr" style="background:'+grad+'">';
    h+='<strong style="flex:1;color:white;cursor:pointer" onclick="togZonaById('+z.id+')">📍 '+z.zona+'</strong>';
    
    // El botón de timer solo se bloquea si TODO está hecho. 
    // Si añades una tarea nueva al Excel, este botón volverá a activarse solo.
    if (!hayPendientes) {
      h+='<button class="btn btn-sm" disabled style="background:rgba(255,255,255,0.3);border:none;color:white">✅ Hecho</button>';
    } else {
      h+='<button id="btn-timer-'+z.id+'" class="btn btn-sm" style="background:white;color:var(--tx);font-weight:700" onclick="event.stopPropagation(); toggleTimer('+z.id+')">▶️ Iniciar</button>';
    }
    h+='<span class="zarr" id="za'+z.id+'" onclick="togZonaById('+z.id+')">▼</span></div>';
    
    // La zona se muestra expandida si hay tareas pendientes
    h+='<div id="zb'+z.id+'" style="display:'+(hayPendientes?'block':'none')+'">';
    
    z.intermedias.forEach(function(si){
      var intPendiente = si.subzonas.some(s => s.registrado === false);
      h+='<div class="int-container" style="background:var(--gl);border-left:4px solid var(--g);margin:6px 10px;border-radius:var(--r);overflow:hidden">';
      h+='<div style="padding:10px 14px;display:flex;align-items:center;gap:8px;background:rgba(26,71,42,.08)">';
      h+='<span style="font-size:12px;font-weight:800;color:var(--g);flex:1">📁 '+si.nombre+'</span>';
      if(intPendiente){
        h+='<button class="tb sg2" style="font-size:10px" onclick="marcarIntTipo(this, \'GRUESO\')">GRUESO</button>';
        h+='<button class="tb sl2" style="font-size:10px" onclick="marcarIntTipo(this, \'L+D\')">L+D</button>';
      }
      h+='</div>';
      
      if(intPendiente){
        h+='<div style="padding:10px 14px;background:#fff;display:flex;gap:15px">';
        h+='<label style="font-size:11px;font-weight:700">QUERAT: <input type="number" id="iquer_'+z.id+'_'+si.id+'" step="0.1" style="width:60px"></label>';
        h+='<label style="font-size:11px;font-weight:700">MAQUINA: <input type="number" id="ibarr_'+z.id+'_'+si.id+'" step="0.1" style="width:60px"></label>';
        h+='</div>';
      }
      si.subzonas.forEach(function(s){ h+=renderSzRow(s, z.id, si.id); });
      h+='</div>';
    });
    
    z.subzonasDirectas.forEach(function(s){ h+=renderSzRow(s, z.id, ''); });
    
    h+='<div class="zfooter">...</div>'; // Resto del footer igual
    h+='</div></div>';
  });
  pc(h);
}

// ----------------------------------------------------
// ACCIONES Y BOTONES DEL TRABAJADOR
// ----------------------------------------------------
function renderSzRow(s, zid, iid){
  if(s.registrado) {
    return '<div class="szrow is-locked" style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;opacity:0.65;user-select:none">' +
           '<span style="font-size:14px;flex:1;text-decoration:line-through;color:var(--tx3)">' + s.nombre + '</span>' +
           '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">✓ ' + (s.tipo || 'COMPLETADO') + '</span>' +
           '<span style="font-size:16px" title="Ya reportado">🔒</span></div>';
  }

  var key = zid + '_' + s.id;
  var st = CL[key]||{}, t=st.tipo||s.tipo||'';
  
  return '<div class="szrow'+(t?' done':'')+'" data-szid="'+s.id+'" data-zid="'+zid+'" data-iid="'+iid+'" style="padding:8px 10px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
    '<div class="sz-nm" style="flex:1;font-size:13px;font-weight:600;min-width:120px;color:var(--tx)">'+s.nombre+'</div>'+
    '<div class="sz-ctl" style="display:flex;gap:4px">' +
      '<button class="tb tb-g'+(t==='GRUESO'?' sg2':'')+'" onclick="setTipoSz(this, '+zid+', '+s.id+', \'GRUESO\')">GRUESO</button>'+
      '<button class="tb tb-l'+(t==='L+D'?' sl2':'')+'" onclick="setTipoSz(this, '+zid+', '+s.id+', \'L+D\')">L+D</button>'+
      '<button class="ib'+(st.obs?' has':'')+'" onclick="modalObs('+zid+', '+s.id+', \''+s.nombre+'\')" title="Añadir nota">💬</button>'+
      '<button class="ib'+(st.fotoBase64?' has':'')+'" onclick="modalFoto('+zid+', '+s.id+', \''+s.nombre+'\')" title="Añadir foto">📷</button>'+
    '</div></div>';
}

function setTipoSz(btnClicked, zid, szId, tipo){
  var key = zid + '_' + szId;
  if(!CL[key]) CL[key]={}; 
  CL[key].tipo = CL[key].tipo === tipo ? '' : tipo; // Efecto Toggle
  
  var row = btnClicked.closest('.szrow');
  var btnG = row.querySelector('.tb-g');
  var btnL = row.querySelector('.tb-l');
  
  if(btnG) btnG.className = 'tb tb-g' + (CL[key].tipo === 'GRUESO' ? ' sg2' : '');
  if(btnL) btnL.className = 'tb tb-l' + (CL[key].tipo === 'L+D' ? ' sl2' : '');
  if (CL[key].tipo) row.classList.add('done'); else row.classList.remove('done');
}

function marcarIntTipo(btnMaster, tipo){
  var container = btnMaster.closest('.int-container');
  var rows = container.querySelectorAll('.szrow:not(.is-locked)');
  var marcadas = 0;
  
  rows.forEach(function(row){
    var szId = row.getAttribute('data-szid');
    var zid = row.getAttribute('data-zid');
    var key = zid + '_' + szId;
    
    if(!CL[key]) CL[key]={}; 
    CL[key].tipo = tipo; 
    
    var btnG = row.querySelector('.tb-g');
    var btnL = row.querySelector('.tb-l');
    
    if(btnG) btnG.className = 'tb tb-g' + (tipo === 'GRUESO' ? ' sg2' : '');
    if(btnL) btnL.className = 'tb tb-l' + (tipo === 'L+D' ? ' sl2' : '');
    row.classList.add('done');
    marcadas++;
  });
  
  if(marcadas > 0) toast('✓ ' + marcadas + ' tareas marcadas como ' + tipo);
  else toast('No hay tareas pendientes en esta zona', 'warn');
}

// ============================================================
// UTILIDADES COMUNES Y MODALES
// ============================================================
function toggleTimer(zid) {
  var btn = G('btn-timer-'+zid);
  if(!btn) return;
  if(!ZONE_TIMERS[zid]) {
    ZONE_TIMERS[zid] = { start: Date.now() };
    btn.innerHTML = '⏳ En curso...';
    btn.style.background = '#fef08a'; 
    btn.style.color = '#854d0e';
    toast('⏱️ Temporizador iniciado');
  } else {
    toast('El temporizador ya está corriendo.', 'warn');
  }
}

function togZonaById(id){var b=G('zb'+id),a=G('za'+id);if(b){var o=b.style.display!=='none';b.style.display=o?'none':'block';if(a)a.textContent=o?'▶':'▼';}}

function modalObs(zid, szId, nombre){
  var key = zid + '_' + szId;
  var cur=(CL[key]&&CL[key].obs)||'';
  var w=document.createElement('div');w.innerHTML='<p style="font-size:12px;color:var(--tx2);margin-bottom:8px">Escribe una nota:</p><textarea id="mo-t" rows="5" style="width:100%;padding:8px;border:1px solid var(--bd);border-radius:4px">'+cur+'</textarea>';
  modal('Notas — '+nombre,w,[{label:'Cerrar',fn:closeModal},{label:'Guardar Nota',fn:function(){if(!CL[key])CL[key]={};CL[key].obs=G('mo-t').value;closeModal();},p:true}]);
}

function modalFoto(zid, szId, nombre){
  var key = zid + '_' + szId;
  var hasFoto=CL[key]&&CL[key].fotoBase64;
  var wrap=document.createElement('div');
  wrap.innerHTML='<label for="fpinp" style="display:block;border:2px dashed var(--bd);border-radius:var(--r);padding:20px;text-align:center;cursor:pointer;font-size:13px;color:var(--tx3)">'+(hasFoto?'<img src="data:'+CL[key].fotoTipo+';base64,'+CL[key].fotoBase64+'" style="max-width:100%;max-height:150px;border-radius:8px">':'📷 Toca para seleccionar foto')+'</label><input type="file" id="fpinp" accept="image/*" capture="environment" style="display:none">';
  modal('Foto — '+nombre,wrap,[{label:'Cerrar',fn:closeModal}]);
  G('fpinp').onchange=function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){if(!CL[key])CL[key]={};CL[key].fotoBase64=ev.target.result.split(',')[1];CL[key].fotoNombre=file.name;CL[key].fotoTipo=file.type;toast('✅ Foto adjuntada');closeModal();};reader.readAsDataURL(file);};
}

// ============================================================
// ACORDEÓN ABSOLUTO (DOBLE CLIC BÚSQUEDA)
// ============================================================
function togInfRow(elemento) {
  // Buscamos el contenedor de la tabla 'tw' sin importar la estructura
  var card = elemento.closest('.card-check') || elemento.closest('.zcard') || elemento.parentElement;
  var tw = card.querySelector('.tw');
  
  if (!tw) {
    // Si no lo encuentra, probamos el método clásico
    tw = elemento.nextElementSibling;
  }
  
  if (!tw) return;

  var arr = elemento.querySelector('.zarr');
  
  if (tw.style.display === 'none' || tw.style.maxHeight === '0px' || tw.style.maxHeight === '') {
    tw.style.display = 'block';
    tw.style.maxHeight = 'none';
    if(arr) arr.textContent = '▼';
  } else {
    tw.style.display = 'none';
    tw.style.maxHeight = '0px';
    if(arr) arr.textContent = '▶';
  }
}

// ============================================================
// GUARDADO Y ENVÍO A BASE DE DATOS
// ============================================================
function saveCheck(){
  try {
    var entradas=[];
    var btn = document.getElementById('btn-save-main');
    
    document.querySelectorAll('.szrow:not(.is-locked)').forEach(function(row){
      var szId = row.getAttribute('data-szid');
      var zid = row.getAttribute('data-zid');
      var key = zid + '_' + szId;
      var st = CL[key];
      if(!st || !st.tipo) return; 
      
      var iid = row.getAttribute('data-iid');
      var nm = row.querySelector('.sz-nm').textContent;
      var zc = row.closest('.zcard');
      var zona = zc ? zc.querySelector('strong').textContent : '';
      var zObs = document.getElementById('zo'+zid) ? document.getElementById('zo'+zid).value : '';
      
      var duracionSegundos = 0;
      if(typeof ZONE_TIMERS !== 'undefined' && ZONE_TIMERS[zid]) {
        duracionSegundos = Math.floor((Date.now() - ZONE_TIMERS[zid].start) / 1000);
      }

      entradas.push({
        szId: parseInt(szId), zonaId: String(zid||''), intId: String(iid||''), zonaNombre: String(zona||''), 
        szNombre: String(nm||''), tipo: String(st.tipo||''), ok: true, comentario: String((st.obs||'')+(zObs?'\n[Zona: '+zObs+']':'')), 
        duracionSeg: duracionSegundos, querat: '', barrido: '', 
        fotoBase64: st.fotoBase64 ? String(st.fotoBase64) : null, fotoNombre: st.fotoNombre ? String(st.fotoNombre) : null, fotoTipo: st.fotoTipo ? String(st.fotoTipo) : null
      });
    });

    if(!entradas.length){ alert('⚠️ No has marcado ninguna tarea nueva para guardar.'); return; }

    var zt={};
    entradas.forEach(e => {
      if(!zt[e.zonaId]) zt[e.zonaId] = {name:e.zonaNombre, ints:new Set(), dir:false};
      if(e.intId && e.intId !== 'null' && e.intId !== '') zt[e.zonaId].ints.add(e.intId); else zt[e.zonaId].dir=true;
    });

    var faltan=[];
    Object.keys(zt).forEach(zid => {
      var z = zt[zid];
      z.ints.forEach(iid => {
        var qEl = document.getElementById('iquer_'+zid+'_'+iid);
        var bEl = document.getElementById('ibarr_'+zid+'_'+iid);
        var q = qEl ? qEl.value.trim() : '';
        var b = bEl ? bEl.value.trim() : '';
        
        if(q === '' || b === '') faltan.push('Residuos en ' + z.name);
        else entradas.forEach(e => { if(e.intId === iid){ e.querat=q; e.barrido=b; }});
      });
      if(z.dir) entradas.forEach(e => { if(e.zonaId === zid && (!e.intId || e.intId === '')){ e.querat='0'; e.barrido='0'; }});
    });

    if(faltan.length){ alert('⚠️ Faltan datos:\n' + faltan.join('\n')); return; }

    if(btn){ 
      btn.disabled = true; 
      btn.textContent = '⏳ Guardando...';
      btn.style.opacity = '0.6';
    }
    
    var incs=[];
    document.querySelectorAll('[id^="zinc"]').forEach(function(ta){
      if(!ta.value.trim()) return;
      var zid = ta.id.replace('zinc','');
      var zc = ta.closest('.zcard');
      var gEl = document.getElementById('zgrav'+zid);
      incs.push({ zona: String(zc ? zc.querySelector('strong').textContent : ''), descripcion: String(ta.value.trim()), gravedad: String(gEl ? gEl.value : 'media') });
    });

    api('guardarChecklist', {entradas: entradas, incidencias: incs}, function(r){
      if(r && r.ok) {
        toast('✅ Datos guardados con éxito.');
        
        // 🔥 ACTUALIZACIÓN DINÁMICA DE LA VISTA
        filasGuardadas.forEach(function(row){
          var nm = row.getAttribute('data-szname');
          row.classList.add('is-locked');
          row.innerHTML = '<span style="font-size:14px;flex:1;text-decoration:line-through;color:var(--tx3)">' + nm + '</span><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">✓ HECHO</span>';
          
          // Verificamos si la carpeta contenedora se ha quedado vacía de tareas pendientes
          var carpeta = row.closest('.int-container');
          if(carpeta) {
             var pendientesEnCarpeta = carpeta.querySelectorAll('.szrow:not(.is-locked)').length;
             if(pendientesEnCarpeta === 0) {
                // Si ya no hay tareas, quitamos los botones de GRUESO/L+D de la cabecera de la carpeta
                var botonesCarpeta = carpeta.querySelector('.tb.sg2, .tb.sl2');
                if(botonesCarpeta) botonesCarpeta.parentElement.innerHTML = '<span style="font-size:10px;color:var(--g);font-weight:800">✅ CARPETA COMPLETADA</span>';
             }
          }
        });

        // Refrescar el botón principal si ya no queda NADA en toda la pantalla
        var totalPendientesPantalla = document.querySelectorAll('.szrow:not(.is-locked)').length;
        if(totalPendientesPantalla === 0 && btn) {
           btn.disabled = true;
           btn.textContent = '✅ Todo Completado';
           btn.style.background = '#dcfce7';
        }
      } else {
        alert('❌ Error: ' + (r ? r.msg : 'Servidor no responde'));
      }
    });

  } catch(error) { alert("Error crítico: " + error.message); }
}

// DASHBOARD
function pgDash(){
  google.script.run
    .withSuccessHandler(function(pingResult){
      google.script.run
        .withSuccessHandler(function(r){
          if(!r||!r.ok){pc('<div class="card" style="color:var(--danger);padding:20px">Error: '+(r?r.msg:'sin respuesta')+'</div>');return;}
          try{renderDash(r);}catch(e){pc('<div class="card" style="color:var(--danger);padding:20px">Error render: '+e.message+'</div>');}
        })
        .withFailureHandler(function(e){pc('<div class="card" style="color:var(--danger);padding:20px">'+e.message+'</div>');toast('Sesión expirada',false);})
        .api(TOKEN,'getDashboard',{});
    })
    .withFailureHandler(function(e){pc('<div class="card" style="color:var(--danger);padding:20px">Ping failed: '+e.message+'</div>');})
    .ping();
}
function renderDash(r){
  var d=r.data,isW=ROL==='worker',isC=ROL==='consultor';
  var h='';
  h+='<div id="dash-peri-resumen"></div>';
  if(d.periPendientes&&d.periPendientes.length){
    h+='<div class="alert-banner" style="margin-bottom:14px"><h3>'+d.periPendientes.length+' periodicidad'+(d.periPendientes.length>1?'es':'')+' vencida'+(d.periPendientes.length>1?'s':'')+'</h3>';
    d.periPendientes.forEach(function(p){h+='<div class="periitem overdue" onclick="pgPeriInforme()"><div><div class="periitem-name">'+p.nombre+'</div><div class="periitem-zona">'+p.zona+' · '+(FREQS[p.frecuencia]||p.frecuencia)+'</div></div><span class="periitem-days late">'+p.diasRetraso+'d</span></div>';});
    h+='<button class="btn btn-sm" style="margin-top:8px" onclick="pgPeriInforme()">Ver informe</button></div>';
  }
  if(!isC){
    // Stats row
    h+='<div class="sg">';
    var pct=d.pct,col=pct>=80?'var(--g)':pct>=50?'var(--warn)':'var(--danger)';
    h+='<div class="stat"><div class="sv" style="color:'+col+'">'+pct+'%</div><div class="sl">'+(isW?'Mis tareas':'Cumplimiento')+'</div><div class="pb"><div class="pf" style="width:'+pct+'%;background:'+col+'"></div></div></div>';
    h+='<div class="stat"><div class="sv">'+d.cubiertas+'/'+d.totalSubzonas+'</div><div class="sl">Tareas hoy</div></div>';
    h+='<div class="stat"><div class="sv">'+d.registrosHoy+'</div><div class="sl">Registros hoy</div></div>';
    if(!isW)h+='<div class="stat"><div class="sv">'+d.personalActivo+'</div><div class="sl">Personal activo</div></div>';
    if(d.zonasIntNoTrabaja&&d.zonasIntNoTrabaja.length){
      h+='<div class="stat" style="background:#FFF0F5;border-color:#F0ADDC;cursor:default">';
      h+='<div style="font-size:22px;font-weight:800;color:#BE185D">'+d.zonasIntNoTrabaja.length+'</div>';
      h+='<div style="font-size:11px;color:#BE185D;font-weight:600;margin-top:4px">📍 Zonas int. no trabajan</div>';
      d.zonasIntNoTrabaja.forEach(function(z){h+='<div style="font-size:10px;color:#BE185D;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">· '+z.nombre+'</div>';});
      h+='</div>';
    }
    if(d.zonasNoTrabaja&&d.zonasNoTrabaja.length){
      h+='<div class="stat" style="background:#F0F9FF;border-color:#BAE6FD;cursor:default">';
      h+='<div style="font-size:22px;font-weight:800;color:#0369A1">'+d.zonasNoTrabaja.length+'</div>';
      h+='<div style="font-size:11px;color:#0369A1;font-weight:600;margin-top:4px">📴 No trabajan</div>';
      d.zonasNoTrabaja.forEach(function(z){h+='<div style="font-size:10px;color:#0369A1;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">· '+z.zona+'</div>';});
      h+='</div>';
    }
    if(d.personalEnVacaciones&&d.personalEnVacaciones.length){
      h+='<div class="stat" style="background:#FFF7ED;border-color:#FED7AA;cursor:default">';
      h+='<div style="font-size:22px;font-weight:800;color:#C2410C">'+d.personalEnVacaciones.length+'</div>';
      h+='<div style="font-size:11px;color:#C2410C;font-weight:600;margin-top:4px">🏖️ De vacaciones</div>';
      d.personalEnVacaciones.forEach(function(p){h+='<div style="font-size:10px;color:#C2410C;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">· '+p.nombre+'</div>';});
      h+='</div>';
    }
    h+='</div>';
    // Dos columnas
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    // IZQUIERDA — Estado por zona
    h+='<div class="card"><div class="card-title">Estado por zona</div>';
    (d.estadoZonas||[]).forEach(function(z){
      var noTrabaja=(d.zonasNoTrabaja||[]).some(function(nt){return nt.zona===z.zona;});
      // Bloque zona principal
      if(noTrabaja){
        h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:2px;border-radius:var(--r) var(--r) 0 0;background:#F0F9FF;border:1px solid #BAE6FD">';
        h+='<div style="width:28px;height:28px;border-radius:50%;background:#0EA5E9;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:white;flex-shrink:0">NT</div>';
        h+='<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#0369A1">'+z.zona+'</div><div style="font-size:11px;color:#0369A1">No trabaja hoy</div></div></div>';
      } else {
        var realizada=z.cubiertas>0;
        var col2=realizada?'var(--g)':'var(--danger)';
        var bg=realizada?'#f0fff8':'#fff5f5';
        var bord=realizada?'#86efac':'#fca5a5';
        h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:2px;border-radius:var(--r) var(--r) 0 0;background:'+bg+';border:1px solid '+bord+'">';
        h+='<div style="width:28px;height:28px;border-radius:50%;background:'+col2+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:white;flex-shrink:0">'+(realizada?'OK':'--')+'</div>';
        h+='<div style="flex:1"><div style="font-size:13px;font-weight:700">'+z.zona+'</div>';
        if(z.personal)h+='<div style="font-size:11px;color:var(--tx3)">'+z.personal+'</div>';
        h+='</div>';
        h+='<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:'+col2+';color:white">'+(realizada?'REALIZADA':'PENDIENTE')+'</span>';
        h+='</div>';
      }
      // Zonas intermedias de esta zona
      if(z.intermedias&&z.intermedias.length){
        z.intermedias.forEach(function(si){
          var bgInt=si.noTrabaja?'#FFE5EC':'#F8FFF8';
          var bordInt=si.noTrabaja?'#FECDD3':'#BBF7D0';
          var colInt=si.noTrabaja?'#BE123C':'#15803D';
          h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 22px;background:'+bgInt+';border-left:3px solid '+bordInt+';border-bottom:1px solid var(--bd);margin-left:0">';
          h+='<span style="font-size:12px">'+(si.noTrabaja?'❌':'📁')+'</span>';
          h+='<div style="flex:1"><div style="font-size:11px;font-weight:700;color:'+colInt+'">'+si.nombre+'</div>';
          h+='<div style="font-size:10px;color:var(--tx3)">'+si.personal+'</div></div>';
          if(si.noTrabaja)h+='<span style="font-size:9px;font-weight:800;color:#BE123C;background:#FFE4E6;padding:2px 7px;border-radius:10px">NO TRABAJA</span>';
          h+='</div>';
        });
      }
      h+='<div style="margin-bottom:8px"></div>';
    });
    h+='</div>';
    // DERECHA — Actividad reciente
    h+='<div class="card"><div class="card-title">Actividad reciente</div>';
    if(!(d.reciente||[]).length){
      h+='<div style="text-align:center;padding:32px;color:var(--tx3)"><div style="font-size:36px;margin-bottom:8px">📋</div><p style="font-size:13px">Sin actividad hoy</p></div>';
    } else {
      (d.reciente||[]).slice(0,10).forEach(function(a){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)">';
        h+='<span class="'+(a.tipo==='GRUESO'?'tg':'tl')+'">'+a.tipo+'</span>';
        h+='<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+a.subzona+'</div>';
        h+='<div style="font-size:11px;color:var(--tx3)">'+a.zona+' · '+a.personal+'</div></div>';
        h+='<div style="font-size:11px;color:var(--tx3);flex-shrink:0">'+safeHora(a.hora)+'</div></div>';
      });
    }
    h+='</div>';
    h+='</div>';
  } else {
    h+='<div class="card" style="text-align:center;padding:32px"><div style="font-size:48px;margin-bottom:12px">📊</div><h3>Panel de Consultor</h3><p style="color:var(--tx2);margin-top:8px">Accede al <strong onclick="goTo(\'historial\')" style="color:var(--g);cursor:pointer">Historial</strong> o a los <strong onclick="goTo(\'informes\')" style="color:var(--g);cursor:pointer">Informes</strong>.</p></div>';
  }
  pc(h);
}

/*
// ============================================
// CHECKLIST (WORKER Y SUPERVISOR)
// ============================================
function pgCheck(){
  api('getChecklist',{},function(r){
    if(!r||!r.ok){pc('<div class="card">Error</div>');return;}
    var zonas=r.data;
    if(!zonas.length){pc('<div class="card">SIN TRABAJO ASIGNADO.</div>');return;}
    var isSup=ROL==='admin'||ROL==='supervisor';
    if(isSup){renderCheckSup(zonas);}else{renderCheckWorker(zonas);}
  });
}
function toggleCard(el) { el.classList.toggle('is-expanded'); }

function renderCheckSup(zonas) {
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px">';
  h += '<div><h2 style="font-size:17px;font-weight:800">Validación del día</h2>';
  h += '<p style="font-size:12px;color:var(--tx3)">' + new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p></div></div>';
  var hayRegistros = false;

  zonas.forEach(function (z, idx) {
    var realizadas = z.subzonas.filter(function (s) { return s.registrado; });
    if (!realizadas.length) return;
    hayRegistros = true;

    var grad = ZCOLORS[idx % ZCOLORS.length];
    var yaValidada = !!z.validadoPor;
    var bg = yaValidada ? '#f0fff8' : 'var(--sur)';
    var bord = yaValidada ? '#86efac' : 'var(--bd)';

    h += '<div class="card-check ' + (yaValidada ? 'is-expanded' : '') + '" id="card-' + idx + '" ondblclick="toggleCard(this)" style="border:2px solid ' + bord + '; background:' + bg + '">';
    h += '<div class="card-header-clickable" style="background:' + grad + '; padding:14px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap">';
    h += '  <strong style="color:white; font-size:14px; flex:1">' + z.zona + '</strong>';
    h += '  <span style="background:rgba(255,255,255,.25); color:white; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700">' + realizadas.length + ' subzonas</span>';
    
    if (yaValidada) {
      h += '  <span style="background:rgba(255,255,255,.9); color:var(--g); padding:4px 12px; border-radius:20px; font-size:12px; font-weight:800">Validada por ' + z.validadoPor + '</span>';
    } else {
      h += '  <button class="btn btn-sm" style="background:white; color:var(--g); font-weight:800; border-color:white" onclick="event.stopPropagation(); validarZonaCheck(\'' + z.zona + '\',this)">Validar zona</button>';
    }
    h += '</div>';
    h += '<div class="tw"><table style="font-size:13px"><thead><tr><th>Subzona</th><th>Personal</th><th>Tipo</th><th>Hora</th><th>OK</th><th>Observaciones</th></tr></thead><tbody>';
    
    realizadas.forEach(function (s) {
      h += '<tr>';
      h += '  <td style="font-weight:700">' + s.nombre + '</td>';
      h += '  <td>' + (s.personal_real || s.personal || '—') + '</td>';
      h += '  <td>' + (s.tipo ? '<span class="' + (s.tipo === 'GRUESO' ? 'tg' : 'tl') + '">' + s.tipo + '</span>' : '—') + '</td>';
      h += '  <td style="color:var(--tx3); font-size:12px">' + (s.hora || '—') + '</td>';
      h += '  <td><span class="' + (s.ok === 'SÍ' ? 'bg-g' : 'bg-gr') + '">' + (s.ok === 'SÍ' ? 'OK' : '—') + '</span></td>';
      h += '  <td style="font-size:12px; color:var(--tx2)">' + (s.comentario || '—') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div></div>';
  });

  if (!hayRegistros) {
    h += '<div class="card" style="text-align:center; padding:40px; color:var(--tx3)"><div style="font-size:48px; margin-bottom:12px">⏳</div><p>Aún no hay registros de limpieza hoy.</p></div>';
  }
  pc(h);
}

function validarZonaCheck(zona,btn){
  if(btn){btn.disabled=true;btn.textContent='Validando...';}
  api('validarZona',{zona:zona},function(r){
    toast(r&&r.ok?'Zona validada':(r?r.msg:'Error'),r&&r.ok);
    if(r&&r.ok)pgCheck();
  });
}

function renderCheckWorker(zonas){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px">';
  h+='<div><h2 style="font-size:17px;font-weight:800">Checklist del día</h2>';
  h+='<p style="font-size:12px;color:var(--tx3)">'+new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</p></div>';
  h+='<button class="btn btn-p" onclick="saveCheck()">Guardar registro</button></div>';
  
  zonas.forEach(function(z,idx){
    var grad=ZCOLORS[idx%ZCOLORS.length],em=ZEMOJIS[idx%ZEMOJIS.length];
    
    var todasSzs=(z.subzonas||[]);
    (z.intermedias||[]).forEach(function(si){
      (si.subzonas||[]).forEach(function(s){
        if(!todasSzs.some(function(x){return String(x.id)===String(s.id);})) todasSzs.push(s);
      });
    });
    
    var done=todasSzs.filter(function(s){return s.registrado||(CL[s.id]&&CL[s.id].tipo);}).length;
    var zt=ZONE_TIMERS[z.id]||{};
    var zIsRun=zt.startTs&&!zt.endTs,zIsDone=!!zt.duracion;
    
    h+='<div class="zcard"><div class="zhdr" style="background:'+grad+'">';
    h+='<span style="font-size:18px;cursor:pointer" onclick="togZonaById('+z.id+')">'+em+'</span>';
    h+='<strong style="cursor:pointer;flex:1" onclick="togZonaById('+z.id+')">'+z.zona+'</strong>';
    h+='<span class="zbdg" id="zbdg'+z.id+'">'+done+'/'+todasSzs.length+'</span>';
    
    if(zIsRun){h+='<button class="tmr run" id="ztm'+z.id+'" onclick="stopZonaTmr('+z.id+')"><span class="tdot blink"></span><span class="tdisp" id="ztd'+z.id+'">--:--</span>Parar</button>';}
    else if(zIsDone){h+='<button class="tmr done" id="ztm'+z.id+'"><span class="tdot"></span><span class="tdisp">'+fmtT(zt.duracion)+'</span></button>';}
    else{h+='<button class="tmr" id="ztm'+z.id+'" onclick="startZonaTmr('+z.id+')"><span class="tdot"></span><span class="tdisp">00:00</span> Iniciar</button>';}
    
    h+='<span class="zarr" id="za'+z.id+'" onclick="togZonaById('+z.id+')">▼</span></div>';
    h+='<div id="zb'+z.id+'" style="display:block">';
 
    var intermedias=z.intermedias||[];
    intermedias.forEach(function(si){
      var siDone=si.subzonas.filter(function(s){return s.registrado||(CL[s.id]&&CL[s.id].tipo);}).length;
      h+='<div style="background:var(--gl);border-left:4px solid var(--g);margin:6px 10px;border-radius:var(--r);overflow:hidden">';
      h+='<div style="padding:8px 14px;display:flex;align-items:center;gap:8px;background:rgba(26,71,42,.08);flex-wrap:wrap">';
      h+='<span style="font-size:12px;font-weight:800;color:var(--g);flex:1">📁 '+si.nombre+'</span>';
      if(si.personalAsignado)h+='<span style="font-size:11px;color:var(--g)">👤 '+si.personalAsignado+'</span>';
      h+='<span style="font-size:11px;color:var(--g);font-weight:700">'+siDone+'/'+si.subzonas.length+'</span>';
      
      h+='<button class="tmr" style="font-size:10px;padding:4px 8px" data-int-id="'+si.id+'" data-zone-id="'+z.id+'" onclick="marcarIntTipo(this,\'GRUESO\')">GRUESO</button>';
      h+='<button class="tmr" style="font-size:10px;padding:4px 8px" data-int-id="'+si.id+'" data-zone-id="'+z.id+'" onclick="marcarIntTipo(this,\'L+D\')">L+D</button>';
      h+='</div>';

      h+='<div style="padding:8px 14px;background:#fff;border-bottom:1px solid var(--bd);display:flex;gap:15px;flex-wrap:wrap;align-items:center;">';
      h+='<label style="font-size:11px;color:var(--g);font-weight:700;display:flex;align-items:center;gap:6px;">🧪 QUERAT (kg): <input type="number" id="iquer'+si.id+'" class="int-querat-'+z.id+'" step="0.1" min="0" oninput="sumResiduos('+z.id+')" style="width:70px;padding:5px;border:1px solid var(--bd);border-radius:4px;outline:none"></label>';
      h+='<label style="font-size:11px;color:var(--g);font-weight:700;display:flex;align-items:center;gap:6px;">🧹 BARRIDO (kg): <input type="number" id="ibarr'+si.id+'" class="int-barrido-'+z.id+'" step="0.1" min="0" oninput="sumResiduos('+z.id+')" style="width:70px;padding:5px;border:1px solid var(--bd);border-radius:4px;outline:none"></label>';
      h+='</div>';

      si.subzonas.forEach(function(s){ h += renderSzRow(s, z.id, si.id); });
      h+='</div>';
    });
 
    var directas=z.subzonasDirectas||[];
    if(!intermedias.length) directas=z.subzonas||[];
    if(directas.length&&intermedias.length){
      h+='<div style="padding:6px 14px;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase">Subzonas directas</div>';
    }
    directas.forEach(function(s){ h += renderSzRow(s, z.id, ''); });
 
    h+='<div class="zfooter">';
    var roAttr = intermedias.length > 0 ? 'readonly style="flex:1;padding:8px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;background:#eef2f3;color:var(--tx2);outline:none"' : 'style="flex:1;padding:8px 11px;border:1.5px solid var(--g);border-radius:var(--r);font-family:inherit;font-size:13px;outline:none"';

    h+='<label style="color:var(--g);font-weight:800">🧪 QUERAT total zona (kg) *</label>';
    h+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">';
    h+='<input type="number" id="zquer'+z.id+'" step="0.1" min="0" placeholder="Ej: 2.5" '+roAttr+'>';
    h+='<span style="font-size:11px;color:var(--tx3)">kg</span></div>';
    
    h+='<label style="color:var(--g);font-weight:800">🧹 BARRIDO total zona (kg) *</label>';
    h+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">';
    h+='<input type="number" id="zbarr'+z.id+'" step="0.1" min="0" placeholder="Ej: 1.5" '+roAttr+'>';
    h+='<span style="font-size:11px;color:var(--tx3)">kg</span></div>';
    
    h+='<label>Observaciones</label>';
    h+='<textarea class="obs-ta" id="zo'+z.id+'" onblur="saveZObs('+z.id+')" placeholder="Observaciones generales...">'+(ZONE_OBS[z.id]||'')+'</textarea>';
    
    h+='<label style="margin-top:10px;color:var(--danger)">Incidencias</label>';
    h+='<textarea class="obs-ta" id="zinc'+z.id+'" onblur="saveZInc('+z.id+')" placeholder="Describe cualquier incidencia..." style="border-color:var(--dangerl)">'+(ZONE_INC[z.id]||'')+'</textarea>';
    h+='<div style="display:flex;gap:8px;margin-top:6px"><select id="zgrav'+z.id+'" style="padding:6px 10px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:12px;background:white">';
    h+='<option value="baja">Gravedad baja</option><option value="media" selected>Gravedad media</option><option value="alta">Gravedad alta</option>';
    h+='</select></div>';
    
    h+='</div></div></div>';
  });
  
  pc(h);
  
  zonas.forEach(function(z){
    var allDone=(z.subzonas||[]).length>0&&(z.subzonas||[]).every(function(s){return s.registrado;});
    if(allDone){var bd=G('zb'+z.id),ar=G('za'+z.id);if(bd)bd.style.display='none';if(ar)ar.textContent='▶';}
  });
  
  Object.keys(ZONE_TIMERS).forEach(function(zid){var zt=ZONE_TIMERS[zid];if(zt.startTs&&!zt.endTs)tickZonaTmr(zid);});
}

function sumResiduos(zid) {
  var sumQ = 0, sumB = 0;
  document.querySelectorAll('.int-querat-' + zid).forEach(function(el) { sumQ += parseFloat(el.value) || 0; });
  document.querySelectorAll('.int-barrido-' + zid).forEach(function(el) { sumB += parseFloat(el.value) || 0; });
  var zq = G('zquer' + zid), zb = G('zbarr' + zid);
  if(zq) zq.value = sumQ > 0 ? sumQ.toFixed(2) : '';
  if(zb) zb.value = sumB > 0 ? sumB.toFixed(2) : '';
}

function renderSzRow(s, zonaId, intId){
  var st = CL[s.id] || {}, tipo = st.tipo || s.tipo || '';
  var h = '<div class="szrow' + (tipo ? ' done' : '') + '" id="sr' + s.id + '" data-sz-id="' + s.id + '" data-zona-id="' + zonaId + '" data-int-id="' + (intId || '') + '">';
  h += '<div class="sz-nm">' + s.nombre + '</div>';
  if (s.personal) h += '<div class="sz-st">👤 ' + s.personal + '</div>';
  h += '<div class="sz-ctl">';
  h += '<button class="tb' + (tipo === 'GRUESO' ? ' sg2' : '') + '" id="tbg' + s.id + '" onclick="setTipoSz(' + s.id + ',1,' + zonaId + ')">GRUESO</button>';
  h += '<button class="tb' + (tipo === 'L+D' ? ' sl2' : '') + '" id="tbl' + s.id + '" onclick="setTipoSz(' + s.id + ',2,' + zonaId + ')">L+D</button>';
  h += '<button class="ib' + (st.obs || s.comentario ? ' has' : '') + '" id="bc' + s.id + '" onclick="modalObsById(' + s.id + ')" title="Observaciones">💬</button>';
  h += '<button class="ib' + (st.fotoBase64 ? ' has' : '') + '" id="bf' + s.id + '" onclick="modalFotoById(' + s.id + ')" title="Foto">📷</button>';
  h += '</div></div>';
  return h;
}

function marcarIntTipo(btn,tipo){
  var intId=btn.getAttribute('data-int-id');
  var zonaId=btn.getAttribute('data-zone-id');
  var zb=G('zb'+zonaId);
  if(!zb)return;
  
  var filas=zb.querySelectorAll('[data-int-id="'+intId+'"]');
  filas.forEach(function(fila){
    var szId=fila.id.replace('sr','');
    if(!CL[szId])CL[szId]={};
    CL[szId].tipo=tipo;
    
    var g=G('tbg'+szId),l=G('tbl'+szId);
    if(g)g.className='tb'+(tipo==='GRUESO'?' sg2':'');
    if(l)l.className='tb'+(tipo==='L+D'?' sl2':'');
    fila.className='szrow done';
  });
  
  var bdg=G('zbdg'+zonaId);
  if(bdg){
    var done=zb.querySelectorAll('.szrow.done').length;
    var total=zb.querySelectorAll('[id^="sr"]').length;
    bdg.textContent=done+'/'+total;
  }
  toast('✓ Zona intermedia marcada como '+tipo);
}

function setTipoSz(szId,tipoArg,zonaId){
  var tipo=tipoArg===1?'GRUESO':'L+D';
  if(!CL[szId])CL[szId]={};
  CL[szId].tipo=CL[szId].tipo===tipo?'':tipo;
  var g=G('tbg'+szId),l=G('tbl'+szId),row=G('sr'+szId);
  if(g)g.className='tb'+(CL[szId].tipo==='GRUESO'?' sg2':'');
  if(l)l.className='tb'+(CL[szId].tipo==='L+D'?' sl2':'');
  if(row)row.className='szrow'+(CL[szId].tipo?' done':'');
  var bdg=G('zbdg'+zonaId);
  if(bdg){
    var zb=G('zb'+zonaId);
    if(zb){
      var done=zb.querySelectorAll('.szrow.done').length;
      var total=zb.querySelectorAll('[id^="sr"]').length;
      bdg.textContent=done+'/'+total;
    }
  }
}

function saveZObs(zonaId){var el=G('zo'+zonaId);if(el)ZONE_OBS[zonaId]=el.value;}
function saveZInc(zonaId){var el=G('zinc'+zonaId);if(el)ZONE_INC[zonaId]=el.value;}

function startZonaTmr(zonaId){
  ZONE_TIMERS[zonaId]={startTs:Date.now(),endTs:null,duracion:0};
  var btn=G('ztm'+zonaId);
  if(btn){btn.className='tmr run';btn.innerHTML='<span class="tdot blink"></span><span class="tdisp" id="ztd'+zonaId+'">00:00</span>Parar';btn.onclick=function(){stopZonaTmr(zonaId);};}
  tickZonaTmr(zonaId);
}
function tickZonaTmr(zonaId){
  if(_timers['z'+zonaId])clearInterval(_timers['z'+zonaId]);
  _timers['z'+zonaId]=setInterval(function(){var zt=ZONE_TIMERS[zonaId];if(!zt||!zt.startTs||zt.endTs){clearInterval(_timers['z'+zonaId]);return;}var el=G('ztd'+zonaId);if(el)el.textContent=fmtT(Math.floor((Date.now()-zt.startTs)/1000));},1000);
}
function stopZonaTmr(zonaId){
  clearInterval(_timers['z'+zonaId]);var zt=ZONE_TIMERS[zonaId];if(!zt)return;
  zt.endTs=Date.now();zt.duracion=Math.floor((zt.endTs-zt.startTs)/1000);
  var btn=G('ztm'+zonaId);if(btn){btn.className='tmr done';btn.innerHTML='<span class="tdot"></span><span class="tdisp">'+fmtT(zt.duracion)+'</span>';btn.onclick=null;}
  toast(''+fmtT(zt.duracion)+' registrado');
}
function togZonaById(id){togZC('zbc'+id,'zac'+id);}
function togZC(bId,aId){var el=G(bId);if(!el)return;var open=el.style.display!=='none';el.style.display=open?'none':'block';var arr=G(aId);if(arr)arr.textContent=open?'▶':'▼';}

function modalObsById(szId){var row=G('sr'+szId);var nombre=row?row.querySelector('.sz-nm').textContent:'Subzona';modalObs(szId,nombre);}
function modalFotoById(szId){var row=G('sr'+szId);var nombre=row?row.querySelector('.sz-nm').textContent:'Subzona';modalFoto(szId,nombre);}
function modalObs(szId,nombre){
  var cur=(CL[szId]&&CL[szId].obs)||'';
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Notas</label><textarea id="mo-t" rows="5" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;outline:none;resize:vertical">'+cur+'</textarea></div>';
  modal('Observaciones — '+nombre,wrap,[{label:'Cancelar',fn:closeModal},{label:'Guardar',fn:function(){if(!CL[szId])CL[szId]={};CL[szId].obs=G('mo-t').value;var b=G('bc'+szId);if(b)b.className='ib'+(CL[szId].obs?' has':'');closeModal();toast('Guardado');},p:true}]);
}
function modalFoto(szId,nombre){
  var hasFoto=CL[szId]&&CL[szId].fotoBase64;
  var wrap=document.createElement('div');
  wrap.innerHTML='<p style="font-size:12px;color:var(--tx2);margin-bottom:12px">Adjunta foto como evidencia</p>'+
    '<label for="fpinp" style="display:block;border:2px dashed var(--bd);border-radius:var(--r);padding:20px;text-align:center;cursor:pointer;font-size:13px;color:var(--tx3)">'+
    (hasFoto?'<img src="data:'+CL[szId].fotoTipo+';base64,'+CL[szId].fotoBase64+'" style="max-width:100%;max-height:150px;border-radius:8px">':'Toca para seleccionar foto')+
    '</label><input type="file" id="fpinp" accept="image/*" capture="environment" style="display:none">';
  modal('Foto — '+nombre,wrap,[{label:'Cerrar',fn:closeModal}]);
  G('fpinp').onchange=function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){if(!CL[szId])CL[szId]={};CL[szId].fotoBase64=ev.target.result.split(',')[1];CL[szId].fotoNombre=file.name;CL[szId].fotoTipo=file.type;var b=G('bf'+szId);if(b)b.className='ib has';toast('Foto añadida');closeModal();};reader.readAsDataURL(file);};
}

function saveCheck(){
  try{
    var entradas=[];
    document.querySelectorAll('[id^="sr"]').forEach(function(row){
      var szId=row.id.replace('sr',''),st=CL[szId];
      if(!st||!st.tipo)return;
      var nm=row.querySelector('.sz-nm').textContent;
      var zbEl=row.closest('[id^="zb"]');
      var zonaId=zbEl&&zbEl.id?zbEl.id.replace('zb',''):'';
      var intId=row.getAttribute('data-int-id');
      var zcard=row.closest('.zcard');
      var zhdr=zcard?zcard.querySelector('.zhdr'):null;
      var zona=zhdr?zhdr.querySelector('strong').textContent:'';
      var zObsEl=document.getElementById('zo'+zonaId);
      var zObs=ZONE_OBS[zonaId]||(zObsEl?zObsEl.value:'');
      var zonaDur=(ZONE_TIMERS[zonaId]&&ZONE_TIMERS[zonaId].duracion)||0;
      
      entradas.push({
        szId:parseInt(szId),
        zonaId: zonaId,
        intId: intId,
        zonaNombre:zona,
        szNombre:nm,
        tipo:st.tipo,
        ok:st.ok||false,
        comentario:(st.obs||'')+(zObs?'\n[Zona: '+zObs+']':''),
        duracionSeg:zonaDur,
        querat:'',
        barrido:'',
        fotoBase64:st.fotoBase64||null,
        fotoNombre:st.fotoNombre||null,
        fotoTipo:st.fotoTipo||null
      });
    });

    if(!entradas.length){
      toast('Marca al menos una tarea','warn');
      return;
    }

    var zonasConTareas={};
    entradas.forEach(function(e){
      if(!zonasConTareas[e.zonaId]){
        zonasConTareas[e.zonaId] = { name: e.zonaNombre, ints: new Set(), hasDirect: false };
      }
      if(e.intId) {
        zonasConTareas[e.zonaId].ints.add(e.intId);
      } else {
        zonasConTareas[e.zonaId].hasDirect = true;
      }
    });

    var faltanDatos=[];
    Object.keys(zonasConTareas).forEach(function(zid){
      var zInfo = zonasConTareas[zid];
      // 1. Zonas Intermedias
      zInfo.ints.forEach(function(iid){
        var qEl = document.getElementById('iquer'+iid);
        var bEl = document.getElementById('ibarr'+iid);
        var q = (qEl && qEl.value !== '') ? String(qEl.value).trim() : '';
        var b = (bEl && bEl.value !== '') ? String(bEl.value).trim() : '';
        if(q === '' || b === ''){
          faltanDatos.push(zInfo.name + ' (Sección Intermedia)');
        } else {
          entradas.forEach(function(e){
            if(e.intId === iid){ e.querat = q; e.barrido = b; }
          });
        }
      });
      // 2. Subzonas directas
      if(zInfo.hasDirect){
        var qEl = document.getElementById('zquer'+zid);
        var bEl = document.getElementById('zbarr'+zid);
        var q = (qEl && qEl.value !== '') ? String(qEl.value).trim() : '';
        var b = (bEl && bEl.value !== '') ? String(bEl.value).trim() : '';
        if(q === '' || b === ''){
          faltanDatos.push(zInfo.name + ' (Total Zona)');
        } else {
          entradas.forEach(function(e){
            if(e.zonaId === zid && !e.intId){ e.querat = q; e.barrido = b; }
          });
        }
      }
    });

    if(faltanDatos.length){
      toast('⚠️ Falta rellenar residuos en: '+faltanDatos.join(', '),'warn');
      return;
    }

    var btn=document.querySelector('.btn.btn-p');
    if(btn){btn.textContent='Guardando...';btn.disabled=true;}

    var incidencias=[];
    document.querySelectorAll('[id^="zinc"]').forEach(function(ta){
      if(!ta.value.trim())return;
      var zonaId=ta.id.replace('zinc','');
      var zcard=ta.closest('.zcard');
      var strong=zcard?zcard.querySelector('.zhdr strong'):null;
      var zonaNombre=strong?strong.textContent:'';
      var gravEl=document.getElementById('zgrav'+zonaId);
      incidencias.push({
        zona:zonaNombre,
        descripcion:ta.value.trim(),
        gravedad:gravEl?gravEl.value:'media'
      });
    });

    api('guardarChecklist',{entradas:entradas,incidencias:incidencias},function(r){
      if(btn){btn.textContent='Guardar registro';btn.disabled=false;}
      if(!r){toast('Error: sin respuesta',false);return;}
      toast(r.ok?''+r.msg:r.msg,r.ok);
      if(r.ok){
        CL={}; ZONE_OBS={}; ZONE_INC={}; ZONE_TIMERS={};
        pgCheck();
      }
    });
  }catch(e){
    console.error('ERROR EN saveCheck:', e);
    toast('Error interno (ver consola)','warn');
  }
}
*/
// ============================================
// RESTO DE FUNCIONES (HISTORIAL, PERIODICIDADES, ETC.)
// ============================================
function pgHist(){
  var isW=ROL==='worker';
  var h='<div class="card" style="margin-bottom:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">';
  h+='<div class="fg" style="margin:0;flex:1;min-width:120px"><label>Fecha</label><input type="date" id="hf" value="'+today()+'"></div>';
  h+='<div class="fg" style="margin:0;flex:1;min-width:120px"><label>Zona</label><input type="text" id="hz" placeholder="Filtrar..."></div>';
  if(!isW)h+='<div class="fg" style="margin:0;flex:1;min-width:120px"><label>Personal</label><input type="text" id="hp" placeholder="Filtrar..."></div>';
  h+='<button class="btn btn-p" onclick="buscarH()">Buscar</button><button class="btn" onclick="limpH()">Limpiar</button>';
  h+='</div></div><div id="hr"><div class="spin"></div></div>';
  pc(h);buscarH();
}
function buscarH(){
  var el=G('hr');if(!el)return;el.innerHTML='<div class="spin"></div>';
  var p={};var hf=G('hf'),hz=G('hz'),hp=G('hp');
  if(hf&&hf.value)p.fecha=hf.value;if(hz&&hz.value)p.zona=hz.value;if(hp&&hp.value)p.personal=hp.value;
  api('getHistorial',p,function(r){
    if(!r||!r.ok||!r.data.length){el.innerHTML='<div class="card" style="text-align:center;padding:32px;color:var(--tx3)">Sin registros</div>';return;}
    var h='<div class="card"><div class="tw"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Zona</th><th>Subzona</th><th>Tipo</th><th>Personal</th><th>Tiempo</th><th>OK</th><th>Obs.</th><th>Foto</th></tr></thead><tbody>';
    r.data.forEach(function(x){
      h+='<tr><td>'+x.fecha+'</td><td style="color:var(--tx3)">'+safeHora(x.hora)+'</td><td style="font-weight:700">'+x.zona+'</td><td>'+x.subzona+'</td>';
      h+='<td>'+(x.tipo?'<span class="'+(x.tipo==='GRUESO'?'tg':'tl')+'">'+x.tipo+'</span>':'—')+'</td>';
      h+='<td>'+x.personal+'</td><td style="font-family:monospace;font-size:12px">'+(x.duracion&&x.duracion!='0'?fmtT(x.duracion):'—')+'</td>';
      h+='<td><span class="'+(x.ok==='SÍ'?'bg-g':'bg-gr')+'">'+(x.ok==='SÍ'?'OK':'—')+'</span></td>';
      h+='<td style="font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(x.comentario||'—')+'</td>';
      h+='<td>'+(x.foto?'<a href="'+x.foto+'" target="_blank" style="color:var(--info);font-weight:700;font-size:12px">Ver</a>':'—')+'</td></tr>';
    });
    h+='</tbody></table></div></div>';
    el.innerHTML=h;
  });
}
function limpH(){var hf=G('hf'),hz=G('hz'),hp=G('hp');if(hf)hf.value='';if(hz)hz.value='';if(hp)hp.value='';buscarH();}

function pgPeri(){
  api('getPeriodicidades',{},function(r){
    if(!r||!r.ok){pc('<div class="card" style="color:var(--danger);padding:20px">Error</div>');return;}
    var isA=ROL==='admin',isSup=ROL==='supervisor'||isA;
    var peris=r.data.periodicidades||[];
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">';
    h+='<div><h2 style="font-size:17px;font-weight:800">Periodicidades</h2></div>';
    if(isSup)h+='<button class="btn btn-p" onclick="mNuevaPeri()">+ Nueva periodicidad</button>';
    h+='</div>';
    var vencidas=peris.filter(function(p){return p.DIAS_PARA_PROX<0;}).length;
    var hoy2=peris.filter(function(p){return p.DIAS_PARA_PROX===0;}).length;
    var ok2=peris.filter(function(p){return p.DIAS_PARA_PROX>0;}).length;
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px">';
    h+='<div class="stat" style="cursor:pointer" onclick="filtrarPeri(\'todas\')"><div class="sv">'+peris.length+'</div><div class="sl">Total</div></div>';
    h+='<div class="stat" style="cursor:pointer;background:var(--dangerl)" onclick="filtrarPeri(\'vencidas\')"><div class="sv" style="color:var(--danger)">'+vencidas+'</div><div class="sl">Vencidas</div></div>';
    h+='<div class="stat" style="cursor:pointer;background:var(--warnl)" onclick="filtrarPeri(\'hoy\')"><div class="sv" style="color:var(--warn)">'+hoy2+'</div><div class="sl">Para hoy</div></div>';
    h+='<div class="stat" style="cursor:pointer;background:var(--gl)" onclick="filtrarPeri(\'aldia\')"><div class="sv" style="color:var(--g)">'+ok2+'</div><div class="sl">Al día</div></div>';
    h+='</div>';
    if(!peris.length){h+='<div class="card" style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">📅</div><h3>Sin periodicidades</h3></div>';}
    else {
      var byZona={};
      peris.forEach(function(p){
        var key=p.ZONA;
        if(p.SUBZONA_INT)key+=' > '+p.SUBZONA_INT;
        if(p.SUBZONA)key+=' — '+p.SUBZONA;
        if(!byZona[key])byZona[key]=[];
        byZona[key].push(p);
      });
      Object.keys(byZona).sort().forEach(function(zonaNombre){
        h+='<div class="card" data-zona-container style="padding:0;overflow:hidden;margin-bottom:14px">';
        h+='<div style="padding:11px 16px;background:var(--g);color:white;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:space-between">';
        h+='<span style="flex:1">'+zonaNombre+'</span><span style="opacity:.7;font-size:11px">'+byZona[zonaNombre].length+' peri.</span></div>';
        byZona[zonaNombre].forEach(function(p){
          var dl=p.DIAS_PARA_PROX;
          var statusCls=dl<0?'late':dl<=3?'soon':'ok';
          var statusTxt=dl<0?''+Math.abs(dl)+'d retrasada':dl===0?'Hoy':'En '+dl+' días';
          h+='<div class="peri-row" data-peri-dias="'+p.DIAS_PARA_PROX+'" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--bd)">';
          h+='<div style="flex:1;min-width:160px"><div class="peri-name">'+p.NOMBRE+'</div>';
          h+='<div style="font-size:11px;color:var(--tx2);margin-top:2px"><span class="'+(p.TIPO==='GRUESO'?'tg':'tl')+'">'+p.TIPO+'</span>';
          if(p.SUBZONA)h+=' <span style="background:var(--infol);color:var(--info);padding:2px 7px;border-radius:5px;font-size:11px;font-weight:700">'+p.SUBZONA+'</span>';
          h+='</div>';
          h+='<div style="font-size:11px;color:var(--tx2);margin-top:3px">Última: '+(p.ULTIMA_LIMPIEZA||'Sin registrar')+' · Próxima: '+p.PROXIMA_FECHA+'</div></div>';
          h+='<span class="peri-freq">'+FREQS[p.FRECUENCIA]+'</span>';
          h+='<span class="peri-next '+statusCls+'">'+statusTxt+'</span>';
          if(isSup){h+='<button class="btn btn-sm btn-p" onclick="marcarPeriRealizadaById('+p.ID+')">Realizada</button>';h+='<button class="btn btn-sm" onclick="mEditPeri('+JSON.stringify(p).replace(/"/g,"&quot;")+')">✏️</button>';}
          if(isA)h+='<button class="btn btn-sm btn-d" onclick="elimPeri('+p.ID+')">✕</button>';
          h+='</div>';
        });
        h+='</div>';
      });
    }
    pc(h);
  });
}
function filtrarPeri(tipo){
  var cards=document.querySelectorAll('[data-peri-dias]'),shown=0;
  cards.forEach(function(card){var dias=parseInt(card.getAttribute('data-peri-dias'));var show=tipo==='todas'||(tipo==='vencidas'&&dias<0)||(tipo==='hoy'&&dias===0)||(tipo==='aldia'&&dias>0);card.style.display=show?'':'none';if(show)shown++;});
  document.querySelectorAll('[data-zona-container]').forEach(function(zc){var anyV=false;zc.querySelectorAll('[data-peri-dias]').forEach(function(v){if(v.style.display!=='none')anyV=true;});zc.style.display=anyV?'':'none';});
  toast(shown+' periodicidades');
}

function pgConfig(){
  if(ROL!=='admin'){pc('<div class="card">Sin acceso</div>');return;}
  api('getConfig',{},function(r){
    var cfg=r&&r.data?r.data:{};
    pc('<div class="card"><div class="card-title">Configuración</div>'+
      '<div class="fg"><label>Nombre de la empresa</label><input id="cfg-e" value="'+(cfg.EMPRESA||'')+'"></div>'+
      '<div class="fg"><label>Emails para informes</label><textarea id="cfg-em" rows="2">'+(cfg.EMAIL_DESTINATARIOS||'')+'</textarea></div>'+
      '<button class="btn btn-p" onclick="saveConfig()">Guardar</button></div>');
  });
}
function saveConfig(){api('guardarConfig',{EMPRESA:G('cfg-e').value,EMAIL_DESTINATARIOS:G('cfg-em').value},function(r){toast(r&&r.ok?'Guardado':(r?r.msg:'Error'),r&&r.ok);});}

function pgIncidencias(){pc('<div class="card" style="text-align:center;padding:32px"><div style="font-size:48px;margin-bottom:12px">🚧</div><h3>Módulo de Incidencias</h3></div>');}


// ============================================================
// MÓDULO DE ZONAS Y SUBZONAS (FIABLE, PARCIAL Y BLINDADO)
// ============================================================
var _zonasNT={};
var ZONAS_INT_NT={};
var CACHE_ZONAS = [];
var _zonaIdActiva = null;
var _zonaNombreActiva = null;
var _asigTab='zona';

function pgZonas(){
  var el = G('main');
  el.innerHTML = '<div class="spin"></div><p style="text-align:center;color:var(--tx3);margin-top:10px">Cargando datos a máxima velocidad ⚡...</p>';
  
  cargarDatosEnParalelo(function(res) {
    if (!res.zonas || !res.zonas.ok) { pc('<div class="card">Error de conexión al cargar las zonas.</div>'); return; }
    
    initCacheSuper(res); // Aquí es donde se llena window._ZONAS_COMPLETADAS_HOY usando IDs
    
    var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:8px"><h2 style="font-size:17px;font-weight:800">Zonas y Subzonas</h2><button class="btn btn-sm" onclick="expAll()">Expandir Todo</button><button class="btn btn-sm" onclick="colAll()">Colapsar Todo</button></div>';
    if(isA)h+='<button class="btn btn-p btn-sm" onclick="mNuevaZona()">+ Nueva zona</button>';
    h+='</div>';

    CACHE_SUPER.zonas.forEach(function(z, idx) {
      var zId = z.ID || z.id;
      var zName = z.ZONA || z.zona || "";
      var safeZName = String(zName).replace(/'/g, "\\'");
      
      var szs = z.subzonas || [];
      var totalSz = szs.length;
      var esNT = !!_zonasNT[String(zId)];
      
      var personasAsig = [];
      var compCount = 0;

      // 🔥 CORRECCIÓN: Contamos usando el ID para que coincida con initCacheSuper
      szs.forEach(function(s) {
         var sId = String(s.ID || s.id);
         if(window._ZONAS_COMPLETADAS_HOY[sId]) {
            compCount++;
         } else if (s.PERSONAL_ASIGNADO && s.PERSONAL_ASIGNADO.trim()) {
            s.PERSONAL_ASIGNADO.split(',').forEach(function(p){
               var n = p.trim(); if(n && personasAsig.indexOf(n)<0) personasAsig.push(n);
            });
         }
      });

      // La zona principal solo está completada si el contador llega al total
      var todasCompletadas = (totalSz > 0 && compCount === totalSz);
      var pctAsig = totalSz > 0 ? Math.round(szs.filter(function(s){ return !!(s.PERSONAL_ASIGNADO && s.PERSONAL_ASIGNADO.trim()); }).length / totalSz * 100) : 0;
      
      var grad = ZCOLORS[idx % ZCOLORS.length], em = ZEMOJIS[idx % ZEMOJIS.length];

      h+='<div class="zcard"><div class="zhdr card-header-clickable" style="background:'+grad+(esNT?';opacity:.7':'')+';user-select:none;cursor:pointer" onclick="togZonaById('+zId+')">';
      h+='<span style="font-size:18px">'+em+'</span>';
      h+='<strong style="flex:1">'+zName+'</strong>';
      
      if(esNT) h+='<span class="badge-nt" style="background:rgba(14,165,233,.8);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px">📴 No trabaja hoy</span>';
      
      if(todasCompletadas) {
         h+='<span class="badge-comp" style="background:rgba(74,222,128,.9);color:#064e3b;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;margin-right:6px;border:1px solid #22c55e">✅ TODO COMPLETADO</span>';
      } else {
         if(personasAsig.length) h+='<span class="zbdg badge-asig" style="background:rgba(255,255,255,.15);margin-right:6px">👤 '+personasAsig.join(', ')+'</span>';
         h+='<span class="zbdg badge-tot" style="margin-right:8px">'+compCount+'/'+totalSz+' hechas</span>';
      }
      
      if(isSup) {
        var esNT2 = !!_zonasNT[String(zId)];
        h+='<button class="btn btn-sm" style="background:'+(esNT2?'rgba(14,165,233,.6)':'rgba(255,200,0,.25)')+';color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();togZonaNoTrabaja('+zId+', \''+safeZName+'\', this)">'+(esNT2?'Reactivar':'No trabaja')+'</button>';
      }
      if(isA){
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSubzonaInt('+zId+', \''+safeZName+'\')">+ Zona int.</button>';
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSZ('+zId+', \''+safeZName+'\')">+ Sub</button>';
        h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();elimZona('+zId+', \''+safeZName+'\')">✕</button>';
      }
      h+='<span class="zarr" id="zac'+zId+'" style="margin-left:8px">▼</span></div>'; 
      h+='<div id="zbc'+zId+'" class="zbody" style="display:block; padding-bottom:1px"><div id="zint'+zId+'">';
      
      h += renderCuerpoZonaSync(zId, zName, szs);

      h+='</div></div></div>';
    });
    pc(h);
  });
}


function cargarZonasNT(cb){
  api('getZonasNoTrabaja',{},function(r){
    _zonasNT={};
    if(r&&r.ok)r.data.forEach(function(z){_zonasNT[z.zonaId]=true;});
    if(cb)cb();
  });
}

// 🔥 RECARGA PARCIAL SILENCIOSA
function refrescarZonaParcial(zonaId, zonaNombre) {
  var cont = document.getElementById('zint'+zonaId);
  if(cont) cont.innerHTML = '<div class="spin" style="margin:10px auto"></div>';
  api('getZonas',{},function(rz){
    if(rz && rz.ok) {
       CACHE_ZONAS = rz.data.zonas; 
       cargarSubzonasIntZona(zonaId, zonaNombre);
    }
  });
}

// 🔥 NO TRABAJA EN CABECERA (BLINDADO CON ZONANOMBRE)
function togZonaNoTrabaja(zonaId, zonaNombre, btn){
  var esNT = !!_zonasNT[String(zonaId)];
  var accion = esNT ? 'desmarcarZonaNoTrabaja' : 'marcarZonaNoTrabaja';
  if(!confirm(esNT ? '¿Reactivar esta zona para hoy?' : '¿Marcar esta zona como No trabaja hoy?')) return;
  
  var origTxt = btn.textContent;
  btn.textContent = '⏳...'; btn.disabled = true;

  // BOMBARDEO DE PARÁMETROS: Pasamos todas las combinaciones posibles
  api(accion, {zonaId: zonaId, zonaNombre: zonaNombre, zona: zonaNombre}, function(r){
    btn.disabled = false; btn.textContent = origTxt;
    if(r && r.ok){
      toast(esNT ? 'Zona reactivada' : 'Marcada como No trabaja', true);
      if(esNT) delete _zonasNT[String(zonaId)]; else _zonasNT[String(zonaId)] = true;
      
      btn.textContent = esNT ? 'No trabaja' : 'Reactivar';
      btn.style.background = esNT ? 'rgba(255,200,0,.25)' : 'rgba(14,165,233,.6)';
      var zhdr = btn.closest('.zhdr');
      if(zhdr) {
        zhdr.style.opacity = esNT ? '1' : '0.7';
        var badge = zhdr.querySelector('.badge-nt');
        if(esNT && badge) badge.remove();
        else if(!esNT && !badge) zhdr.querySelector('strong').insertAdjacentHTML('afterend', '<span class="badge-nt" style="background:rgba(14,165,233,.8);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px">📴 No trabaja hoy</span>');
      }
      refrescarZonaParcial(zonaId, zonaNombre);
    } else { toast(r ? r.msg : 'Error: Falta Zona', false); }
  });
}

function cargarSubzonasIntZona(zonaId, zonaNombre){
  var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
  api('getSubzonasInt',{zonaId:zonaId},function(ri){
    var el=G('zint'+zonaId); if(!el)return;
    api('getZonasIntNoTrabaja',{},function(rNT){
      ZONAS_INT_NT={}; if(rNT&&rNT.ok){rNT.data.forEach(function(z){ZONAS_INT_NT[String(z.subIntId)]=true;});}
      
      var zona = CACHE_ZONAS.find(function(z){ return String(z.ID) === String(zonaId); });
      var zNombre = zonaNombre || (zona ? zona.ZONA : '');
      var safeZNombre = String(zNombre).replace(/'/g, "\\'");
      var subzonas = zona ? zona.subzonas : [], ints = ri && ri.ok ? ri.data : [], intIds = {}, h = '';

      ints.forEach(function(si){
        var noTrabaja=!!ZONAS_INT_NT[String(si.id)];
        var szDeInt=subzonas.filter(function(s){return String(s.ID_SUBZONA_INT)===String(si.id);});
        
        var safeIntName = String(si.nombre||'').replace(/'/g, "\\'");

        h+='<div id="int-container-'+si.id+'" style="background:'+(noTrabaja?'#FFF0F2':'#F0FFF8')+';border-left:4px solid '+(noTrabaja?'var(--danger)':'var(--g)')+';margin:8px 12px;border-radius:var(--r);overflow:hidden">';
        
        h+='<div id="int-hdr-'+si.id+'" onclick="togSubInt('+si.id+')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:'+(noTrabaja?'#FFE5EC':'var(--gl)')+';cursor:pointer;user-select:none">';
        h+='<strong style="font-size:13px;color:'+(noTrabaja?'var(--danger)':'var(--g)')+';flex:1">'+(noTrabaja?'❌ ':'📁 ')+si.nombre+'</strong>';
        
        var todasCompletadas = szDeInt.length > 0 && szDeInt.every(function(s){ return window._ZONAS_COMPLETADAS_HOY && window._ZONAS_COMPLETADAS_HOY[String(s.ID||s.id)]; });
        if(todasCompletadas) {
           h+='<span style="font-size:11px;color:var(--g);font-weight:700;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px">✅ Completada</span>';
        } else if(si.personalAsignado) {
           h+='<span style="font-size:11px;color:'+(noTrabaja?'var(--danger)':'var(--g)')+';margin-right:8px">👤 '+si.personalAsignado.substring(0,25)+'</span>';
        }

        if(isSup){
          h+='<button class="btn btn-sm" style="background:'+(noTrabaja?'rgba(190,18,60,.15)':'rgba(255,200,0,.2)')+';color:'+(noTrabaja?'var(--danger)':'var(--tx)')+';border-color:'+(noTrabaja?'var(--danger)':'var(--bd)')+'" onclick="event.stopPropagation();togIntNoTrabaja('+si.id+',\''+safeIntName+'\', this)">'+(noTrabaja?'Reactivar':'No trabaja')+'</button>';
          h+='<button class="btn btn-sm" onclick="event.stopPropagation();mAsignarPersonalInt('+si.id+',\''+safeIntName+'\', '+zonaId+', \''+safeZNombre+'\')">Asignar</button>';
        }
        if(isA){
          h+='<button class="btn btn-sm" onclick="event.stopPropagation();mEditSubzonaInt('+si.id+')">✏️</button>';
          h+='<button class="btn btn-sm" onclick="event.stopPropagation();mNuevaSZInt('+zonaId+','+si.id+',\''+safeIntName+'\',\''+safeZNombre+'\')">+ Sub</button>';
          h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();elimSubzonaInt('+si.id+')">✕</button>';
        }
        if(!noTrabaja) h+='<span id="ar-int-'+si.id+'" style="font-size:10px;color:var(--tx3);margin-left:6px">▶</span>';
        h+='</div>';

        h+='<div id="sub-int-'+si.id+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
        if(!noTrabaja){
          szDeInt.forEach(function(s){ intIds[String(s.ID||s.id)]=true; h+=renderSubzonaRow(s,isA); });
        } else {
          h+='<div style="padding:10px 14px;font-size:12px;color:var(--danger);font-style:italic">Carpeta inactiva hoy</div>';
        }
        h+='</div></div>';
      });

      var szDirectas=subzonas.filter(function(s){return !intIds[String(s.ID||s.id)]&&!s.ID_SUBZONA_INT;});
      if(szDirectas.length){
        h+='<div style="margin:8px 12px; border:1.5px solid var(--bd); border-radius:var(--r); overflow:hidden">';
        h+='<div onclick="togSubInt(\'dir\'+'+zonaId+')" style="padding:10px 14px; background:var(--sur2); cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none">';
        h+='<strong style="font-size:11px;color:var(--tx2);text-transform:uppercase;flex:1">Subzonas directas de la zona</strong>';
        var todasDirComp = szDirectas.every(function(s){ return window._ZONAS_COMPLETADAS_HOY && window._ZONAS_COMPLETADAS_HOY[String(s.ID||s.id)]; });
        if(todasDirComp) h+='<span style="font-size:11px;color:var(--g);font-weight:700;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px">✅ Completadas</span>';
        h+='<span id="ar-int-dir'+zonaId+'" style="font-size:10px;color:var(--tx3)">▶</span></div>';
        h+='<div id="sub-int-dir'+zonaId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
        szDirectas.forEach(function(s){ h+=renderSubzonaRow(s,isA); });
        h+='</div></div>';
      }
      
      if(!ints.length&&!subzonas.length) el.innerHTML='<p style="padding:14px 16px;color:var(--tx3);font-style:italic">Sin subzonas en esta zona</p>';
      else el.innerHTML=h;
    }); 
  }); 
}

function togIntNoTrabaja(intId, nombre, btn){
  var esNT=!!ZONAS_INT_NT[String(intId)];
  var accion=esNT?'desmarcarZonaIntNoTrabaja':'marcarZonaIntNoTrabaja';
  if(!confirm(esNT?('¿Reactivar "'+nombre+'" para hoy?'):('¿Marcar "'+nombre+'" como No trabaja hoy?')))return;
  
  var origTxt = btn.textContent;
  btn.textContent = '⏳...'; btn.disabled = true;

  api(accion,{subzonaIntId:intId},function(r){
    btn.disabled = false; btn.textContent = origTxt;
    if(r&&r.ok){
      toast(esNT?'Reactivada':'Marcada como No trabaja', true);
      if(esNT)delete ZONAS_INT_NT[String(intId)]; else ZONAS_INT_NT[String(intId)]=true;
      
      btn.textContent = esNT ? 'No trabaja' : 'Reactivar';
      btn.style.background = esNT ? 'rgba(255,200,0,.2)' : 'rgba(190,18,60,.15)';
      btn.style.color = esNT ? 'var(--tx)' : 'var(--danger)';
      btn.style.borderColor = esNT ? 'var(--bd)' : 'var(--danger)';
      
      var intHdr = document.getElementById('int-hdr-'+intId);
      var intContainer = document.getElementById('int-container-'+intId);
      if(intHdr && intContainer) {
         intContainer.style.borderLeftColor = esNT ? 'var(--g)' : 'var(--danger)';
         intContainer.style.background = esNT ? '#F0FFF8' : '#FFF0F2';
         intHdr.style.background = esNT ? 'var(--gl)' : '#FFE5EC';
         var strong = intHdr.querySelector('strong');
         if(strong) {
            strong.style.color = esNT ? 'var(--g)' : 'var(--danger)';
            strong.textContent = (esNT ? '📁 ' : '❌ ') + nombre;
         }
      }
    } else toast(r?r.msg:'Error', false);
  });
}

function togSubInt(id){
  var body = document.getElementById('sub-int-'+id);
  var arrow = document.getElementById('ar-int-'+id);
  if(!body) return;
  var isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if(arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

function renderSubzonaRow(s,isA){
  var completada = window._ZONAS_COMPLETADAS_HOY && !!window._ZONAS_COMPLETADAS_HOY[String(s.ID||s.id)];
  var hp2=!!(s.PERSONAL_ASIGNADO&&s.PERSONAL_ASIGNADO.trim());
  var bg = completada ? '#F0FFF8' : 'white';
  var h='<div style="display:flex;align-items:center;padding:9px 16px;border-bottom:1px solid var(--bd);gap:8px;background:'+bg+'"><span style="font-weight:600;font-size:12px;flex:1">'+(s.SUBZONA||s.nombre)+'</span>';
  if (completada) h+='<span style="font-size:11px;color:var(--g);font-weight:700">✅ Completado</span>';
  else h+='<span style="font-size:11px;color:'+(hp2?'var(--tx2)':'var(--warn)')+'">'+(hp2?'👤 '+s.PERSONAL_ASIGNADO:'Sin asignar')+'</span>';
  if(isA)h+='<button class="btn btn-sm btn-d" style="padding:2px 8px" onclick="elimSZ('+(s.ID||s.id)+')">✕</button>';
  h+='</div>'; return h;
}

// 🔥 LLAMADA FRESCA AL ABRIR ASIGNAR (Recupera filtro de vacaciones)
function abrirAsignar(zonaId, zonaNombre){
  _asigTab='zona'; _zonaIdActiva = zonaId; _zonaNombreActiva = zonaNombre;
  var ov=document.createElement('div');ov.className='ov-load';ov.id='asig-ov';ov.innerHTML='<div class="ov-box">Cargando trabajadores...</div>';document.body.appendChild(ov);
  
  api('getUsuarios',{},function(ru){
    if(!ru || !ru.ok) { var el=G('asig-ov');if(el)el.remove(); toast('Error conectando',false); return; }
    var usuarios = ru.data.filter(function(u){return u.activo==='SI'&&u.rol!=='admin'&&u.rol!=='consultor'&&u.rol!=='mantenimiento';});
    
    api('getZonas',{},function(r){
      var el=G('asig-ov');if(el)el.remove();
      if(!r||!r.ok){toast('Error cargando zona',false);return;}
      var zona=r.data.zonas.find(function(z){ return String(z.ID) === String(zonaId); });
      if(!zona){toast('Zona no encontrada',false);return;}
      
      mostrarAsignar(zona,usuarios);
    });
  });
}

function mostrarAsignar(zona,usuarios){
  var subs=zona.subzonas||[];var wrap=document.createElement('div');
  var tabs=document.createElement('div');tabs.className='atabs';
  var tZ=document.createElement('button');tZ.className='atab on';tZ.textContent='Zona completa';
  var tS=document.createElement('button');tS.className='atab';tS.textContent='Por subzona';
  var pZ=document.createElement('div');var pS=document.createElement('div');pS.style.display='none';pS.style.maxHeight='350px';pS.style.overflowY='auto';
  tZ.onclick=function(){_asigTab='zona';tZ.className='atab on';tS.className='atab';pZ.style.display='block';pS.style.display='none';};
  tS.onclick=function(){_asigTab='sub';tS.className='atab on';tZ.className='atab';pS.style.display='block';pZ.style.display='none';};
  tabs.appendChild(tZ);tabs.appendChild(tS);
  var note=document.createElement('p');note.style.cssText='font-size:12px;background:var(--warnl);color:var(--warn);padding:10px 14px;border-radius:var(--r);margin-bottom:12px';
  note.innerHTML='Mismo personal para las <strong>'+subs.length+' subzonas</strong> de '+zona.ZONA;pZ.appendChild(note);
  var tipoDiv=document.createElement('div');tipoDiv.className='fg';tipoDiv.style.marginBottom='12px';
  tipoDiv.innerHTML='<label>Tipo de asignación</label><div style="display:flex;gap:8px;margin-top:4px">'+
    '<label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid var(--bd);border-radius:var(--r);cursor:pointer;font-weight:600;font-size:13px"><input type="radio" name="asig-tipo" value="semanal" checked style="accent-color:var(--g)"> Semanal</label>'+
    '<label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid var(--bd);border-radius:var(--r);cursor:pointer;font-weight:600;font-size:13px"><input type="radio" name="asig-tipo" value="diaria" style="accent-color:var(--g)"> Diaria (L-V)</label>'+
    '</div>';
  pZ.appendChild(tipoDiv);pZ.appendChild(mkPersonalList('plZ',usuarios,''));
  if(!subs.length){var emp=document.createElement('p');emp.style.cssText='color:var(--tx3);padding:16px';emp.textContent='Sin subzonas.';pS.appendChild(emp);}
  subs.forEach(function(s){
    var sdiv=document.createElement('div');sdiv.style.cssText='margin-bottom:12px;border:1.5px solid var(--bd);border-radius:var(--r);overflow:hidden';
    var stit=document.createElement('div');stit.style.cssText='background:var(--g);padding:9px 14px;font-weight:700;font-size:12px;color:white';stit.textContent=s.SUBZONA||s.nombre;
    var sbody=document.createElement('div');sbody.style.padding='10px';sbody.appendChild(mkPersonalList('plS'+(s.ID||s.id),usuarios,s.PERSONAL_ASIGNADO||''));
    sdiv.appendChild(stit);sdiv.appendChild(sbody);pS.appendChild(sdiv);
  });
  
  var hidden=document.createElement('input');hidden.type='hidden';hidden.id='asig-szids';
  hidden.value=subs.map(function(s){return s.ID||s.id||'';}).filter(Boolean).join(',');
  
  wrap.appendChild(tabs);wrap.appendChild(pZ);wrap.appendChild(pS);wrap.appendChild(hidden);
  modal('Asignar personal — '+zona.ZONA,wrap,[{label:'Cancelar',fn:closeModal},{label:'Guardar asignación',fn:guardarAsig,p:true}]);
}

function mkPersonalList(listId,usuarios,current){
  var cur=current.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var wrap=document.createElement('div');
  var btns=document.createElement('div');btns.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
  var lbl=document.createElement('span');lbl.style.cssText='font-size:12px;color:var(--tx2);font-weight:600';lbl.textContent=usuarios.length+' personas disponibles';
  var bw=document.createElement('div');bw.style.cssText='display:flex;gap:4px';
  var bA=document.createElement('button');bA.className='btn btn-sm';bA.textContent='Todos';
  var bN=document.createElement('button');bN.className='btn btn-sm';bN.textContent='Ninguno';
  var bD=document.createElement('button');bD.className='btn btn-sm btn-d';bD.textContent='Desasignar zona';
  bD.onclick=function(){
    var szIdsEl=G('asig-szids');
    if(!szIdsEl||!confirm('Quitar todo el personal de esta zona?'))return;
    var asignaciones=szIdsEl.value.split(',').filter(Boolean).map(function(sid){return {szId:sid,personal:'',tipoAsignacion:'semanal'};});
    closeModal();toast('⏳ Desasignando...');
    api('asignarPersonalBatch',{
      asignaciones:asignaciones, zonaId: _zonaIdActiva, zona: _zonaNombreActiva, zonaNombre: _zonaNombreActiva
    },function(r){
       toast(r&&r.ok?'Personal desasignado':(r?r.msg:'Error'),r&&r.ok);
       refrescarZonaParcial(_zonaIdActiva, _zonaNombreActiva);
    });
  };
  (function(id){bA.onclick=function(){var l=G(id);if(l)l.querySelectorAll('input').forEach(function(c){c.checked=true;});};bN.onclick=function(){var l=G(id);if(l)l.querySelectorAll('input').forEach(function(c){c.checked=false;});};})(listId);
  bw.appendChild(bD);bw.appendChild(bA);bw.appendChild(bN);btns.appendChild(lbl);btns.appendChild(bw);wrap.appendChild(btns);
  var list=document.createElement('div');list.id=listId;list.className='plist';
  if(!usuarios.length){var emp=document.createElement('p');emp.style.cssText='color:var(--tx3);font-size:13px;padding:10px;text-align:center';emp.textContent='Sin usuarios disponibles (o en vacaciones)';list.appendChild(emp);}
  usuarios.forEach(function(u){
    var lbl2=document.createElement('label');lbl2.className='pitem';
    var chk=document.createElement('input');chk.type='checkbox';chk.value=u.nombre;chk.checked=cur.indexOf(u.nombre)>=0;
    var av=document.createElement('div');av.className='pav';av.style.background=u.color||'#1A472A';av.textContent=(u.iniciales||u.nombre.slice(0,2)).toUpperCase();
    var info=document.createElement('div');
    var nm=document.createElement('div');nm.style.cssText='font-size:13px;font-weight:600';nm.textContent=u.nombre;
    var rl=document.createElement('div');rl.style.cssText='font-size:11px;color:var(--tx3)';rl.textContent=u.rol;
    info.appendChild(nm);info.appendChild(rl);lbl2.appendChild(chk);lbl2.appendChild(av);lbl2.appendChild(info);list.appendChild(lbl2);
  });
  wrap.appendChild(list);return wrap;
}

// 🔥 GUARDAR ASIGNACIÓN MAESTRA (BLINDADO CON ZONA Y ZONANOMBRE)
function guardarAsig(){
  var szIdsEl=G('asig-szids');if(!szIdsEl){toast('Error modal',false);return;}
  var szIds=szIdsEl.value.split(',').filter(Boolean);
  
  if(_asigTab==='zona'){
    var plZ=G('plZ');if(!plZ){toast('Error',false);return;}
    var sel=[];plZ.querySelectorAll('input:checked').forEach(function(cb){sel.push(cb.value);});
    if(!sel.length){toast('Selecciona al menos una persona','warn');return;}
    var personal=sel.join(', ');var tipoRb=document.querySelector('input[name="asig-tipo"]:checked');var tipoAsig=tipoRb?tipoRb.value:'semanal';
    closeModal();toast('⏳ Asignando...');
    
    var asignaciones=szIds.map(function(id){return {szId:id,personal:personal,tipoAsignacion:tipoAsig};});
    api('asignarPersonalBatch',{
      asignaciones: asignaciones,
      zonaId: _zonaIdActiva,
      zonaNombre: _zonaNombreActiva,
      zona: _zonaNombreActiva
    },function(r){
       toast(r&&r.ok?'✅ Personal asignado':(r?r.msg:'Error: Falta Zona'),r&&r.ok);
       if(r&&r.ok) refrescarZonaParcial(_zonaIdActiva, _zonaNombreActiva);
    });
  } else {
    var asigs=[],done=0;
    szIds.forEach(function(id){var pl=G('plS'+id);var sel=[];if(pl)pl.querySelectorAll('input:checked').forEach(function(cb){sel.push(cb.value);});asigs.push({szId:id,personal:sel.join(', ')});});
    closeModal();toast('⏳ Guardando...');
    function nS(i){
      if(i>=asigs.length){toast('✅ Guardado'); refrescarZonaParcial(_zonaIdActiva, _zonaNombreActiva); return;}
      api('asignarPersonal',{
        szId: asigs[i].szId,
        personal: asigs[i].personal,
        zonaId: _zonaIdActiva,
        zonaNombre: _zonaNombreActiva,
        zona: _zonaNombreActiva
      },function(r){if(r&&r.ok)done++;nS(i+1);});
    }
    nS(0);
  }
}

function mAsignarPersonalInt(id,nombre,zonaIdActiva,zonaNombreActiva){
  nombre=nombre||'zona intermedia';
  _zonaIdActiva = zonaIdActiva; _zonaNombreActiva = zonaNombreActiva;
  
  api('getUsuarios',{},function(r){
    if(!r||!r.ok)return;
    var usuarios=r.data.filter(function(u){return u.activo==='SI'&&u.rol!=='admin'&&u.rol!=='consultor'&&u.rol!=='mantenimiento';});
    var wrap=document.createElement('div');
    wrap.appendChild(mkPersonalListInt('plInt'+id,usuarios,''));
    modal('Asignar personal — '+nombre,wrap,[
      {label:'Cancelar',fn:closeModal},
      {label:'Guardar',fn:function(){
        var plInt=G('plInt'+id);if(!plInt){toast('Error',false);return;}
        var sel=[];plInt.querySelectorAll('input:checked').forEach(function(cb){sel.push(cb.value);});
        var personal=sel.join(', ');
        closeModal(); toast('⏳ Asignando...');
        
        api('asignarPersonalInt',{
          id: id,
          subzonaIntId: id,
          personal: personal,
          zonaId: _zonaIdActiva,
          zonaNombre: _zonaNombreActiva,
          zona: _zonaNombreActiva
        },function(res){
          toast(res&&res.ok?'✅ Personal asignado':(res?res.msg:'Error: Falta Zona'),res&&res.ok);
          if(res&&res.ok) refrescarZonaParcial(_zonaIdActiva, _zonaNombreActiva);
        });
      },p:true}
    ]);
  });
}

function mkPersonalListInt(listId,usuarios,current){
  var cur=current.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var wrap=document.createElement('div');
  var btns=document.createElement('div');btns.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
  var lbl=document.createElement('span');lbl.style.cssText='font-size:12px;color:var(--tx2);font-weight:600';lbl.textContent=usuarios.length+' personas disponibles';
  var bw=document.createElement('div');bw.style.cssText='display:flex;gap:4px';
  var bA=document.createElement('button');bA.className='btn btn-sm';bA.textContent='Todos';
  var bN=document.createElement('button');bN.className='btn btn-sm';bN.textContent='Ninguno';
  bA.onclick=function(){var l=G(listId);if(l)l.querySelectorAll('input').forEach(function(c){c.checked=true;});};
  bN.onclick=function(){var l=G(listId);if(l)l.querySelectorAll('input').forEach(function(c){c.checked=false;});};
  bw.appendChild(bA);bw.appendChild(bN);btns.appendChild(lbl);btns.appendChild(bw);wrap.appendChild(btns);
  var list=document.createElement('div');list.id=listId;list.className='plist';
  if(!usuarios.length){var emp=document.createElement('p');emp.style.cssText='color:var(--tx3);font-size:13px;padding:10px;text-align:center';emp.textContent='Sin usuarios disponibles';list.appendChild(emp);}
  usuarios.forEach(function(u){
    var lbl2=document.createElement('label');lbl2.className='pitem';
    var chk=document.createElement('input');chk.type='checkbox';chk.value=u.nombre;chk.checked=cur.indexOf(u.nombre)>=0;
    var av=document.createElement('div');av.className='pav';av.style.background=u.color||'#1A472A';av.textContent=(u.iniciales||u.nombre.slice(0,2)).toUpperCase();
    var info=document.createElement('div');
    var nm=document.createElement('div');nm.style.cssText='font-size:13px;font-weight:600';nm.textContent=u.nombre;
    var rl=document.createElement('div');rl.style.cssText='font-size:11px;color:var(--tx3)';rl.textContent=u.rol;
    info.appendChild(nm);info.appendChild(rl);lbl2.appendChild(chk);lbl2.appendChild(av);lbl2.appendChild(info);list.appendChild(lbl2);
  });
  wrap.appendChild(list);return wrap;
}

function mNuevaZona(){
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Nombre</label><input id="nz-n" placeholder="EJ: ALMACÉN"></div>'+
    '<div class="fg"><label>Color</label><select id="nz-c"><option value="#D4EBD9">Verde</option><option value="#DCF0FF">Azul</option><option value="#FEF3C7">Amarillo</option><option value="#FDECEA">Rojo</option><option value="#EDE9FE">Morado</option></select></div>';
  modal('Nueva zona',wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nz-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearZona',{nombre:n,color:G('nz-c').value},function(r){toast(r&&r.ok?'Zona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgZonas();}});},p:true}]);
}

function elimZona(id, zonaNombre){if(!confirm('¿Eliminar zona y todas sus subzonas?'))return;api('eliminarZona',{id:id, zonaId:id, zona:zonaNombre, zonaNombre:zonaNombre},function(r){toast(r&&r.ok?'Zona eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}

function mNuevaSZ(zonaId,zonaNombre){
  var wrap=document.createElement('div');wrap.innerHTML='<div class="fg"><label>Nombre de la subzona</label><input id="nsz-n" placeholder="EJ: SUELOS"></div>';
  modal('Nueva subzona en '+zonaNombre,wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nsz-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearSubzona',{zonaId:zonaId,zonaNombre:zonaNombre,zona:zonaNombre,nombre:n},function(r){toast(r&&r.ok?'Subzona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgZonas();}});},p:true}]);
}

function elimSZ(id){if(!confirm('¿Eliminar esta subzona?'))return;api('eliminarSubzona',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}

function mNuevaSubzonaInt(zonaId,zonaNombre){
  zonaNombre=zonaNombre||'zona '+zonaId;
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Nombre de la zona intermedia</label><input id="nsi-n" placeholder="EJ: Z7.1 - Filetes"></div>';
  modal('Nueva zona intermedia en '+zonaNombre,wrap,[
    {label:'Cancelar',fn:closeModal},
    {label:'Crear',fn:function(){
      var n=G('nsi-n').value.trim().toUpperCase();
      if(!n){toast('Escribe un nombre','warn');return;}
      api('crearSubzonaInt',{zonaId:zonaId,zonaNombre:zonaNombre,zona:zonaNombre,nombre:n},function(r){
        toast(r&&r.ok?'Zona intermedia creada':(r?r.msg:'Error'),r&&r.ok);
        if(r&&r.ok){closeModal();pgZonas();} 
      });
    },p:true}
  ]);
}

function mEditSubzonaInt(id,nombre){
  nombre=nombre||'';
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Nombre</label><input id="esi-n" value="'+nombre+'"></div>';
  modal('Editar zona intermedia',wrap,[
    {label:'Cancelar',fn:closeModal},
    {label:'Guardar',fn:function(){
      api('editarSubzonaInt',{id:id,nombre:G('esi-n').value.trim()},function(r){
        toast(r&&r.ok?'Actualizada':(r?r.msg:'Error'),r&&r.ok);
        if(r&&r.ok){closeModal();pgZonas();}
      });
    },p:true}
  ]);
}

function elimSubzonaInt(id){
  if(!confirm('¿Eliminar esta zona intermedia? Las subzonas quedarán sin zona intermedia.'))return;
  api('eliminarSubzonaInt',{id:id},function(r){
    toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);
    if(r&&r.ok)pgZonas();
  });
}

function expAll(){document.querySelectorAll('.zbody').forEach(function(e){e.style.display='block';});document.querySelectorAll('[id^="zac"]').forEach(function(e){e.textContent='▼';});document.querySelectorAll('[id^="sub-int-"]').forEach(function(e){e.style.display='block';});document.querySelectorAll('[id^="ar-int-"]').forEach(function(e){e.textContent='▼';});}
function colAll(){document.querySelectorAll('.zbody').forEach(function(e){e.style.display='none';});document.querySelectorAll('[id^="zac"]').forEach(function(e){e.textContent='▶';});document.querySelectorAll('[id^="sub-int-"]').forEach(function(e){e.style.display='none';});document.querySelectorAll('[id^="ar-int-"]').forEach(function(e){e.textContent='▶';});}
// ============================================================
// FIN DEL MÓDULO DE ZONAS
// ============================================================


// ============================================================
// MÓDULO DE USUARIOS
// ============================================================
function pgUsers(){
  if(ROL==='worker'){pc('<div class="card">Sin acceso</div>');return;}
  api('getUsuarios',{},function(r){
    if(!r||!r.ok){pc('<div class="card">Error</div>');return;}
    var isA=ROL==='admin';
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">';
    h+='<h2 style="font-size:17px;font-weight:800">Usuarios</h2>';
    if(isA)h+='<button class="btn btn-p" onclick="mNuevoUser()">+ Nuevo usuario</button>';
    h+='</div><div class="card"><div class="tw"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th>'+(isA?'<th>Acciones</th>':'')+'</tr></thead><tbody>';
    r.data.forEach(function(u){
      h+='<tr><td><div style="display:flex;align-items:center;gap:8px">';
      h+='<div style="width:30px;height:30px;border-radius:50%;background:'+(u.color||'#1A472A')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white">'+(u.iniciales||u.nombre.slice(0,2)).toUpperCase()+'</div>';
      h+='<strong>'+u.nombre+'</strong></div></td>';
      h+='<td style="color:var(--tx2)">'+u.usuario+'</td>';
      var roleCls={admin:'bg-w',supervisor:'bg-w',worker:'bg-g',consultor:'bg-gr',laboratorio:'bg-g'};
      h+='<td><span class="'+(roleCls[u.rol]||'bg-gr')+'">'+u.rol+'</span></td>';
      h+='<td><span class="'+(u.activo==='SI'?'bg-g':'bg-gr')+'">'+(u.activo==='SI'?'Activo':'Inactivo')+'</span></td>';
      if(isA){h+='<td><div style="display:flex;gap:5px"><button class="btn btn-sm" onclick=\'mEditUser('+JSON.stringify(u).replace(/'/g, "&apos;")+')\'>✏️</button><button class="btn btn-sm" onclick="mPassUser('+u.id+')">🔑</button><button class="btn btn-sm btn-d" onclick="elimUser('+u.id+')">✕</button></div></td>';}
      h+='</tr>';
    });
    h+='</tbody></table></div></div>';
    pc(h);
  });
}
function mNuevoUser(){
  var wrap=document.createElement('div');
  wrap.innerHTML=
    '<div class="fr"><div class="fg"><label>Nombre completo</label><input id="nu-n" placeholder="María García"></div><div class="fg"><label>Usuario</label><input id="nu-u" placeholder="mgarcia"></div></div>'+
    '<div class="fr"><div class="fg"><label>Contraseña</label><input type="password" id="nu-p"></div>'+
    '<div class="fg"><label>Rol</label><select id="nu-r">'+
    '<option value="worker">Trabajador</option>'+
    '<option value="supervisor">Supervisor</option>'+
    '<option value="admin">Admin</option>'+
    '<option value="consultor">Consultor</option>'+
    '<option value="mantenimiento">Mantenimiento</option>'+
    '<option value="jefe_mantenimiento">Jefe Mantenimiento</option>'+
    '<option value="laboratorio">Laboratorio</option>'+
    '</select></div></div>'+
    '<div class="fr"><div class="fg"><label>Iniciales (2)</label><input id="nu-i" maxlength="2" placeholder="MG"></div><div class="fg"><label>Email</label><input type="email" id="nu-e" placeholder="m@empresa.com"></div></div>';
  modal('Nuevo usuario',wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){
    var p={nombre:G('nu-n').value.trim(),usuario:G('nu-u').value.trim(),password:G('nu-p').value,rol:G('nu-r').value,iniciales:G('nu-i').value.trim().toUpperCase(),email:G('nu-e').value.trim(),color:'#1A472A'};
    if(!p.nombre||!p.usuario||!p.password){toast('Completa nombre, usuario y contraseña','warn');return;}
    api('crearUsuario',p,function(r){toast(r&&r.ok?''+r.msg:(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgUsers();}});
  },p:true}]);
}
function mEditUser(u){
  var wrap=document.createElement('div');
  wrap.innerHTML=
    '<div class="fg"><label>Nombre</label><input id="eu-n" value="'+u.nombre+'"></div>'+
    '<div class="fr"><div class="fg"><label>Rol</label><select id="eu-r">'+
    '<option value="worker"'+(u.rol==='worker'?' selected':'')+'>Trabajador</option>'+
    '<option value="supervisor"'+(u.rol==='supervisor'?' selected':'')+'>Supervisor</option>'+
    '<option value="admin"'+(u.rol==='admin'?' selected':'')+'>Admin</option>'+
    '<option value="consultor"'+(u.rol==='consultor'?' selected':'')+'>Consultor</option>'+
    '<option value="mantenimiento"'+(u.rol==='mantenimiento'?' selected':'')+'>Mantenimiento</option>'+
    '<option value="jefe_mantenimiento"'+(u.rol==='jefe_mantenimiento'?' selected':'')+'>Jefe Mantenimiento</option>'+
    '<option value="laboratorio"'+(u.rol==='laboratorio'?' selected':'')+'>Laboratorio</option>'+
    '</select></div>'+
    '<div class="fg"><label>Estado</label><select id="eu-a"><option value="1"'+(u.activo==='SI'?' selected':'')+'>Activo</option><option value="0"'+(u.activo!=='SI'?' selected':'')+'>Inactivo</option></select></div></div>'+
    '<div class="fg"><label>Email</label><input type="email" id="eu-e" value="'+(u.email||'')+'"></div>';
  modal('Editar usuario',wrap,[{label:'Cancelar',fn:closeModal},{label:'Guardar',fn:function(){
    api('editarUsuario',{id:u.id,nombre:G('eu-n').value.trim(),rol:G('eu-r').value,email:G('eu-e').value.trim(),activo:G('eu-a').value==='1'},function(r){
      toast(r&&r.ok?'Actualizado':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgUsers();}
    });
  },p:true}]);
}
function mPassUser(id){
  var wrap=document.createElement('div');wrap.innerHTML='<div class="fg"><label>Nueva contraseña</label><input type="password" id="cp1"></div><div class="fg"><label>Confirmar</label><input type="password" id="cp2"></div>';
  modal('Cambiar contraseña',wrap,[{label:'Cancelar',fn:closeModal},{label:'Cambiar',fn:function(){if(G('cp1').value!==G('cp2').value){toast('No coinciden','warn');return;}api('cambiarPassword',{id:id,newPassword:G('cp1').value},function(r){toast(r&&r.ok?''+r.msg:(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)closeModal();});},p:true}]);
}
function elimUser(id){if(!confirm('¿Eliminar este usuario?'))return;api('eliminarUsuario',{id:id},function(r){toast(r&&r.ok?'Eliminado':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgUsers();});}

// ============================================================
// MÓDULO DE VACACIONES Y AUSENCIAS
// ============================================================
function pgVacaciones(){
  var isSup=ROL==='admin'||ROL==='supervisor';
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">';
  h+='<div><h2 style="font-size:17px;font-weight:800">Vacaciones y Ausencias</h2>';
  h+='<p style="font-size:12px;color:var(--tx3)">Gestion manual + sincronizacion con Bizneo</p></div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
  if(isSup)h+='<button class="btn" onclick="sincBizneoFront()">Sincronizar Bizneo</button>';
  if(isSup)h+='<button class="btn btn-p" onclick="mNuevaVacacion()">+ Añadir ausencia</button>';
  h+='</div></div>';
  h+='<div class="tabs"><div class="tab active" onclick="vacTab(this,1)">Activas hoy</div><div class="tab" onclick="vacTab(this,2)">Próximas</div><div class="tab" onclick="vacTab(this,3)">Todas</div></div>';
  h+='<div id="vt-act" class="tp active"><div class="spin"></div></div><div id="vt-prox" class="tp"></div><div id="vt-all" class="tp"></div>';
  pc(h); cargarVacaciones('activas');
}
function vacTab(el,num){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tp').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');
  var id=num===1?'vt-act':num===2?'vt-prox':'vt-all';
  var tp=G(id);if(tp)tp.classList.add('active');
  if(num===1)cargarVacaciones('activas'); else if(num===2)cargarVacaciones('proximas'); else cargarVacaciones('todas');
}
function cargarVacaciones(tipo){
  var elId=tipo==='activas'?'vt-act':tipo==='proximas'?'vt-prox':'vt-all';
  var el=G(elId);if(!el)return; el.innerHTML='<div class="spin"></div>';
  var hoy=today(), payload={};
  if(tipo==='activas'){payload.desde=hoy;payload.hasta=hoy;} else if(tipo==='proximas'){payload.desde=hoy;}
  api('getVacaciones',payload,function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card" style="color:var(--danger)">Error</div>';return;}
    var lista=r.data;
    if(tipo==='activas')lista=lista.filter(function(v){return v.activa;});
    if(!lista.length){
      el.innerHTML='<div class="card" style="text-align:center;padding:32px;color:var(--tx3)"><div style="font-size:40px;margin-bottom:8px">'+(tipo==='activas'?'✅':'📅')+'</div>'+(tipo==='activas'?'Nadie de vacaciones hoy':tipo==='proximas'?'Sin ausencias próximas':'Sin registros')+'</div>';
      return;
    }
    var isSup=ROL==='admin'||ROL==='supervisor';
    var h='<div class="card" style="padding:0;overflow:hidden"><div class="tw"><table><thead><tr><th>Trabajador</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Motivo</th><th>Fuente</th><th>Estado</th>'+(isSup?'<th></th>':'')+'</tr></thead><tbody>';
    lista.forEach(function(v){
      var ini=new Date(v.fechaInicio+'T00:00:00'), fin=new Date(v.fechaFin+'T00:00:00');
      var dias=Math.round((fin-ini)/(1000*60*60*24))+1, esBizneo=v.fuente==='bizneo';
      h+='<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:'+(v.activa?'#C2410C':'var(--g)')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white">'+v.nombre.slice(0,2).toUpperCase()+'</div><strong>'+v.nombre+'</strong></div></td>';
      h+='<td style="white-space:nowrap">'+fmtFecha(v.fechaInicio)+'</td><td style="white-space:nowrap">'+fmtFecha(v.fechaFin)+'</td>';
      h+='<td style="text-align:center;font-weight:700">'+dias+'</td><td style="font-size:12px;color:var(--tx2)">'+(v.motivo||'—')+'</td>';
      h+='<td>'+(esBizneo?'<span style="background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">Bizneo</span>':'<span class="bg-g">Manual</span>')+'</td>';
      h+='<td>'+(v.activa?'<span class="bg-w">Activa</span>':'<span class="bg-gr">Pasada</span>')+'</td>';
      if(isSup)h+='<td>'+(esBizneo?'<span style="font-size:11px;color:var(--tx3)">Auto</span>':'<button class="btn btn-sm btn-d" onclick="elimVacacion('+v.id+')">✕</button>')+'</td>';
      h+='</tr>';
    });
    h+='</tbody></table></div></div>'; el.innerHTML=h;
  });
}
function fmtFecha(iso){
  if(!iso)return'—';
  var d=new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
}
function mNuevaVacacion(){
  api('getUsuarios',{},function(r){
    if(!r||!r.ok)return;
    var usuarios=r.data.filter(function(u){return u.activo==='SI';});
    var opts=usuarios.map(function(u){return '<option value="'+u.nombre+'">'+u.nombre+'</option>';}).join('');
    var wrap=document.createElement('div'), hoy=today();
    wrap.innerHTML=
      '<div class="fg"><label>Trabajador</label><select id="nv-who">'+opts+'</select></div>'+
      '<div class="fr"><div class="fg"><label>Fecha inicio</label><input type="date" id="nv-ini" value="'+hoy+'"></div><div class="fg"><label>Fecha fin</label><input type="date" id="nv-fin" value="'+hoy+'"></div></div>'+
      '<div class="fg"><label>Motivo</label><input id="nv-mot" placeholder="Vacaciones, baja, permiso..."></div>';
    modal('Añadir ausencia',wrap,[{label:'Cancelar',fn:closeModal},{label:'Guardar',fn:function(){
        var ini=G('nv-ini').value,fin=G('nv-fin').value;
        if(!ini||!fin){toast('Selecciona fechas','warn');return;}
        if(ini>fin){toast('La fecha inicio no puede ser posterior al fin','warn');return;}
        api('crearVacacion',{nombre:G('nv-who').value,fechaInicio:ini,fechaFin:fin,motivo:G('nv-mot').value},function(r){
          toast(r&&r.ok?r.msg:(r?r.msg:'Error'),r&&r.ok); if(r&&r.ok){closeModal();cargarVacaciones('activas');}
        });
      },p:true}
    ]);
  });
}
function elimVacacion(id){if(!confirm('¿Eliminar esta ausencia?'))return;api('eliminarVacacion',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)cargarVacaciones('todas');});}
function sincBizneoFront(){
  toast('Sincronizando con Bizneo...');
  api('sincBizneo',{},function(r){toast(r&&r.ok?'✅ '+r.msg:(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)cargarVacaciones('activas');});
}



// ============================================================
// MÓDULO DE INFORMES
// ============================================================
function pgInformes(){
  var isW=ROL==='worker',isC=ROL==='consultor';
  var h='<div class="tabs"><div class="tab active" onclick="swTabInf(this,\'ti-d\')">Diario</div><div class="tab" onclick="swTabInf(this,\'ti-s\')">Semanal</div><div class="tab" onclick="swTabInf(this,\'ti-m\')">Mensual</div><div class="tab" onclick="swTabInf(this,\'ti-z\')">Por Zona</div>';
  if(!isW&&!isC)h+='<div class="tab" onclick="swTabInf(this,\'ti-e\')">Email</div>';
  h+='</div><div id="ti-d" class="tp active"><div class="spin"></div></div><div id="ti-s" class="tp"></div><div id="ti-m" class="tp"></div><div id="ti-z" class="tp"></div>';
  if(!isW&&!isC)h+='<div id="ti-e" class="tp"></div>';
  pc(h);loadDiario();
}
 
function swTabInf(el,id){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tp').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');var tp=G(id);if(tp)tp.classList.add('active');
  if(id==='ti-d'&&tp&&!tp.querySelector('#inf-print-d'))loadDiario();
  if(id==='ti-s'&&tp&&!tp.querySelector('#inf-print-s'))loadSemanal();
  if(id==='ti-m'&&tp&&!tp.querySelector('#inf-print-m'))loadMensual();
  if(id==='ti-z'&&tp&&!tp.querySelector('#inf-print-z'))loadPorZona();
  if(id==='ti-e')renderEmail();
}
 

/// ============================================================
// BÚSQUEDA POR ZONA, ZONA INTERMEDIA Y SUBZONA (EN CASCADA)
// ============================================================

var cacheJerarquia = null;

// --- 1. CARGA INICIAL Y DIBUJO DE LA INTERFAZ ---
function loadPorZona() {
  var el = G('ti-z'); if(!el) return;
  
  var h = '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap;gap:12px">';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;flex:1">';
  
  h += '<div style="flex:1;min-width:140px"><label style="display:block;font-size:11px;color:var(--tx2);font-weight:700;margin-bottom:4px">ZONA *</label>';
  h += '<select id="bus-zona" onchange="cambioZona()" disabled style="width:100%;padding:7px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;box-sizing:border-box;background:white;cursor:pointer"><option>Cargando datos...</option></select></div>';
  
  h += '<div style="flex:1;min-width:140px"><label style="display:block;font-size:11px;color:var(--tx2);font-weight:700;margin-bottom:4px">Z. INTERMEDIA (Opc.)</label>';
  h += '<select id="bus-zi" onchange="cambioZI()" disabled style="width:100%;padding:7px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;box-sizing:border-box;background:white;cursor:pointer"><option>Esperando zona...</option></select></div>';
  
  h += '<div style="flex:1;min-width:140px"><label style="display:block;font-size:11px;color:var(--tx2);font-weight:700;margin-bottom:4px">SUBZONA (Opc.)</label>';
  h += '<select id="bus-subzona" disabled style="width:100%;padding:7px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;box-sizing:border-box;background:white;cursor:pointer"><option>Esperando z. int...</option></select></div>';
  
  h += '</div>';
  h += '<div style="display:flex;gap:8px">';
  h += '<button class="btn btn-p" style="height:36px;padding:0 20px" onclick="ejecutarBusquedaZonas()">Buscar</button>';
  h += '<button class="btn btn-p" style="height:36px" onclick="printInf(\'inf-print-z\')">Imprimir</button>';
  h += '</div></div>';
  h += '<div id="inf-print-z"><div class="spin"></div><p style="text-align:center;color:var(--tx3);font-size:12px;margin-top:10px">Conectando con base de datos de zonas...</p></div>';
  
  el.innerHTML = h;

  if(cacheJerarquia) {
    pintarSelectZonasInicial();
  } else {
    api('getJerarquia', {}, function(r) {
      if(r && r.ok && r.data) {
        cacheJerarquia = r.data;
        pintarSelectZonasInicial();
      } else {
        var err = (r && r.msg) ? r.msg : "Error desconocido";
        G('inf-print-z').innerHTML = '<p style="color:red;text-align:center;padding:20px">Error del servidor: ' + err + '</p>';
      }
    });
  }
}

// --- 2. PINTAR EL PRIMER DESPLEGABLE (ZONAS) ---
function pintarSelectZonasInicial() {
  var selZ = G('bus-zona');
  var selZI = G('bus-zi');
  var selSZ = G('bus-subzona');
  
  selZ.disabled = false;
  selZI.disabled = true;
  selSZ.disabled = true;
  
  var opts = '<option value="">Seleccione Zona...</option>';
  cacheJerarquia.zonas.forEach(function(z) {
    var nombreMostrar = z.nombre || z.zona || z.id; 
    opts += '<option value="' + z.id + '">' + nombreMostrar + '</option>';
  });
  selZ.innerHTML = opts;
  
  selZI.innerHTML = '<option value="">Primero seleccione Zona</option>';
  selSZ.innerHTML = '<option value="">Primero seleccione Z. Int.</option>';
  
  G('inf-print-z').innerHTML = '<p style="color:var(--tx3);text-align:center;padding:30px;background:var(--sur2);border-radius:var(--r)">Configura los filtros arriba y pulsa Buscar</p>';
}

// --- 3. EVENTOS DE CAMBIO DE DESPLEGABLES ---
function cambioZona() {
  var idZona = G('bus-zona').value;
  var selZI = G('bus-zi');
  var selSZ = G('bus-subzona');
  
  selSZ.disabled = true;
  selSZ.innerHTML = '<option value="">Primero seleccione Z. Int.</option>';
  
  if(!idZona) {
    selZI.disabled = true;
    selZI.innerHTML = '<option value="">Primero seleccione Zona</option>';
    return;
  }
  
  selZI.disabled = false;
  var opts = '<option value="">Todas las Z. Intermedias...</option>';
  var subIntsFiltradas = cacheJerarquia.subzonasInt.filter(function(zi) { return zi.id_zona == idZona; });
  
  subIntsFiltradas.forEach(function(zi) {
    var nombreMostrar = zi.nombre || zi.subzona_int || zi.id;
    opts += '<option value="' + zi.id + '">' + nombreMostrar + '</option>';
  });
  selZI.innerHTML = opts;
}

function cambioZI() {
  var idZona = G('bus-zona').value;
  var idZi = G('bus-zi').value;
  var selSZ = G('bus-subzona');
  
  if(!idZi) {
    selSZ.disabled = true;
    selSZ.innerHTML = '<option value="">Primero seleccione Z. Int.</option>';
    return;
  }
  
  selSZ.disabled = false;
  var opts = '<option value="">Todas las Subzonas...</option>';
  var subzonasFiltradas = cacheJerarquia.subzonas.filter(function(sz) { return sz.id_zona == idZona && sz.id_subzona_int == idZi; });
  
  subzonasFiltradas.forEach(function(sz) {
    var nombreMostrar = sz.nombre || sz.subzona || sz.id;
    opts += '<option value="' + sz.id + '">' + nombreMostrar + '</option>';
  });
  selSZ.innerHTML = opts;
}

// --- 4. EXTRACCIÓN DE TEXTO Y EJECUCIÓN ---
function ejecutarBusquedaZonas() {
  var selZ = G('bus-zona');
  var selZI = G('bus-zi');
  var selSZ = G('bus-subzona');
  var el = G('inf-print-z');
  
  if (!selZ || !selZ.value) {
    el.innerHTML = '<p style="color:#D97706;text-align:center;padding:20px;background:#FEF3C7;border-radius:var(--r);font-weight:700">⚠️ INTRODUZCA ZONA (Es obligatoria para buscar).</p>';
    return;
  }

  var zonaTxt = selZ.options[selZ.selectedIndex].text;
  var ziTxt = selZI.value ? selZI.options[selZI.selectedIndex].text : "";
  var szTxt = selSZ.value ? selSZ.options[selSZ.selectedIndex].text : "";
  
  buscarPorZonasMultiples(zonaTxt, ziTxt, szTxt);
}

// --- 5. LÓGICA DE BÚSQUEDA Y FILTRADO ESTRICTO ---
function buscarPorZonasMultiples(zonaTxt, ziTxt, szTxt) {
  var el = G('inf-print-z');
  el.innerHTML = '<div class="spin"></div><p style="text-align:center;font-size:12px;color:var(--tx3);margin-top:10px;">Buscando y filtrando registros...</p>';
  
  api('buscarPorZona', { zona: zonaTxt }, function(r) {
    if(!r || !r.ok || !r.data) {
      el.innerHTML = '<p style="color:var(--danger);padding:16px;text-align:center">Error: ' + (r ? r.msg : 'Desconocido') + '</p>';
      return;
    }
    
    var registros = r.data;
    
    // 1. Reconstrucción ULTRA SEGURA de la jerarquía (ZONA + SUBZONA = INTERMEDIA)
    var mapaZI = {};
    if (cacheJerarquia && cacheJerarquia.subzonas && cacheJerarquia.subzonasInt) {
      cacheJerarquia.subzonas.forEach(function(s) {
        var nZona = String(s.zona || '').trim().toUpperCase();
        if (!nZona && s.id_zona) {
          var objZ = cacheJerarquia.zonas.find(function(z){ return z.id == s.id_zona; });
          if (objZ) nZona = String(objZ.zona || objZ.nombre || '').trim().toUpperCase();
        }
        
        var nSub = String(s.subzona || s.nombre || '').trim().toUpperCase();
        var idInt = s.id_subzona_int;
        
        if (nZona && nSub && idInt) {
          var objInt = cacheJerarquia.subzonasInt.find(function(i){ return i.id == idInt; });
          if (objInt) {
            mapaZI[nZona + '|' + nSub] = String(objInt.nombre || objInt.subzona_int || '').trim().toUpperCase();
          }
        }
      });
    }
    
    // 2. Filtrado Local ESTRICTO
    registros = registros.filter(function(reg) {
      var rZ = String(reg.zona || '').trim().toUpperCase();
      var rSZ = String(reg.subzona || '').trim().toUpperCase();
      
      var rZI = mapaZI[rZ + '|' + rSZ] || '';
      
      var matchZ = (rZ === String(zonaTxt).trim().toUpperCase());
      var matchZI = (ziTxt === '' || rZI === String(ziTxt).trim().toUpperCase());
      var matchSZ = (szTxt === '' || rSZ === String(szTxt).trim().toUpperCase());
      
      return matchZ && matchZI && matchSZ;
    });

    // 3. Validación de registros vacíos
    if(registros.length === 0) {
      el.innerHTML = '<p style="color:var(--tx3);text-align:center;padding:30px;background:var(--sur2);border-radius:var(--r);font-size:14px"><b>No existen registros de ese día para la selección.</b></p>';
      return;
    }
    
    // 4. Agrupación por Fecha -> Zona Intermedia -> Subzona
    var porFecha = {};
    registros.forEach(function(reg) {
      var f = reg.fecha || 'Sin fecha';
      var rZ = String(reg.zona || '').trim().toUpperCase();
      var sZon = String(reg.subzona || 'Sin Subzona').toUpperCase();
      
      // Si no tiene zona intermedia (o es un registro antiguo/suelto), lo ponemos en ZONAS DIRECTAS
      var zInt = mapaZI[rZ + '|' + sZon] || 'ZONAS DIRECTAS';
      
      if(!porFecha[f]) porFecha[f] = {};
      if(!porFecha[f][zInt]) porFecha[f][zInt] = {};
      if(!porFecha[f][zInt][sZon]) porFecha[f][zInt][sZon] = [];
      
      porFecha[f][zInt][sZon].push(reg);
    });
    
    // 5. Construcción visual
    var html = '<div style="background:var(--g);color:white;padding:20px 24px;border-radius:var(--rl) var(--rl) 0 0">';
    html += '<h2 style="font-size:18px;font-weight:800;margin-bottom:4px">Búsqueda por Jerarquía</h2>';
    var desc = 'Zona: <b>' + zonaTxt + '</b>';
    if(ziTxt) desc += ' | Z. Int: <b>' + ziTxt + '</b>';
    if(szTxt) desc += ' | Subzona: <b>' + szTxt + '</b>';
    html += '<p style="opacity:.9;font-size:13px">' + desc + '</p>';
    html += '<div style="margin-top:12px"><div style="font-size:22px;font-weight:800">' + registros.length + '</div><div style="font-size:11px;opacity:.7">REGISTROS TOTALES</div></div></div>';
    html += '<div style="border:1px solid var(--bd);border-top:none;border-radius:0 0 var(--rl) var(--rl);overflow:hidden">';
    
    var fechas = Object.keys(porFecha).sort(function(a, b) {
      var da = a.split('/').reverse().join('');
      var db = b.split('/').reverse().join('');
      return da > db ? -1 : 1;
    });
    
    fechas.forEach(function(fecha) {
      var zIntermedias = porFecha[fecha];
      var totalDia = 0;
      Object.keys(zIntermedias).forEach(function(ziKey) { Object.keys(zIntermedias[ziKey]).forEach(function(szKey) { totalDia += zIntermedias[ziKey][szKey].length; }); });
      
      html += '<div class="card-check" style="border-bottom:1px solid var(--bd)">';
      html += '<div class="card-header-clickable" style="background:var(--sur2);padding:12px;display:flex;align-items:center;gap:10px;user-select:none;cursor:pointer" ondblclick="togInfRow(this)">';
      html += '<span style="font-size:16px">📅</span><strong style="flex:1;font-size:14px">' + fecha + '</strong>';
      html += '<span style="background:white;color:var(--tx2);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid var(--bd)">' + totalDia + ' registros</span>';
      html += '<span class="zarr">▶</span></div>';
      html += '<div class="tw" style="max-height:0;overflow:hidden;transition:max-height .3s ease;padding:0">';
      
      Object.keys(zIntermedias).forEach(function(ziKey) {
        
        html += '<div style="background:#E2E8F0;padding:8px 14px;font-weight:800;font-size:12px;color:#334155;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:6px">';
        html += '<span style="color:#64748B">📂</span> ' + ziKey + '</div>';
        
        var subzonas = zIntermedias[ziKey];
        Object.keys(subzonas).forEach(function(szKey) {
          html += '<div style="background:#F8FAFC;padding:6px 14px 6px 32px;font-weight:700;font-size:11px;color:#475569;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:6px">';
          html += '<span style="color:#94A3B8">📍</span> ' + szKey + '</div>';
          
          html += '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed">';
          html += '<thead><tr style="background:white">';
          html += '<th style="padding:8px 10px 8px 32px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:25%">PERSONAL</th>';
          html += '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:15%">TIPO</th>';
          html += '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:12%">HORA</th>';
          html += '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:10%">OK</th>';
          html += '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd)">NOTAS</th>';
          html += '</tr></thead><tbody>';
          
          subzonas[szKey].forEach(function(reg) {
            var tipoHtml = reg.tipo ? ('<span style="background:' + (reg.tipo === 'GRUESO' ? '#FEF3C7' : '#DBEAFE') + ';color:' + (reg.tipo === 'GRUESO' ? '#92400E' : '#1E40AF') + ';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">' + reg.tipo + '</span>') : '<span style="color:var(--tx3);font-size:11px">—</span>';
            var okHtml = reg.ok === 'SÍ' ? ('<span style="color:var(--g);font-size:16px;font-weight:800">✓</span>') : '<span style="color:var(--tx3)">—</span>';
            var bg = reg.tipo ? 'white' : '#FFFBF0';
            var fHora = (typeof safeHora !== 'undefined') ? safeHora(reg.hora) : reg.hora;
            
            html += '<tr style="background:' + bg + ';border-bottom:1px solid var(--bd)">';
            html += '<td style="padding:8px 10px 8px 32px;color:var(--info);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + reg.personal + '">' + reg.personal + '</td>';
            html += '<td style="padding:8px 10px;text-align:center">' + tipoHtml + '</td>';
            html += '<td style="padding:8px 10px;text-align:center;font-family:monospace;color:var(--tx3);font-size:11px">' + fHora + '</td>';
            html += '<td style="padding:8px 10px;text-align:center">' + okHtml + '</td>';
            html += '<td style="padding:8px 10px;font-size:11px;color:var(--tx2)">' + (reg.comentario || '') + '</td>';
            html += '</tr>';
          });
          html += '</tbody></table>';
        });
      });
      html += '</div></div>';
    });
    
    html += '</div>';
    el.innerHTML = html;
  });
}

// ---------------- DIARIO ----------------
function loadDiario(fecha){
  var el=G('ti-d');if(!el)return;el.innerHTML='<div class="spin"></div>';
  api('getInformeDiario',fecha?{fecha:fecha}:{},function(r){
    if(!r||!r.ok){el.innerHTML='<p style="color:var(--danger);padding:16px">Error: '+(r?r.msg:'')+'</p>';return;}
    var d=r.data, h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px"><input type="date" id="inf-f" value="'+d.fechaRaw+'" onchange="loadDiario(this.value)" style="padding:7px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px"><button class="btn btn-p" onclick="printInf(\'inf-print-d\')">Imprimir</button></div><div id="inf-print-d"><div style="background:var(--g);color:white;padding:20px 24px;border-radius:var(--rl) var(--rl) 0 0"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px"><div><h2 style="font-size:18px;font-weight:800;margin-bottom:4px">CHECK LIST LIMPIEZA L+D</h2><p style="opacity:.8;font-size:13px">'+d.empresa+' · '+d.fecha+'</p></div><div style="display:flex;gap:18px;flex-wrap:wrap">';
    var pctColor=d.pct>=80?'#4ADE80':d.pct>=50?'#FCD34D':'#F87171';
    h+='<div style="text-align:center"><div style="font-size:28px;font-weight:800;color:'+pctColor+'">'+d.pct+'%</div><div style="font-size:11px;opacity:.7">CUMPLIMIENTO</div></div><div style="text-align:center"><div style="font-size:28px;font-weight:800">'+d.cubiertas+'/'+d.totalSz+'</div><div style="font-size:11px;opacity:.7">SUBZONAS</div></div></div></div></div><div style="border:1px solid var(--bd);border-top:none;border-radius:0 0 var(--rl) var(--rl);overflow:hidden">';
    d.detalles.forEach(function(z,idx2){
      if(z.noTrabaja){h+='<div style="background:linear-gradient(135deg,#0EA5E9,#38BDF8);padding:10px 16px;display:flex;align-items:center;gap:12px"><strong style="color:white;font-size:14px;flex:1">'+z.zona+'</strong><span style="background:rgba(0,0,0,.25);color:white;padding:3px 14px;border-radius:20px;font-size:12px;font-weight:800">NO TRABAJA HOY</span></div>';return;}
      var done=(z.subzonas||[]).filter(function(s){return s.tipo;}).length, total=(z.subzonas||[]).length, pz=total>0?Math.round(done/total*100):0, grad=ZCOLORS[idx2%ZCOLORS.length];
      h+='<div style="background:'+grad+';padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><strong style="color:white;font-size:14px;flex:1">'+z.zona+'</strong><span style="background:rgba(255,255,255,.25);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">'+done+'/'+total+' ('+pz+'%)</span></div>';
      var intermedias=z.intermedias||[];
      intermedias.forEach(function(si){var siDone=si.subzonas.filter(function(s){return s.tipo;}).length;h+='<div style="border-left:4px solid var(--g);margin:0;background:var(--gl)"><div style="padding:8px 14px;display:flex;align-items:center;gap:8px"><strong style="font-size:12px;color:var(--g);flex:1">📁 '+si.nombre+'</strong><span style="font-size:11px;color:var(--g);font-weight:700">'+siDone+'/'+si.subzonas.length+'</span></div>'+tablaSubzonasInf(si.subzonas)+'</div>';});
      var directas=z.subzonasDirectas||[];if(!intermedias.length) directas=z.subzonas||[];
      if(directas.length){if(intermedias.length){h+='<div style="padding:6px 14px;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;background:var(--sur2)">Subzonas directas</div>';}h+=tablaSubzonasInf(directas);}
    }); 
    h+='</div></div>'; el.innerHTML=h;
  });
}
function tablaSubzonasInf(szList){
  if(!szList||!szList.length)return'';
  var t='<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed"><thead><tr style="background:var(--sur2)"><th style="padding:7px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:30%">SUBZONA</th><th style="padding:7px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:15%">TIPO</th><th style="padding:7px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:10%">OK</th><th style="padding:7px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd)">OBSERVACIONES</th></tr></thead><tbody>';
  szList.forEach(function(s){
    var bg=s.tipo?'white':'#FFFBF0', tipoHtml=s.tipo?('<span style="background:'+(s.tipo==='GRUESO'?'#FEF3C7':'#DBEAFE')+';color:'+(s.tipo==='GRUESO'?'#92400E':'#1E40AF')+';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">'+s.tipo+'</span>'):'<span style="color:var(--tx3);font-size:11px">—</span>', okHtml=s.tipo?('<span style="color:'+(s.ok==='SÍ'?'var(--g)':'var(--danger)')+';font-size:16px;font-weight:800">'+(s.ok==='SÍ'?'✓':'✗')+'</span>'):'<span style="color:var(--tx3)">—</span>';
    t+='<tr style="background:'+bg+';border-bottom:1px solid var(--bd)"><td style="padding:8px 10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+s.nombre+'">'+s.nombre+'</td><td style="padding:8px 10px;text-align:center">'+tipoHtml+'</td><td style="padding:8px 10px;text-align:center">'+okHtml+'</td><td style="padding:8px 10px;font-size:11px;color:var(--tx2)">'+(s.comentario||'')+'</td></tr>';
  });
  t+='</tbody></table>'; return t;
}

// --- UTILIDADES DE FECHAS (Semanas y Meses) ---
function getCurrentWeek(){
  var d=new Date(); d=new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return d.getUTCFullYear() + "-W" + (weekNo<10?'0':'') + weekNo;
}
function getDatesFromWeek(weekStr){
  var parts = weekStr.split('-W'), y = parseInt(parts[0], 10), w = parseInt(parts[1], 10);
  var simple = new Date(y, 0, 1 + (w - 1) * 7), dow = simple.getDay(), start = simple;
  if (dow <= 4) start.setDate(simple.getDate() - simple.getDay() + 1);
  else start.setDate(simple.getDate() + 8 - simple.getDay());
  var end = new Date(start); end.setDate(end.getDate() + 6);
  return { desde: fmtIso(start), hasta: fmtIso(end) };
}
function getCurrentMonth(){
  var d = new Date(), m = d.getMonth()+1;
  return d.getFullYear() + "-" + (m<10?'0':'') + m;
}
function getDatesFromMonth(monthStr){
  var parts = monthStr.split('-'), y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1;
  var start = new Date(y, m, 1), end = new Date(y, m + 1, 0);
  return { desde: fmtIso(start), hasta: fmtIso(end) };
}

/// ---------------- SEMANAL ----------------
function loadSemanal(weekVal){
  var el=G('ti-s'); if(!el) return;
  
  try {
    var weekStr = weekVal || getCurrentWeek();
    var dates = getDatesFromWeek(weekStr);
    
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">';
    h+='<input type="week" id="inf-week" value="'+weekStr+'" onchange="loadSemanal(this.value)" style="padding:7px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px">';
    h+='<button class="btn btn-p" onclick="printInf(\'inf-print-s\')">Imprimir</button></div>';
    h+='<div id="inf-print-s"><div class="spin"></div><p style="text-align:center;font-size:12px;color:var(--tx3);margin-top:10px;">Cargando datos...</p></div>';
    el.innerHTML=h;

    api('getHistorial', {desde: dates.desde, hasta: dates.hasta}, function(r) {
      var printEl = G('inf-print-s'); if(!printEl) return;
      
      try {
        if(!r || !r.ok || !r.data || r.data.length === 0) {
           printEl.innerHTML = '<p style="color:var(--tx3);text-align:center;padding:20px">No hay registros detallados en la semana ' + weekStr + '.</p>';
           return;
        }
        
        var d = r.data;
        var total = d.length;
        var gruesos = d.filter(function(x){return x.tipo==='GRUESO';}).length;
        var lds = d.filter(function(x){return x.tipo==='L+D';}).length;
        
        var ph = '<div style="background:var(--g);color:white;padding:20px 24px;border-radius:var(--rl) var(--rl) 0 0">';
        ph += '<h2 style="font-size:18px;font-weight:800;margin-bottom:4px">Informe Semanal</h2>';
        ph += '<p style="opacity:.8;font-size:13px">Semana ' + weekStr + ' (' + dates.desde + ' al ' + dates.hasta + ')</p>';
        ph += '<div style="display:flex;gap:18px;margin-top:12px">';
        ph += '<div><div style="font-size:22px;font-weight:800">'+total+'</div><div style="font-size:11px;opacity:.7">TOTAL</div></div>';
        ph += '<div><div style="font-size:22px;font-weight:800">'+gruesos+'</div><div style="font-size:11px;opacity:.7">GRUESO</div></div>';
        ph += '<div><div style="font-size:22px;font-weight:800">'+lds+'</div><div style="font-size:11px;opacity:.7">L+D</div></div>';
        ph += '</div></div>';
        
        ph += '<div style="border:1px solid var(--bd);border-top:none;border-radius:0 0 var(--rl) var(--rl);overflow:hidden">';
        
        // Construir array de fechas de la semana (desde y hasta)
        var fechaStart = new Date(dates.desde + 'T00:00:00');
        var diasSemana = [];
        for (var i = 0; i < 7; i++) {
          var dActual = new Date(fechaStart);
          dActual.setDate(dActual.getDate() + i);
          
          // Formateamos manualmente para evitar errores (dias y meses con 2 dígitos)
          var dia = String(dActual.getDate()).padStart(2, '0');
          var mes = String(dActual.getMonth() + 1).padStart(2, '0');
          var anio = dActual.getFullYear();
          
          var fIso = anio + '-' + mes + '-' + dia;        // Ej: 2024-05-15
          var fFormato = dia + '/' + mes + '/' + anio;    // Ej: 15/05/2024
          
          diasSemana.push({ iso: fIso, formato: fFormato, date: dActual });
        }
        
        // Agrupar registros por fecha
        var regPorFecha = {};
        d.forEach(function(reg) {
          var f = reg.fecha; // asume que reg.fecha viene en el mismo formato que fmtDate()
          if (!regPorFecha[f]) regPorFecha[f] = [];
          regPorFecha[f].push(reg);
        });
        
        // Mostrar TODOS los días de la semana, colapsados
        diasSemana.forEach(function(dia) {
          var registrosDia = regPorFecha[dia.formato] || [];
          var numRegistros = registrosDia.length;
          
          ph += '<div class="card-check" style="border-bottom:1px solid var(--bd)">';
          ph += '<div class="card-header-clickable" style="background:var(--sur2);padding:12px;display:flex;align-items:center;gap:10px;user-select:none;cursor:pointer" ondblclick="togInfRow(this)">';
          ph += '<span style="font-size:16px">📅</span>';
          ph += '<strong style="flex:1;font-size:14px">' + dia.formato + '</strong>';
          ph += '<span style="background:white;color:var(--tx2);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid var(--bd)">' + numRegistros + ' registros</span>';
          ph += '<span class="zarr">▶</span></div>';
          
          ph += '<div class="tw" style="max-height:0;overflow:hidden;transition:max-height .3s ease;padding:0">';
          
          if (numRegistros > 0) {
            ph += '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed">';
            ph += '<thead><tr style="background:#F8F9FA">';
            ph += '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:20%">ZONA</th>';
            ph += '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:25%">SUBZONA</th>';
            ph += '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:20%">PERSONAL</th>';
            ph += '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:12%">TIPO</th>';
            ph += '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:10%">HORA</th>';
            ph += '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--bd);width:8%">OK</th>';
            ph += '</tr></thead><tbody>';
            
            registrosDia.forEach(function(reg) {
              var tipoHtml = reg.tipo ? '<span style="background:'+(reg.tipo==='GRUESO'?'#FEF3C7':'#DBEAFE')+';color:'+(reg.tipo==='GRUESO'?'#92400E':'#1E40AF')+';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">'+reg.tipo+'</span>' : '<span style="color:var(--tx3);font-size:11px">—</span>';
              var okHtml = reg.ok === 'SÍ' ? '<span style="color:var(--g);font-size:16px;font-weight:800">✓</span>' : '<span style="color:var(--tx3)">—</span>';
              var bg = reg.tipo ? 'white' : '#FFFBF0';
              
              ph += '<tr style="background:'+bg+';border-bottom:1px solid var(--bd)">';
              ph += '<td style="padding:8px 10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+reg.zona+'">'+reg.zona+'</td>';
              ph += '<td style="padding:8px 10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+reg.subzona+'">'+reg.subzona+'</td>';
              ph += '<td style="padding:8px 10px;color:var(--info);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+reg.personal+'">'+reg.personal+'</td>';
              ph += '<td style="padding:8px 10px;text-align:center">'+tipoHtml+'</td>';
              ph += '<td style="padding:8px 10px;text-align:center;font-family:monospace;color:var(--tx3);font-size:11px">'+reg.hora+'</td>';
              ph += '<td style="padding:8px 10px;text-align:center">'+okHtml+'</td>';
              ph += '</tr>';
            });
            ph += '</tbody></table>';
          } else {
            ph += '<div style="padding:12px;text-align:center;color:var(--tx3);font-size:12px">Sin registros este día</div>';
          }
          ph += '</div></div>';
        });
        
        ph += '</div>';
        printEl.innerHTML = ph;
      } catch (errorRender) {
        console.error("Error renderizando los datos: ", errorRender);
        printEl.innerHTML = '<p style="color:red;text-align:center;padding:20px">Error al procesar los datos recibidos.</p>';
      }
    });

  } catch (errorGenerico) {
    console.error("Error al iniciar loadSemanal: ", errorGenerico);
    el.innerHTML = '<p style="color:red;text-align:center;padding:20px">Error al iniciar el informe. Revisa la consola.</p>';
  }
}

// ---------------- MENSUAL ----------------
function loadMensual(monthVal){
  var el=G('ti-m');if(!el)return;
  var monthStr = monthVal || getCurrentMonth();
  var dates = getDatesFromMonth(monthStr);
  
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">';
  h+='<input type="month" id="inf-month" value="'+monthStr+'" onchange="loadMensual(this.value)" style="padding:7px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px">';
  h+='<button class="btn btn-p" onclick="printInf(\'inf-print-m\')">Imprimir</button></div>';
  h+='<div id="inf-print-m"><div class="spin"></div></div>';
  el.innerHTML=h;

  api('getHistorial', {desde: dates.desde, hasta: dates.hasta}, function(r) {
    var printEl = G('inf-print-m'); if(!printEl) return;
    if(!r || !r.ok || !r.data || r.data.length === 0) {
       printEl.innerHTML = '<p style="color:var(--tx3);text-align:center;padding:20px">No hay registros detallados en el mes ' + monthStr + '.</p>';
       return;
    }
    var d = r.data, total = d.length, gruesos = d.filter(function(x){return x.tipo==='GRUESO';}).length, lds = d.filter(function(x){return x.tipo==='L+D';}).length;
    var ph = '<div class="rh" style="border-radius:var(--rl) var(--rl) 0 0"><h2 style="font-size:17px;font-weight:800">Informe Mensual</h2><p style="opacity:.8;font-size:13px">Mes de ' + monthStr + '</p><div style="display:flex;gap:18px;margin-top:12px"><div><div style="font-size:22px;font-weight:800">'+total+'</div><div style="font-size:11px;opacity:.7">TOTAL</div></div><div><div style="font-size:22px;font-weight:800">'+gruesos+'</div><div style="font-size:11px;opacity:.7">GRUESO</div></div><div><div style="font-size:22px;font-weight:800">'+lds+'</div><div style="font-size:11px;opacity:.7">L+D</div></div></div></div>';
    ph += '<div class="rb" style="border-radius:0 0 var(--rl) var(--rl)"><h3 style="font-weight:800;margin-bottom:12px">Desglose por Día y Zona</h3>';
    ph += buildHierarchicalHTML(d);
    ph += '</div>';
    printEl.innerHTML = ph;
  });
}

// --- FUNCIÓN CREADORA DE JERARQUÍAS (COLAPSADAS POR DEFECTO) ---
function buildHierarchicalHTML(historial) {
  if(!historial || !historial.length) return '';
  
  var tree = {};
  var mesesNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
 
  // Agrupar los datos
  historial.forEach(function(h){
    var mesStr = "Mes Desconocido";
    if(h.fecha.indexOf('-') > 0) {
       var pts = h.fecha.split('-');
       if(pts.length >= 2) mesStr = mesesNames[parseInt(pts[1],10)-1] + ' ' + pts[0];
    } else if(h.fecha.indexOf('/') > 0) {
       var pts = h.fecha.split('/');
       if(pts.length >= 3) mesStr = mesesNames[parseInt(pts[1],10)-1] + ' ' + pts[2];
    }
 
    if(!tree[mesStr]) tree[mesStr] = {};
    if(!tree[mesStr][h.fecha]) tree[mesStr][h.fecha] = {};
    if(!tree[mesStr][h.fecha][h.zona]) tree[mesStr][h.fecha][h.zona] = [];
    tree[mesStr][h.fecha][h.zona].push(h);
  });
 
  var html = '';
 
  Object.keys(tree).forEach(function(mes) {
    // 1. Nivel Mes (Cerrado por defecto)
    html += '<div class="card-check" style="margin-bottom:16px; border:2px solid var(--bd)">';
    html += '<div class="card-header-clickable" style="background:#F0F2F5; padding:14px; display:flex; align-items:center; gap:10px; user-select:none; cursor:pointer" ondblclick="togInfRow(this)">';
    html += '<span style="font-size:18px">🗓️</span><strong style="flex:1; font-size:15px; text-transform:uppercase">' + mes + '</strong><span class="zarr">▶</span></div>';
    html += '<div class="tw" style="max-height:0;overflow:hidden;transition:max-height .3s ease;padding:0;background:white">';
 
    // 2. Nivel Día (Cerrado por defecto)
    var fechas = Object.keys(tree[mes]).sort(function(a,b){
      var da = a.split('/').reverse().join(''); var db = b.split('/').reverse().join(''); return da > db ? -1 : 1;
    });
 
    fechas.forEach(function(f){
      html += '<div class="card-check" style="margin-bottom:8px; border:1px solid var(--bd)">';
      html += '<div class="card-header-clickable" style="background:var(--sur2); padding:12px; display:flex; align-items:center; gap:10px; user-select:none; cursor:pointer" ondblclick="togInfRow(this)">';
      html += '<span style="font-size:16px">📅</span><strong style="flex:1; font-size:14px">' + f + '</strong>';
      html += '<span style="background:white; color:var(--tx2); padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; border:1px solid var(--bd)">' + Object.keys(tree[mes][f]).length + ' zonas trab.</span>';
      html += '<span class="zarr">▶</span></div>';
      
      html += '<div class="tw" style="max-height:0;overflow:hidden;transition:max-height .3s ease;padding:0;background:white">';
      
      // 3. Nivel Zona (Cerrado por defecto)
      var zonas = Object.keys(tree[mes][f]).sort();
      zonas.forEach(function(z){
        var registros = tree[mes][f][z];
        html += '<div class="card-check" style="margin-bottom:6px; border:1px solid #BBF7D0">';
        html += '<div class="card-header-clickable" style="background:#F0FDF4; padding:10px; display:flex; align-items:center; gap:10px; user-select:none; cursor:pointer" ondblclick="togInfRow(this)">';
        html += '<span style="font-size:14px">📍</span><strong style="flex:1; font-size:13px; color:var(--g)">' + z + '</strong>';
        html += '<span style="background:var(--g); color:white; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700">' + registros.length + ' tareas</span>';
        html += '<span class="zarr" style="color:var(--g)">▶</span></div>';
        
        // 4. Tabla de Tareas (oculta por defecto)
        html += '<div class="tw" style="max-height:0;overflow:hidden;transition:max-height .3s ease;padding:0"><div style="overflow-x:auto"><table style="width:100%; border-collapse:collapse; font-size:12px; table-layout:fixed">';
        html += '<thead><tr style="background:#F8F9FA">';
        html += '<th style="padding:8px; border-bottom:1px solid var(--bd); text-align:left; width:35%">Subzona / Int.</th>';
        html += '<th style="padding:8px; border-bottom:1px solid var(--bd); text-align:left; width:30%">Personal</th>';
        html += '<th style="padding:8px; border-bottom:1px solid var(--bd); text-align:center; width:15%">Tipo</th>';
        html += '<th style="padding:8px; border-bottom:1px solid var(--bd); text-align:center; width:10%">Hora</th>';
        html += '<th style="padding:8px; border-bottom:1px solid var(--bd); text-align:center; width:10%">OK</th>';
        html += '</tr></thead><tbody>';
        
        registros.forEach(function(r){
          var tipoHtml = r.tipo ? '<span class="' + (r.tipo==='GRUESO'?'tg':'tl') + '">' + r.tipo + '</span>' : '—';
          var okHtml = r.ok==='SÍ' ? '<span class="bg-g">✓</span>' : '<span class="bg-gr">—</span>';
          html += '<tr style="border-bottom:1px solid var(--bd)">';
          html += '<td style="padding:8px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="' + r.subzona + '">' + r.subzona + '</td>';
          html += '<td style="padding:8px; color:var(--info); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="' + r.personal + '">👤 ' + r.personal + '</td>';
          html += '<td style="padding:8px; text-align:center">' + tipoHtml + '</td>';
          html += '<td style="padding:8px; text-align:center; font-family:monospace; color:var(--tx3)">' + safeHora(r.hora) + '</td>';
          html += '<td style="padding:8px; text-align:center">' + okHtml + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table></div></div>'; 
      });
      html += '</div></div>'; 
    });
    html += '</div></div>'; 
  });
 
  return html;
}
 
/*// ----------------------------------------------------
// EXPANDIR / CONTRAER BÚSQUEDA POR ZONAS 
// ----------------------------------------------------
// ----------------------------------------------------
// EXPANDIR / CONTRAER BÚSQUEDA POR ZONAS (MODO BRUTO)
// ----------------------------------------------------
function togInfRow(elemento) {
  // 1. Buscamos la tabla que está justo debajo
  var tw = elemento.nextElementSibling;
  
  if (!tw || !tw.classList.contains('tw')) {
    tw = elemento.parentElement.querySelector('.tw');
  }
  
  // Si no la encuentra, te avisará en la pantalla
  if (!tw) {
    alert("❌ Error: No encuentro la tabla que debo abrir.");
    return;
  }
  
  var arr = elemento.querySelector('.zarr');

  // 2. Comprobamos si está cerrada (por display o por altura)
  var estaCerrado = (tw.style.display === 'none' || tw.style.maxHeight === '0px' || tw.style.maxHeight === '0' || tw.style.maxHeight === '');

  if (estaCerrado) {
    // FORZAR APERTURA ABSOLUTA
    tw.style.display = 'block';
    tw.style.maxHeight = 'none'; // Destruye el límite de altura
    tw.style.overflow = 'visible'; // Permite que el contenido se desborde si hace falta
    if (arr) arr.textContent = '▼';
  } else {
    // FORZAR CIERRE ABSOLUTO
    tw.style.display = 'none';
    tw.style.maxHeight = '0px';
    tw.style.overflow = 'hidden';
    if (arr) arr.textContent = '▶';
  }
}

*/
// ----------------------------------------------------
// EXPANDIR / CONTRAER CHECKLIST (SUPERVISOR)
// ----------------------------------------------------
function toggleCard(elemento) {
  var card = elemento.classList.contains('card-check') ? elemento : elemento.closest('.card-check');
  if(card) {
    card.classList.toggle('is-expanded');
  }
}
// ---------------- EMAIL / PRINT ----------------
function renderEmail(){
  var el=G('ti-e');if(!el)return;
  el.innerHTML='<div class="card"><div class="card-title">Enviar informe por email</div><div class="fg"><label>Tipo</label><select id="em-t"><option value="diario">Diario</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option></select></div><div class="fg"><label>Destinatarios</label><textarea id="em-em" rows="2" placeholder="a@empresa.com, b@empresa.com"></textarea></div><div class="fg"><label>Asunto</label><input id="em-as" value="Informe de Limpieza L+D"></div><button class="btn btn-p" id="em-btn" onclick="enviarEmail()">Enviar ahora</button></div>';
}
function enviarEmail(){
  var btn=G('em-btn');btn.textContent='Enviando...';btn.disabled=true;
  api('enviarEmail',{tipo:G('em-t').value,emails:G('em-em').value,asunto:G('em-as').value,mensaje:''},function(r){toast(r&&r.ok?'Enviado':'Error',r&&r.ok);btn.textContent='Enviar ahora';btn.disabled=false;});
}
function printInf(containerId){
  var c=G(containerId);if(!c)return;
  var w=window.open('','_blank');
  w.document.write('<html><head><title>Informe</title><style>body{font-family:Arial,sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border:1px solid #E0E0E0;text-align:left;font-size:10px}th{background:#F8F9FA;font-weight:700}</style></head><body>'+c.innerHTML+'</body></html>');
  w.document.close();w.print();
}


// ============================================================
// ============================================================
// MÓDULO DE INCIDENCIAS
// ============================================================
var _timers_inc={};
function pgIncidencias(){
  if(ROL==='mantenimiento'||ROL==='jefe_mantenimiento'){pgMisIncidencias();return;}
  var isA=ROL==='admin',isSup=ROL==='supervisor'||isA;
  if(!isSup){pc('<div class="card">Sin acceso</div>');return;}
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px"><div><h2 style="font-size:17px;font-weight:800">Incidencias</h2></div>';
  if(isA||isSup)h+='<button class="btn btn-p" onclick="mNuevaIncidencia()">+ Nueva incidencia</button>';
  h+='</div><div class="tabs"><div class="tab active" onclick="incSwTab(this,1)">Activas</div><div class="tab" onclick="incSwTab(this,2)">Historial</div></div>';
  h+='<div id="inc-tab-lista" class="tp active"><div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap"><button class="btn" onclick="exportIncWhatsApp()">WhatsApp</button><button class="btn" onclick="exportIncEmail()">Email</button></div>';
  h+='<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="fg" style="margin:0;flex:1;min-width:120px"><label>Zona</label><input type="text" id="if-zona" placeholder="Filtrar zona..."></div><div class="fg" style="margin:0;flex:1;min-width:120px"><label>Estado</label><select id="if-estado"><option value="">Todos</option><option value="abierta">Abierta</option><option value="en_curso">En curso</option><option value="realizada">Realizada</option><option value="terminada">Terminada</option><option value="cerrada">Cerrada</option></select></div><button class="btn btn-p" onclick="buscarInc()">Buscar</button><button class="btn" onclick="limpiarInc()">Limpiar</button></div></div><div id="inc-list"><div class="spin"></div></div></div>';
  h+='<div id="inc-tab-hist" class="tp"><div class="card" style="margin-bottom:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="fg" style="margin:0"><label>Período</label><select id="ih-periodo" onchange="cambiarPeriodoHist()" style="padding:9px 12px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px"><option value="dia">Hoy</option><option value="semana" selected>Esta semana</option><option value="mes">Este mes</option><option value="rango">Rango personalizado</option></select></div><div id="ih-rango" style="display:none;gap:8px"><div class="fg" style="margin:0"><label>Desde</label><input type="date" id="ih-desde"></div><div class="fg" style="margin:0"><label>Hasta</label><input type="date" id="ih-hasta"></div></div><button class="btn btn-p" onclick="loadIncHist()">Ver</button><button class="btn" onclick="printIncHist()">Imprimir</button></div></div><div id="inc-hist-content"><div class="spin"></div></div></div>';
  pc(h);buscarInc();loadIncHist();
}
function incSwTab(el,idx){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tp').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');var id=idx===1?'inc-tab-lista':'inc-tab-hist';var tp=G(id);if(tp)tp.classList.add('active');
}
function cambiarPeriodoHist(){var p=G('ih-periodo');if(!p)return;var rango=G('ih-rango');if(rango)rango.style.display=p.value==='rango'?'flex':'none';if(p.value!=='rango')loadIncHist();}
function loadIncHist(){
  var el=G('inc-hist-content');if(!el)return;el.innerHTML='<div class="spin"></div>';
  var periodo=G('ih-periodo')?G('ih-periodo').value:'semana';
  var desde='',hasta='',hoy=new Date();
  if(periodo==='dia'){desde=hasta=fmtIso(hoy);}
  else if(periodo==='semana'){var ini=new Date(hoy);ini.setDate(hoy.getDate()-6);desde=fmtIso(ini);hasta=fmtIso(hoy);}
  else if(periodo==='mes'){desde=hoy.getFullYear()+'-'+(('0'+(hoy.getMonth()+1)).slice(-2))+'-01';hasta=fmtIso(hoy);}
  else{desde=G('ih-desde')?G('ih-desde').value:'';hasta=G('ih-hasta')?G('ih-hasta').value:'';if(!desde||!hasta){toast('Selecciona fechas','warn');el.innerHTML='';return;}}
  api('getIncidencias',{desde:desde,hasta:hasta},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card" style="color:var(--danger);padding:20px">Error</div>';return;}
    var total=r.data.length,cerradas=r.data.filter(function(i){return i.estado==='cerrada';}).length,abiertas=r.data.filter(function(i){return i.estado==='abierta';}).length;
    var h='<div id="inc-hist-print"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:18px">';
    h+='<div class="stat"><div class="sv">'+total+'</div><div class="sl">Total</div></div><div class="stat"><div class="sv" style="color:var(--danger)">'+abiertas+'</div><div class="sl">Abiertas</div></div><div class="stat"><div class="sv" style="color:var(--g)">'+cerradas+'</div><div class="sl">Cerradas</div></div></div>';
    if(!r.data.length){h+='<div class="card" style="text-align:center;padding:32px;color:var(--tx3)">Sin incidencias</div>';}
    else{
      h+='<div class="card"><div class="tw"><table><thead><tr><th>Fecha</th><th>Zona</th><th>Descripción</th><th>Gravedad</th><th>Estado</th><th>Reportado por</th></tr></thead><tbody>';
      r.data.forEach(function(inc){
        h+='<tr><td style="white-space:nowrap;font-weight:600">'+inc.fecha+'</td><td style="font-weight:700">'+inc.zona+'</td><td style="max-width:220px">'+inc.descripcion+'</td>';
        h+='<td><span class="'+(inc.gravedad==='alta'?'bg-r':inc.gravedad==='media'?'bg-w':'bg-gr')+'">'+inc.gravedad+'</span></td>';
        h+='<td><span class="'+(inc.estado==='cerrada'||inc.estado==='terminada'?'bg-g':'bg-r')+'">'+inc.estado+'</span></td>';
        h+='<td style="font-size:12px">'+inc.reportadoPor+'</td></tr>';
      });
      h+='</tbody></table></div></div>';
    }
    h+='</div>';el.innerHTML=h;
  });
}
function printIncHist(){var c=G('inc-hist-print');if(!c){toast('Carga el historial primero','warn');return;}var w=window.open('','_blank');w.document.write('<html><head><title>Incidencias L+D</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:16px}table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border:1px solid #e0e0e0;text-align:left;font-size:10px}th{background:#f5f5f5;font-weight:700}</style></head><body>'+c.innerHTML+'</body></html>');w.document.close();w.print();}

function buscarInc(){
  var el=G('inc-list');if(!el)return;el.innerHTML='<div class="spin"></div>';
  var zona=G('if-zona')?G('if-zona').value:'';var estado=G('if-estado')?G('if-estado').value:'';
  api('getIncidencias',{zona:zona,estado:estado},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card" style="color:var(--danger);padding:20px">Error</div>';return;}
    if(!r.data||!r.data.length){el.innerHTML='<div class="card" style="text-align:center;padding:32px;color:var(--tx3)">Sin incidencias</div>';return;}
    var isA=ROL==='admin',isSup=ROL==='supervisor'||isA;
    var h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;cursor:pointer"><input type="checkbox" id="inc-selall" style="width:16px;height:16px;accent-color:var(--g);cursor:pointer" onchange="togSelAll(this.checked)"> Seleccionar todo</label></div>';
    r.data.forEach(function(inc){
      var gravCls=inc.gravedad==='alta'?'bg-r':inc.gravedad==='media'?'bg-w':'bg-gr';
      var estCls=inc.estado==='abierta'?'bg-r':inc.estado==='en_curso'||inc.estado==='realizada'?'bg-w':'bg-g';
      var estLbl={abierta:'Abierta',en_curso:'En curso',realizada:'Realizada',terminada:'Terminada',cerrada:'Cerrada',archivada:'Archivada'};
      var bord=inc.gravedad==='alta'?'var(--danger)':inc.gravedad==='media'?'var(--warn)':'var(--bd)';
      h+='<div class="card" style="margin-bottom:10px;border-left:4px solid '+bord+';padding:14px 16px">';
      h+='<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap"><input type="checkbox" class="inc-chk" data-id="'+inc.id+'" style="width:17px;height:17px;accent-color:var(--g);cursor:pointer;margin-top:3px;flex-shrink:0">';
      h+='<div style="flex:1;min-width:200px"><div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;flex-wrap:wrap"><span class="'+gravCls+'">'+inc.gravedad+'</span><span class="'+estCls+'">'+(estLbl[inc.estado]||inc.estado)+'</span><span style="font-size:11px;color:var(--tx3)">'+inc.fecha+' · '+inc.zona+'</span></div>';
      h+='<p style="font-size:13px;margin-bottom:5px">'+inc.descripcion+'</p><div style="font-size:11px;color:var(--tx3)">Por: <strong>'+inc.reportadoPor+'</strong>';
      if(inc.asignadoA)h+=' · <span style="color:var(--info);font-weight:700">Asignada a: '+inc.asignadoA+'</span>';
      if(inc.tiempoTotal&&inc.tiempoTotal!='0')h+=' · <span style="font-family:monospace">'+fmtT(parseInt(inc.tiempoTotal))+'</span>';
      h+='</div>';
      if(inc.observacionesCierre)h+='<div style="font-size:11px;color:var(--g);margin-top:3px;font-weight:700">'+inc.observacionesCierre+(inc.realizadoPor?' · '+inc.realizadoPor:'')+'</div>';
      h+='</div><div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">';
      if(isSup&&inc.estado!=='archivada'&&inc.estado!=='terminada'&&inc.estado!=='cerrada')h+='<button class="btn btn-sm" onclick="mAsignarInc('+inc.id+')">Asignar</button>';
      if((isSup||ROL==='jefe_mantenimiento')&&inc.estado==='realizada')h+='<button class="btn btn-sm btn-p" onclick="cerrarDefinitivoInc('+inc.id+')">Cerrar</button>';
      h+='<button class="btn btn-sm" onclick="verAvances('+inc.id+')">Historial</button>';
      if(isA)h+='<button class="btn btn-sm btn-d" onclick="eliminarInc('+inc.id+')">X</button>';
      h+='</div></div></div>';
    });
    el.innerHTML=h;
  });
}
function limpiarInc(){var z=G('if-zona'),e=G('if-estado');if(z)z.value='';if(e)e.value='';buscarInc();}
function togSelAll(checked){document.querySelectorAll('.inc-chk').forEach(function(cb){cb.checked=checked;});}
function mAsignarInc(id){
  api('getUsuarios',{},function(r){
    if(!r||!r.ok)return;
    var usuarios=r.data.filter(function(u){return u.rol==='mantenimiento'||u.rol==='jefe_mantenimiento';});
    var wrap=document.createElement('div');
    var opts=usuarios.map(function(u){return '<option value="'+u.nombre+'">'+u.nombre+' ('+u.rol+')</option>';}).join('');
    if(!opts)opts='<option value="">Sin usuarios de mantenimiento</option>';
    wrap.innerHTML='<div class="fg"><label>Asignar a</label><select id="ai-usr"><option value="">— Seleccionar —</option>'+opts+'</select></div>';
    modal('Asignar incidencia',wrap,[{label:'Cancelar',fn:closeModal},{label:'Asignar',fn:function(){
      var u=G('ai-usr').value;if(!u){toast('Selecciona un usuario','warn');return;}
      api('asignarIncidencia',{id:id,asignadoA:u},function(res){toast(res&&res.ok?''+res.msg:(res?res.msg:'Error'),res&&res.ok);if(res&&res.ok){closeModal();buscarInc();}});
    },p:true}]);
  });
}
function mNuevaIncidencia(){
  api('getZonas',{},function(r){
    var zonas=r&&r.data?r.data.zonas:[];var wrap=document.createElement('div');
    var zonaOpts=zonas.map(function(z){return '<option value="'+z.ZONA+'">'+z.ZONA+'</option>';}).join('');
    wrap.innerHTML='<div class="fg"><label>Zona</label><select id="ni-zona">'+zonaOpts+'</select></div>'+
      '<div class="fg"><label>Descripción</label><textarea id="ni-desc" rows="4" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;outline:none;resize:vertical" placeholder="Describe la incidencia..."></textarea></div>'+
      '<div class="fg"><label>Gravedad</label><select id="ni-grav"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option></select></div>';
    modal('Nueva incidencia',wrap,[{label:'Cancelar',fn:closeModal},{label:'Registrar',fn:function(){
      var desc=G('ni-desc').value.trim();if(!desc){toast('Escribe la descripción','warn');return;}
      api('crearIncidencia',{zona:G('ni-zona').value,descripcion:desc,gravedad:G('ni-grav').value},function(r){
        toast(r&&r.ok?'Incidencia registrada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();buscarInc();}
      });
    },p:true}]);
  });
}
function eliminarInc(id){if(!confirm('¿Eliminar esta incidencia?'))return;api('eliminarIncidencia',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)buscarInc();});}

var CFG_WA='';
function exportIncWhatsApp(){
  var selIds=[];document.querySelectorAll('.inc-chk:checked').forEach(function(cb){selIds.push(cb.dataset.id);});
  api('getIncidencias',{},function(r){
    if(!r||!r.ok||!r.data.length){toast('Sin incidencias','warn');return;}
    var toSend=selIds.length>0?r.data.filter(function(inc){return selIds.indexOf(String(inc.id))>=0;}):r.data.filter(function(inc){return !inc.waEnviada;});
    if(!toSend.length){toast('Sin incidencias para enviar','warn');return;}
    var msg='*INCIDENCIAS L+D* - '+new Date().toLocaleDateString('es-ES')+'\n\n';
    toSend.forEach(function(inc){msg+=(inc.gravedad==='alta'?'🔴':inc.gravedad==='media'?'🟠':'🟡')+' '+inc.zona+' ('+inc.fecha+')\n'+inc.descripcion+'\n\n';});
    var idsToMark=toSend.map(function(inc){return String(inc.id);});
    mWAModal(msg,function(){api('marcarWaEnviada',{ids:idsToMark},function(res){if(res&&res.ok)buscarInc();});});
  });
}

function exportIncEmail(){
  api('getIncidencias',{estado:'abierta'},function(r){
    if(!r||!r.ok||!r.data.length){toast('Sin incidencias abiertas','warn');return;}
    var wrap=document.createElement('div');
    wrap.innerHTML='<div class="fg"><label>Destinatario(s)</label><input id="ie-em" placeholder="responsable@empresa.com"></div><div class="fg"><label>Asunto</label><input id="ie-as" value="Incidencias L+D — '+new Date().toLocaleDateString('es-ES')+'"></div>';
    modal('Enviar por email',wrap,[{label:'Cancelar',fn:closeModal},{label:'Enviar',fn:function(){
      api('enviarEmail',{tipo:'incidencias',emails:G('ie-em').value,asunto:G('ie-as').value,mensaje:'',incidencias:r.data},function(res){toast(res&&res.ok?''+res.msg:(res?res.msg:'Error'),res&&res.ok);if(res&&res.ok)closeModal();});
    },p:true}]);
  });
}

function mWAModal(msg,onSent){
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Número WhatsApp</label><input id="wa-num" value="'+CFG_WA+'" placeholder="34612345678" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;outline:none"></div><div class="fg"><label>Mensaje</label><textarea id="wa-msg" rows="6" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:12px;outline:none;resize:vertical">'+msg+'</textarea></div>';
  modal('Enviar por WhatsApp',wrap,[{label:'Cancelar',fn:closeModal},{label:'Abrir WhatsApp',fn:function(){
    var num=G('wa-num').value.replace(/[^0-9]/g,'');if(!num){toast('Introduce el número','warn');return;}
    CFG_WA=num;window.open('https://wa.me/'+num+'?text='+encodeURIComponent(G('wa-msg').value),'_blank');closeModal();if(typeof onSent==='function')onSent();
  },p:true}]);
}


function pgMisIncidencias(){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px"><div><h2 style="font-size:17px;font-weight:800">Mis Incidencias</h2><p style="font-size:12px;color:var(--tx3)">Incidencias asignadas</p></div></div>';
  h+='<div class="tabs"><div class="tab active" onclick="incMantTab(this,\'pend\')">Pendientes</div><div class="tab" onclick="incMantTab(this,\'realiz\')">Realizadas</div><div class="tab" onclick="incMantTab(this,\'cerradas\')">Cerradas</div></div>';
  h+='<div id="imt-pend" class="tp active"><div class="spin"></div></div><div id="imt-real" class="tp"></div><div id="imt-cerr" class="tp"></div>';
  pc(h);cargarMisInc('pendientes');
}
function incMantTab(el,tipo){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tp').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');var id=tipo==='pend'?'imt-pend':tipo==='realiz'?'imt-real':'imt-cerr';var tp=G(id);if(tp)tp.classList.add('active');
  if(tipo==='pend')cargarMisInc('pendientes'); else if(tipo==='realiz')cargarMisInc('realizadas'); else cargarMisInc('cerradas');
}
function cargarMisInc(tipo){
  var elId=tipo==='pendientes'?'imt-pend':tipo==='realizadas'?'imt-real':'imt-cerr';var el=G(elId);if(!el)return;
  el.innerHTML='<div class="spin"></div>';
  api('getMisIncidencias',{},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card" style="color:var(--danger)">Error</div>';return;}
    var todas=r.data,lista;
    if(tipo==='pendientes'){lista=todas.filter(function(i){return i.estado==='abierta'||i.estado==='en_curso';});}
    else if(tipo==='realizadas'){lista=todas.filter(function(i){return i.estado==='realizada';});}
    else{lista=todas.filter(function(i){return i.estado==='cerrada'||i.estado==='terminada'||i.estado==='archivada';});}
    if(!lista.length){
      el.innerHTML='<div class="card" style="text-align:center;padding:32px;color:var(--tx3)"><div style="font-size:40px;margin-bottom:8px">'+(tipo==='pendientes'?'✅':'📋')+'</div>'+(tipo==='pendientes'?'Sin incidencias pendientes':tipo==='realizadas'?'Sin incidencias realizadas':'Sin incidencias cerradas')+'</div>';
      return;
    }
    var isJefe=ROL==='jefe_mantenimiento'||ROL==='admin'||ROL==='supervisor';
    var h='';
    lista.forEach(function(inc){
      var t=_timers_inc[inc.id], running=t&&t.running;
      var accum=t?(t.accumulated+(running?Math.floor((Date.now()-t.startTs)/1000):0)):(parseInt(inc.tiempoTotal)||0);
      var gravCls=inc.gravedad==='alta'?'bg-r':inc.gravedad==='media'?'bg-w':'bg-gr';
      var estCls=inc.estado==='abierta'?'bg-r':inc.estado==='en_curso'?'bg-w':inc.estado==='realizada'?'bg-w':'bg-g';
      var estLbl={abierta:'Abierta',en_curso:'En curso',realizada:'Realizada — pendiente cierre',terminada:'Terminada',cerrada:'Cerrada',archivada:'Archivada'};
      var bord=inc.gravedad==='alta'?'var(--danger)':inc.gravedad==='media'?'var(--warn)':'var(--bd)';
      h+='<div class="card" style="margin-bottom:12px;border-left:4px solid '+bord+'"><div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px"><div style="flex:1"><div style="font-weight:800;font-size:14px;margin-bottom:4px">'+inc.zona+'</div><div style="font-size:12px;color:var(--tx2);margin-bottom:6px">'+inc.descripcion+'</div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="'+gravCls+'">'+inc.gravedad.toUpperCase()+'</span><span class="'+estCls+'">'+(estLbl[inc.estado]||inc.estado)+'</span><span style="font-size:11px;color:var(--tx3)">'+inc.fecha+' '+inc.hora+'</span></div></div></div>';
      if(tipo==='pendientes'){
        h+='<div style="background:var(--sur2);border-radius:var(--r);padding:12px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div style="font-weight:700;font-size:13px">Tiempo sesión:</div><div id="tmr-disp-'+inc.id+'" style="font-family:monospace;font-size:20px;font-weight:800;color:var(--g)">'+fmtT(0)+'</div><button id="tmr-btn-'+inc.id+'" class="btn '+(running?'btn-d':'btn-p')+'" onclick="togTimerInc('+inc.id+')" style="min-width:100px">'+(running?'Parar':'Iniciar')+'</button><div style="font-size:12px;color:var(--tx2)">Total acumulado: <strong style="font-family:monospace">'+fmtT(accum)+'</strong></div></div></div>';
        h+='<div class="fg"><label>Material utilizado</label><textarea id="mat-'+inc.id+'" rows="2" style="width:100%;padding:8px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:12px;resize:vertical">'+inc.materiales+'</textarea></div>';
        h+='<div class="fg"><label>Observaciones de esta sesión</label><textarea id="obs-'+inc.id+'" rows="3" style="width:100%;padding:8px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:12px;resize:vertical">'+inc.observaciones+'</textarea></div>';
        if(inc.archivosUrl){var urls=inc.archivosUrl.split(',').filter(Boolean);if(urls.length){h+='<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--tx2);text-transform:uppercase">Archivos adjuntos</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">';urls.forEach(function(u,i){h+='<a href="'+u.trim()+'" target="_blank" class="btn btn-sm" style="text-decoration:none">Archivo '+(i+1)+'</a>';});h+='</div></div>';}}
        h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"><button class="btn" onclick="verAvances('+inc.id+')">Historial</button><button class="btn" onclick="adjuntarArchivoInc('+inc.id+')">Adjuntar archivo</button><button class="btn btn-p" onclick="guardarAvanceInc('+inc.id+')">Guardar avance</button><button class="btn" style="background:var(--g);color:white" onclick="mMarcarRealizada('+inc.id+')">Marcar como realizada</button></div>';
        h+='<input type="file" id="finc-'+inc.id+'" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" style="display:none" onchange="subirArchivoInc('+inc.id+',this)">';
      } else if(tipo==='realizadas'){
        h+='<div style="background:#f0fff8;border:1px solid #86efac;border-radius:var(--r);padding:12px;margin-bottom:10px"><p style="font-size:13px;color:var(--g);font-weight:700">Realizada por: '+inc.realizadoPor+'</p>';
        if(inc.observacionesCierre)h+='<p style="font-size:12px;color:var(--tx2);margin-top:4px">'+inc.observacionesCierre+'</p>';
        h+='<p style="font-size:12px;color:var(--g);margin-top:4px">Tiempo total: <strong style="font-family:monospace">'+fmtT(parseInt(inc.tiempoTotal)||0)+'</strong></p></div>';
        h+='<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="verAvances('+inc.id+')">Historial</button><button class="btn" onclick="adjuntarArchivoInc('+inc.id+')">Adjuntar archivo</button><input type="file" id="finc-'+inc.id+'" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" style="display:none" onchange="subirArchivoInc('+inc.id+',this)">';
        if(isJefe)h+='<button class="btn btn-p" onclick="cerrarDefinitivoInc('+inc.id+')">Cerrar definitivamente</button>';
        h+='</div>';
      } else {
        if(inc.observacionesCierre||inc.realizadoPor){
          h+='<div style="background:var(--gl);border-radius:var(--r);padding:10px 14px;margin-top:6px">';
          if(inc.realizadoPor)h+='<div style="font-size:12px;font-weight:700;color:var(--g)">Realizado por: '+inc.realizadoPor+'</div>';
          if(inc.observacionesCierre)h+='<div style="font-size:12px;color:var(--tx2);margin-top:4px">'+inc.observacionesCierre+'</div></div>';
        }
        if(inc.tiempoTotal&&inc.tiempoTotal!=='0')h+='<div style="font-size:12px;font-family:monospace;color:var(--tx2);margin-top:6px">Tiempo total: '+fmtT(parseInt(inc.tiempoTotal))+'</div>';
        h+='<div style="margin-top:8px"><button class="btn btn-sm" onclick="verAvances('+inc.id+')">Historial de avances</button></div>';
      }
      h+='</div>';
    });
    el.innerHTML=h;
    lista.forEach(function(inc){if(_timers_inc[inc.id]&&_timers_inc[inc.id].running)tickTimerInc(inc.id);});
  });
}
function togTimerInc(id){
  if(!_timers_inc[id])_timers_inc[id]={running:false,startTs:0,accumulated:0,interval:null};
  var t=_timers_inc[id];
  if(t.running){
    t.accumulated+=Math.floor((Date.now()-t.startTs)/1000);t.running=false;clearInterval(t.interval);
    var btn=G('tmr-btn-'+id);if(btn){btn.className='btn btn-p';btn.textContent='Iniciar';}
    var disp=G('tmr-disp-'+id);if(disp)disp.textContent=fmtT(t.accumulated);
    toast('Tiempo guardado: '+fmtT(t.accumulated));
  } else {
    t.running=true;t.startTs=Date.now();
    var btn=G('tmr-btn-'+id);if(btn){btn.className='btn btn-d';btn.textContent='Parar';}
    api('actualizarIncidencia',{id:id,estado:'en_curso'},function(){});
    tickTimerInc(id);
  }
}
function tickTimerInc(id){
  var t=_timers_inc[id];if(!t)return;clearInterval(t.interval);
  t.interval=setInterval(function(){if(!t.running){clearInterval(t.interval);return;}var el=G('tmr-disp-'+id);if(el)el.textContent=fmtT(t.accumulated+Math.floor((Date.now()-t.startTs)/1000));},1000);
}
function guardarAvanceInc(id){
  var mat=G('mat-'+id)?G('mat-'+id).value:'';var obs=G('obs-'+id)?G('obs-'+id).value:'';
  var t=_timers_inc[id],tiempoSeg=0;
  if(t){if(t.running){t.accumulated+=Math.floor((Date.now()-t.startTs)/1000);t.running=false;clearInterval(t.interval);t.startTs=0;}tiempoSeg=t.accumulated;t.accumulated=0;}
  if(!obs.trim()&&tiempoSeg===0){toast('Escribe observaciones o registra tiempo','warn');return;}
  api('guardarAvance',{id:id,tiempoSeg:tiempoSeg,materiales:mat,observaciones:obs},function(r){
    toast(r&&r.ok?'Avance guardado':(r?r.msg:'Error'),r&&r.ok);
    if(r&&r.ok){var btn=G('tmr-btn-'+id);if(btn){btn.className='btn btn-p';btn.textContent='Iniciar';}var disp=G('tmr-disp-'+id);if(disp)disp.textContent=fmtT(0);cargarMisInc('pendientes');}
  });
}
function mMarcarRealizada(id){
  var obs=G('obs-'+id)?G('obs-'+id).value:'';var t=_timers_inc[id];var total=t?t.accumulated:0;
  if(t&&t.running){total+=Math.floor((Date.now()-t.startTs)/1000);t.running=false;clearInterval(t.interval);}
  var wrap=document.createElement('div');
  wrap.innerHTML='<p style="font-size:13px;color:var(--tx2);margin-bottom:14px">El jefe de mantenimiento la cerrará definitivamente.</p><div class="fg"><label>Resumen del trabajo realizado *</label><textarea id="mr-obs" rows="4" style="width:100%;padding:9px 11px;border:1.5px solid var(--bd);border-radius:var(--r);font-family:inherit;font-size:13px;resize:vertical" placeholder="Describe qué se ha hecho...">'+obs+'</textarea></div><div style="background:var(--sur2);border-radius:var(--r);padding:10px 12px;font-size:12px">Tiempo total: <strong style="font-family:monospace">'+fmtT(total)+'</strong></div>';
  modal('Marcar como realizada',wrap,[{label:'Cancelar',fn:closeModal},{label:'Confirmar',fn:function(){
    var obsFinal=G('mr-obs').value.trim();if(!obsFinal){toast('Las observaciones son obligatorias','warn');return;}
    api('marcarRealizada',{id:id,observaciones:obsFinal,tiempoTotal:total},function(r){
      toast(r&&r.ok?'Marcada como realizada':(r?r.msg:'Error'),r&&r.ok);
      if(r&&r.ok){closeModal();delete _timers_inc[id];cargarMisInc('pendientes');}
    });
  },p:true}]);
}
function cerrarDefinitivoInc(id){
  if(!confirm('¿Cerrar definitivamente esta incidencia?'))return;
  api('cerrarDefinitivo',{id:id},function(r){
    toast(r&&r.ok?'Incidencia cerrada definitivamente':(r?r.msg:'Error'),r&&r.ok);
    if(r&&r.ok){cargarMisInc('pendientes');cargarMisInc('realizadas');}
  });
}
function adjuntarArchivoInc(id){var inp=G('finc-'+id);if(inp)inp.click();}
function subirArchivoInc(id,input){
  var file=input.files[0];if(!file)return;
  if(file.size>10*1024*1024){toast('Archivo demasiado grande (máx 10MB)','warn');return;}
  toast('Subiendo archivo...');
  var reader=new FileReader();
  reader.onload=function(ev){
    var base64=ev.target.result.split(',')[1];
    api('subirArchivoInc',{id:id,base64:base64,nombre:file.name,mime:file.type||'application/octet-stream'},function(r){
      if(!r||!r.ok){toast(r?r.msg:'Error subiendo',false);return;}
      toast('Archivo subido: '+r.nombre);cargarMisInc('pendientes');
    });
  };
  reader.readAsDataURL(file);
}
function verAvances(id){
  var wrap=document.createElement('div');wrap.innerHTML='<div class="spin"></div>';
  modal('Historial de avances',wrap,[{label:'Cerrar',fn:closeModal}]);
  api('getAvances',{id:id},function(r){
    if(!r||!r.ok){wrap.innerHTML='<p style="color:var(--danger)">Error</p>';return;}
    if(!r.data.length){wrap.innerHTML='<p style="color:var(--tx3);text-align:center;padding:20px">Sin avances registrados aún</p>';return;}
    var tiempoTotal=0;
    var h='<div class="tw"><table style="font-size:13px"><thead><tr><th>Fecha</th><th>Hora</th><th>Personal</th><th>Tiempo</th><th>Materiales</th><th>Observaciones</th></tr></thead><tbody>';
    r.data.forEach(function(a){
      tiempoTotal+=a.tiempoSeg;
      h+='<tr><td style="white-space:nowrap">'+a.fecha+'</td><td>'+a.hora+'</td><td style="font-weight:700">'+a.personal+'</td>';
      h+='<td style="font-family:monospace;color:var(--g);font-weight:700">'+fmtT(a.tiempoSeg)+'</td><td style="font-size:12px;color:var(--tx2)">'+(a.materiales||'—')+'</td><td style="font-size:12px">'+(a.observaciones||'—')+'</td></tr>';
    });
    h+='</tbody></table></div><div style="margin-top:12px;padding:10px 14px;background:var(--gl);border-radius:var(--r);font-size:13px;font-weight:700;color:var(--g)">Tiempo total: <span style="font-family:monospace">'+fmtT(tiempoTotal)+'</span> en '+r.data.length+' sesión'+(r.data.length>1?'es':'')+'</div>';
    wrap.innerHTML=h;
  });
}

// ============================================================
// MÓDULO DE RESIDUOS
// ============================================================
function pgResiduos(){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px"><div><h2 style="font-size:17px;font-weight:800">Residuos Generados</h2><p style="font-size:12px;color:var(--tx3)">QUERAT y Barrido suelo — Totales y Desgloses</p></div></div><div class="tabs"><div class="tab active" onclick="swTabRes(this,\'res-hoy\')">Hoy</div><div class="tab" onclick="swTabRes(this,\'res-per\')">Período</div></div><div id="res-hoy" class="tp active"><div id="res-hoy-list"></div></div><div id="res-per" class="tp"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px"><input type="date" id="res-fini"><input type="date" id="res-ffin"></div><button class="btn btn-p" onclick="cargarResiduosPeriodo()">Buscar</button><div id="res-per-list" style="margin-top:14px"></div></div>';
  pc(h);cargarResiduosHoy();
}

function swTabRes(el,id){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tp').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');var tp=G(id);if(tp)tp.classList.add('active');
  if(id==='res-hoy')cargarResiduosHoy();
}

function cargarResiduosHoy(){
  api('getRegistrosHoy',{incluir:['querat','barrido']},function(r){
    if(!r||!r.ok||!r.data){G('res-hoy-list').innerHTML='<p style="color:var(--tx3);text-align:center;padding:20px">Sin registros hoy</p>';return;}
    var porZona={};
    var totalQuerat = 0;
    var totalBarrido = 0;

    r.data.forEach(function(reg){
      if(!porZona[reg.ZONA])porZona[reg.ZONA]={querat:0,barrido:0,subzonas:[]};
      var q = parseFloat(reg.QUERAT) || 0;
      var b = parseFloat(reg.BARRIDO_SUELO) || 0;
      porZona[reg.ZONA].querat += q;
      porZona[reg.ZONA].barrido += b;
      totalQuerat += q;
      totalBarrido += b;
      porZona[reg.ZONA].subzonas.push(reg.SUBZONA);
    });
    
    var h='';
    
    // --- TARJETA DE TOTALES DIARIOS Y BOTÓN GLOBAL ---
    if(Object.keys(porZona).length > 0) {
      var jsonZonas = encodeURIComponent(JSON.stringify(porZona));
      h += '<div class="card" style="margin-bottom:20px; border:2px solid var(--g); background:var(--gl)">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
      h += '<h3 style="font-size:16px;font-weight:800;color:var(--g)">TOTAL DIARIO DE RESIDUOS</h3>';
      h += '<button class="btn btn-p" style="background:var(--g);color:white" onclick="enviarTodosResiduos(\''+totalQuerat+'\',\''+totalBarrido+'\',\''+jsonZonas+'\')">Enviar Resumen 📧</button>';
      h += '</div>';
      h += '<div style="display:flex;gap:20px;font-size:15px;color:var(--g);font-weight:700">';
      h += '<div>🌰 TOTAL QUERAT: ' + totalQuerat.toFixed(2) + ' kg</div>';
      h += '<div>🧹 DENTRO DE MAQUINA: ' + totalBarrido.toFixed(2) + ' kg</div>';
      h += '</div></div>';
    }

    // --- DESGLOSE INDIVIDUAL POR ZONA ---
    Object.keys(porZona).forEach(function(zona){
      var datos=porZona[zona];
      h+='<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="font-size:14px;font-weight:700">'+zona+'</h3><button class="btn btn-sm btn-p" onclick="enviarResiduoPorEmail(\''+zona+'\','+datos.querat+','+datos.barrido+')">Enviar 📧</button></div><div style="background:var(--sur2);padding:12px;border-radius:var(--r);font-size:12px"><div style="margin-bottom:6px"><strong>🌰 QUERAT:</strong> '+datos.querat.toFixed(2)+' kg</div><div style="margin-bottom:6px"><strong>🧹 BARRIDO:</strong> '+datos.barrido.toFixed(2)+' kg</div></div></div>';
    });
    G('res-hoy-list').innerHTML=h||'<p style="color:var(--tx3);text-align:center;padding:20px">Sin registros con residuos</p>';
  });
}

function enviarTodosResiduos(totQ, totB, jsonZonas) {
  try {
    var porZona = JSON.parse(decodeURIComponent(jsonZonas));
    
    var html = '<div style="font-family: \'Segoe UI\', Arial, sans-serif; background-color: #F0F2F5; padding: 20px; color: #212121;">';
    
    // -- TARJETA DE TOTALES (Fondo Verde) --
    html += '<div style="background-color: #D4EBD9; border: 2px solid #1A472A; border-radius: 12px; padding: 20px; margin-bottom: 24px;">';
    html += '<h3 style="margin-top: 0; margin-bottom: 16px; color: #1A472A; font-size: 16px; text-transform: uppercase;">TOTAL DIARIO DE RESIDUOS</h3>';
    html += '<div style="font-size: 15px; color: #1A472A;">';
    html += '<span style="margin-right: 24px;"><strong>TOTAL QUERAT:</strong> ' + parseFloat(totQ).toFixed(2) + ' kg</span>';
    html += '<span><strong>TOTAL BARRIDO:</strong> ' + parseFloat(totB).toFixed(2) + ' kg</span>';
    html += '</div></div>';
    
    // -- TARJETAS POR ZONA (Fondo Blanco) --
    Object.keys(porZona).forEach(function(zona) {
      var qVal = porZona[zona].querat.toFixed(2);
      var bVal = porZona[zona].barrido.toFixed(2);
      
      html += '<div style="background-color: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">';
      html += '<h4 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; color: #212121;">' + zona + '</h4>';
      // Caja interior gris para los pesos
      html += '<div style="background-color: #F8F9FA; padding: 16px; border-radius: 8px; font-size: 13px; color: #212121;">';
      html += '<div style="margin-bottom: 8px;"><strong>QUERAT:</strong> ' + qVal + ' kg</div>';
      html += '<div><strong>BARRIDO:</strong> ' + bVal + ' kg</div>';
      html += '</div></div>';
    });
    
    html += '</div>'; // Fin del contenedor gris

    // 2. Pedir correo y enviar
    var correo = prompt("Introduce el correo para enviar el resumen visual:\n", "");
    if(!correo || correo.trim() === "") return;

    toast("Enviando resumen global...");
    
    api('enviarEmail', {
      tipo: 'diario',
      emails: correo,
      asunto: "Residuos Generados L+D - " + today(),
      mensaje: html // Pasamos el código HTML directamente
    }, function(r){
      toast(r && r.ok ? '✅ Resumen enviado a ' + correo : 'Error al enviar el correo', r && r.ok);
    });

  } catch (error) {
    console.error("Error procesando el resumen", error);
    toast("Hubo un error al preparar el resumen", false);
  }
}

function enviarResiduoPorEmail(zona,querat,barrido){
  var correo=prompt('Correo para enviar registro individual de '+zona+':\n\n QUERAT: '+querat.toFixed(2)+' kg\n BARRIDO: '+barrido.toFixed(2)+' kg');
  if(!correo)return; 
  api('enviarResiduoPorEmail',{zona:zona,querat:querat,barrido:barrido,correo:correo},function(r){toast(r&&r.ok?'Email enviado a '+correo:'Error',r&&r.ok);});
}

function cargarResiduosPeriodo(){
  var fini=G('res-fini').value,ffin=G('res-ffin').value;
  if(!fini||!ffin){toast('Selecciona fechas','warn');return;}
  api('getResiduosPeriodo',{fechaIni:fini,fechaFin:ffin},function(r){
    if(!r||!r.ok){G('res-per-list').innerHTML='<p style="color:var(--tx3)">'+((r&&r.msg)||'Error')+'</p>';return;}
    var porZona={};
    var totalQuerat = 0;
    var totalBarrido = 0;

    (r.data||[]).forEach(function(reg){
      if(!porZona[reg.ZONA])porZona[reg.ZONA]={querat:0,barrido:0};
      var q = parseFloat(reg.QUERAT)||0;
      var b = parseFloat(reg.BARRIDO_SUELO)||0;
      porZona[reg.ZONA].querat += q;
      porZona[reg.ZONA].barrido += b;
      totalQuerat += q;
      totalBarrido += b;
    });
    
    var h='';

    // TOTALES DEL PERÍODO
    if(Object.keys(porZona).length > 0) {
      h += '<div class="card" style="margin-bottom:20px; border:2px solid var(--info); background:var(--infol)">';
      h += '<h3 style="font-size:16px;font-weight:800;color:var(--info);margin-bottom:10px">TOTAL DEL PERÍODO</h3>';
      h += '<div style="display:flex;gap:20px;font-size:15px;color:var(--info);font-weight:700">';
      h += '<div>🌰 TOTAL QUERAT: ' + totalQuerat.toFixed(2) + ' kg</div>';
      h += '<div>🧹 DENTRO DE MAQUINA: ' + totalBarrido.toFixed(2) + ' kg</div>';
      h += '</div></div>';
    }

    Object.keys(porZona).forEach(function(zona){
      var datos=porZona[zona];
      h+='<div class="card" style="margin-bottom:12px"><h3 style="font-size:14px;font-weight:700;margin-bottom:8px">'+zona+'</h3><div style="background:var(--sur2);padding:12px;border-radius:var(--r);font-size:12px"><div style="margin-bottom:6px"><strong>🌰 QUERAT:</strong> '+datos.querat.toFixed(2)+' kg</div><div><strong>🧹 DENTRO MAQUINA:</strong> '+datos.barrido.toFixed(2)+' kg</div></div></div>';
    });
    G('res-per-list').innerHTML=h||'<p style="color:var(--tx3);text-align:center;padding:20px">Sin datos en el período</p>';
  });
}

// ============================================================
// MÓDULO DE LUMINÓMETRO ATP
// ============================================================
var _LUM = { zonas: [], cadenaActual: null, pendienteRem: null };
function pgLuminometro(){
  var canAdd = ROL==='admin'||ROL==='supervisor'||ROL==='jefe_mantenimiento';
  var canVal = ROL==='admin'||ROL==='supervisor'||ROL==='laboratorio';
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">';
  h +=   '<div><h2 style="font-size:17px;font-weight:800">🔬 Luminómetro ATP</h2><p style="font-size:12px;color:var(--tx3)">Verificación eficacia de limpieza · PC46 v13</p></div></div>';
  h += '<div class="tabs">';
  if(canAdd) h += '<div class="tab active" onclick="lumSwTab(this,\'lum-add\')">➕ Añadir medida</div>';
  if(canAdd) h += '<div class="tab" onclick="lumSwTab(this,\'lum-rem\')">🔁 Re-mediciones <span id="lum-badge-rem" style="display:none;margin-left:4px;background:var(--danger);color:white;padding:1px 7px;border-radius:10px;font-size:10px">0</span></div>';
  h += '<div class="tab'+(canAdd?'':' active')+'" onclick="lumSwTab(this,\'lum-his\')">📋 Histórico</div>';
  if(canVal) h += '<div class="tab" onclick="lumSwTab(this,\'lum-val\')">✅ Validación</div>';
  if(canVal) h += '<div class="tab" onclick="lumSwTab(this,\'lum-exp\')">📄 Exportar Pdf</div>';
  h += '<div class="tab" onclick="lumSwTab(this,\'lum-res\')">📊 Resumen</div>';
  if(canVal) h += '<div class="tab" onclick="lumSwTab(this,\'lum-cfg\')">⚙️ Configuración</div>';
  h += '</div>';
  if(canAdd) h += '<div id="lum-add" class="tp active"><div class="spin"></div></div>';
  if(canAdd) h += '<div id="lum-rem" class="tp"></div>';
  h += '<div id="lum-his" class="tp'+(canAdd?'':' active')+'"></div>';
  if(canVal) h += '<div id="lum-val" class="tp"></div>';
  if(canVal) h += '<div id="lum-exp" class="tp"></div>';
  h += '<div id="lum-res" class="tp"></div>';
  if(canVal) h += '<div id="lum-cfg" class="tp"></div>';
  pc(h);
  api('lumListZonas',{},function(r){
    if(r&&r.ok) _LUM.zonas=r.data;
    if(canAdd) lumRenderAdd(); else lumRenderHist();
    lumBadgeRefresh();
  });
}
function lumSwTab(el,id){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tp').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active'); var tp=G(id); if(tp)tp.classList.add('active');
  if(id==='lum-add') lumRenderAdd(); else if(id==='lum-rem') lumRenderRem(); else if(id==='lum-his') lumRenderHist(); else if(id==='lum-val') lumRenderVal(); else if(id==='lum-exp') lumRenderExp(); else if(id==='lum-res') lumRenderRes(); else if(id==='lum-cfg') lumRenderCfg();
}
function lumBadgeRefresh(){
  api('lumListCadenasAbiertas',{},function(r){
    var b=G('lum-badge-rem'); if(!b) return;
    if(r&&r.ok&&r.data.length){ b.textContent=r.data.length; b.style.display='inline-block'; } else b.style.display='none';
  });
}
function lumRenderAdd(){
  var el=G('lum-add'); if(!el) return;
  var now=new Date(), pad2=function(n){return n<10?'0'+n:n;};
  var hoy=now.getFullYear()+'-'+pad2(now.getMonth()+1)+'-'+pad2(now.getDate());
  var hora=pad2(now.getHours())+':'+pad2(now.getMinutes()), cadBanner='';
  if(_LUM.cadenaActual){
    var c=_LUM.cadenaActual;
    cadBanner='<div class="alert-banner" style="background:#FFF3E0;border-color:var(--warn);margin-bottom:14px"><h3 style="color:var(--warn)">🔁 RE-MEDICIÓN en curso</h3><p style="font-size:12px">Cadena <b>'+c.cadena_id+'</b> · Zona <b>'+c.zona+'</b>'+(c.subzona?' · Subzona <b>'+c.subzona+'</b>':'')+' · Último: <b>'+c.ultima_url+' URL ('+c.ultimo_status+')</b> · Intento <b>#'+(c.max_intento+1)+'</b></p><p style="font-size:11px;color:var(--tx2);margin-top:4px">Introduce la nueva medida. Debe salir OK o MOD para cerrar la cadena.</p><button class="btn btn-sm" style="margin-top:8px" onclick="lumCancelRem()">↩ Cancelar re-medición</button></div>';
  }
  var zonaOpts = _LUM.zonas.map(function(z){return '<option value="'+z.codigo+'">'+z.codigo+' — '+z.descripcion+'</option>';}).join('');
  var h=cadBanner+'<div class="card"><div class="card-title">Nueva medida de luminómetro</div><div class="fr"><div class="fg"><label>Periodicidad</label><select id="lf_tipo"><option value="SEMANAL">SEMANAL</option><option value="MENSUAL">MENSUAL</option><option value="TRIMESTRAL">TRIMESTRAL</option></select></div><div class="fg"><label>Zona *</label><select id="lf_zona" onchange="lumOnZonaChange()">'+zonaOpts+'</select></div></div><div class="fr"><div class="fg"><label>Zona Intermedia</label><select id="lf_subzona" onchange="lumLookupResp()"><option value="">— Sin subzona —</option></select></div><div class="fg"><label>Punto de muestreo</label><input type="text" id="lf_punto" placeholder="Ej: LAVADORA Y CRIBAS"></div></div><div class="fr"><div class="fg"><label>Fecha *</label><input type="date" id="lf_fecha" value="'+hoy+'" onchange="lumLookupResp()"></div><div class="fg"><label>Hora *</label><input type="time" id="lf_hora" value="'+hora+'"></div></div><div class="fr"><div class="fg"><label>Resultado (URL) *</label><input type="number" id="lf_url" min="0" step="1" placeholder="Valor numérico" oninput="lumPreviewStatus()"></div><div class="fg"><label>Lote hisopo</label><input type="text" id="lf_lote"></div></div><div class="fg"><label>Responsable limpieza <span style="font-weight:400;color:var(--tx3)">(auto desde REGISTRO)</span></label><input type="text" id="lf_resp" placeholder="Se autocompleta al elegir zona y fecha"><p id="lf_resp_hint" style="font-size:11px;color:var(--info);margin-top:3px;font-style:italic;display:none"></p></div><div class="fr"><div class="fg"><label>CM</label><input type="text" id="lf_cm"></div><div class="fg"><label>Observaciones</label><input type="text" id="lf_obs"></div></div><div class="fg" style="margin-top:8px"><label>Status (automático al teclear)</label><div id="lf_status" style="padding:16px;border-radius:var(--rl);text-align:center;font-size:26px;font-weight:800;border:3px solid var(--bd);background:var(--sur2);color:var(--tx3);transition:all .2s">— Introduce un valor —</div></div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-p" id="lf_save" onclick="lumGuardar()">💾 Guardar medida</button><button class="btn" onclick="lumLimpiar()">🗙 Limpiar</button></div></div>';
  el.innerHTML=h; lumOnZonaChange();
  if(_LUM.cadenaActual){
    var c=_LUM.cadenaActual; G('lf_zona').value=c.zona; lumOnZonaChange();
    setTimeout(function(){
      if(c.subzona){G('lf_subzona').value=c.subzona;}
      G('lf_zona').disabled=true; G('lf_subzona').disabled=true; G('lf_punto').value=c.punto_muestreo||''; G('lf_tipo').value=c.periodo_tipo||'SEMANAL';
      lumLookupResp();
    },50);
  }
}
function lumOnZonaChange(){
  var cod=G('lf_zona').value, zona=null;
  for(var i=0;i<_LUM.zonas.length;i++){if(_LUM.zonas[i].codigo===cod){zona=_LUM.zonas[i];break;}}
  var sel=G('lf_subzona'); sel.innerHTML='<option value="">— Sin subzona —</option>';
  if(zona&&zona.subzonas&&zona.subzonas.length){zona.subzonas.forEach(function(s){var opt=document.createElement('option');opt.value=s.codigo;opt.textContent=s.descripcion||s.codigo;sel.appendChild(opt);});}
  lumLookupResp();
}
function lumLookupResp(){
  var zona=G('lf_zona').value, sub=G('lf_subzona').value, fecha=G('lf_fecha').value, resp=G('lf_resp'), hint=G('lf_resp_hint');
  if(resp.dataset.manual==='1') return; if(!zona||!fecha) return;
  api('lumLookupResponsable',{zona:zona,subzona:sub,fecha:fecha},function(r){
    if(!r||!r.ok) return;
    if(r.data.encontrado){ resp.value=r.data.responsable; resp.style.background='#DBEAFE'; resp.style.borderColor='#3B82F6'; hint.textContent='✓ Auto-rellenado'; hint.style.display='block'; }
    else if(!resp.value){ resp.style.background=''; resp.style.borderColor=''; hint.textContent='No se encontró registro. Escríbelo manualmente.'; hint.style.display='block'; }
  });
}
document.addEventListener('input',function(e){
  if(e.target&&e.target.id==='lf_resp'){ e.target.dataset.manual='1'; e.target.style.background=''; e.target.style.borderColor=''; var h=G('lf_resp_hint'); if(h) h.style.display='none'; }
});
function lumPreviewStatus(){
  var v=G('lf_url').value, box=G('lf_status');
  if(v===''){box.style.cssText='padding:16px;border-radius:var(--rl);text-align:center;font-size:26px;font-weight:800;border:3px solid var(--bd);background:var(--sur2);color:var(--tx3)';box.innerHTML='— Introduce un valor —';return;}
  var n=Number(v);
  if(n<150){ box.style.cssText='padding:16px;border-radius:var(--rl);text-align:center;font-size:26px;font-weight:800;border:3px solid #86efac;background:#dcfce7;color:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.15)'; box.innerHTML='✅ OK — '+v+' URL'; }
  else if(n<=300){ box.style.cssText='padding:16px;border-radius:var(--rl);text-align:center;font-size:26px;font-weight:800;border:3px solid #fde68a;background:#fef9c3;color:#ca8a04;box-shadow:0 0 0 4px rgba(202,138,4,.15)'; box.innerHTML='⚠️ MODERADO — '+v+' URL'; }
  else { box.style.cssText='padding:16px;border-radius:var(--rl);text-align:center;font-size:26px;font-weight:800;border:3px solid #fca5a5;background:#fee2e2;color:#dc2626;box-shadow:0 0 0 4px rgba(220,38,38,.2);animation:lumShake .6s'; box.innerHTML='🚫 NO OK — '+v+' URL<br><span style="font-size:13px;font-weight:500">Exigirá re-medir</span>'; }
}
(function(){if(document.getElementById('lum-style'))return;var st=document.createElement('style');st.id='lum-style';st.textContent='@keyframes lumShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}.lum-row-ok td{background:#f0fdf4!important}.lum-row-mod td{background:#fefce8!important}.lum-row-ko td{background:#fef2f2!important}';document.head.appendChild(st);})();
function lumLimpiar(){['lf_punto','lf_url','lf_cm','lf_obs','lf_lote'].forEach(function(id){var e=G(id);if(e)e.value='';});var r=G('lf_resp'); if(r){r.value='';delete r.dataset.manual;r.style.background='';r.style.borderColor='';} var h=G('lf_resp_hint'); if(h)h.style.display='none'; lumPreviewStatus(); lumLookupResp(); }
function lumCancelRem(){_LUM.cadenaActual=null; lumRenderAdd(); toast('Re-medición cancelada'); }
function lumGuardar(){
  var fecha=G('lf_fecha').value, hora=G('lf_hora').value; if(!fecha){toast('Falta la fecha','warn');return;}
  var url=G('lf_url').value; if(url===''){toast('Falta el resultado','warn');return;}
  var respEl=G('lf_resp');
  var payload={periodo_tipo: G('lf_tipo').value, zona: G('lf_zona').value, subzona: G('lf_subzona').value, punto_muestreo: G('lf_punto').value, fecha_medida: new Date(fecha+'T'+(hora||'00:00')+':00').toISOString(), hora_medida: hora, resultado_url: url, responsable: respEl.dataset.manual==='1'?respEl.value:'', cm: G('lf_cm').value, observaciones: G('lf_obs').value, lote_hisopo: G('lf_lote').value, cadena_id: _LUM.cadenaActual?_LUM.cadenaActual.cadena_id:null};
  var btn=G('lf_save'); if(btn){btn.disabled=true;btn.textContent='⏳ Guardando...';}
  api('lumAddMedida',payload,function(r){
    if(btn){btn.disabled=false;btn.textContent='💾 Guardar medida';}
    if(!r){toast('Sin respuesta del servidor',false);return;}
    if(!r.ok){toast('❌ '+r.msg,false);return;}
    if(r.status==='NO OK'){
      _LUM.pendienteRem={cadena_id: r.cadena_id, zona: payload.zona, subzona: payload.subzona, punto_muestreo: payload.punto_muestreo, periodo_tipo: payload.periodo_tipo, ultima_url: Number(url), ultimo_status: 'NO OK', max_intento: r.intento};
      lumModalNoOk(); lumBadgeRefresh(); return;
    }
    toast('✅ Guardada — '+r.status+' ('+r.periodo_codigo+')'+(r.intento>1?' · Cadena CERRADA ✓':''));
    if(_LUM.cadenaActual){_LUM.cadenaActual=null;lumRenderAdd();} else lumLimpiar();
    lumBadgeRefresh();
  });
}
function lumModalNoOk(){
  var wrap=document.createElement('div');
  wrap.innerHTML='<div style="background:#fee2e2;padding:14px;border-radius:var(--r);border-left:4px solid var(--danger);margin-bottom:14px;font-size:13px"><strong style="color:var(--danger);font-size:15px">⚠️ RESULTADO NO OK</strong><br><br>La medida supera <b>300 URL</b>, por encima del límite PC46 v13.<br><br><b>La cadena queda abierta.</b> Debes realizar una nueva limpieza y volver a medir el mismo punto hasta obtener <b>OK</b> o <b>MODERADO</b>.</div>';
  modal('⚠️ Resultado NO OK', wrap, [{label:'Continuar → Re-medir', fn:function(){closeModal();if(_LUM.pendienteRem){_LUM.cadenaActual=_LUM.pendienteRem;_LUM.pendienteRem=null;lumRenderAdd();}}, d:true}]);
}
function lumRenderRem(){
  var el=G('lum-rem'); if(!el) return; el.innerHTML='<div class="spin"></div>';
  api('lumListCadenasAbiertas',{},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card">Error</div>';return;}
    if(!r.data.length){el.innerHTML='<div class="card" style="text-align:center;padding:32px"><div style="font-size:48px;margin-bottom:8px">✅</div><p>No hay cadenas abiertas. Todas las medidas están cerradas.</p></div>';return;}
    var h='<div class="card" style="margin-bottom:14px"><p style="font-size:12px;color:var(--tx2)">Cada fila es un punto que dio <b>NO OK</b> y sigue pendiente de re-medir. Pulsa <b>Re-medir</b> para añadir una nueva lectura del mismo punto.</p></div><div class="card" style="padding:0;overflow:hidden"><div class="tw"><table><thead><tr><th>Periodo</th><th>Zona</th><th>Punto</th><th>Última medida</th><th>Resultado</th><th>Intentos</th><th></th></tr></thead><tbody>';
    r.data.forEach(function(c){
      h+='<tr class="lum-row-ko"><td>'+c.periodo_codigo+'</td><td><b>'+c.zona+'</b>'+(c.subzona?'<br><span style="font-size:11px;color:var(--tx3)">'+c.subzona+'</span>':'')+'</td><td>'+(c.punto_muestreo||'—')+'</td><td style="font-size:12px">'+(c.ultima_fecha||'')+'</td><td><b>'+c.ultima_url+'</b> <span class="bg-r">'+c.ultimo_status+'</span></td><td>'+c.intentos+'</td><td><button class="btn btn-sm btn-d" onclick=\'lumIniciarRem('+JSON.stringify(JSON.stringify(c)).replace(/'/g,"&apos;")+')\'>🔁 Re-medir</button></td></tr>';
    });
    h+='</tbody></table></div></div>'; el.innerHTML=h;
  });
}
function lumIniciarRem(jsonStr){ try{_LUM.cadenaActual=JSON.parse(jsonStr);var addTab=document.querySelector('.tab[onclick*="lum-add"]');if(addTab)addTab.click();}catch(e){toast('Error cargando cadena','warn');} }
function lumRenderHist(){
  var el=G('lum-his'); if(!el) return;
  var h='<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="fg" style="margin:0"><label>Periodicidad</label><select id="lh_tipo"><option value="">Todas</option><option>SEMANAL</option><option>MENSUAL</option><option>TRIMESTRAL</option></select></div><div class="fg" style="margin:0"><label>Año</label><input type="number" id="lh_anio" value="'+(new Date()).getFullYear()+'"></div><div class="fg" style="margin:0"><label>Zona</label><input type="text" id="lh_zona" placeholder="Z.4, Z.7..."></div><button class="btn btn-p" onclick="lumCargarHist()">🔍 Filtrar</button></div></div><div id="lh_res"><div class="spin"></div></div>';
  el.innerHTML=h; lumCargarHist();
}
function lumCargarHist(){
  var el=G('lh_res'); if(!el)return; el.innerHTML='<div class="spin"></div>';
  var p={}; var t=G('lh_tipo'); if(t&&t.value)p.periodo_tipo=t.value; var a=G('lh_anio'); if(a&&a.value)p.anio=a.value; var z=G('lh_zona'); if(z&&z.value)p.zona=z.value;
  api('lumListMedidas',p,function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card">Error</div>';return;}
    if(!r.data.length){el.innerHTML='<div class="card" style="text-align:center;padding:32px;color:var(--tx3)">Sin medidas</div>';return;}
    var h='<div class="card" style="padding:0;overflow:hidden"><div class="tw"><table><thead><tr><th>Periodo</th><th>Zona</th><th>Punto</th><th>Fecha/Hora</th><th>URL</th><th>Status</th><th>Responsable</th><th>Val.</th><th>Obs.</th></tr></thead><tbody>';
    r.data.forEach(function(m){
      var cls=m.status==='OK'?'lum-row-ok':m.status==='MOD'?'lum-row-mod':m.status==='NO OK'?'lum-row-ko':'';
      var intTxt=m.intento>1?'<br><span style="font-size:10px;color:var(--tx3)">re-med #'+m.intento+'</span>':'';
      var cadTxt=m.cadena_estado==='ABIERTA'?'<br><span class="bg-r" style="font-size:10px">CADENA ABIERTA</span>':'';
      var badge=m.status==='OK'?'<span class="bg-g">OK</span>':m.status==='MOD'?'<span class="bg-w">MOD</span>':'<span class="bg-r">NO OK</span>';
      h+='<tr class="'+cls+'"><td>'+(m.periodo_codigo||'')+'</td><td><b>'+(m.zona||'')+'</b>'+(m.subzona?'<br><span style="font-size:11px;color:var(--tx3)">'+m.subzona+'</span>':'')+'</td><td>'+(m.punto_muestreo||'—')+intTxt+cadTxt+'</td><td style="font-size:11px">'+m.fecha_medida+' '+(m.hora_medida||'')+'</td><td><b>'+m.resultado_url+'</b></td><td>'+badge+'</td><td style="font-size:11px">'+(m.responsable||'—')+'</td><td>'+(m.validado?'<span class="bg-g">✓</span>':'<span class="bg-gr">—</span>')+'</td><td style="font-size:11px;max-width:160px">'+(m.observaciones||'')+'</td></tr>';
    });
    h+='</tbody></table></div></div><p class="small" style="font-size:11px;color:var(--tx3);margin-top:8px">Total: '+r.data.length+' medidas</p>'; el.innerHTML=h;
  });
}
function lumRenderVal(){
  var el=G('lum-val'); if(!el) return;
  var h='<div class="card" style="margin-bottom:14px"><p style="font-size:12px;color:var(--tx2)">Solo <b>admin</b> y <b>supervisor</b> pueden validar. Las cadenas con re-medición pendiente NO se pueden validar hasta cerrarse.</p><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px"><div class="fg" style="margin:0"><label>Año</label><input type="number" id="lv_anio" value="'+(new Date()).getFullYear()+'"></div><button class="btn btn-p" onclick="lumCargarVal()">🔍 Cargar pendientes</button></div></div><div id="lv_res"><div class="spin"></div></div>';
  el.innerHTML=h; lumCargarVal();
}
function lumCargarVal(){
  var el=G('lv_res'); if(!el)return; el.innerHTML='<div class="spin"></div>';
  var p={}; var a=G('lv_anio'); if(a&&a.value)p.anio=a.value;
  api('lumListMedidas',p,function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card">Error</div>';return;}
    var pend=r.data.filter(function(m){return !m.validado;});
    if(!pend.length){el.innerHTML='<div class="card" style="text-align:center;padding:32px"><div style="font-size:42px">✅</div><p>Nada pendiente de validar</p></div>';return;}
    var h='<div class="card" style="padding:0;overflow:hidden"><div class="tw"><table><thead><tr><th>Periodo</th><th>Zona</th><th>Punto</th><th>Fecha</th><th>URL</th><th>Status</th><th>Cadena</th><th></th></tr></thead><tbody>';
    pend.forEach(function(m){
      var cls=m.status==='OK'?'lum-row-ok':m.status==='MOD'?'lum-row-mod':'lum-row-ko', abierta=m.cadena_estado==='ABIERTA', badge=m.status==='OK'?'<span class="bg-g">OK</span>':m.status==='MOD'?'<span class="bg-w">MOD</span>':'<span class="bg-r">NO OK</span>';
      h+='<tr class="'+cls+'"><td>'+m.periodo_codigo+'</td><td><b>'+m.zona+'</b> '+(m.subzona||'')+'</td><td>'+(m.punto_muestreo||'—')+'</td><td style="font-size:11px">'+m.fecha_medida+'</td><td><b>'+m.resultado_url+'</b></td><td>'+badge+'</td><td>'+(abierta?'<span class="bg-r">ABIERTA</span>':'<span class="bg-gr">cerrada</span>')+'</td><td>'+(abierta?'<span style="font-size:11px;color:var(--tx3)">no validar</span>':'<button class="btn btn-sm" style="background:var(--g);color:white;border-color:var(--g)" onclick="lumValidar(\''+m.id+'\')">✓</button> <button class="btn btn-sm btn-d" onclick="lumAnular(\''+m.id+'\')">✗</button>')+'</td></tr>';
    });
    h+='</tbody></table></div></div>'; el.innerHTML=h;
  });
}
function lumValidar(id){api('lumValidarMedida',{id:id,valor:true},function(r){toast(r&&r.ok?'✓ Validada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)lumCargarVal();});}
function lumAnular(id){var mot=prompt('Motivo de anulación:');if(!mot)return;api('lumAnularMedida',{id:id,motivo:mot},function(r){toast(r&&r.ok?'Anulada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)lumCargarVal();});}

function lumRenderExp(){
  var el=G('lum-exp'); if(!el) return;
  el.innerHTML='<div class="card" style="margin-bottom:14px"><p style="font-size:12px;color:var(--tx2)">Genera un .docx con los boletines de PC46 v13 (uno por periodo).</p><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px"><div class="fg" style="margin:0"><label>Periodicidad</label><select id="le_tipo" onchange="lumCargarExp()"><option value="SEMANAL">SEMANAL</option><option value="MENSUAL">MENSUAL</option><option value="TRIMESTRAL">TRIMESTRAL</option></select></div><div class="fg" style="margin:0"><label>Año</label><input type="number" id="le_anio" value="'+(new Date()).getFullYear()+'" onchange="lumCargarExp()"></div><div class="fg" style="margin:0"><label><input type="checkbox" id="le_val" checked> Solo validadas</label></div></div></div><div id="le_per"><div class="spin"></div></div><div style="margin-top:12px"><button class="btn btn-p" onclick="lumExportar()">📄 Generar Pdf</button></div><div id="le_res"></div>';
  lumCargarExp();
}
function lumCargarExp(){
  var el=G('le_per'); if(!el)return; el.innerHTML='<div class="spin"></div>';
  var tipo=G('le_tipo').value, anio=G('le_anio').value;
  api('lumListPeriodos',{periodo_tipo:tipo,anio:anio},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card">Error</div>';return;}
    if(!r.data.length){el.innerHTML='<div class="card" style="text-align:center;padding:24px;color:var(--tx3)">Sin periodos</div>';return;}
    var h='<div class="card"><div style="margin-bottom:8px"><button class="btn btn-sm" onclick="lumCheckAll(true)">Todos</button> <button class="btn btn-sm" onclick="lumCheckAll(false)">Ninguno</button></div>';
    r.data.forEach(function(p){
      var tag=(p.validadas===p.total&&p.cadenas_abiertas===0)?'bg-g':(p.cadenas_abiertas>0?'bg-r':'bg-w');
      h+='<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd);border-radius:var(--r);margin-bottom:6px;cursor:pointer"><input type="checkbox" class="le-chk" value="'+p.periodo_codigo+'" style="width:17px;height:17px;accent-color:var(--g)"><span style="flex:1;font-size:13px"><b>'+p.periodo_codigo+'</b> · '+p.total+' medidas · '+p.validadas+' val.'+(p.cadenas_abiertas>0?' · ⚠ '+p.cadenas_abiertas+' abierta(s)':'')+'</span><span class="'+tag+'">'+p.validadas+'/'+p.total+'</span></label>';
    });
    h+='</div>'; el.innerHTML=h;
  });
}
function lumCheckAll(v){document.querySelectorAll('.le-chk').forEach(function(c){c.checked=v;});}
function lumExportar(){
  var sel=[]; document.querySelectorAll('.le-chk:checked').forEach(function(c){sel.push(c.value);});
  if(!sel.length){toast('Selecciona al menos un periodo','warn');return;}
  var soloVal=G('le_val').checked;
  var res=G('le_res'); if(res)res.innerHTML='<div class="card"><div class="spin"></div><p style="text-align:center">Generando Word...</p></div>';
  api('lumExportarWord',{periodos:sel,solo_validadas:soloVal},function(r){
    if(!r||!r.ok){if(res)res.innerHTML='';toast(r?r.msg:'Error',false);return;}
    if(res)res.innerHTML='<div class="card" style="background:#ecfdf5;border-color:#86efac;margin-top:12px"><b>✅ Word generado:</b> '+r.data.nombre+'<br><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><a href="'+r.data.url+'" target="_blank" class="btn btn-p" style="text-decoration:none">🔗 Abrir en Drive</a> <a href="'+r.data.downloadUrl+'" target="_blank" class="btn" style="text-decoration:none">⬇️ Descargar</a></div></div>';
    toast('✅ Word generado');
  });
}
function lumRenderRes(){
  var el=G('lum-res'); if(!el) return;
  el.innerHTML='<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="fg" style="margin:0"><label>Año</label><input type="number" id="lr_anio" value="'+(new Date()).getFullYear()+'"></div><button class="btn btn-p" onclick="lumCargarRes()">🔄 Actualizar</button></div></div><div id="lr_res"><div class="spin"></div></div>';
  lumCargarRes();
}
function lumCargarRes(){
  var el=G('lr_res'); if(!el)return; el.innerHTML='<div class="spin"></div>';
  api('lumResumen',{anio:G('lr_anio').value},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card">Error</div>';return;}
    var d=r.data, h='<div class="sg"><div class="stat"><div class="sv">'+d.total+'</div><div class="sl">Total</div></div><div class="stat"><div class="sv" style="color:var(--g)">'+d.ok+'</div><div class="sl">OK</div></div><div class="stat"><div class="sv" style="color:var(--warn)">'+d.mod+'</div><div class="sl">MOD</div></div><div class="stat"><div class="sv" style="color:var(--danger)">'+d.noOk+'</div><div class="sl">NO OK</div></div><div class="stat"><div class="sv">'+d.validadas+'</div><div class="sl">Validadas</div></div><div class="stat"><div class="sv" style="color:var(--warn)">'+d.pendientes+'</div><div class="sl">Pendientes</div></div><div class="stat"><div class="sv" style="color:var(--danger)">'+d.cadenas_abiertas+'</div><div class="sl">Cadenas abiertas</div></div><div class="stat"><div class="sv">'+d.re_mediciones+'</div><div class="sl">Re-mediciones</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px"><div class="card"><div class="card-title">Por zona</div><table><thead><tr><th>Zona</th><th>Medidas</th></tr></thead><tbody>';
    Object.keys(d.porZona).sort().forEach(function(z){h+='<tr><td><b>'+z+'</b></td><td>'+d.porZona[z]+'</td></tr>';});
    h+='</tbody></table></div><div class="card"><div class="card-title">Por periodicidad</div><table><thead><tr><th>Tipo</th><th>Medidas</th></tr></thead><tbody>';
    Object.keys(d.porPeriodo).forEach(function(t){h+='<tr><td><b>'+t+'</b></td><td>'+d.porPeriodo[t]+'</td></tr>';});
    h+='</tbody></table></div></div>'; el.innerHTML=h;
  });
}
function lumRenderCfg(){
  var el=G('lum-cfg');if(!el)return; el.innerHTML='<div class="spin"></div>';
  api('lumGetConfig',{},function(r){
    if(!r||!r.ok){el.innerHTML='<div class="card">Error cargando config</div>';return;}
    var d=r.data, h='<div class="card"><div class="card-title">Configuración del Luminómetro</div><div class="fg"><label>Email destinatario (boletines PDF)</label><input type="email" id="lc_email" value="'+(d.email_luminometro||'')+'" placeholder="revisor@empresa.com"></div><div class="fg"><label>Lote hisopo actual</label><input type="text" id="lc_lote" value="'+(d.lote_hisopo_actual||'')+'" placeholder="Ej: L2024-01"></div><div class="fg"><label>Norma</label><input type="text" id="lc_norma" value="'+(d.norma||'PC46 v13')+'"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="fg"><label>Límite OK (URL menor que)</label><input type="number" id="lc_ok" value="'+(d.limite_ok||150)+'"></div><div class="fg"><label>Límite MOD (URL menor o igual que)</label><input type="number" id="lc_mod" value="'+(d.limite_mod||300)+'"></div></div><button class="btn btn-p" onclick="lumGuardarCfg()">Guardar configuración</button></div>';
    el.innerHTML=h;
  });
}
function lumGuardarCfg(){
  var p={email_luminometro:G('lc_email').value.trim(),lote_hisopo_actual:G('lc_lote').value.trim(),norma:G('lc_norma').value.trim(),limite_ok:Number(G('lc_ok').value),limite_mod:Number(G('lc_mod').value)};
  if(p.limite_ok>=p.limite_mod){toast('El límite OK debe ser menor que el límite MOD','warn');return;}
  api('lumSaveConfig',p,function(r){toast(r&&r.ok?'Configuración guardada':(r?r.msg:'Error'),r&&r.ok);});
}

// INICIALIZACIÓN DE LA APP
window.onload = function() {
    G('luu').focus();
}

// ----------------------------------------------------
// EXPANDIR / CONTRAER CHECKLIST (SUPERVISOR)
// ----------------------------------------------------
function toggleCard(elemento) {
  var card = elemento.classList.contains('card-check') ? elemento : elemento.closest('.card-check');
  if(card) {
    card.classList.toggle('is-expanded');
  }
}

// ============================================================
// VISTA: ASIGNACIÓN DE ZONAS (TODO EXPANDIDO Y EN CASCADA)
// ============================================================
function renderZonas(zonas) {
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">';
  h += '<div><h2 style="font-size:18px;font-weight:800">Asignación de Personal</h2><p style="font-size:12px;color:var(--tx3)">Zonas expandidas para asignación rápida</p></div>';
  // Asegúrate de que este botón llama a tu función real de guardar en base de datos
  h += '<button class="btn btn-p" onclick="guardarAsignacionesGlobal()" style="padding:10px 20px;font-weight:bold;box-shadow:0 4px 6px rgba(0,0,0,0.1)">💾 Guardar Cambios</button></div>';

  zonas.forEach(function(z, idx) {
    // 1. Asignamos un color distinto en bucle
    var grad = ZCOLORS[idx % ZCOLORS.length];
    var em = ZEMOJIS[idx % ZEMOJIS.length];

    // Comprobamos si TODA la zona está completada (registrada)
    var todasLasSubzonas = [];
    if (z.subzonasDirectas) todasLasSubzonas = todasLasSubzonas.concat(z.subzonasDirectas);
    if (z.intermedias) z.intermedias.forEach(si => { if (si.subzonas) todasLasSubzonas = todasLasSubzonas.concat(si.subzonas); });
    
    var estaCompletada = todasLasSubzonas.length > 0 && todasLasSubzonas.every(s => s.registrado === true);

    // CONTENEDOR PRINCIPAL DE LA ZONA
    h += '<div class="zcard" style="border:1px solid var(--bd); border-radius:8px; margin-bottom:16px; overflow:hidden; background:#fff">';
    
    // CABECERA DE LA ZONA
    h += '<div style="background:' + grad + '; padding:14px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap">';
    h += '  <span style="font-size:18px">' + em + '</span>';
    h += '  <strong style="color:white; flex:1; font-size:15px">' + z.zona + '</strong>';
    
    // Contenedor para el letrero de "NO TRABAJA" o "COMPLETADO" en la cabecera
    h += '  <div id="badge-cabecera-' + z.id + '">';
    if (estaCompletada) {
      h += '    <span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-right:8px">✅ COMPLETADA</span>';
    }
    h += '  </div>';

    // Botones maestros de la cabecera
    if (!estaCompletada) {
      h += '  <button class="btn btn-sm" style="background:white; color:var(--g); font-weight:800; font-size:11px; padding:4px 10px; border:none" onclick="cascadaAsignar(' + z.id + ', \'' + z.zona + '\')">👤 Asignar Todo</button>';
      h += '  <button class="btn btn-sm" style="background:#fee2e2; color:#991b1b; font-weight:800; font-size:11px; padding:4px 10px; border:none" onclick="cascadaNoTrabaja(' + z.id + ', \'' + z.zona + '\')">❌ No Trabaja</button>';
    }
    h += '</div>';

    // CUERPO DE LA ZONA (Siempre abierto, style block directo)
    h += '<div style="display:block; padding:10px">';

    // Zonas Intermedias
    var intermedias = z.intermedias || [];
    intermedias.forEach(function(si) {
      h += '<div style="background:var(--gl); border-left:4px solid var(--g); margin:6px 0; border-radius:var(--r); overflow:hidden">';
      h += '  <div style="padding:10px 14px; background:rgba(26,71,42,.08); display:flex; justify-content:space-between; align-items:center">';
      h += '    <span style="font-size:12px; font-weight:800; color:var(--g)">📁 ' + si.nombre + '</span>';
      // Nombre del personal actual
      var pAct = si.personal || 'Sin asignar';
      var colorP = pAct === 'NO' ? 'red' : 'var(--tx2)';
      h += '    <span class="asig-txt asig-zid-' + z.id + '" data-tipo="intermedia" data-id="' + si.id + '" style="font-size:12px; font-weight:bold; color:' + colorP + '">' + pAct + '</span>';
      h += '  </div>';

      // Subzonas dentro de la intermedia
      si.subzonas.forEach(function(s) {
        h += renderFilaAsignacion(s, z.id);
      });
      h += '</div>';
    });

    // Subzonas Directas
    var directas = z.subzonasDirectas || [];
    if (directas.length && intermedias.length) {
      h += '<div style="padding:10px 14px; font-size:11px; font-weight:800; color:var(--tx3); background:#f1f5f9; border-top:1px solid var(--bd); border-bottom:1px solid var(--bd)">OTRAS SUBZONAS</div>';
    }
    directas.forEach(function(s) {
      h += renderFilaAsignacion(s, z.id);
    });

    h += '</div></div>'; // Cierre del cuerpo y del zcard
  });

  pc(h);
}

// Renderiza cada fila de subzona para la vista de asignación
function renderFilaAsignacion(s, zid) {
  var pAct = s.personal || 'Sin asignar';
  var colorP = pAct === 'NO' ? 'red' : 'var(--tx2)';
  var icono = s.registrado ? '✅ ' : '🔸 ';
  var textColor = s.registrado ? '#166534' : 'var(--tx)';

  var row = '<div style="padding:10px 14px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#fff">';
  row += '<span style="font-size:13px; font-weight:600; color:' + textColor + '">' + icono + s.nombre + '</span>';
  
  if (s.registrado) {
    row += '<span style="font-size:11px; font-weight:bold; color:#166534; background:#dcfce7; padding:2px 6px; border-radius:4px">COMPLETADO</span>';
  } else {
    // Elemento que sufrirá la cascada (lleva la clase asig-zid-X)
    row += '<span class="asig-txt asig-zid-' + zid + '" data-tipo="subzona" data-id="' + s.id + '" style="font-size:12px; font-weight:bold; cursor:pointer; color:' + colorP + '" onclick="asignarIndividual(this)">' + pAct + '</span>';
  }
  
  row += '</div>';
  return row;
}

// ============================================================
// FUNCIONES DE CASCADA (LA MAGIA DE ASIGNAR DE GOLPE)
// ============================================================

// 1. Asignar nombre a toda la zona
function cascadaAsignar(zid, zonaNombre) {
  // Pedimos el nombre del trabajador (Puedes cambiar el prompt por tu modal si prefieres)
  var personal = prompt("Introduce el nombre del personal para TODA la zona: " + zonaNombre);
  if (personal === null) return; // Si cancela, no hacemos nada
  
  personal = personal.trim().toUpperCase() || 'Sin asignar';

  // Cambiamos el texto de todos los elementos que pertenezcan a esta zona
  document.querySelectorAll('.asig-zid-' + zid).forEach(function(el) {
    el.textContent = personal;
    el.style.color = personal === 'Sin asignar' ? 'var(--tx3)' : 'var(--g)';
  });

  // Quitamos el letrero de "NO TRABAJA" de la cabecera si lo hubiera
  var badgeCabecera = document.getElementById('badge-cabecera-' + zid);
  if (badgeCabecera) badgeCabecera.innerHTML = '';

  toast("✅ " + personal + " asignado a toda la zona. ¡Recuerda Guardar!");
}

// 2. Marcar "No Trabaja" en toda la zona
function cascadaNoTrabaja(zid, zonaNombre) {
  if (!confirm("¿Seguro que quieres marcar TODA la zona '" + zonaNombre + "' como NO TRABAJA?")) return;

  // Cambiamos todos los textos a "NO" y los ponemos rojos
  document.querySelectorAll('.asig-zid-' + zid).forEach(function(el) {
    el.textContent = 'NO';
    el.style.color = 'red';
  });

  // Ponemos el letrero en la cabecera de la zona
  var badgeCabecera = document.getElementById('badge-cabecera-' + zid);
  if (badgeCabecera) {
    badgeCabecera.innerHTML = '<span style="background:#fee2e2; color:#991b1b; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-right:8px">❌ NO TRABAJA</span>';
  }

  toast("❌ Zona marcada como NO TRABAJA. ¡Recuerda Guardar!");
}

// 3. Asignación Individual (por si tocan un texto suelto)
function asignarIndividual(elemento) {
  var personal = prompt("Asignar personal a esta tarea (Escribe 'NO' para marcar que no trabaja):", elemento.textContent);
  if (personal === null) return;
  
  personal = personal.trim().toUpperCase() || 'Sin asignar';
  elemento.textContent = personal;
  elemento.style.color = personal === 'NO' ? 'red' : (personal === 'Sin asignar' ? 'var(--tx3)' : 'var(--g)');
}

// ============================================================
// VISTA: TRABAJADOR (CHECKLIST Y BOTONES)
// ============================================================
function renderCheckWorker(zonas){
  var totalPendientes = 0;
  zonas.forEach(function(z){
    if(z.subzonasDirectas) z.subzonasDirectas.forEach(s => { if(s.registrado === false) totalPendientes++; });
    if(z.intermedias) z.intermedias.forEach(si => {
      if(si.subzonas) si.subzonas.forEach(s => { if(s.registrado === false) totalPendientes++; });
    });
  });

  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">';
  h+='<div><h2 style="font-size:18px;font-weight:800">Tareas de hoy</h2><p style="font-size:12px;color:var(--tx3)">Reporta el trabajo realizado</p></div>';
  
  if (totalPendientes === 0) {
    h+='<button id="btn-save-main" class="btn" disabled style="background:#dcfce7;color:#166534;border:none;font-weight:bold;opacity:1;box-shadow:none">✅ Todo Completado</button></div>';
  } else {
    h+='<button id="btn-save-main" class="btn btn-p" onclick="saveCheck()">💾 Guardar Todo</button></div>';
  }
  
  zonas.forEach(function(z,idx){
    var grad=ZCOLORS[idx%ZCOLORS.length];
    var todas = [];
    if(z.subzonasDirectas) todas = todas.concat(z.subzonasDirectas);
    z.intermedias.forEach(si => { todas = todas.concat(si.subzonas); });
    var hayPendientes = todas.some(s => s.registrado === false);

    // 🔥 AÑADIDO: data-zname="'+z.zona+'" para guardar el nombre limpio sin chinchetas
    h+='<div class="zcard" data-zname="'+z.zona+'"><div class="zhdr" style="background:'+grad+'">';
    h+='<strong style="flex:1;color:white;cursor:pointer" onclick="togZonaById('+z.id+')">📍 '+z.zona+'</strong>';
    
    if (!hayPendientes) {
      h+='<button class="btn btn-sm" disabled style="background:rgba(255,255,255,0.3);border:none;color:white">✅ Hecho</button>';
    } else {
      h+='<button id="btn-timer-'+z.id+'" class="btn btn-sm" style="background:white;color:var(--tx);font-weight:700" onclick="event.stopPropagation(); toggleTimer('+z.id+')">▶️ Iniciar</button>';
    }
    h+='<span class="zarr" id="za'+z.id+'" onclick="togZonaById('+z.id+')">▼</span></div>';
    
    h+='<div id="zb'+z.id+'" style="display:'+(hayPendientes?'block':'none')+'">';
    
    if(z.intermedias) z.intermedias.forEach(function(si){
      var intPendiente = si.subzonas.some(s => s.registrado === false);
      h+='<div class="int-container" style="background:var(--gl);border-left:4px solid var(--g);margin:6px 10px;border-radius:var(--r);overflow:hidden">';
      h+='<div style="padding:10px 14px;display:flex;align-items:center;gap:8px;background:rgba(26,71,42,.08)">';
      h+='<span style="font-size:12px;font-weight:800;color:var(--g);flex:1">📁 '+si.nombre+'</span>';
      if(intPendiente){
        h+='<button class="tb sg2" style="font-size:10px" onclick="marcarIntTipo(this, \'GRUESO\')">GRUESO</button>';
        h+='<button class="tb sl2" style="font-size:10px" onclick="marcarIntTipo(this, \'L+D\')">L+D</button>';
      }
      h+='</div>';
      
      if(intPendiente){
        h+='<div style="padding:10px 14px;background:#fff;display:flex;gap:15px">';
        h+='<label style="font-size:11px;font-weight:700">QUERAT: <input type="number" id="iquer_'+z.id+'_'+si.id+'" step="0.1" style="width:60px"></label>';
        h+='<label style="font-size:11px;font-weight:700">MAQUINA: <input type="number" id="ibarr_'+z.id+'_'+si.id+'" step="0.1" style="width:60px"></label>';
        h+='</div>';
      }
      si.subzonas.forEach(function(s){ h+=renderSzRow(s, z.id, si.id); });
      h+='</div>';
    });
    
    if(z.subzonasDirectas) z.subzonasDirectas.forEach(function(s){ h+=renderSzRow(s, z.id, ''); });
    
    h+='<div class="zfooter">';
    h+='<label style="font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:4px;display:block">Observaciones de la zona</label><textarea class="obs-ta" id="zo'+z.id+'" style="width:100%;margin-bottom:12px;padding:8px;border:1px solid var(--bd);border-radius:4px" placeholder="Observaciones generales..."></textarea>';
    h+='<div style="background:#fef2f2;padding:12px;border:1px solid #fca5a5;border-radius:6px">';
    h+='<label style="color:#991b1b;font-size:11px;font-weight:800;display:block;margin-bottom:4px">⚠️ Reportar Incidencia (Mantenimiento)</label>';
    h+='<textarea class="obs-ta" id="zinc'+z.id+'" style="width:100%;border-color:#fca5a5;border-radius:4px;padding:6px;margin-bottom:6px" placeholder="Describe la avería o incidencia..."></textarea>';
    h+='<select id="zgrav'+z.id+'" style="padding:6px;width:100%;border:1px solid #fca5a5;border-radius:4px;color:#991b1b"><option value="baja">Gravedad Baja</option><option value="media" selected>Gravedad Media</option><option value="alta">Gravedad Alta</option></select>';
    h+='</div></div></div></div>'; 
  });
  pc(h);
}

function renderSzRow(s, zid, iid){
  if(s.registrado) {
    return '<div class="szrow is-locked" style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;opacity:0.65;user-select:none">' +
           '<span style="font-size:14px;flex:1;text-decoration:line-through;color:var(--tx3)">' + s.nombre + '</span>' +
           '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">✓ ' + (s.tipo || 'COMPLETADO') + '</span>' +
           '<span style="font-size:16px" title="Ya reportado">🔒</span></div>';
  }

  var key = zid + '_' + s.id;
  var st = CL[key]||{}, t=st.tipo||s.tipo||'';
  
  // 🔥 AÑADIDO: data-szname para el nombre limpio
  return '<div class="szrow'+(t?' done':'')+'" data-szid="'+s.id+'" data-zid="'+zid+'" data-iid="'+iid+'" data-szname="'+s.nombre+'" style="padding:8px 10px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
    '<div class="sz-nm" style="flex:1;font-size:13px;font-weight:600;min-width:120px;color:var(--tx)">'+s.nombre+'</div>'+
    '<div class="sz-ctl" style="display:flex;gap:4px">' +
      '<button class="tb tb-g'+(t==='GRUESO'?' sg2':'')+'" onclick="setTipoSz(this, '+zid+', '+s.id+', \'GRUESO\')">GRUESO</button>'+
      '<button class="tb tb-l'+(t==='L+D'?' sl2':'')+'" onclick="setTipoSz(this, '+zid+', '+s.id+', \'L+D\')">L+D</button>'+
      '<button class="ib'+(st.obs?' has':'')+'" onclick="modalObs('+zid+', '+s.id+', \''+s.nombre+'\')" title="Añadir nota">💬</button>'+
      '<button class="ib'+(st.fotoBase64?' has':'')+'" onclick="modalFoto('+zid+', '+s.id+', \''+s.nombre+'\')" title="Añadir foto">📷</button>'+
    '</div></div>';
}

function saveCheck(){
  try {
    var entradas=[], filasGuardadas = [], btn = G('btn-save-main');
    document.querySelectorAll('.szrow:not(.is-locked)').forEach(function(row){
      var szId = row.getAttribute('data-szid'), zid = row.getAttribute('data-zid'), key = zid + '_' + szId, st = CL[key];
      if(!st || !st.tipo) return; 
      var iid = row.getAttribute('data-iid'), nm = row.getAttribute('data-szname'), zc = row.closest('.zcard'), zona = zc ? zc.getAttribute('data-zname') : '';
      var zObs = G('zo'+zid) ? G('zo'+zid).value : '';
      var duracionSegundos = (typeof ZONE_TIMERS !== 'undefined' && ZONE_TIMERS[zid]) ? Math.floor((Date.now() - ZONE_TIMERS[zid].start) / 1000) : 0;
      entradas.push({ szId: parseInt(szId), zonaId: String(zid||''), intId: String(iid||''), zonaNombre: String(zona||''), szNombre: String(nm||''), tipo: String(st.tipo||''), ok: true, comentario: String((st.obs||'')+(zObs?'\n[Zona: '+zObs+']':'')), duracionSeg: duracionSegundos, querat: '', barrido: '', fotoBase64: st.fotoBase64 ? String(st.fotoBase64) : null, fotoNombre: st.fotoNombre ? String(st.fotoNombre) : null, fotoTipo: st.fotoTipo ? String(st.fotoTipo) : null });
      filasGuardadas.push(row);
    });

    if(!entradas.length){ alert('⚠️ No has marcado ninguna tarea nueva para guardar.'); return; }

    var zt={};
    entradas.forEach(e => {
      if(!zt[e.zonaId]) zt[e.zonaId] = {name:e.zonaNombre, ints:new Set(), dir:false};
      if(e.intId && e.intId !== 'null' && e.intId !== '') zt[e.zonaId].ints.add(e.intId); else zt[e.zonaId].dir=true;
    });

    var faltan=[];
    Object.keys(zt).forEach(zid => {
      var z = zt[zid];
      z.ints.forEach(iid => {
        var qEl = G('iquer_'+zid+'_'+iid), bEl = G('ibarr_'+zid+'_'+iid);
        var q = qEl ? qEl.value.trim() : '', b = bEl ? bEl.value.trim() : '';
        if(q === '' || b === '') {
            faltan.push('Residuos en ' + z.name); 
        } else {
            // 🔥 CORRECCIÓN: Asignamos el peso de los residuos SOLO a la primera tarea de la carpeta
            var yaAsignado = false;
            entradas.forEach(e => { 
                if(e.intId === iid){ 
                    if(!yaAsignado) { e.querat=q; e.barrido=b; yaAsignado = true; }
                    else { e.querat=''; e.barrido=''; } // Las demás se quedan en blanco
                }
            });
        }
      });
      if(z.dir) {
          var yaAsignadoDir = false;
          entradas.forEach(e => { 
              if(e.zonaId === zid && (!e.intId || e.intId === '')){ 
                  if(!yaAsignadoDir) { e.querat='0'; e.barrido='0'; yaAsignadoDir = true; }
                  else { e.querat=''; e.barrido=''; }
              }
          });
      }
    });

    if(faltan.length){ alert('⚠️ Faltan datos:\n' + faltan.join('\n')); return; }
    if(btn){ btn.disabled = true; btn.textContent = '⏳ Guardando...'; btn.style.opacity = '0.6'; }
    
    var incs=[];
    document.querySelectorAll('[id^="zinc"]').forEach(function(ta){
      if(!ta.value.trim()) return;
      var zid = ta.id.replace('zinc',''), zc = ta.closest('.zcard'), gEl = G('zgrav'+zid);
      incs.push({ zona: String(zc ? zc.getAttribute('data-zname') : ''), descripcion: String(ta.value.trim()), gravedad: String(gEl ? gEl.value : 'media') });
    });

    api('guardarChecklist', {entradas: entradas, incidencias: incs}, function(r){
      if(r && r.ok) {
        toast('✅ Datos guardados con éxito.');
        CL={}; entradas.forEach(e => { if(typeof ZONE_TIMERS !== 'undefined') delete ZONE_TIMERS[e.zonaId]; });
        filasGuardadas.forEach(function(row){
          var nm = row.getAttribute('data-szname'), stTipo = row.querySelector('.tb.sg2, .tb.sl2'), tipoTexto = stTipo ? stTipo.textContent : 'COMPLETADO';
          row.classList.remove('done'); row.classList.add('is-locked');
          row.style.cssText = 'padding:10px 14px;background:#f8fafc;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;opacity:0.65;user-select:none;pointer-events:none;';
          row.innerHTML = '<span style="font-size:14px;flex:1;text-decoration:line-through;color:var(--tx3)">' + nm + '</span><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">✓ ' + tipoTexto + '</span><span style="font-size:16px" title="Ya reportado">🔒</span>';
        });
        var tareasRestantes = document.querySelectorAll('.szrow:not(.is-locked)').length;
        if (btn) {
          if (tareasRestantes > 0) { btn.disabled = false; btn.textContent = '💾 Guardar Todo'; btn.style.background = 'var(--g)'; btn.style.color = 'white'; btn.style.opacity = '1'; } 
          else { btn.disabled = true; btn.textContent = '✅ Todo Completado'; btn.style.background = '#dcfce7'; btn.style.color = '#166534'; btn.style.opacity = '1'; btn.style.boxShadow = 'none'; }
        }
        document.querySelectorAll('.zcard').forEach(function(zcard) {
           var tienePendientes = zcard.querySelectorAll('.szrow:not(.is-locked)').length > 0;
           if (!tienePendientes) { var btnIniciar = zcard.querySelector('button[id^="btn-timer-"]'); if (btnIniciar) { btnIniciar.disabled = true; btnIniciar.textContent = '✅ Hecho'; btnIniciar.style.cssText = 'background:rgba(255,255,255,0.3);color:white;border:none;cursor:not-allowed;font-size:11px;padding:4px 10px;'; } }
        });
      } else {
        if(btn){ btn.disabled = false; btn.textContent = '💾 Guardar Todo'; btn.style.opacity = '1'; }
        alert('❌ Error: ' + (r ? r.msg : 'Servidor no responde'));
      }
    });
  } catch(error) { alert("Error crítico: " + error.message); }
}


/*
// ============================================================
// MÓDULO DE ZONAS Y ASIGNACIONES (CARGA EN PARALELO ULTRA-RÁPIDA)
// ============================================================
var _zonasNT={};
var ZONAS_INT_NT={};
var CACHE_SUPER = {}; 
var _zonaIdActiva = null;
var _zonaNombreActiva = null;
var _asigTab='zona';

// ⚡ MOTOR DE CARGA EN PARALELO ⚡
function cargarDatosEnParalelo(callback) {
  var resultados = {};
  var completados = 0;
  var totalPeticiones = 5;

  function checkFin() {
    completados++;
    if (completados === totalPeticiones) callback(resultados);
  }

  // Lanzamos las 5 peticiones simultáneamente (Tardan 1 segundo en total)
  api('getChecklist', {}, function(r) { resultados.checklist = r; checkFin(); });
  api('getZonas', {}, function(r) { resultados.zonas = r; checkFin(); });
  api('getSubzonasInt', {}, function(r) { resultados.subInt = r; checkFin(); });
  api('getZonasNoTrabaja', {}, function(r) { resultados.zNT = r; checkFin(); });
  api('getZonasIntNoTrabaja', {}, function(r) { resultados.zIntNT = r; checkFin(); });
}

function initCacheSuper(res) {
  CACHE_SUPER.usuarios = (res.zonas && res.zonas.ok) ? res.zonas.data.usuarios : [];
  CACHE_SUPER.zonas = (res.zonas && res.zonas.ok) ? res.zonas.data.zonas : [];
  CACHE_SUPER.subzonasInt = (res.subInt && res.subInt.ok) ? res.subInt.data : [];
  
  _zonasNT = {};
  if(res.zNT && res.zNT.ok) res.zNT.data.forEach(function(z){ _zonasNT[String(z.zonaId)] = true; });
  
  ZONAS_INT_NT = {};
  if(res.zIntNT && res.zIntNT.ok) res.zIntNT.data.forEach(function(zi){ ZONAS_INT_NT[String(zi.subIntId)] = true; });

  window._ZONAS_COMPLETADAS_HOY = {};
  if(res.checklist && res.checklist.ok && res.checklist.data) {
    res.checklist.data.forEach(function(z){
      var recolectar = function(szList) {
        if(!szList) return;
        szList.forEach(function(sz){ if(sz.registrado) window._ZONAS_COMPLETADAS_HOY[String(sz.id||sz.ID)] = true; });
      };
      recolectar(z.subzonas);
      recolectar(z.subzonasDirectas);
      if(z.intermedias) z.intermedias.forEach(function(zi){ recolectar(zi.subzonas); });
    });
  }
}

function pgZonas(){
  var el = G('main');
  el.innerHTML = '<div class="spin"></div><p style="text-align:center;color:var(--tx3);margin-top:10px"> 🧹</p>';
  
  cargarDatosEnParalelo(function(res) {
    if (!res.zonas || !res.zonas.ok) { pc('<div class="card">Error de conexión al cargar las zonas.</div>'); return; }
    
    initCacheSuper(res);
    
    var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:8px"><h2 style="font-size:17px;font-weight:800">Zonas y Subzonas</h2><button class="btn btn-sm" onclick="expAll()">Expandir Todo</button><button class="btn btn-sm" onclick="colAll()">Colapsar Todo</button></div>';
    if(isA)h+='<button class="btn btn-p btn-sm" onclick="mNuevaZona()">+ Nueva zona</button>';
    h+='</div>';

    CACHE_SUPER.zonas.forEach(function(z, idx) {
      var zId = z.ID;
      var zName = z.ZONA;
      var safeZName = String(zName).replace(/'/g, "\\'");
      
      var szs = z.subzonas || [];
      var totalSz = szs.length;
      var asig = szs.filter(function(s){ return !!(s.PERSONAL_ASIGNADO && s.PERSONAL_ASIGNADO.trim()); }).length;
      var pct = totalSz > 0 ? Math.round(asig/totalSz*100) : 0;
      var esNT = !!_zonasNT[String(zId)];
      
      var personasAsig = [];
      var compCount = 0;
      szs.forEach(function(s) {
         if(window._ZONAS_COMPLETADAS_HOY[String(s.ID)]) {
            compCount++;
         } else if (s.PERSONAL_ASIGNADO && s.PERSONAL_ASIGNADO.trim()) {
            s.PERSONAL_ASIGNADO.split(',').forEach(function(p){
               var n = p.trim(); if(n && personasAsig.indexOf(n)<0) personasAsig.push(n);
            });
         }
      });
      var todasCompletadas = (totalSz > 0 && compCount === totalSz);
      var grad = ZCOLORS[idx % ZCOLORS.length], em = ZEMOJIS[idx % ZEMOJIS.length];

      h+='<div class="zcard"><div class="zhdr card-header-clickable" style="background:'+grad+(esNT?';opacity:.7':'')+';user-select:none;cursor:pointer" onclick="togZonaById('+zId+')">';
      h+='<span style="font-size:18px">'+em+'</span>';
      h+='<strong style="flex:1">'+zName+'</strong>';
      
      if(esNT) h+='<span class="badge-nt" style="background:rgba(14,165,233,.8);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px">📴 No trabaja hoy</span>';
      if(todasCompletadas) h+='<span class="badge-comp" style="background:rgba(74,222,128,.9);color:#064e3b;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;margin-right:6px">✅ COMPLETADO</span>';
      else if(personasAsig.length) h+='<span class="zbdg badge-asig" style="background:rgba(255,255,255,.15);margin-right:6px">👤 '+personasAsig.join(', ')+'</span>';
      h+='<span class="zbdg badge-tot" style="margin-right:8px">'+totalSz+' sub · '+pct+'% asig.</span>';
      
      if(isSup) {
        var esNT2 = !!_zonasNT[String(zId)];
        h+='<button class="btn btn-sm" style="background:'+(esNT2?'rgba(14,165,233,.6)':'rgba(255,200,0,.25)')+';color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();togZonaNoTrabaja('+zId+', \''+safeZName+'\', this)">'+(esNT2?'Reactivar':'No trabaja')+'</button>';
      }
      if(isA){
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSubzonaInt('+zId+', \''+safeZName+'\')">+ Zona int.</button>';
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSZ('+zId+', \''+safeZName+'\')">+ Sub</button>';
        h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();elimZona('+zId+', \''+safeZName+'\')">✕</button>';
      }
      h+='<span class="zarr" id="zac'+zId+'" style="margin-left:8px">▼</span></div>'; 
      h+='<div id="zbc'+zId+'" class="zbody" style="display:block; padding-bottom:1px"><div id="zint'+zId+'">';
      
      h += renderCuerpoZonaSync(zId, zName, szs);

      h+='</div></div></div>';
    });
    pc(h);
  });
}

function renderCuerpoZonaSync(zonaId, zonaNombre, subzonas) {
  var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
  var h = '';
  var ints = CACHE_SUPER.subzonasInt.filter(function(i){ return String(i.zonaId) === String(zonaId); });
  
  var mapInts = {}; 
  var intIds = {};
  subzonas.forEach(function(sz){
    var intId = sz.ID_SUBZONA_INT;
    if(intId) {
        if(!mapInts[String(intId)]) mapInts[String(intId)] = [];
        mapInts[String(intId)].push(sz);
        intIds[String(intId)] = true;
    }
  });

  ints.forEach(function(si){
     var siId = si.id;
     var siName = si.nombre || '';
     var safeIntName = String(siName).replace(/'/g, "\\'");
     var szs = mapInts[String(siId)] || [];
     var noTrabaja = !!ZONAS_INT_NT[String(siId)];

     h+='<div id="int-container-'+siId+'" style="background:'+(noTrabaja?'#FFF0F2':'#F0FFF8')+';border-left:4px solid '+(noTrabaja?'var(--danger)':'var(--g)')+';margin:8px 12px;border-radius:var(--r);overflow:hidden">';
     h+='<div id="int-hdr-'+siId+'" onclick="togSubInt('+siId+')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:'+(noTrabaja?'#FFE5EC':'var(--gl)')+';cursor:pointer;user-select:none">';
     h+='<strong style="font-size:13px;color:'+(noTrabaja?'var(--danger)':'var(--g)')+';flex:1">'+(noTrabaja?'❌ ':'📁 ')+siName+'</strong>';
     
     var todasCompletadas = szs.length > 0 && szs.every(function(s){ return window._ZONAS_COMPLETADAS_HOY[String(s.ID)]; });
     var pAsigInt = si.personalAsignado || (szs.length>0 ? szs[0].PERSONAL_ASIGNADO : '');

     if(todasCompletadas) {
        h+='<span style="font-size:11px;color:var(--g);font-weight:700;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px">✅ Completada</span>';
     } else if(pAsigInt) {
        h+='<span style="font-size:11px;color:'+(noTrabaja?'var(--danger)':'var(--g)')+';margin-right:8px">👤 '+pAsigInt.substring(0,25)+'</span>';
     }

     if(isSup){
       h+='<button class="btn btn-sm" style="background:'+(noTrabaja?'rgba(190,18,60,.15)':'rgba(255,200,0,.2)')+';color:'+(noTrabaja?'var(--danger)':'var(--tx)')+';border-color:'+(noTrabaja?'var(--danger)':'var(--bd)')+'" onclick="event.stopPropagation();togIntNoTrabaja('+siId+',\''+safeIntName+'\', this)">'+(noTrabaja?'Reactivar':'No trabaja')+'</button>';
       h+='<button class="btn btn-sm" onclick="event.stopPropagation();mAsignarPersonalInt('+siId+',\''+safeIntName+'\', '+zonaId+', \''+zonaNombre.replace(/'/g, "\\'")+'\')">Asignar</button>';
     }
     if(isA){
       h+='<button class="btn btn-sm" onclick="event.stopPropagation();mEditSubzonaInt('+siId+')">✏️</button>';
       h+='<button class="btn btn-sm" onclick="event.stopPropagation();mNuevaSZInt('+zonaId+','+siId+',\''+safeIntName+'\',\''+zonaNombre.replace(/'/g, "\\'")+'\')">+ Sub</button>';
       h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();elimSubzonaInt('+siId+')">✕</button>';
     }
     if(!noTrabaja) h+='<span id="ar-int-'+siId+'" style="font-size:10px;color:var(--tx3);margin-left:6px">▶</span>';
     h+='</div>';

     h+='<div id="sub-int-'+siId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     if(!noTrabaja){ szs.forEach(function(s){ h+=renderSubzonaRow(s,isA); }); } 
     else { h+='<div style="padding:10px 14px;font-size:12px;color:var(--danger);font-style:italic">Carpeta inactiva hoy</div>'; }
     h+='</div></div>';
  });

  var szDirectas = subzonas.filter(function(s){ return !intIds[String(s.ID_SUBZONA_INT)]; });
  if(szDirectas.length){
     h+='<div style="margin:8px 12px; border:1.5px solid var(--bd); border-radius:var(--r); overflow:hidden">';
     h+='<div onclick="togSubInt(\'dir\'+'+zonaId+')" style="padding:10px 14px; background:var(--sur2); cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none">';
     h+='<strong style="font-size:11px;color:var(--tx2);text-transform:uppercase;flex:1">Subzonas directas de la zona</strong>';
     var todasDirComp = szDirectas.every(function(s){ return window._ZONAS_COMPLETADAS_HOY[String(s.ID)]; });
     if(todasDirComp) h+='<span style="font-size:11px;color:var(--g);font-weight:700;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px">✅ Completadas</span>';
     h+='<span id="ar-int-dir'+zonaId+'" style="font-size:10px;color:var(--tx3)">▶</span></div>';
     h+='<div id="sub-int-dir'+zonaId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     szDirectas.forEach(function(s){ h+=renderSubzonaRow(s,isA); });
     h+='</div></div>';
  }
  
  if(!ints.length && !subzonas.length) { h+='<p style="padding:14px 16px;color:var(--tx3);font-style:italic">Sin subzonas en esta zona</p>'; }
  return h;
}

function renderSubzonaRow(s, isA){
  var szId = s.ID;
  var szNombre = s.SUBZONA;
  var completada = window._ZONAS_COMPLETADAS_HOY[String(szId)];
  var pAsig = s.PERSONAL_ASIGNADO || '';
  var hp2 = !!(pAsig && pAsig.trim());
  var bg = completada ? '#F0FFF8' : 'white';
  
  var h='<div style="display:flex;align-items:center;padding:9px 16px;border-bottom:1px solid var(--bd);gap:8px;background:'+bg+'"><span style="font-weight:600;font-size:12px;flex:1">'+szNombre+'</span>';
  if (completada) h+='<span style="font-size:11px;color:var(--g);font-weight:700">✅ Completado</span>';
  else h+='<span style="font-size:11px;color:'+(hp2?'var(--tx2)':'var(--warn)')+'">'+(hp2?'👤 '+pAsig:'Sin asignar')+'</span>';
  if(isA)h+='<button class="btn btn-sm btn-d" style="padding:2px 8px" onclick="elimSZ('+szId+')">✕</button>';
  h+='</div>'; return h;
}

function togZonaById(id){
  var body = document.getElementById('zbc'+id);
  var arr = document.getElementById('zac'+id);
  if(!body) return;
  if(body.style.display === 'none'){ body.style.display = 'block'; if(arr) arr.textContent = '▼'; } 
  else { body.style.display = 'none'; if(arr) arr.textContent = '▶'; }
}
function expAll(){document.querySelectorAll('.zbody').forEach(function(e){e.style.display='block';});document.querySelectorAll('[id^="zac"]').forEach(function(e){e.textContent='▼';});document.querySelectorAll('[id^="sub-int-"]').forEach(function(e){e.style.display='block';});document.querySelectorAll('[id^="ar-int-"]').forEach(function(e){e.textContent='▼';});}
function colAll(){document.querySelectorAll('.zbody').forEach(function(e){e.style.display='none';});document.querySelectorAll('[id^="zac"]').forEach(function(e){e.textContent='▶';});document.querySelectorAll('[id^="sub-int-"]').forEach(function(e){e.style.display='none';});document.querySelectorAll('[id^="ar-int-"]').forEach(function(e){e.textContent='▶';});}
function togSubInt(id){
  var body = document.getElementById('sub-int-'+id);
  var arrow = document.getElementById('ar-int-'+id);
  if(!body) return;
  var isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if(arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

// 🔥 RECARGA PARCIAL SILENCIOSA 🔥
function refrescarZonaParcialSilencioso(zonaId, zonaNombre) {
  var cont = document.getElementById('zint'+zonaId);
  if(cont) cont.innerHTML = '<div class="spin" style="margin:10px auto"></div>';
  
  // Pedimos solo los datos frescos y actualizamos ESA zona
  api('getZonas', {}, function(r) {
     if(r && r.ok) {
        CACHE_SUPER.zonas = r.data.zonas;
        var zonaActualizada = CACHE_SUPER.zonas.find(function(z){ return String(z.ID) === String(zonaId); });
        var szs = zonaActualizada ? zonaActualizada.subzonas : [];
        if(cont) cont.innerHTML = renderCuerpoZonaSync(zonaId, zonaNombre, szs);
     }
  });
}

function togZonaNoTrabaja(zonaId, zonaNombre, btn){
  var esNT = !!_zonasNT[String(zonaId)];
  var accion = esNT ? 'desmarcarZonaNoTrabaja' : 'marcarZonaNoTrabaja';
  if(!confirm(esNT ? '¿Reactivar esta zona para hoy?' : '¿Marcar esta zona como No trabaja hoy?')) return;
  var origTxt = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
  api(accion, {zonaId: zonaId, zonaNombre: zonaNombre, zona: zonaNombre}, function(r){
    btn.disabled = false; btn.textContent = origTxt;
    if(r && r.ok){ 
       toast(esNT ? 'Zona reactivada' : 'Marcada como No trabaja', true); 
       if(esNT) delete _zonasNT[String(zonaId)]; else _zonasNT[String(zonaId)] = true;
       pgZonas(); // Refresco general para marcar la cabecera visualmente
    } 
    else { toast(r ? r.msg : 'Error', false); }
  });
}

function togIntNoTrabaja(intId, nombre, btn){
  var esNT=!!ZONAS_INT_NT[String(intId)];
  var accion=esNT?'desmarcarZonaIntNoTrabaja':'marcarZonaIntNoTrabaja';
  if(!confirm(esNT?('¿Reactivar "'+nombre+'" para hoy?'):('¿Marcar "'+nombre+'" como No trabaja hoy?')))return;
  var origTxt = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
  api(accion,{subzonaIntId:intId},function(r){
    btn.disabled = false; btn.textContent = origTxt;
    if(r&&r.ok){ 
       toast(esNT?'Reactivada':'Marcada como No trabaja', true); 
       if(esNT) delete ZONAS_INT_NT[String(intId)]; else ZONAS_INT_NT[String(intId)] = true;
       pgZonas(); 
    } 
    else toast(r?r.msg:'Error', false);
  });
}

// MODALES Y EDICIONES
function mNuevaZona(){
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Nombre</label><input id="nz-n" placeholder="EJ: ALMACÉN"></div><div class="fg"><label>Color</label><select id="nz-c"><option value="#D4EBD9">Verde</option><option value="#DCF0FF">Azul</option><option value="#FEF3C7">Amarillo</option><option value="#FDECEA">Rojo</option><option value="#EDE9FE">Morado</option></select></div>';
  modal('Nueva zona',wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nz-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearZona',{nombre:n,color:G('nz-c').value},function(r){toast(r&&r.ok?'Zona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgZonas();}});},p:true}]);
}
function elimZona(id, zonaNombre){if(!confirm('¿Eliminar zona y todas sus subzonas?'))return;api('eliminarZona',{id:id, zonaId:id, zona:zonaNombre, zonaNombre:zonaNombre},function(r){toast(r&&r.ok?'Zona eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}
function mNuevaSZById(zonaId){mNuevaSZ(zonaId,'zona '+zonaId);}
function mNuevaSZ(zonaId,zonaNombre){
  var wrap=document.createElement('div');wrap.innerHTML='<div class="fg"><label>Nombre de la subzona</label><input id="nsz-n" placeholder="EJ: SUELOS"></div>';
  modal('Nueva subzona en '+zonaNombre,wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nsz-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearSubzona',{zonaId:zonaId,zonaNombre:zonaNombre,zona:zonaNombre,nombre:n},function(r){toast(r&&r.ok?'Subzona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();refrescarZonaParcialSilencioso(zonaId, zonaNombre);}});},p:true}]);
}
function elimSZ(id){if(!confirm('¿Eliminar esta subzona?'))return;api('eliminarSubzona',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}
function mNuevaSubzonaInt(zonaId,zonaNombre){
  var wrap=document.createElement('div'); wrap.innerHTML='<div class="fg"><label>Nombre de la zona intermedia</label><input id="nsi-n" placeholder="EJ: Z7.1 - Filetes"></div>';
  modal('Nueva zona intermedia en '+zonaNombre,wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nsi-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearSubzonaInt',{zonaId:zonaId,zonaNombre:zonaNombre,zona:zonaNombre,nombre:n},function(r){toast(r&&r.ok?'Zona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();refrescarZonaParcialSilencioso(zonaId, zonaNombre);}});},p:true}]);
}
function mEditSubzonaInt(id){
  var wrap=document.createElement('div'); wrap.innerHTML='<div class="fg"><label>Nuevo Nombre</label><input id="esi-n" placeholder="Escribe el nuevo nombre"></div>';
  modal('Editar zona intermedia',wrap,[{label:'Cancelar',fn:closeModal},{label:'Guardar',fn:function(){api('editarSubzonaInt',{id:id,nombre:G('esi-n').value.trim()},function(r){toast(r&&r.ok?'Actualizada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgZonas();}});},p:true}]);
}
function elimSubzonaInt(id){if(!confirm('¿Eliminar esta zona intermedia?'))return;api('eliminarSubzonaInt',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}

*/
// ============================================================
// MÓDULO DE ZONAS Y ASIGNACIONES (CARGA EN PARALELO ULTRA-RÁPIDA)
// ============================================================
var _zonasNT={};
var ZONAS_INT_NT={};
var CACHE_SUPER = {}; 
var _zonaIdActiva = null;
var _zonaNombreActiva = null;
var _asigTab='zona';

// ⚡ MOTOR DE CARGA EN PARALELO ⚡
// ⚡ MOTOR DE CARGA EN PARALELO (CON ANTICACHÉ) ⚡
function cargarDatosEnParalelo(callback) {
  var resultados = {};
  var completados = 0;
  var totalPeticiones = 5;
  var t = Date.now(); // 🔥 Número aleatorio para forzar datos frescos
  
  function checkFin() { completados++; if (completados === totalPeticiones) callback(resultados); }
  
  api('getChecklist', {t: t}, function(r) { resultados.checklist = r; checkFin(); });
  api('getZonas', {t: t}, function(r) { resultados.zonas = r; checkFin(); });
  api('getSubzonasInt', {t: t}, function(r) { resultados.subInt = r; checkFin(); });
  api('getZonasNoTrabaja', {t: t}, function(r) { resultados.zNT = r; checkFin(); });
  api('getZonasIntNoTrabaja', {t: t}, function(r) { resultados.zIntNT = r; checkFin(); });
}

function initCacheSuper(res) {
  CACHE_SUPER.usuarios = (res.zonas && res.zonas.ok) ? res.zonas.data.usuarios : [];
  CACHE_SUPER.zonas = (res.zonas && res.zonas.ok) ? res.zonas.data.zonas : [];
  CACHE_SUPER.subzonasInt = (res.subInt && res.subInt.ok) ? res.subInt.data : [];
  
  // 🔥 PARCHE: En lugar de borrar la memoria ( = {} ), mantenemos la que ya existe
  window._zonasNT = window._zonasNT || {}; 
  if(res.zNT && res.zNT.ok) {
    res.zNT.data.forEach(function(z){ 
      var id = z.ZONA_ID || z.ID_ZONA || z.ID || z.id || z.ZONAID;
      if(id) window._zonasNT[String(id)] = true; 
    });
  }
  
  window.ZONAS_INT_NT = window.ZONAS_INT_NT || {}; 
  if(res.zIntNT && res.zIntNT.ok) {
    res.zIntNT.data.forEach(function(zi){ 
      var id = zi.SUBZONA_INT_ID || zi.ID_SUBZONA_INT || zi.ID || zi.id || zi.SUBZONAINTID;
      if(id) window.ZONAS_INT_NT[String(id)] = true; 
    });
  }

  // (Sincronización de tareas completadas)
  window._ZONAS_COMPLETADAS_HOY = {};
  if(res.checklist && res.checklist.ok && res.checklist.data) {
    res.checklist.data.forEach(function(z){
      var recolectar = function(szList) {
        if(!szList) return;
        szList.forEach(function(sz){ 
          var idFinal = String(sz.id || sz.ID || sz.id_subzona || "").trim();
          if(sz.registrado && idFinal !== "") window._ZONAS_COMPLETADAS_HOY[idFinal] = true; 
        });
      };
      recolectar(z.subzonas);
      recolectar(z.subzonasDirectas);
      if(z.intermedias) z.intermedias.forEach(function(zi){ recolectar(zi.subzonas); });
    });
  }
}

function pgZonas(){
  var el = G('main');
  el.innerHTML = '<div class="spin"></div><p style="text-align:center;color:var(--tx3);margin-top:10px">Cargando...</p>';
  
  cargarDatosEnParalelo(function(res) {
    if (!res.zonas || !res.zonas.ok) { pc('<div class="card">Error de conexión.</div>'); return; }
    
    initCacheSuper(res);
    
    var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:8px"><h2 style="font-size:17px;font-weight:800">Zonas y Subzonas</h2><button class="btn btn-sm" onclick="expAll()">Expandir Todo</button><button class="btn btn-sm" onclick="colAll()">Colapsar Todo</button></div>';
    if(isA)h+='<button class="btn btn-p btn-sm" onclick="mNuevaZona()">+ Nueva zona</button>';
    h+='</div>';

    CACHE_SUPER.zonas.forEach(function(z, idx) {
      var zId = z.ID || z.id;
      var zName = z.ZONA || z.zona || "";
      var safeZName = String(zName).replace(/'/g, "\\'");
      
      var szActivas = (z.subzonas || []).filter(function(s) { return String(s.ACTIVA || '').toUpperCase() !== 'NO'; });
      var totalSz = szActivas.length;
      var esNT = !!window._zonasNT[String(zId)];
      
      var personasAsig = [];
      var compCount = 0;

      szActivas.forEach(function(s) {
         var sId = String(s.ID || s.id || s.id_subzona || "").trim();
         if(window._ZONAS_COMPLETADAS_HOY[sId]) compCount++;
         else if (s.PERSONAL_ASIGNADO && String(s.PERSONAL_ASIGNADO).trim()) {
            String(s.PERSONAL_ASIGNADO).split(',').forEach(function(p){
               var n = p.trim(); if(n && personasAsig.indexOf(n)<0) personasAsig.push(n);
            });
         }
      });

      var todasCompletadas = (totalSz > 0 && compCount === totalSz);
      var grad = ZCOLORS[idx % ZCOLORS.length], em = ZEMOJIS[idx % ZEMOJIS.length];

      h+='<div class="zcard"><div class="zhdr card-header-clickable" style="background:'+grad+(esNT?';opacity:.7':'')+';user-select:none;cursor:pointer" onclick="togZonaById('+zId+')">';
      h+='<span style="font-size:18px">'+em+'</span><strong style="flex:1">'+zName+'</strong>';
      
      if(esNT) h+='<span class="badge-nt" style="background:rgba(14,165,233,.8);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px">📴 No trabaja hoy</span>';
      
      if(todasCompletadas) {
         h+='<span class="badge-comp" style="background:rgba(74,222,128,.9);color:#064e3b;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;margin-right:6px;border:1px solid #22c55e">✅ COMPLETADO</span>';
      } else {
         if(personasAsig.length) h+='<span class="zbdg badge-asig" style="background:rgba(255,255,255,.15);margin-right:6px">👤 '+personasAsig.join(', ')+'</span>';
         h+='<span class="zbdg badge-tot" style="margin-right:8px">'+compCount+'/'+totalSz+' hechas</span>';
      }
      
      if(isSup) {
        h+='<button class="btn btn-sm" style="background:'+(esNT?'rgba(14,165,233,.6)':'rgba(255,200,0,.25)')+';color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();togZonaNoTrabaja('+zId+', \''+safeZName+'\', this)">'+(esNT?'Reactivar':'No trabaja')+'</button>';
      }
      if(isA){
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSubzonaInt('+zId+', \''+safeZName+'\')">+ Zona int.</button>';
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSZ('+zId+', \''+safeZName+'\')">+ Sub</button>';
        h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();elimZona('+zId+', \''+safeZName+'\')">✕</button>';
      }
      h+='<span class="zarr" id="zac'+zId+'" style="margin-left:8px">▼</span></div>'; 
      h+='<div id="zbc'+zId+'" class="zbody" style="display:block; padding-bottom:1px"><div id="zint'+zId+'">';
      
      h += renderCuerpoZonaSync(zId, zName, z.subzonas || []);

      h+='</div></div></div>';
    });
    pc(h);
  });
}

// ============================================================
// DIBUJADO DE CARPETAS Y SUBZONAS (OCULTA TRABAJADORES SI ESTÁ OFF)
// ============================================================
function renderCuerpoZonaSync(zonaId, zonaNombre, subzonas) {
  var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
  var h = '';
  var isZoneOff = !!window._zonasNT[String(zonaId)];
  
  var ints = CACHE_SUPER.subzonasInt.filter(function(i){ return String(i.zonaId||i.ID_ZONA) === String(zonaId); });
  var mapInts = {}; 
  subzonas.forEach(function(sz){
    var intId = sz.ID_SUBZONA_INT || sz.id_subzona_int;
    if(intId && String(intId)!=="0") {
        if(!mapInts[String(intId)]) mapInts[String(intId)] = [];
        mapInts[String(intId)].push(sz);
    }
  });

  ints.forEach(function(si){
     var siId = si.id || si.ID;
     var isIntOff = isZoneOff || !!window.ZONAS_INT_NT[String(siId)]; // 👈 CLAVE
     var szs = mapInts[String(siId)] || [];
     var szsActivas = szs.filter(function(s) { return String(s.ACTIVA || '').toUpperCase() !== 'NO'; });
     var todasCompletadas = szsActivas.length > 0 && szsActivas.every(function(s){ return window._ZONAS_COMPLETADAS_HOY[String(s.ID || s.id)]; });

     h+='<div id="int-container-'+siId+'" class="int-container" style="background:'+(isIntOff?'#f1f5f9':'#F0FFF8')+';border-left:4px solid '+(isIntOff?'#94a3b8':'var(--g)')+';margin:8px 12px;border-radius:var(--r);overflow:hidden">';
     h+='<div id="int-hdr-'+siId+'" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:'+(isIntOff?'#e2e8f0':'var(--gl)')+';user-select:none">';
     h+='<div style="flex:1;cursor:pointer;display:flex;align-items:center" onclick="togSubInt('+siId+')"><strong style="font-size:13px;color:'+(isIntOff?'var(--tx2)':'var(--g)')+'">'+(isIntOff?'❌ ':'📁 ')+(si.nombre||si.NOMBRE)+'</strong></div>';
     
     if(isIntOff) h+='<span style="font-size:10px;color:#ef4444;font-weight:800;background:#fee2e2;padding:2px 6px;border-radius:4px">📴 NO TRABAJA</span>';
     else if(todasCompletadas) h+='<span style="font-size:11px;color:var(--g);font-weight:800;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px;border:1px solid #86efac">✅ Terminada</span>';

     if(isSup){
       var isIntOnlyOff = !!window.ZONAS_INT_NT[String(siId)];
       if(!isZoneOff) h+='<button class="btn btn-sm" style="background:'+(isIntOnlyOff?'var(--danger)':'white')+';color:'+(isIntOnlyOff?'white':'var(--tx2)')+';border:1px solid var(--bd)" onclick="event.stopPropagation();togZonaIntNoTrabaja('+siId+', \''+(si.nombre||'').replace(/'/g, "\\'")+'\', this)">'+(isIntOnlyOff?'Reactivar':'No trabaja')+'</button>';
     }
     h+='<span id="ar-int-'+siId+'" style="font-size:10px;color:var(--tx3);margin-left:6px;cursor:pointer" onclick="togSubInt('+siId+')">'+(todasCompletadas||isIntOff?'':'▶')+'</span></div>';
     h+='<div id="sub-int-'+siId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     szs.forEach(function(s){ h+=renderSubzonaRowSimple(s, isIntOff); }); // Usa una función simple de dibujo
     h+='</div></div>';
  });
 
  ints.forEach(function(si){
     var siId = si.id || si.ID;
     var siName = si.nombre || si.NOMBRE || "";
     var szs = mapInts[String(siId)] || [];
     var isIntOff = isZoneOff || !!window.ZONAS_INT_NT[String(siId)];

     var todasCompletadas = szs.length > 0 && szs.every(function(s){ return window._ZONAS_COMPLETADAS_HOY[String(s.ID || s.id)]; });

     h+='<div id="int-container-'+siId+'" style="background:'+(isIntOff?'#f1f5f9':'#F0FFF8')+';border-left:4px solid '+(isIntOff?'#94a3b8':'var(--g)')+';margin:8px 12px;border-radius:var(--r);overflow:hidden">';
     h+='<div id="int-hdr-'+siId+'" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:'+(isIntOff?'#e2e8f0':'var(--gl)')+';user-select:none">';
     
     h+='<div style="flex:1;cursor:pointer;display:flex;align-items:center" onclick="togSubInt('+siId+')"><strong style="font-size:13px;color:'+(isIntOff?'var(--tx2)':'var(--g)')+'">'+(isIntOff?'❌ ':'📁 ')+siName+'</strong></div>';
     
     if(isIntOff) {
        h+='<span style="font-size:10px;color:#ef4444;font-weight:800;background:#fee2e2;padding:2px 6px;border-radius:4px">📴 NO TRABAJA</span>';
     } else if(todasCompletadas) {
        h+='<span style="font-size:11px;color:var(--g);font-weight:800;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px;border:1px solid #86efac">✅ Terminada</span>';
     }

     if(isSup){
       var isIntOnlyOff = !!window.ZONAS_INT_NT[String(siId)];
       if(!isZoneOff) { 
          // 🔥 BOTÓN EXCLUSIVO PARA DESACTIVAR CARPETAS INTERMEDIAS
          h+='<button class="btn btn-sm" style="background:'+(isIntOnlyOff?'var(--danger)':'white')+';color:'+(isIntOnlyOff?'white':'var(--tx2)')+';border:1px solid var(--bd)" onclick="event.stopPropagation();togZonaIntNoTrabaja('+siId+', \''+siName.replace(/'/g, "\\'")+'\', this)">'+(isIntOnlyOff?'Reactivar':'No trabaja')+'</button>';
       }
       if(!isIntOff && !todasCompletadas) {
          h+='<button class="btn btn-sm" style="margin-left:4px" onclick="event.stopPropagation();mAsignarPersonalInt('+siId+',\''+siName.replace(/'/g, "\\'")+'\', '+zonaId+', \''+zonaNombre.replace(/'/g, "\\'")+'\')">Asignar</button>';
       }
     }
     h+='<span id="ar-int-'+siId+'" style="font-size:10px;color:var(--tx3);margin-left:6px;cursor:pointer" onclick="togSubInt('+siId+')">'+(todasCompletadas||isIntOff?'':'▶')+'</span></div>';

     h+='<div id="sub-int-'+siId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     szs.forEach(function(s){ h+=rRow(s, isIntOff); });
     if(szs.length===0) h+='<div style="padding:10px;font-size:11px;color:var(--tx3);text-align:center">No hay tareas en esta carpeta</div>';
     h+='</div></div>';
  });

  // TAREAS SUELTAS DIRECTAS
  var szDirectas = subzonas.filter(function(s){ 
    var idInt = s.ID_SUBZONA_INT || s.id_subzona_int;
    return !idInt || idInt === "" || idInt === "0";
  });

  if(szDirectas.length){
     h+='<div style="margin:8px 12px; border:1.5px solid var(--bd); border-radius:var(--r); overflow:hidden">';
     h+='<div onclick="togSubInt(\'dir\'+'+zonaId+')" style="padding:10px 14px; background:'+(isZoneOff?'#e2e8f0':'var(--sur2)')+'; cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none">';
     h+='<strong style="font-size:11px;color:var(--tx2);text-transform:uppercase;flex:1">'+(isZoneOff?'❌ ':'')+'Tareas sueltas de la zona</strong>';
     h+='<span id="ar-int-dir'+zonaId+'" style="font-size:10px;color:var(--tx3)">▶</span></div>';
     h+='<div id="sub-int-dir'+zonaId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     szDirectas.forEach(function(s){ h+=rRow(s, isZoneOff); });
     h+='</div></div>';
  }
  return h;
}

function renderSubzonaRow(s, isA){
  var szId = s.ID;
  var szNombre = s.SUBZONA;
  var completada = window._ZONAS_COMPLETADAS_HOY[String(szId)];
  var pAsig = s.PERSONAL_ASIGNADO || '';
  var hp2 = !!(pAsig && pAsig.trim());
  var bg = completada ? '#F0FFF8' : 'white';
  
  var h='<div style="display:flex;align-items:center;padding:9px 16px;border-bottom:1px solid var(--bd);gap:8px;background:'+bg+'"><span style="font-weight:600;font-size:12px;flex:1">'+szNombre+'</span>';
  if (completada) h+='<span style="font-size:11px;color:var(--g);font-weight:700">✅ Completado</span>';
  else h+='<span style="font-size:11px;color:'+(hp2?'var(--tx2)':'var(--warn)')+'">'+(hp2?'👤 '+pAsig:'Sin asignar')+'</span>';
  if(isA)h+='<button class="btn btn-sm btn-d" style="padding:2px 8px" onclick="elimSZ('+szId+')">✕</button>';
  h+='</div>'; return h;
}

function togZonaById(id){
  var body = document.getElementById('zbc'+id);
  var arr = document.getElementById('zac'+id);
  if(!body) return;
  if(body.style.display === 'none'){ body.style.display = 'block'; if(arr) arr.textContent = '▼'; } 
  else { body.style.display = 'none'; if(arr) arr.textContent = '▶'; }
}
function expAll(){document.querySelectorAll('.zbody').forEach(function(e){e.style.display='block';});document.querySelectorAll('[id^="zac"]').forEach(function(e){e.textContent='▼';});document.querySelectorAll('[id^="sub-int-"]').forEach(function(e){e.style.display='block';});document.querySelectorAll('[id^="ar-int-"]').forEach(function(e){e.textContent='▼';});}
function colAll(){document.querySelectorAll('.zbody').forEach(function(e){e.style.display='none';});document.querySelectorAll('[id^="zac"]').forEach(function(e){e.textContent='▶';});document.querySelectorAll('[id^="sub-int-"]').forEach(function(e){e.style.display='none';});document.querySelectorAll('[id^="ar-int-"]').forEach(function(e){e.textContent='▶';});}
function togSubInt(id){
  var body = document.getElementById('sub-int-'+id);
  var arrow = document.getElementById('ar-int-'+id);
  if(!body) return;
  var isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if(arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

// 🔥 RECARGA PARCIAL SILENCIOSA 🔥
function refrescarZonaParcialSilencioso(zonaId, zonaNombre) {
  var cont = document.getElementById('zint'+zonaId);
  if(cont) cont.innerHTML = '<div class="spin" style="margin:10px auto"></div>';
  
  // Pedimos solo los datos frescos y actualizamos ESA zona
  api('getZonas', {}, function(r) {
     if(r && r.ok) {
        CACHE_SUPER.zonas = r.data.zonas;
        var zonaActualizada = CACHE_SUPER.zonas.find(function(z){ return String(z.ID) === String(zonaId); });
        var szs = zonaActualizada ? zonaActualizada.subzonas : [];
        if(cont) cont.innerHTML = renderCuerpoZonaSync(zonaId, zonaNombre, szs);
     }
  });
}

function togZonaNoTrabaja(zonaId, zonaNombre, btn){
  var esNT = !!_zonasNT[String(zonaId)];
  var accion = esNT ? 'desmarcarZonaNoTrabaja' : 'marcarZonaNoTrabaja';
  if(!confirm(esNT ? '¿Reactivar esta zona para hoy?' : '¿Marcar esta zona como No trabaja hoy?')) return;
  var origTxt = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
  api(accion, {zonaId: zonaId, zonaNombre: zonaNombre, zona: zonaNombre}, function(r){
    btn.disabled = false; btn.textContent = origTxt;
    if(r && r.ok){ 
       toast(esNT ? 'Zona reactivada' : 'Marcada como No trabaja', true); 
       if(esNT) delete _zonasNT[String(zonaId)]; else _zonasNT[String(zonaId)] = true;
       pgZonas(); // Refresco general para marcar la cabecera visualmente
    } 
    else { toast(r ? r.msg : 'Error', false); }
  });
}

function togIntNoTrabaja(intId, nombre, btn){
  var esNT=!!ZONAS_INT_NT[String(intId)];
  var accion=esNT?'desmarcarZonaIntNoTrabaja':'marcarZonaIntNoTrabaja';
  if(!confirm(esNT?('¿Reactivar "'+nombre+'" para hoy?'):('¿Marcar "'+nombre+'" como No trabaja hoy?')))return;
  var origTxt = btn.textContent; btn.textContent = '⏳...'; btn.disabled = true;
  api(accion,{subzonaIntId:intId},function(r){
    btn.disabled = false; btn.textContent = origTxt;
    if(r&&r.ok){ 
       toast(esNT?'Reactivada':'Marcada como No trabaja', true); 
       if(esNT) delete ZONAS_INT_NT[String(intId)]; else ZONAS_INT_NT[String(intId)] = true;
       pgZonas(); 
    } 
    else toast(r?r.msg:'Error', false);
  });
}

// MODALES Y EDICIONES
function mNuevaZona(){
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="fg"><label>Nombre</label><input id="nz-n" placeholder="EJ: ALMACÉN"></div><div class="fg"><label>Color</label><select id="nz-c"><option value="#D4EBD9">Verde</option><option value="#DCF0FF">Azul</option><option value="#FEF3C7">Amarillo</option><option value="#FDECEA">Rojo</option><option value="#EDE9FE">Morado</option></select></div>';
  modal('Nueva zona',wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nz-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearZona',{nombre:n,color:G('nz-c').value},function(r){toast(r&&r.ok?'Zona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgZonas();}});},p:true}]);
}
function elimZona(id, zonaNombre){if(!confirm('¿Eliminar zona y todas sus subzonas?'))return;api('eliminarZona',{id:id, zonaId:id, zona:zonaNombre, zonaNombre:zonaNombre},function(r){toast(r&&r.ok?'Zona eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}
function mNuevaSZById(zonaId){mNuevaSZ(zonaId,'zona '+zonaId);}
function mNuevaSZ(zonaId,zonaNombre){
  var wrap=document.createElement('div');wrap.innerHTML='<div class="fg"><label>Nombre de la subzona</label><input id="nsz-n" placeholder="EJ: SUELOS"></div>';
  modal('Nueva subzona en '+zonaNombre,wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nsz-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearSubzona',{zonaId:zonaId,zonaNombre:zonaNombre,zona:zonaNombre,nombre:n},function(r){toast(r&&r.ok?'Subzona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();refrescarZonaParcialSilencioso(zonaId, zonaNombre);}});},p:true}]);
}
function elimSZ(id){if(!confirm('¿Eliminar esta subzona?'))return;api('eliminarSubzona',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}
function mNuevaSubzonaInt(zonaId,zonaNombre){
  var wrap=document.createElement('div'); wrap.innerHTML='<div class="fg"><label>Nombre de la zona intermedia</label><input id="nsi-n" placeholder="EJ: Z7.1 - Filetes"></div>';
  modal('Nueva zona intermedia en '+zonaNombre,wrap,[{label:'Cancelar',fn:closeModal},{label:'Crear',fn:function(){var n=G('nsi-n').value.trim().toUpperCase();if(!n){toast('Escribe un nombre','warn');return;}api('crearSubzonaInt',{zonaId:zonaId,zonaNombre:zonaNombre,zona:zonaNombre,nombre:n},function(r){toast(r&&r.ok?'Zona creada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();refrescarZonaParcialSilencioso(zonaId, zonaNombre);}});},p:true}]);
}
function mEditSubzonaInt(id){
  var wrap=document.createElement('div'); wrap.innerHTML='<div class="fg"><label>Nuevo Nombre</label><input id="esi-n" placeholder="Escribe el nuevo nombre"></div>';
  modal('Editar zona intermedia',wrap,[{label:'Cancelar',fn:closeModal},{label:'Guardar',fn:function(){api('editarSubzonaInt',{id:id,nombre:G('esi-n').value.trim()},function(r){toast(r&&r.ok?'Actualizada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok){closeModal();pgZonas();}});},p:true}]);
}
function elimSubzonaInt(id){if(!confirm('¿Eliminar esta zona intermedia?'))return;api('eliminarSubzonaInt',{id:id},function(r){toast(r&&r.ok?'Eliminada':(r?r.msg:'Error'),r&&r.ok);if(r&&r.ok)pgZonas();});}


// ============================================================
// MÓDULO: ASIGNACIÓN RÁPIDA Y TABLÓN DE IMPRESIÓN 
// ============================================================
(function(){
  if(document.getElementById('css-impresion')) return;
  var style = document.createElement('style'); style.id = 'css-impresion';
  style.innerHTML = `@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; } .no-print, .no-print * { display: none !important; } .no-print-input { display: none !important; } .print-only-text { display: block !important; font-size: 14pt !important; color: #000 !important; font-weight: bold; } .print-header { display: block !important; } #tabla-asignaciones th { background: #e2e8f0 !important; color: #000 !important; border: 2px solid #64748b; font-size: 14pt; padding: 12px !important; } #tabla-asignaciones td { border: 1px solid #94a3b8; font-size: 13pt; padding: 10px 16px !important; } #tabla-asignaciones tr { page-break-inside: avoid; } .print-carpeta { font-size: 13pt !important; color: #000 !important; font-weight: bold !important; } .print-zona { background: #cbd5e1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}`;
  document.head.appendChild(style);
})();



// ============================================================
// PÁGINA ASIGNACIONES (VERSIÓN COMPLETA Y REPARADA)
// ============================================================
function pgAsignaciones() {
  var el = G('main'); el.innerHTML = '<div class="spin"></div><p style="text-align:center;color:var(--tx3);margin-top:10px">Cargando cuadrante en paralelo ⚡...</p>';
  cargarDatosEnParalelo(function(res) {
     if (!res.zonas || !res.zonas.ok) { pc('<div class="card">Error cargando zonas</div>'); return; }
     initCacheSuper(res); 
     var dl = '<datalist id="dl-plantilla">'; CACHE_SUPER.usuarios.forEach(function(u){ dl += '<option value="' + u.nombre + '">'; }); dl += '</datalist>';
     var h = dl + '<div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px"><div><h2 style="font-size:18px;font-weight:800">Asignación Rápida</h2><p style="font-size:12px;color:var(--tx3)">Asigna carpetas a una o varias personas. Listo para imprimir.</p></div><div style="display:flex;gap:8px"><button class="btn" onclick="window.print()"><span style="font-size:16px">🖨️</span> Imprimir Tablón</button><button class="btn btn-p" id="btn-save-asig-rapida" onclick="guardarAsignacionesRapidas()">💾 Guardar Todo</button></div></div><div class="card" id="print-area" style="padding:0; overflow:hidden; background:white">';
     var fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
     h += '<div class="print-header" style="display:none; padding:20px; text-align:center; border-bottom:3px solid #000; margin-bottom:15px"><h1 style="margin:0; font-size:26px; text-transform:uppercase; letter-spacing:1px">CUADRANTE L+D COLEFRUSE</h1><p style="margin:8px 0 0 0; font-size:16px; color:#333; text-transform:capitalize; font-weight:bold">' + fechaHoy + '</p></div><table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left" id="tabla-asignaciones"><thead><tr style="background:var(--g);color:white"><th style="padding:14px 16px; width:55%">ZONA / ÁREA</th><th style="padding:14px 16px; width:45%">PERSONAL ASIGNADO</th></tr></thead><tbody>';

     CACHE_SUPER.zonas.forEach(function(z){
        var zId = z.ID||z.id; var zName = z.ZONA||z.zona; var szs = z.subzonas || [];
        
        var isZoneOff = !!window._zonasNT[String(zId)];
        
        h += '<tr class="print-zona" style="background:'+(isZoneOff?'#cbd5e1':'#e2e8f0')+';border-bottom:2px solid var(--bd)"><td style="padding:12px 16px;font-weight:900;font-size:14px;text-transform:uppercase;color:#0f172a" colspan="2"><div style="display:flex;justify-content:space-between;align-items:center"><span>' + (isZoneOff?'📴 ':'📍 ') + zName + (isZoneOff?' <span style="color:#b91c1c;font-size:11px;margin-left:8px">(ZONA CERRADA)</span>':'') + '</span><button class="btn btn-sm no-print" style="background:'+(isZoneOff?'var(--danger)':'white')+';color:'+(isZoneOff?'white':'var(--tx2)')+';border:1px solid var(--bd)" onclick="togZonaNoTrabajaAsig('+zId+', \''+String(zName).replace(/'/g, "\\'")+'\', this)">'+(isZoneOff?'Reactivar Zona':'No Trabaja')+'</button></div></td></tr>';
        
        var mapInts = {}; var mapDir = [];
        szs.forEach(function(s){ var intId = s.ID_SUBZONA_INT||s.id_subzona_int; if(intId && String(intId)!=="0") { if(!mapInts[intId]) mapInts[intId] = []; mapInts[intId].push(s); } else { mapDir.push(s); } });
        var intsOfZone = CACHE_SUPER.subzonasInt.filter(function(i){ return String(i.zonaId||i.ID_ZONA) === String(zId); });
        
        intsOfZone.forEach(function(si){
           var siId = si.id||si.ID; var siName = si.nombre||si.NOMBRE || ''; var szg = mapInts[siId] || []; var szIds = szg.map(function(s){ return s.ID||s.id; }).filter(Boolean).join(',');
           
           var isIntOff = isZoneOff || !!window.ZONAS_INT_NT[String(siId)];
           var isIntOnlyOff = !!window.ZONAS_INT_NT[String(siId)];
           var pAsig = isIntOff ? '' : (si.personalAsignado || si.PERSONAL_ASIGNADO || (szg.length > 0 ? (szg[0].PERSONAL_ASIGNADO||szg[0].personal_asignado) : '')); 
           var inpId = 'fast-inp-int-' + siId;
           
           h += '<tr style="border-bottom:1px solid var(--bd)"><td class="print-carpeta" style="padding:12px 16px 12px 30px;font-weight:700;color:'+(isIntOff?'var(--tx3)':'var(--g)')+'"><div style="display:flex;justify-content:space-between;align-items:center"><span>' + (isIntOff?'❌ ':'📁 ') + siName + ' <span class="no-print" style="font-size:10px;color:var(--tx3);font-weight:normal">(' + szg.length + ' tareas)</span></span>';
           
           if(!isZoneOff) { 
               h += '<button class="btn btn-sm no-print" style="background:'+(isIntOnlyOff?'var(--danger)':'white')+';color:'+(isIntOnlyOff?'white':'var(--tx2)')+';border:1px solid var(--bd);padding:2px 8px;font-size:10px" onclick="togZonaIntNoTrabajaAsig('+siId+', \''+String(siName).replace(/'/g, "\\'")+'\', this)">'+(isIntOnlyOff?'Reactivar':'No Trabaja')+'</button>';
           }
           
           h += '</div></td><td style="padding:8px 16px"><div class="no-print-input" style="display:flex;gap:6px;align-items:center">';
           
           if(isIntOff) {
               h += '<input type="text" disabled value="📴 NO TRABAJA" style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:6px;background:#f1f5f9;color:#ef4444;font-weight:900;font-size:13px;text-align:center;">';
           } else {
               h += '<input type="text" id="' + inpId + '" class="fast-inp" data-type="int" data-intid="' + siId + '" data-zid="' + zId + '" data-zname="' + String(zName).replace(/"/g, '&quot;') + '" data-szids="' + szIds + '" data-original="' + String(pAsig||'').replace(/"/g, '&quot;') + '" list="dl-plantilla" value="' + (pAsig||'') + '" style="flex:1;padding:10px 12px;border:1.5px solid var(--bd);border-radius:6px;outline:none;font-weight:bold;font-size:13px;background:#f8fafc" placeholder="Escribe o selecciona..."><button class="btn" style="padding:8px 12px;font-size:14px" onclick="abrirModalMultiSelect(\'' + inpId + '\', \'' + String(siName).replace(/'/g, "\\'") + '\')" title="Asignar a varias personas">👥</button>';
           }
           h += '</div><span class="print-only-text" style="display:none">' + (isIntOff?'📴 NO TRABAJA':(pAsig||'—')) + '</span></td></tr>';
        });
        
        if(mapDir.length > 0){
           var szIdsDir = mapDir.map(function(s){ return s.ID||s.id; }).filter(Boolean).join(','); 
           var pAsigDir = isZoneOff ? '' : (mapDir[0].PERSONAL_ASIGNADO || mapDir[0].personal_asignado || ''); 
           var inpIdDir = 'fast-inp-dir-' + zId;
           
           h += '<tr style="border-bottom:1px solid var(--bd)"><td class="print-carpeta" style="padding:12px 16px 12px 30px;font-weight:700;color:'+(isZoneOff?'var(--tx3)':'var(--tx2)')+'">' + (isZoneOff?'❌ ':'📄 ') + 'TAREAS DIRECTAS <span class="no-print" style="font-size:10px;color:var(--tx3);font-weight:normal">(' + mapDir.length + ' tareas)</span></td><td style="padding:8px 16px"><div class="no-print-input" style="display:flex;gap:6px;align-items:center">';
           
           if(isZoneOff) {
               h += '<input type="text" disabled value="📴 NO TRABAJA" style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:6px;background:#f1f5f9;color:#ef4444;font-weight:900;font-size:13px;text-align:center;">';
           } else {
               h += '<input type="text" id="' + inpIdDir + '" class="fast-inp" data-type="dir" data-szids="' + szIdsDir + '" data-zid="' + zId + '" data-zname="' + String(zName).replace(/"/g, '&quot;') + '" data-original="' + String(pAsigDir||'').replace(/"/g, '&quot;') + '" list="dl-plantilla" value="' + (pAsigDir||'') + '" style="flex:1;padding:10px 12px;border:1.5px solid var(--bd);border-radius:6px;outline:none;font-weight:bold;font-size:13px;background:#f8fafc" placeholder="Escribe o selecciona..."><button class="btn" style="padding:8px 12px;font-size:14px" onclick="abrirModalMultiSelect(\'' + inpIdDir + '\', \'Tareas Directas (' + String(zName).replace(/'/g, "\\'") + ')\')" title="Asignar a varias personas">👥</button>';
           }
           h += '</div><span class="print-only-text" style="display:none">' + (isZoneOff?'📴 NO TRABAJA':(pAsigDir||'—')) + '</span></td></tr>';
        }
     });

     h += '</tbody></table></div>'; pc(h);
     document.querySelectorAll('.fast-inp').forEach(function(inp){ inp.addEventListener('input', function(){ var txt = this.parentElement.nextElementSibling; if(txt && txt.classList.contains('print-only-text')) txt.textContent = this.value.trim().toUpperCase() || '—'; }); });
  });
}

function abrirModalMultiSelect(inputId, areaNombre) {
   var inp = G(inputId); if(!inp) return;
   var wrap = document.createElement('div');
   wrap.appendChild(mkPersonalListRapida('pl-rapida', CACHE_SUPER.usuarios, inp.value));
   modal('Asignar personal a: ' + areaNombre, wrap, [{label: 'Cancelar', fn: closeModal}, {label: 'Aceptar', fn: function(){
        var pl = G('pl-rapida'), sel = [];
        if(pl) pl.querySelectorAll('input:checked').forEach(function(cb){ sel.push(cb.value); });
        inp.value = sel.join(', '); inp.dispatchEvent(new Event('input')); closeModal();
     }, p: true}]);
}

function mkPersonalListRapida(listId, usuarios, current){
  var cur = current.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var wrap = document.createElement('div');
  var btns = document.createElement('div'); btns.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
  var lbl = document.createElement('span'); lbl.style.cssText='font-size:12px;color:var(--tx2);font-weight:600'; lbl.textContent=usuarios.length+' personas disponibles';
  var bw = document.createElement('div'); bw.style.cssText='display:flex;gap:4px';
  var bA = document.createElement('button'); bA.className='btn btn-sm'; bA.textContent='Todos';
  var bN = document.createElement('button'); bN.className='btn btn-sm'; bN.textContent='Ninguno';
  bA.onclick=function(){var l=G(listId);if(l)l.querySelectorAll('input').forEach(function(c){c.checked=true;});};
  bN.onclick=function(){var l=G(listId);if(l)l.querySelectorAll('input').forEach(function(c){c.checked=false;});};
  bw.appendChild(bA); bw.appendChild(bN); btns.appendChild(lbl); btns.appendChild(bw); wrap.appendChild(btns);
  var list = document.createElement('div'); list.id=listId; list.className='plist';
  if(!usuarios.length){var emp=document.createElement('p');emp.style.cssText='color:var(--tx3);font-size:13px;padding:10px;text-align:center';emp.textContent='Sin usuarios disponibles';list.appendChild(emp);}
  usuarios.forEach(function(u){
    var lbl2=document.createElement('label');lbl2.className='pitem';
    var chk=document.createElement('input');chk.type='checkbox';chk.value=u.nombre;chk.checked=cur.indexOf(u.nombre)>=0;
    var av=document.createElement('div');av.className='pav';av.style.background=u.color||'#1A472A';av.textContent=(u.iniciales||u.nombre.slice(0,2)).toUpperCase();
    var info=document.createElement('div');
    var nm=document.createElement('div');nm.style.cssText='font-size:13px;font-weight:600';nm.textContent=u.nombre;
    var rl=document.createElement('div');rl.style.cssText='font-size:11px;color:var(--tx3)';rl.textContent=u.rol;
    info.appendChild(nm);info.appendChild(rl);lbl2.appendChild(chk);lbl2.appendChild(av);lbl2.appendChild(info);list.appendChild(lbl2);
  });
  wrap.appendChild(list); return wrap;
}

function guardarAsignacionesRapidas() {
  var inputs = document.querySelectorAll('.fast-inp');
  var asignacionesSub = [];
  var asignacionesInt = [];
  var inputsModificados = []; 

  inputs.forEach(function(inp) {
     var p = inp.value.trim().toUpperCase();
     var original = (inp.getAttribute('data-original') || '').trim().toUpperCase();
     var tipo = inp.getAttribute('data-type');

     if (p !== original) {
         inputsModificados.push(inp);

         if(tipo === 'int') {
             var intId = inp.getAttribute('data-intid');
             // Solo enviamos la carpeta. El servidor ya se encarga de buscar a sus hijas.
             if(intId) asignacionesInt.push({ intId: intId, personal: p });
         } else if (tipo === 'dir') {
             var szIds = inp.getAttribute('data-szids');
             if(szIds) {
                 szIds.split(',').filter(Boolean).forEach(function(id){ 
                    asignacionesSub.push({ szId: id, personal: p }); 
                 });
             }
         }
     }
  });

  if(asignacionesSub.length === 0 && asignacionesInt.length === 0) { 
     toast('No se han detectado cambios.', 'warn'); return; 
  }

  var btn = G('btn-save-asig-rapida');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

  api('asignarPersonalSuperBatch', { 
     asignacionesSub: asignacionesSub, 
     asignacionesInt: asignacionesInt 
  }, function(r) {
     if(btn){ btn.disabled = false; btn.textContent = '💾 Guardar Todo'; }
     
     if (r && r.ok) {
         toast('✅ ' + r.msg, true);
         
         // 🔥 MAGIA VISUAL: Recargamos la pestaña entera para leer los datos reales de Sheets
         setTimeout(pgAsignaciones, 800);
         
     } else {
         var errorMsg = r ? r.msg : 'Servidor desconectado';
         toast(errorMsg, false);
         alert('Detalle del error: ' + errorMsg);
     }
  });
}

function mAsignarPersonalInt(id,nombre,zonaIdActiva,zonaNombreActiva){
  var wrap=document.createElement('div');
  wrap.appendChild(mkPersonalListRapida('plInt'+id, CACHE_SUPER.usuarios,''));
  modal('Asignar personal a — '+nombre,wrap,[
    {label:'Cancelar',fn:closeModal},
    {label:'Guardar',fn:function(){
      var plInt=G('plInt'+id);if(!plInt){toast('Error',false);return;}
      var sel=[];plInt.querySelectorAll('input:checked').forEach(function(cb){sel.push(cb.value);});
      var personal=sel.join(', ');
      closeModal(); toast('⏳ Asignando...');
      api('asignarPersonalInt',{ id: id, subzonaIntId: id, personal: personal, zonaId: zonaIdActiva, zonaNombre: zonaNombreActiva, zona: zonaNombreActiva },function(res){
        toast(res&&res.ok?'✅ Personal asignado':(res?res.msg:'Error'),res&&res.ok);
        if(res&&res.ok) refrescarZonaParcialSilencioso(zonaIdActiva, zonaNombreActiva);
      });
    },p:true}
  ]);
}
// ============================================================
// FIN DE MÓDULOS DE ZONAS Y ASIGNACIONES
// ============================================================

// ============================================================
// REPARACIÓN: NUEVA PERIODICIDAD (FORMULARIO CON JERARQUÍA)
// ============================================================
function mNuevaPeri() {
  api('getJerarquia', {}, function(r) {
    if(!r || !r.ok) { toast('Error cargando zonas', false); return; }
    window._cacheJerarquia = r.data; // Guardamos la estructura en memoria

    var h = '<div class="fg"><label>Nombre de la Tarea/Periodicidad *</label><input id="np-nom" placeholder="Ej: Limpieza profunda de techo"></div>';
    
    h += '<div class="fg"><label>Tipo de Limpieza</label><select id="np-tipo"><option value="GRUESO">GRUESO</option><option value="L+D">L+D</option></select></div>';
    
    h += '<div class="fg"><label>Frecuencia *</label><select id="np-freq"><option value="diaria">Diaria</option><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></div>';
    
    h += '<div class="fg"><label>Próxima Fecha *</label><input type="date" id="np-fec" value="'+today()+'"></div>';
    
    // Desplegable 1: Zonas
    h += '<div class="fg"><label>Zona *</label><select id="np-z" onchange="updZINuevaPeri()"><option value="">Selecciona Zona...</option>';
    r.data.zonas.forEach(function(z){ 
        var zId = z.id || z.ID;
        var zNom = z.nombre || z.zona || z.ZONA || z.NOMBRE;
        h += '<option value="'+zId+'">📍 '+zNom+'</option>'; 
    });
    h += '</select></div>';

    // Desplegable 2: Zonas Intermedias
    h += '<div class="fg"><label>Zona Intermedia (Opcional)</label><select id="np-zi" onchange="updSZNuevaPeri()" disabled><option value="">Primero selecciona Zona</option></select></div>';
    
    // Desplegable 3: Subzonas
    h += '<div class="fg"><label>Tarea Directa (Opcional)</label><select id="np-sz" disabled><option value="">Primero selecciona Z. Intermedia</option></select></div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = h;

    modal('Nueva Periodicidad', wrap, [
      {label: 'Cancelar', fn: closeModal},
      {label: 'Crear', fn: function(){
        var nom = G('np-nom').value.trim();
        var freq = G('np-freq').value;
        var fec = G('np-fec').value;
        var zId = G('np-z').value;
        var tipo = G('np-tipo').value;
        
        if(!nom || !freq || !fec || !zId) { toast('Rellena los campos obligatorios (*)', 'warn'); return; }

        var selZ = G('np-z'); var zNom = selZ.options[selZ.selectedIndex].text.replace('📍 ', '');
        var selZI = G('np-zi'); var ziId = selZI.value; var ziNom = ziId ? selZI.options[selZI.selectedIndex].text.replace('📁 ', '') : '';
        var selSZ = G('np-sz'); var szId = selSZ.value; var szNom = szId ? selSZ.options[selSZ.selectedIndex].text.replace('📄 ', '') : '';

        var payload = {
          nombre: nom, tipo: tipo, frecuencia: freq, proximaFecha: fec,
          zonaId: zId, zonaNombre: zNom, subzonaIntId: ziId, subzonaIntNombre: ziNom, subzonaId: szId, subzonaNombre: szNom
        };

        closeModal(); toast('⏳ Creando...', true);
        api('crearPeriodicidad', payload, function(res){
          if(res && res.ok) {
            toast('✅ Periodicidad creada', true);
            if(typeof pgPeri === 'function') pgPeri(); // Recargar la tabla automáticamente
          } else { toast(res ? res.msg : 'Error al crear', false); }
        });
      }, p: true}
    ]);
  });
}

// Alias por si el botón HTML original lo llama con un nombre distinto
function mNuevaPeriodicidad() { mNuevaPeri(); }

// Funciones para encadenar los desplegables
function updZINuevaPeri() {
  var zId = G('np-z').value, selZI = G('np-zi'), selSZ = G('np-sz');
  selSZ.disabled = true; selSZ.innerHTML = '<option value="">Primero selecciona Z. Intermedia</option>';
  
  if(!zId) { selZI.disabled = true; selZI.innerHTML = '<option value="">Primero selecciona Zona</option>'; return; }
  selZI.disabled = false;
  
  var opts = '<option value="">Ninguna / Toda la zona</option>';
  window._cacheJerarquia.subzonasInt.filter(function(zi){ return String(zi.id_zona || zi.ID_ZONA) === String(zId); }).forEach(function(zi){
    opts += '<option value="'+(zi.id||zi.ID)+'">📁 '+(zi.nombre||zi.subzona_int||zi.NOMBRE||zi.SUBZONA_INT)+'</option>';
  });
  selZI.innerHTML = opts;
  
  updSZNuevaPeri(); 
}

function updSZNuevaPeri() {
  var zId = G('np-z').value, ziId = G('np-zi').value, selSZ = G('np-sz');
  if(!zId) { selSZ.disabled = true; selSZ.innerHTML = '<option value="">Primero selecciona Z. Intermedia</option>'; return; }
  
  selSZ.disabled = false;
  var opts = '<option value="">Ninguna / Toda la carpeta</option>';
  
  var filtradas = window._cacheJerarquia.subzonas.filter(function(sz){
    if(ziId) return String(sz.id_subzona_int || sz.ID_SUBZONA_INT) === String(ziId);
    else return String(sz.id_zona || sz.ID_ZONA) === String(zId) && (!sz.id_subzona_int && !sz.ID_SUBZONA_INT);
  });
  
  filtradas.forEach(function(sz){
    opts += '<option value="'+(sz.id||sz.ID)+'">📄 '+(sz.nombre||sz.subzona||sz.NOMBRE||sz.SUBZONA)+'</option>';
  });
  selSZ.innerHTML = opts;
}

// ============================================================
// CHECKLIST SUPERVISOR (VALIDACIONES CORREGIDAS)
// ============================================================

function toggleCard(headerEl) {
    var card = headerEl.parentElement;
    if (card.classList.contains('is-expanded')) {
        card.classList.remove('is-expanded');
    } else {
        card.classList.add('is-expanded');
    }
}

function renderCheckSup(zonas) {
  // 🔥 CORRECCIÓN: Inicializamos la memoria de validadas para que no dé error
  window.ZONAS_RECIEN_VALIDADAS = window.ZONAS_RECIEN_VALIDADAS || {};

  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px"><div><h2 style="font-size:17px;font-weight:800">Validación del día</h2><p style="font-size:12px;color:var(--tx3)">' + new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p></div><button id="btn-val-todo" class="btn btn-p" style="background:var(--g); border:none; padding:10px 20px; font-weight:800" onclick="validarTodoCheck()">✅ Validar Todo</button></div>';
  var hayRegistros = false;

  zonas.forEach(function (z, idx) {
    var realizadas = [];
    if (z.subzonasDirectas) z.subzonasDirectas.forEach(function(s) { if (s.registrado) realizadas.push(s); });
    if (z.intermedias) z.intermedias.forEach(function(si) { if (si.subzonas) si.subzonas.forEach(function(s) { var sConInt = Object.assign({}, s); sConInt.nombre = '📁 ' + si.nombre + ' - ' + s.nombre; if (s.registrado) realizadas.push(sConInt); }); });

    if (!realizadas.length) return;
    hayRegistros = true;

    var grad = ZCOLORS[idx % ZCOLORS.length];
    var yaValidadaEnServer = realizadas.some(function(s) { return !!s.validadoPor; });
    var yaValidadaLocal = !!window.ZONAS_RECIEN_VALIDADAS[z.zona];
    var yaValidada = yaValidadaEnServer || yaValidadaLocal;
    
    var validadorNombre = yaValidadaEnServer ? (realizadas.find(function(s) { return !!s.validadoPor; }) || {}).validadoPor : (yaValidadaLocal ? '(Procesando...)' : '');
    var bg = yaValidada ? '#f0fff8' : 'var(--sur)';
    var bord = yaValidada ? '#86efac' : 'var(--bd)';

    h += '<div class="card-check ' + (yaValidada ? '' : 'is-expanded') + '" id="card-sup-' + idx + '" data-zona-nombre="'+z.zona.replace(/"/g, '&quot;')+'" style="border:2px solid ' + bord + '; background:' + bg + '"><div class="card-header-clickable" ondblclick="toggleCard(this)" style="background:' + grad + '; padding:14px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; cursor:pointer" title="Doble clic para ver detalles"><strong style="color:white; font-size:14px; flex:1">' + z.zona + '</strong><span style="background:rgba(255,255,255,.25); color:white; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700">' + realizadas.length + ' tareas hechas</span>';
    
    if (yaValidada) h += '<button class="btn btn-sm btn-status-val" disabled style="background:#dcfce7; color:#166534; font-weight:800; border:none; opacity:1; cursor:not-allowed">✅ Validada' + (validadorNombre ? ': ' + validadorNombre : '') + '</button>';
    else h += '<div style="display:flex;gap:6px" class="btn-container"><button class="btn btn-sm btn-rechazar" style="background:#fee2e2; color:#991b1b; font-weight:800; border:none" onclick="event.stopPropagation(); procesarZonaCheck(\'' + z.zona.replace(/'/g, "\\'") + '\', this, \'rechazar\')">❌ Rechazar</button><button class="btn btn-sm btn-validar" style="background:white; color:var(--g); font-weight:800; border:none" onclick="event.stopPropagation(); procesarZonaCheck(\'' + z.zona.replace(/'/g, "\\'") + '\', this, \'validar\')">✅ Validar</button></div>';
    
    h += '</div><div class="tw"><table style="font-size:13px; width:100%; border-collapse:collapse;"><thead><tr style="background:rgba(0,0,0,0.02)"><th style="padding:10px; text-align:left; border-bottom:1px solid var(--bd)">Subzona</th><th style="padding:10px; text-align:left; border-bottom:1px solid var(--bd)">Personal</th><th style="padding:10px; text-align:center; border-bottom:1px solid var(--bd)">Tipo</th><th style="padding:10px; text-align:center; border-bottom:1px solid var(--bd)">Hora</th><th style="padding:10px; text-align:center; border-bottom:1px solid var(--bd)">OK</th><th style="padding:10px; text-align:left; border-bottom:1px solid var(--bd)">Observaciones</th></tr></thead><tbody>';
    realizadas.forEach(function (s) {
      var tipoDisplay = s.tipo ? '<span class="' + (s.tipo === 'GRUESO' ? 'tg' : 'tl') + '">' + s.tipo + '</span>' : '—';
      var okDisplay = (s.ok === 'SÍ' || s.ok === true) ? '<span class="bg-g">OK</span>' : '<span class="bg-gr">—</span>';
      h += '<tr style="border-bottom:1px solid var(--bd)"><td style="padding:10px; font-weight:700">' + s.nombre + '</td><td style="padding:10px; color:var(--tx2); font-size:12px">' + (s.personal_real || s.personal || '—') + '</td><td style="padding:10px; text-align:center">' + tipoDisplay + '</td><td style="padding:10px; text-align:center; color:var(--tx3); font-size:12px; font-family:monospace">' + (s.hora || '—') + '</td><td style="padding:10px; text-align:center">' + okDisplay + '</td><td style="padding:10px; font-size:12px; color:var(--tx2); max-width:200px">' + (s.comentario || '—') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
  });
  if (!hayRegistros) h += '<div class="card" style="text-align:center; padding:40px; color:var(--tx3)">Aún no hay tareas para validar.</div>';
  pc(h);
}

async function validarTodoCheck() {
  window.ZONAS_RECIEN_VALIDADAS = window.ZONAS_RECIEN_VALIDADAS || {};
  var btnTodo = document.getElementById('btn-val-todo');
  
  // Seleccionamos solo los botones de "Validar" de las zonas pendientes
  var containers = document.querySelectorAll('.btn-validar');
  if (containers.length === 0) { alert("No hay zonas pendientes de validar."); return; }
  
  if (!confirm("¿Deseas validar todas las zonas pendientes (" + containers.length + ") de golpe?")) return;
  
  btnTodo.disabled = true; btnTodo.textContent = "⌛ Procesando todo...";
  
  // Procesamos todas en paralelo para mayor rapidez
  var validacionesPromises = [];
  for (var btn of containers) {
    var card = btn.closest('.card-check');
    var zonaNombre = card.getAttribute('data-zona-nombre');
    window.ZONAS_RECIEN_VALIDADAS[zonaNombre] = true;
    validacionesPromises.push(new Promise(resolve => { 
        api('validarZona', {zona: zonaNombre}, function() { resolve(); }); 
    }));
  }
  
  await Promise.all(validacionesPromises);
  toast("✅ Todas las zonas han sido validadas", true); 
  setTimeout(pgCheck, 1000); 
}

function procesarZonaCheck(zona, btn, accion){
  window.ZONAS_RECIEN_VALIDADAS = window.ZONAS_RECIEN_VALIDADAS || {};
  var container = btn.parentElement;
  
  if(btn){ 
      btn.disabled = true; 
      btn.textContent = '⏳...'; 
      Array.from(container.children).forEach(function(b) { b.disabled = true; }); 
  }
  
  var endpoint = accion === 'validar' ? 'validarZona' : 'rechazarZona'; 
  if(accion === 'validar') window.ZONAS_RECIEN_VALIDADAS[zona] = true; else delete window.ZONAS_RECIEN_VALIDADAS[zona];
  
  api(endpoint, {zona: zona}, function(r){
    if (r && r.ok) {
      if(accion === 'validar') { 
          btn.textContent = '✅ Validada'; 
          btn.style.background = '#dcfce7'; 
          btn.style.color = '#166534'; 
          var rechazarBtn = container.querySelector('.btn-rechazar'); 
          if(rechazarBtn) rechazarBtn.style.display = 'none'; 
      }
      // Actualiza la vista real 800ms después
      setTimeout(pgCheck, 800); 
    } else {
      delete window.ZONAS_RECIEN_VALIDADAS[zona]; 
      toast(r ? r.msg : 'Error', false);
      if(btn){ 
         Array.from(container.children).forEach(function(b) { b.disabled = false; }); 
         btn.textContent = accion === 'validar' ? '✅ Validar' : '❌ Rechazar'; 
      }
    }
  });
}

// ============================================================
// LECTOR Y VISTA DE ZONAS (BLINDADO Y SIN TAREAS INACTIVAS)
// ============================================================

function initCacheSuper(res) {
  CACHE_SUPER.usuarios = (res.zonas && res.zonas.ok) ? res.zonas.data.usuarios : [];
  CACHE_SUPER.zonas = (res.zonas && res.zonas.ok) ? res.zonas.data.zonas : [];
  CACHE_SUPER.subzonasInt = (res.subInt && res.subInt.ok) ? res.subInt.data : [];
  
  _zonasNT = {}; 
  if(res.zNT && res.zNT.ok) res.zNT.data.forEach(function(z){ 
    if(z.zonaId) _zonasNT[String(z.zonaId)] = true; 
  });
  
  ZONAS_INT_NT = {}; 
  if(res.zIntNT && res.zIntNT.ok) res.zIntNT.data.forEach(function(zi){ 
    if(zi.subIntId) ZONAS_INT_NT[String(zi.subIntId)] = true; 
  });

  // 🔥 CAZADOR DE IDs: Busca el ID se llame como se llame
  window._ZONAS_COMPLETADAS_HOY = {};
  if(res.checklist && res.checklist.ok && res.checklist.data) {
    res.checklist.data.forEach(function(z){
      var recolectar = function(szList) {
        if(!szList) return;
        szList.forEach(function(sz){ 
          var idFinal = String(sz.id || sz.ID || sz.id_subzona || sz.ID_SUBZONA || sz.szId || "").trim();
          if(sz.registrado && idFinal !== "" && idFinal !== "undefined") {
            window._ZONAS_COMPLETADAS_HOY[idFinal] = true; 
          }
        });
      };
      recolectar(z.subzonas);
      recolectar(z.subzonasDirectas);
      if(z.intermedias) z.intermedias.forEach(function(zi){ recolectar(zi.subzonas); });
    });
  }
}

function pgZonas(){
  var el = G('main');
  el.innerHTML = '<div class="spin"></div><p style="text-align:center;color:var(--tx3);margin-top:10px">Cargando datos a máxima velocidad ⚡...</p>';
  
  cargarDatosEnParalelo(function(res) {
    if (!res.zonas || !res.zonas.ok) { pc('<div class="card">Error de conexión al cargar las zonas.</div>'); return; }
    
    initCacheSuper(res);
    
    var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:8px"><h2 style="font-size:17px;font-weight:800">Zonas y Subzonas</h2><button class="btn btn-sm" onclick="expAll()">Expandir Todo</button><button class="btn btn-sm" onclick="colAll()">Colapsar Todo</button></div>';
    if(isA)h+='<button class="btn btn-p btn-sm" onclick="mNuevaZona()">+ Nueva zona</button>';
    h+='</div>';

    CACHE_SUPER.zonas.forEach(function(z, idx) {
      var zId = z.ID || z.id;
      var zName = z.ZONA || z.zona || "";
      var safeZName = String(zName).replace(/'/g, "\\'");
      
      // 🔥 FILTRO: Ignoramos las tareas que están desactivadas en el Excel
      var szs = (z.subzonas || []).filter(function(s) { 
          return String(s.ACTIVA || s.activa || '').toUpperCase() !== 'NO'; 
      });
      
      var totalSz = szs.length;
      var esNT = !!_zonasNT[String(zId)];
      
      var personasAsig = [];
      var compCount = 0;

      szs.forEach(function(s) {
         // Buscamos el ID en todos los formatos posibles para que no falle
         var sId = String(s.ID || s.id || s.id_subzona || s.ID_SUBZONA || "").trim();
         
         if(window._ZONAS_COMPLETADAS_HOY[sId]) {
            compCount++;
         } else if (s.PERSONAL_ASIGNADO && String(s.PERSONAL_ASIGNADO).trim()) {
            String(s.PERSONAL_ASIGNADO).split(',').forEach(function(p){
               var n = p.trim(); if(n && personasAsig.indexOf(n)<0) personasAsig.push(n);
            });
         }
      });

      var todasCompletadas = (totalSz > 0 && compCount === totalSz);
      
      var grad = ZCOLORS[idx % ZCOLORS.length], em = ZEMOJIS[idx % ZEMOJIS.length];

      h+='<div class="zcard"><div class="zhdr card-header-clickable" style="background:'+grad+(esNT?';opacity:.7':'')+';user-select:none;cursor:pointer" onclick="togZonaById('+zId+')">';
      h+='<span style="font-size:18px">'+em+'</span>';
      h+='<strong style="flex:1">'+zName+'</strong>';
      
      if(esNT) h+='<span class="badge-nt" style="background:rgba(14,165,233,.8);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px">📴 No trabaja hoy</span>';
      
      if(todasCompletadas) {
         h+='<span class="badge-comp" style="background:rgba(74,222,128,.9);color:#064e3b;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;margin-right:6px;border:1px solid #22c55e">✅ TODO COMPLETADO</span>';
      } else {
         if(personasAsig.length) h+='<span class="zbdg badge-asig" style="background:rgba(255,255,255,.15);margin-right:6px">👤 '+personasAsig.join(', ')+'</span>';
         h+='<span class="zbdg badge-tot" style="margin-right:8px">'+compCount+'/'+totalSz+' hechas</span>';
      }
      
      if(isSup) {
        var esNT2 = !!_zonasNT[String(zId)];
        h+='<button class="btn btn-sm" style="background:'+(esNT2?'rgba(14,165,233,.6)':'rgba(255,200,0,.25)')+';color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();togZonaNoTrabaja('+zId+', \''+safeZName+'\', this)">'+(esNT2?'Reactivar':'No trabaja')+'</button>';
      }
      if(isA){
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSubzonaInt('+zId+', \''+safeZName+'\')">+ Zona int.</button>';
        h+='<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border-color:rgba(255,255,255,.4)" onclick="event.stopPropagation();mNuevaSZ('+zId+', \''+safeZName+'\')">+ Sub</button>';
        h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();elimZona('+zId+', \''+safeZName+'\')">✕</button>';
      }
      h+='<span class="zarr" id="zac'+zId+'" style="margin-left:8px">▼</span></div>'; 
      h+='<div id="zbc'+zId+'" class="zbody" style="display:block; padding-bottom:1px"><div id="zint'+zId+'">';
      
      h += renderCuerpoZonaSync(zId, zName, z.subzonas || []); // Pasamos subzonas sin filtrar aquí para que pinte todo el árbol

      h+='</div></div></div>';
    });
    pc(h);
  });
}

// ============================================================
// ACTIVAR / DESACTIVAR CARPETAS INTERMEDIAS INDIVIDUALES
// ============================================================
function togZonaIntNoTrabaja(id, nombre, btn) {
  if(!confirm("¿Cambiar el estado de trabajo de la carpeta " + nombre + "?")) return;
  var p = btn.parentElement; 
  var originalHTML = p.innerHTML;
  btn.textContent = '⏳...'; btn.disabled = true;
  api('togZonaIntNoTrabaja', { subzonaIntId: id, zonaNombre: nombre }, function(r) {
    if(r && r.ok) { 
        toast('✅ Sincronizado');
        // Esto es lo que hace que el Dashboard y Zonas se enteren
        if(r.newState) window.ZONAS_INT_NT[String(id)] = true;
        else delete window.ZONAS_INT_NT[String(id)];
        
        // Magia visual en la fila actual
        btn.disabled = false;
        btn.innerHTML = r.newState ? 'Reactivar' : 'No Trabaja';
        btn.style.background = r.newState ? 'var(--danger)' : 'white';
        aplicarEfectoApagado(btn.closest('tr'), r.newState);
    }
});
}

// ============================================================
// FUNCIONES DE APAGADO (MAGIA VISUAL INSTANTÁNEA SIN RECARGAR)
// ============================================================
function togZonaNoTrabajaAsig(id, nombre, btn) {
  if(!confirm("¿Cambiar el estado de la ZONA PRINCIPAL " + nombre + "?")) return;
  var originalHTML = btn.innerHTML; 
  btn.innerHTML = '⏳...'; btn.disabled = true;
  
  api('togZonaNoTrabaja', { zonaId: id, zonaNombre: nombre }, function(r) {
    if(r && r.ok) { 
      toast('✅ Guardado y sincronizado', true); 
      btn.disabled = false;
      var isOff = r.newState;
      
      // 🔥 ACTUALIZAMOS LA MEMORIA GLOBAL PARA TODA LA APP
      if(isOff) window._zonasNT[String(id)] = true;
      else delete window._zonasNT[String(id)];

      // Actualización visual de la fila
      var tr = btn.closest('tr');
      btn.innerHTML = isOff ? 'Reactivar Zona' : 'No Trabaja';
      btn.style.background = isOff ? 'var(--danger)' : 'white';
      btn.style.color = isOff ? 'white' : 'var(--tx2)';
      tr.style.background = isOff ? '#cbd5e1' : '#e2e8f0';
      var spanTit = tr.querySelector('td div span');
      if(spanTit) spanTit.innerHTML = (isOff ? '📴 ' : '📍 ') + nombre + (isOff ? ' <span style="color:#b91c1c;font-size:11px;margin-left:8px">(ZONA CERRADA)</span>' : '');

      var nextTr = tr.nextElementSibling;
      while(nextTr && !nextTr.classList.contains('print-zona')) {
          aplicarEfectoApagado(nextTr, isOff);
          nextTr = nextTr.nextElementSibling;
      }
    } else { 
      btn.innerHTML = originalHTML; btn.disabled = false; 
      toast(r ? r.msg : 'Error al cambiar', false); 
    }
  });
}

function togZonaIntNoTrabajaAsig(id, nombre, btn) {
  if(!confirm("¿Cambiar el estado de la CARPETA " + nombre + "?")) return;
  var originalHTML = btn.innerHTML; 
  btn.innerHTML = '⏳...'; btn.disabled = true;
  
  api('togZonaIntNoTrabaja', { subzonaIntId: id, zonaNombre: nombre }, function(r) {
    if(r && r.ok) { 
      toast('✅ Guardado y sincronizado', true); 
      btn.disabled = false;
      var isOff = r.newState;

      // 🔥 ACTUALIZAMOS LA MEMORIA GLOBAL PARA TODA LA APP
      if(isOff) window.ZONAS_INT_NT[String(id)] = true;
      else delete window.ZONAS_INT_NT[String(id)];

      var tr = btn.closest('tr');
      btn.innerHTML = isOff ? 'Reactivar' : 'No Trabaja';
      btn.style.background = isOff ? 'var(--danger)' : 'white';
      btn.style.color = isOff ? 'white' : 'var(--tx2)';
      aplicarEfectoApagado(tr, isOff);
    } else { 
      btn.innerHTML = originalHTML; btn.disabled = false; 
      toast(r ? r.msg : 'Error al cambiar', false); 
    }
  });
}

function aplicarEfectoApagado(tr, isOff) {
    var labelTd = tr.querySelector('.print-carpeta span') || tr.querySelector('.print-carpeta');
    if(labelTd) {
        labelTd.innerHTML = labelTd.innerHTML.replace('📁', isOff ? '❌' : '📁').replace('❌', isOff ? '❌' : '📁');
        labelTd.innerHTML = labelTd.innerHTML.replace('📄', isOff ? '❌' : '📄').replace('❌', isOff ? '❌' : '📄');
        tr.querySelector('.print-carpeta').style.color = isOff ? 'var(--tx3)' : 'var(--g)';
    }
    
    var inputDiv = tr.querySelector('.no-print-input');
    if (inputDiv) {
        if (isOff) {
            if(!inputDiv.getAttribute('data-backup')) inputDiv.setAttribute('data-backup', inputDiv.innerHTML); 
            inputDiv.innerHTML = '<input type="text" disabled value="📴 NO TRABAJA" style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:6px;background:#f1f5f9;color:#ef4444;font-weight:900;font-size:13px;text-align:center;">';
        } else {
            if(inputDiv.getAttribute('data-backup')) inputDiv.innerHTML = inputDiv.getAttribute('data-backup'); 
        }
    }
    
    var printTxt = tr.querySelector('.print-only-text');
    if(printTxt) {
        if (isOff) printTxt.textContent = '📴 NO TRABAJA';
        else {
            var restoredInput = tr.querySelector('.fast-inp');
            printTxt.textContent = restoredInput ? restoredInput.value : '—';
        }
    }
}

// ============================================================
// DIBUJO DE ZONAS (REPARADO Y SIN ERRORES)
// ============================================================
function renderCuerpoZonaSync(zonaId, zonaNombre, subzonas) {
  var isA=ROL==='admin', isSup=ROL==='supervisor'||isA;
  var h = '';
  var isZoneOff = !!window._zonasNT[String(zonaId)];
  
  var ints = CACHE_SUPER.subzonasInt.filter(function(i){ return String(i.zonaId||i.ID_ZONA) === String(zonaId); });
  var mapInts = {}; 
  subzonas.forEach(function(sz){
    var intId = sz.ID_SUBZONA_INT || sz.id_subzona_int;
    if(intId && String(intId)!=="0") {
        if(!mapInts[String(intId)]) mapInts[String(intId)] = [];
        mapInts[String(intId)].push(sz);
    }
  });

  // 🔥 EL MOTOR DE DIBUJO DE FILAS INTERNO
  function rRow(s, isFolderOff) {
     var sId = s.ID||s.id; 
     var sName = s.SUBZONA||s.subzona||s.NOMBRE||s.nombre;
     var comp = !!window._ZONAS_COMPLETADAS_HOY[String(sId)];
     var off = isZoneOff || isFolderOff || String(s.ACTIVA).toUpperCase()==='NO';
     var p = String(s.PERSONAL_ASIGNADO||'').trim();
     
     var html = '<div style="padding:8px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;background:'+(off?'#f8fafc':(comp?'#f0fff8':'white'))+';opacity:'+(off?'0.6':'1')+'">';
     html += '<div style="flex:1;font-size:13px;color:'+(off?'var(--tx3)':'var(--tx)')+'">';
     html += '<span style="text-decoration:'+(comp?'line-through':'none')+'">'+sName+'</span>';
     if(off) html += ' <span style="font-size:10px;color:#ef4444;font-weight:bold">(📴 DESACTIVADA)</span>';
     html += '</div>';
     
     if(comp) html += '<span style="font-size:10px;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-weight:bold">✓ HECHO</span>';
     else {
        if(off) html += '<span style="font-size:11px;color:var(--tx3);font-weight:bold">—</span>'; 
        else if(p) html += '<span style="font-size:11px;background:var(--sur);color:var(--tx2);padding:2px 6px;border-radius:4px">👤 '+p+'</span>';
        else html += '<span style="font-size:11px;color:var(--tx3)">Sin asignar</span>';
     }
     
     if(isA) html += '<button class="btn btn-sm" style="padding:2px 6px" onclick="event.stopPropagation();mEditarSZ('+sId+', \''+String(sName).replace(/'/g,"\\'")+'\')">✏️</button>';
     html += '</div>';
     return html;
  }

  ints.forEach(function(si){
     var siId = si.id || si.ID;
     var isIntOff = isZoneOff || !!window.ZONAS_INT_NT[String(siId)];
     var szs = mapInts[String(siId)] || [];
     var szsActivas = szs.filter(function(s) { return String(s.ACTIVA || '').toUpperCase() !== 'NO'; });
     var todasCompletadas = szsActivas.length > 0 && szsActivas.every(function(s){ return window._ZONAS_COMPLETADAS_HOY[String(s.ID || s.id)]; });

     h+='<div id="int-container-'+siId+'" class="int-container" style="background:'+(isIntOff?'#f1f5f9':'#F0FFF8')+';border-left:4px solid '+(isIntOff?'#94a3b8':'var(--g)')+';margin:8px 12px;border-radius:var(--r);overflow:hidden">';
     h+='<div id="int-hdr-'+siId+'" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:'+(isIntOff?'#e2e8f0':'var(--gl)')+';user-select:none">';
     h+='<div style="flex:1;cursor:pointer;display:flex;align-items:center" onclick="togSubInt('+siId+')"><strong style="font-size:13px;color:'+(isIntOff?'var(--tx2)':'var(--g)')+'">'+(isIntOff?'❌ ':'📁 ')+(si.nombre||si.NOMBRE)+'</strong></div>';
     
     if(isIntOff) h+='<span style="font-size:10px;color:#ef4444;font-weight:800;background:#fee2e2;padding:2px 6px;border-radius:4px">📴 NO TRABAJA</span>';
     else if(todasCompletadas) h+='<span style="font-size:11px;color:var(--g);font-weight:800;margin-right:8px;background:#dcfce7;padding:2px 8px;border-radius:10px;border:1px solid #86efac">✅ Terminada</span>';

     if(isSup){
       var isIntOnlyOff = !!window.ZONAS_INT_NT[String(siId)];
       if(!isZoneOff) h+='<button class="btn btn-sm" style="background:'+(isIntOnlyOff?'var(--danger)':'white')+';color:'+(isIntOnlyOff?'white':'var(--tx2)')+';border:1px solid var(--bd)" onclick="event.stopPropagation();togZonaIntNoTrabaja('+siId+', \''+(si.nombre||si.NOMBRE||'').replace(/'/g, "\\'")+'\', this)">'+(isIntOnlyOff?'Reactivar':'No trabaja')+'</button>';
       if(!isIntOff && !todasCompletadas) h+='<button class="btn btn-sm" style="margin-left:4px" onclick="event.stopPropagation();mAsignarPersonalInt('+siId+',\''+(si.nombre||si.NOMBRE||'').replace(/'/g, "\\'")+'\', '+zonaId+', \''+zonaNombre.replace(/'/g, "\\'")+'\')">Asignar</button>';
     }
     h+='<span id="ar-int-'+siId+'" style="font-size:10px;color:var(--tx3);margin-left:6px;cursor:pointer" onclick="togSubInt('+siId+')">'+(todasCompletadas||isIntOff?'':'▶')+'</span></div>';
     h+='<div id="sub-int-'+siId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     szs.forEach(function(s){ h+=rRow(s, isIntOff); }); 
     if(szs.length===0) h+='<div style="padding:10px;font-size:11px;color:var(--tx3);text-align:center">No hay tareas en esta carpeta</div>';
     h+='</div></div>';
  });

  var szDirectas = subzonas.filter(function(s){ 
    var idInt = s.ID_SUBZONA_INT || s.id_subzona_int;
    return !idInt || idInt === "" || idInt === "0";
  });

  if(szDirectas.length){
     h+='<div style="margin:8px 12px; border:1.5px solid var(--bd); border-radius:var(--r); overflow:hidden">';
     h+='<div onclick="togSubInt(\'dir\'+'+zonaId+')" style="padding:10px 14px; background:'+(isZoneOff?'#e2e8f0':'var(--sur2)')+'; cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none">';
     h+='<strong style="font-size:11px;color:var(--tx2);text-transform:uppercase;flex:1">'+(isZoneOff?'❌ ':'')+'Tareas sueltas de la zona</strong>';
     h+='<span id="ar-int-dir'+zonaId+'" style="font-size:10px;color:var(--tx3)">▶</span></div>';
     h+='<div id="sub-int-dir'+zonaId+'" style="display:none; background:white; border-top:1px solid var(--bd)">';
     szDirectas.forEach(function(s){ h+=rRow(s, isZoneOff); });
     h+='</div></div>';
  }
  return h;
}

// ============================================================
// 🎙️ MÓDULO ASISTENTE DE VOZ (J.A.R.V.I.S. / CHATGPT)
// ============================================================

// 1. Configuración del Reconocimiento de Voz del navegador
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognitionIA;
let isRecordingIA = false;

if (SpeechRecognition) {
  recognitionIA = new SpeechRecognition();
  recognitionIA.lang = 'es-ES'; // Español
  recognitionIA.interimResults = false;
  recognitionIA.maxAlternatives = 1;

  recognitionIA.onstart = function() {
    isRecordingIA = true;
    var btn = document.getElementById('btn-mic-ia');
    if(btn) {
       btn.style.background = '#ef4444'; // Se pone rojo al grabar
       btn.style.animation = 'pulse 1.5s infinite';
    }
    toast('🎙️ Te escucho, dime qué necesitas...', true);
  };

  recognitionIA.onresult = function(event) {
    const textoDetectado = event.results[0][0].transcript;
    toast('🧠 Pensando: "' + textoDetectado + '"', true);
    enviarComando_A_ChatGPT(textoDetectado);
  };

  recognitionIA.onerror = function(event) {
    isRecordingIA = false;
    reiniciarBotonMic();
    toast('❌ Error de micrófono: ' + event.error, false);
  };

  recognitionIA.onend = function() {
    isRecordingIA = false;
    reiniciarBotonMic();
  };
}

function toggleMicIA() {
  if (!SpeechRecognition) {
    alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari moderno.");
    return;
  }
  if (isRecordingIA) recognitionIA.stop();
  else recognitionIA.start();
}

function reiniciarBotonMic() {
  var btn = document.getElementById('btn-mic-ia');
  if(btn) {
     btn.style.background = '#1A472A';
     btn.style.animation = 'none';
     btn.innerHTML = '🎤';
  }
}

// 2. Comunicación con el Servidor (ChatGPT)
function enviarComando_A_ChatGPT(texto) {
  var btn = document.getElementById('btn-mic-ia');
  if(btn) btn.innerHTML = '⏳'; // Icono de cargando
  
  api('procesarComandoVoz', { texto: texto }, function(r) {
    reiniciarBotonMic();
    if (r && r.ok) {
       ejecutarManosIA(r.comando);
    } else {
       toast('Error en IA: ' + (r ? r.msg : 'Desconocido'), false);
    }
  });
}

// 3. LAS "MANOS" DE LA IA: Traduce la orden de ChatGPT a Clics Reales
function ejecutarManosIA(cmd) {
  if (!cmd || !cmd.accion) return;
  
  switch(cmd.accion) {
    case 'imprimir':
      toast('🖨️ Abriendo menú de impresión...', true);
      window.print();
      break;
      
    case 'abrirAsignaciones':
      toast('👥 Abriendo Asignaciones Rápidas...', true);
      pgAsignaciones(); // Te lleva automáticamente a la pestaña
      break;
      
    case 'cerrarZona':
      toast('🔍 Buscando y apagando: ' + cmd.zona, true);
      intentarCerrarZonaPorVoz(cmd.zona);
      break;
      
    case 'desconocido':
      toast('🤔 ' + cmd.mensaje, false);
      break;
      
    default:
      toast('Comando no programado aún: ' + cmd.accion, false);
  }
}

// Función avanzada para que la IA busque la zona por nombre (sea principal o carpeta)
function intentarCerrarZonaPorVoz(nombreZona) {
   var buscado = nombreZona.toUpperCase().trim();
   
   // 1. ¿Es una Zona Principal?
   var zonaMain = CACHE_SUPER.zonas.find(function(z) { return z.ZONA.toUpperCase().indexOf(buscado) >= 0; });
   if (zonaMain) {
       api('togZonaNoTrabaja', { zonaId: zonaMain.ID, zonaNombre: zonaMain.ZONA }, function(r){
          if(r && r.ok) { 
             toast('✅ Zona ' + zonaMain.ZONA + ' cerrada', true); 
             window._zonasNT[String(zonaMain.ID)] = true; // Sincroniza memoria
             refrescarPantallaActual();
          }
       });
       return;
   }

   // 2. ¿Es una Carpeta Intermedia?
   var intMain = CACHE_SUPER.subzonasInt.find(function(zi) { return String(zi.NOMBRE||zi.SUBZONA_INT||'').toUpperCase().indexOf(buscado) >= 0; });
   if (intMain) {
       api('togZonaIntNoTrabaja', { subzonaIntId: intMain.ID, zonaNombre: intMain.NOMBRE }, function(r){
          if(r && r.ok) { 
             toast('✅ Carpeta ' + intMain.NOMBRE + ' cerrada', true); 
             window.ZONAS_INT_NT[String(intMain.ID)] = true; // Sincroniza memoria
             refrescarPantallaActual();
          }
       });
       return;
   }

   toast('❌ No encontré la zona: ' + nombreZona + ' en el Excel', false);
}

function refrescarPantallaActual() {
   // Dependiendo de dónde esté el usuario, refrescamos esa vista para que vea el candado
   if(document.getElementById('tabla-asignaciones')) pgAsignaciones();
   else if(document.querySelector('.zcard')) pgZonas();
   else pgDashboard();
}

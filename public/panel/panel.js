// Panel de la dueña de Montana Helados (port del ejemplo aprobado, prototipo/netlify/panel.html).
// Lee y guarda todo por /api/gestionar/*; el servidor valida la sesión y los datos en cada pedido.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const cont = $('#contenido');
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const gs = (n) => 'G. ' + Number(n).toLocaleString('es-PY');
  const fecha = (f) => (f ? f.split('-').reverse().join('/') : '');
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const ESTADOS = [['disponible', 'Disponible'], ['hoy_no_hay', 'Hoy no hay'], ['agotado', 'Agotado'], ['oculto', 'Oculto']];
  const ESTADOS_PEDIDO = [['nuevo', 'Nuevo'], ['confirmado', 'Confirmado'], ['sena_recibida', 'Seña recibida'], ['entregado', 'Entregado'], ['cancelado', 'Cancelado']];
  const NOMBRE_PEDIDO = Object.fromEntries(ESTADOS_PEDIDO);
  const PRODUCTO = { gourmet: 'Heladito', xl: 'Helado XL' };
  const NOMBRES = { inicio: 'Inicio', pedidos: 'Pedidos', sabores: 'Sabores', xl: 'Helados XL', precios: 'Precios por cantidad', promos: 'Promos', puntos: 'Puntos de venta', textos: 'Textos de la web', ajustes: 'Ajustes', papelera: 'Papelera' };

  let db = null;          // estado del panel (todo menos pedidos)
  let ped = null;         // página actual de pedidos
  let modulo = 'inicio', seleccion = new Set(), busqueda = '';
  let pagina = 1, porPagina = 20;
  const FILTRO0 = { estado: '', dia: '', modalidad: '', entrega: '', factura: '' };
  let filtro = { ...FILTRO0 };

  // ---------- servidor ----------
  async function pedir(url, opciones) {
    const r = await fetch(url, { credentials: 'same-origin', ...opciones });
    if (r.status === 401) { location.assign('/gestionar/entrar'); throw new Error('sin sesión'); }
    return r.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor.' }));
  }
  async function cargar() {
    const d = await pedir('/api/gestionar/estado');
    if (d.ok) db = d;
    else avisar(d.error || 'No se pudo cargar el panel');
  }
  async function cargarPedidos() {
    const q = new URLSearchParams({ ...filtro, q: busqueda, pagina: String(pagina), por: String(porPagina) });
    const d = await pedir('/api/gestionar/pedidos?' + q);
    if (d.ok) ped = d; else avisar(d.error || 'No se pudieron cargar los pedidos');
  }
  async function hacer(datos, { recargar = true } = {}) {
    const d = await pedir('/api/gestionar/accion', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) });
    avisar(d.ok ? d.aviso : d.error || 'No se pudo guardar');
    if (d.ok && recargar) { await cargar(); if (modulo === 'pedidos') await cargarPedidos(); render(); }
    return d.ok;
  }
  async function subirFoto(file) {
    if (!file) return null;
    if (file.size > 8 * 1024 * 1024) { avisar('La foto pesa más de 8 MB'); return false; }
    const f = new FormData(); f.append('foto', file);
    const d = await pedir('/api/gestionar/foto', { method: 'POST', body: f });
    if (!d.ok) { avisar(d.error || 'No se pudo subir la foto'); return false; }
    return d.ruta;
  }

  // ---------- piezas ----------
  let tAviso;
  function avisar(t) {
    let a = $('.aviso'); if (!a) { a = document.createElement('div'); a.className = 'aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.textContent = t; clearTimeout(tAviso); tAviso = setTimeout(() => a.remove(), 2400);
  }
  function confirmar(texto, si, etiqueta = 'Eliminar') {
    const d = document.createElement('div'); d.className = 'confirmar';
    d.innerHTML = `<div role="dialog" aria-modal="true"><p style="margin:0;font-weight:800;font-size:19px">${esc(texto)}</p><div class="acciones" style="justify-content:flex-start"><button class="btn peligro" data-si>${esc(etiqueta)}</button><button class="btn" data-no>Cancelar</button></div></div>`;
    document.body.appendChild(d); d.querySelector('[data-no]').focus();
    d.querySelector('[data-no]').onclick = () => d.remove();
    d.querySelector('[data-si]').onclick = () => { d.remove(); si(); };
  }
  function lado(titulo, campos, guardar, { boton = 'Guardar' } = {}) {
    cerrarLado();
    const d = document.createElement('aside'); d.className = 'lado'; d.id = 'lado';
    d.innerHTML = `<h3>${esc(titulo)}</h3><form id="form-lado" style="display:grid;gap:12px" novalidate>${campos}<div class="acciones" style="justify-content:flex-start">${guardar ? `<button class="btn pri" type="submit">${boton}</button>` : ''}<button class="btn" type="button" data-cerrar>${guardar ? 'Cancelar' : 'Cerrar'}</button></div></form>`;
    document.body.appendChild(d); d.querySelector('input,textarea,select')?.focus();
    d.querySelector('[data-cerrar]').onclick = cerrarLado;
    d.querySelector('form').onsubmit = async (e) => {
      e.preventDefault(); if (!guardar) return;
      const b = d.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Guardando…';
      try { if ((await guardar(new FormData(e.target), d)) !== false) cerrarLado(); }
      finally { if (b.isConnected) { b.disabled = false; b.textContent = boton; } }
    };
  }
  function cerrarLado() { $('#lado')?.remove(); }
  const campo = (n, l, v = '', t = 'text', ayuda = '', extra = '') => `<div class="campo"><label for="f-${n}">${l}</label>${t === 'textarea' ? `<textarea id="f-${n}" name="${n}" rows="3" ${extra}>${esc(v)}</textarea>` : `<input id="f-${n}" name="${n}" type="${t}" value="${esc(v)}" ${extra}>`}${ayuda ? `<small>${ayuda}</small>` : ''}</div>`;
  const campoFoto = (actual) => `<div class="campo"><label for="f-foto">Foto</label>${actual ? `<img class="previa-foto" src="${esc(actual)}" alt="Foto actual">` : ''}<input id="f-foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG o WebP, hasta 8 MB.${actual ? ' Si no elegís otra, queda la actual.' : ''}</small></div>`;
  const hoyISO = () => db.hoy;
  const masDias = (n) => { const [a, m, d] = db.hoy.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10); };
  const diaTxt = (f) => (f === hoyISO() ? 'hoy' : f === masDias(1) ? 'mañana' : f.slice(8, 10) + '/' + f.slice(5, 7));
  function estadoPromo(p) { const hoy = hoyISO(); if (p.terminada || (p.hasta && p.hasta < hoy)) return 'finalizada'; if (p.desde && p.desde > hoy) return 'programada'; return 'vigente'; }
  const selectorEstado = (item, lista) => `<span class="estados" role="group" aria-label="Estado de ${esc(item.nombre)}">${ESTADOS.map(([k, t]) => `<button type="button" data-e="${k}" data-lista="${lista}" data-id="${item.id}" aria-pressed="${item.estado === k}">${t}</button>`).join('')}</span>`;
  const lineasTexto = (det) => det.map((l) => `${l.cantidad} ${l.tipo === 'xl' ? 'XL ' : ''}${l.sabor}`).join(', ');

  // ---------- vistas ----------
  const vistas = {
    inicio() {
      const sinStock = [...db.sabores, ...db.xl.map((x) => ({ ...x, nombre: x.nombre + ' XL' }))].filter((s) => s.estado === 'hoy_no_hay' || s.estado === 'agotado');
      const vig = db.promos.filter((p) => estadoPromo(p) === 'vigente');
      const { nuevos, manana } = db.resumen;
      const sinEmail = !db.ajustes.email ? `<p class="previa" style="margin-bottom:14px">Todavía no cargaste el email que recibe los avisos de pedidos. <button class="btn chico" data-ir="ajustes">Ir a Ajustes</button></p>` : '';
      return `<div class="cabeza"><h2>Hola${db.usuario?.nombre ? ', ' + esc(db.usuario.nombre) : ''}</h2></div>${sinEmail}
      <div class="tarjetas">
        <div class="tarjeta"><div class="num">${nuevos}</div><p>${nuevos === 1 ? 'pedido nuevo' : 'pedidos nuevos'} para revisar</p><p><button class="btn chico" data-ir="pedidos">Ver pedidos</button></p></div>
        <div class="tarjeta"><div class="num">${manana}</div><p>${manana === 1 ? 'pedido' : 'pedidos'} para mañana</p><p><button class="btn chico" data-ir="pedidos" data-dia="manana">Ver los de mañana</button></p></div>
        <div class="tarjeta"><div class="num">${sinStock.length}</div><p>sabores en "Hoy no hay" o "Agotado"</p>${sinStock.length ? `<ul class="lista-simple">${sinStock.map((s) => `<li>${esc(s.nombre)}: ${s.estado === 'agotado' ? 'Agotado' : 'Hoy no hay'}</li>`).join('')}</ul>` : ''}<p><button class="btn chico pri" data-accion="todo-disponible">Todo disponible</button></p><p><small>Pasa todo lo que está en "Hoy no hay" a "Disponible", para empezar el día.</small></p></div>
        <div class="tarjeta"><div class="num">${vig.length}</div><p>${vig.length === 1 ? 'promo vigente' : 'promos vigentes'}</p><p><button class="btn chico" data-ir="promos">Ver promos</button></p></div>
      </div>`;
    },
    pedidos() {
      if (!ped) return '<p class="cargando">Cargando pedidos…</p>';
      const { total, todos, cuentas, filas } = ped;
      const paginas = Math.max(1, Math.ceil(total / porPagina));
      const ini = total ? (pagina - 1) * porPagina + 1 : 0, fin = (pagina - 1) * porPagina + filas.length;
      const activos = Object.values(filtro).filter(Boolean).length + (busqueda ? 1 : 0);
      const sel = (k, etq, ops) => `<div class="filtro"><label for="f-${k}">${etq}</label><select id="f-${k}" data-filtro="${k}" class="${filtro[k] ? 'activo' : ''}">${ops.map(([v, t]) => `<option value="${v}" ${filtro[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
      const pag = `<nav class="paginado" aria-label="Páginas de pedidos"><span class="pag-info">Mostrando <b>${ini} a ${fin}</b> de ${total}</span>
        <div class="pag-botones"><button type="button" class="btn chico" data-pag="${pagina - 1}" ${pagina === 1 ? 'disabled' : ''}>Anteriores</button><span class="pag-num">Página ${pagina} de ${paginas}</span><button type="button" class="btn chico" data-pag="${pagina + 1}" ${pagina >= paginas ? 'disabled' : ''}>Siguientes</button></div>
        <label class="pag-cant">Ver <select data-por-pagina aria-label="Pedidos por página">${[10, 20, 50].map((n) => `<option ${n === porPagina ? 'selected' : ''}>${n}</option>`).join('')}</select> por página</label></nav>`;
      return `<div class="cabeza"><h2>Pedidos</h2><span class="contador">${total === todos ? `${total} pedidos` : `${total} de ${todos} pedidos`}</span></div>
      <div class="chips-estado" role="group" aria-label="Filtrar por estado">${[['', 'Todos'], ...ESTADOS_PEDIDO].map(([v, t]) => `<button type="button" class="chip-f" aria-pressed="${filtro.estado === v}" data-f-estado="${v}">${t} <span>${cuentas[v] || 0}</span></button>`).join('')}</div>
      <div class="filtros">
        ${sel('dia', 'Día de entrega', [['', 'Todos los días'], ['hoy', 'Hoy'], ['manana', 'Mañana'], ['semana', 'Próximos 7 días'], ['pasados', 'Días pasados']])}
        ${sel('modalidad', 'Tipo de pedido', [['', 'Todos'], ['hoy', 'Para hoy'], ['otro_dia', 'Para otro día']])}
        ${sel('entrega', 'Entrega', [['', 'Todas'], ['retiro', 'Retiro'], ['bolt', 'Bolt']])}
        ${sel('factura', 'Factura', [['', 'Todos'], ['si', 'Pidió factura'], ['no', 'Sin factura']])}
      </div>
      <div class="barra"><input type="search" placeholder="Buscar por cliente, código o sabor" aria-label="Buscar pedidos" value="${esc(busqueda)}" data-buscar>${activos ? `<button type="button" class="btn chico" data-limpiar>Limpiar filtros (${activos})</button>` : ''}</div>
      <div class="tabla tarjetas-movil"><table class="t-pedidos"><thead><tr><th>Código</th><th>Para el día</th><th>Cliente</th><th>Pedido</th><th>Total</th><th>Entrega</th><th>Estado</th><th></th></tr></thead><tbody>
      ${filas.map((p) => `<tr id="pedido-${p.id}" class="${p.fechaEntrega < hoyISO() ? 'pasado' : ''}"><td data-l="Código" class="nw"><b>${esc(p.codigo)}</b></td><td data-l="Para el día"><b>${cap(diaTxt(p.fechaEntrega))}</b></td><td data-l="Cliente" class="full"><b>${esc(p.nombre)}</b></td><td data-l="Pedido" class="full">${esc(lineasTexto(p.detalle))}<br><small>${p.modalidad === 'hoy' ? 'Para hoy' : 'Para otro día'}</small></td><td class="num" data-l="Total">${gs(p.total)}</td><td data-l="Entrega">${p.entrega === 'bolt' ? 'Bolt' : 'Retiro'}${p.factura ? '<br><small><b>Con factura</b></small>' : ''}</td>
      <td data-l="Estado" class="full"><select class="inline" data-estado-pedido="${p.id}" aria-label="Estado de ${esc(p.codigo)}">${ESTADOS_PEDIDO.map(([e, t]) => `<option value="${e}" ${e === p.estado ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
      <td class="full"><div class="acciones"><button class="btn chico pri" data-ver-pedido="${p.id}">Ver</button></div></td></tr>`).join('')}
      </tbody></table>${filas.length ? '' : `<div class="vacio">${todos ? 'No hay pedidos con estos filtros. <button type="button" class="btn chico" data-limpiar>Ver todos</button>' : 'Todavía no entró ningún pedido por la web.'}</div>`}</div>${total > 10 ? pag : ''}`;
    },
    sabores() { return grillaProductos('sabores', 'Sabores', 'heladitos'); },
    xl() { return grillaProductos('xl', 'Helados XL', 'helados XL'); },
    precios() {
      const ej = (t) => { const e = db.precios.filter((p) => p.producto === 'gourmet' && p.desde <= t).sort((a, b) => b.desde - a.desde)[0]; return e ? t * e.precio : 0; };
      return `<div class="cabeza"><h2>Precios por cantidad</h2><button class="btn pri" data-nuevo="precios">Nuevo escalón</button></div>
      <p class="previa">Con estos precios: 25 heladitos = ${gs(ej(25))} · 50 = ${gs(ej(50))} · 100 = ${gs(ej(100))}</p>
      <div class="tabla"><table><thead><tr><th>Producto</th><th>Desde (unidades)</th><th>Precio cada uno</th><th></th></tr></thead><tbody>
      ${db.precios.map((p) => `<tr><td>${PRODUCTO[p.producto]}</td><td><input class="inline" type="number" min="${p.desde === 1 ? 1 : 2}" value="${p.desde}" data-precio="${p.id}" data-k="desde" aria-label="Desde, ${PRODUCTO[p.producto]}" ${p.desde === 1 ? 'readonly' : ''}></td><td><input class="inline" type="number" min="0" step="500" value="${p.precio}" data-precio="${p.id}" data-k="precio" aria-label="Precio, ${PRODUCTO[p.producto]} desde ${p.desde}"></td><td><div class="acciones">${p.desde === 1 ? '' : `<button class="btn chico peligro" data-borrar-precio="${p.id}">Eliminar</button>`}</div></td></tr>`).join('')}
      </tbody></table></div><p><small>El escalón "desde 1" no se puede borrar: siempre tiene que haber un precio base. Los cambios se ven en la web al instante.</small></p>`;
    },
    promos() {
      return `<div class="cabeza"><h2>Promos</h2><span class="contador">${db.promos.length} ${db.promos.length === 1 ? 'promo' : 'promos'}</span><button class="btn pri" data-nuevo="promos">Nueva promo</button></div>
      <div class="tabla tarjetas-movil"><table><thead><tr><th>#</th><th>Foto</th><th>Título</th><th>Desde</th><th>Hasta</th><th>Estado</th><th></th></tr></thead><tbody>
      ${db.promos.map((p) => { const e = estadoPromo(p); return `<tr><td class="id">#${p.id}</td><td class="sel">${p.foto ? `<img class="mini foto" src="${esc(p.foto)}" alt="">` : ''}</td><td class="full"><b>${esc(p.titulo)}</b></td><td data-l="Desde">${p.desde ? fecha(p.desde) : 'ya'}</td><td data-l="Hasta">${p.hasta ? fecha(p.hasta) : 'sin fecha'}</td><td data-l="Estado"><span class="chip ${e}">${e}</span></td>
      <td class="full"><div class="acciones">${e !== 'finalizada' ? `<button class="btn chico" data-terminar="${p.id}">Terminar promo</button>` : ''}<button class="btn chico" data-duplicar="${p.id}">Duplicar</button><button class="btn chico" data-editar="promos" data-id="${p.id}">Editar</button><button class="btn chico peligro" data-borrar="promos" data-id="${p.id}">Eliminar</button></div></td></tr>`; }).join('')}
      </tbody></table>${db.promos.length ? '' : '<div class="vacio">No hay promos. Tocá "Nueva promo".</div>'}</div>
      <p><small>La fecha "hasta" es opcional. Sin fecha, la promo queda hasta que toques "Terminar promo". Terminada, deja de verse en la web pero no se borra.</small></p>`;
    },
    puntos() {
      return `<div class="cabeza"><h2>Puntos de venta</h2><span class="contador">${db.puntos.length} locales</span><button class="btn pri" data-nuevo="puntos">Nuevo local</button></div>
      <div class="tabla tarjetas-movil"><table><thead><tr><th>#</th><th>Nombre</th><th>Mapa</th><th>Visible</th><th></th></tr></thead><tbody>
      ${db.puntos.map((p) => `<tr><td class="id">#${p.id}</td><td class="full"><b>${esc(p.nombre)}</b>${p.barrio ? ` · ${esc(p.barrio)}` : ''}</td><td data-l="Mapa" class="full"><a href="${esc(p.mapa)}" target="_blank" rel="noopener">Ver en el mapa</a></td><td data-l="Visible"><label><input type="checkbox" ${p.visible ? 'checked' : ''} data-visible="${p.id}" style="width:22px;height:22px;accent-color:var(--choco)"> ${p.visible ? 'Visible' : 'Oculto'}</label></td>
      <td class="full"><div class="acciones"><button class="btn chico" data-editar="puntos" data-id="${p.id}">Editar</button><button class="btn chico peligro" data-borrar="puntos" data-id="${p.id}">Eliminar</button></div></td></tr>`).join('')}
      </tbody></table>${db.puntos.length ? '' : '<div class="vacio">No hay locales cargados. Sin locales, la sección no aparece en la web.</div>'}</div>`;
    },
    textos() {
      const campoTexto = (c) => {
        const valor = c.valor || c.original;
        const input = c.tipo === 'parrafo'
          ? `<textarea id="t-${c.clave}" name="${c.clave}" rows="${Math.min(6, Math.ceil(c.max / 90) + 1)}" maxlength="${c.max}" data-original="${esc(c.original)}">${esc(valor)}</textarea>`
          : `<input id="t-${c.clave}" name="${c.clave}" type="text" maxlength="${c.max}" value="${esc(valor)}" data-original="${esc(c.original)}">`;
        return `<div class="campo campo-texto${c.valor && c.valor !== c.original ? ' cambiado' : ''}"><label for="t-${c.clave}">${esc(c.etiqueta)}</label>${input}
          <small class="pie-texto"><span data-cuenta="${c.clave}">${valor.length}</span>/${c.max}${c.valor && c.valor !== c.original ? ` · <button type="button" class="enlace" data-original="${c.clave}">Volver al original</button>` : ''}</small></div>`;
      };
      return `<div class="cabeza"><h2>Textos de la web</h2><a class="btn chico" href="/" target="_blank" rel="noopener">Ver la web</a></div>
      <p class="previa">Cambiá los títulos y textos de cada parte de la web. Lo que dejes vacío vuelve al texto original. Para que algo salga en <b>negrita</b>, ponelo entre dos asteriscos: **así**.</p>
      <form id="form-textos" novalidate>
      ${db.textos.map((g) => `<details class="bloque bloque-textos" ${g.id === 'inicio' ? 'open' : ''}><summary><h3>${esc(g.titulo)}</h3><span class="contador">${g.campos.filter((c) => c.valor && c.valor !== c.original).length || ''}</span></summary>${g.campos.map(campoTexto).join('')}</details>`).join('')}
      <div class="guardar-fijo"><button class="btn pri" type="submit">Guardar textos</button></div></form>`;
    },
    ajustes() {
      const a = db.ajustes;
      return `<div class="cabeza"><h2>Ajustes</h2></div><form id="form-ajustes" novalidate>
      <div class="bloque"><h3>Avisos de pedidos</h3>${campo('email', 'Email que recibe los avisos', a.email, 'email', 'Te llega un aviso cada vez que alguien arma un pedido en la web.')}<div><button class="btn chico" type="button" data-accion="prueba">Enviar email de prueba</button></div></div>
      <div class="bloque"><h3>Contacto y redes</h3>${campo('whatsapp', 'WhatsApp', a.whatsapp, 'tel', 'Celular al que llegan los pedidos, por ejemplo 0986 759 890.')}${campo('instagram', 'Instagram (link completo)', a.instagram, 'url')}${campo('tiktok', 'TikTok (link completo)', a.tiktok, 'url')}</div>
      <div class="bloque"><h3>Local y horario</h3>${campo('horario', 'Horario', a.horario)}${campo('mapa', 'Link de Google Maps', a.mapa, 'url')}</div>
      <div class="bloque"><h3>Pedidos</h3>${campo('sena', 'Seña (%)', a.sena, 'number', 'Se calcula en todos los pedidos y se redondea a G. 1.000.', 'min="0" max="100"')}</div>
      <div class="bloque"><h3>Datos de pago</h3>${campo('pago', 'Datos de transferencia', a.pago, 'textarea', 'Privado. No se publican en la web: solo para copiar y pegar en el chat de WhatsApp.')}<div><button class="btn chico" type="button" data-accion="copiar-pago">Copiar datos</button></div></div>
      <button class="btn pri" type="submit">Guardar ajustes</button></form>
      <div class="bloque" style="margin-top:22px"><h3>Tu contraseña</h3><p style="margin:0">Entrás como <b>${esc(db.usuario?.email)}</b>.</p><div><button class="btn chico" type="button" data-accion="cambiar-clave">Cambiar contraseña</button></div></div>`;
    },
    papelera() {
      return `<div class="cabeza"><h2>Papelera</h2><span class="contador">${db.papelera.length} elementos</span></div>
      <div class="tabla"><table><thead><tr><th>Qué</th><th>De</th><th>Cuándo</th><th></th></tr></thead><tbody>
      ${db.papelera.map((p) => `<tr><td><b>${esc(p.etiqueta)}</b></td><td>${esc(p.de)}</td><td>${new Date(p.cuando).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td><div class="acciones"><button class="btn chico" data-restaurar="${p.tipo}" data-id="${p.id}">Restaurar</button></div></td></tr>`).join('')}
      </tbody></table>${db.papelera.length ? '' : '<div class="vacio">La papelera está vacía. Lo que elimines queda acá 30 días.</div>'}</div>`;
    },
  };

  function grillaProductos(lista, titulo, que) {
    const items = db[lista].filter((s) => !busqueda || s.nombre.toLowerCase().includes(busqueda));
    return `<div class="cabeza"><h2>${titulo}</h2><span class="contador">${db[lista].length} ${que}</span><button class="btn pri" data-nuevo="${lista}">${lista === 'xl' ? 'Nuevo XL' : 'Nuevo sabor'}</button></div>
    <div class="barra"><input type="search" placeholder="Buscar sabor" aria-label="Buscar sabor" value="${esc(busqueda)}" data-buscar></div>
    ${seleccion.size ? `<div class="lote" role="region" aria-label="Acciones con los seleccionados"><b>${seleccion.size} elegidos:</b>${ESTADOS.map(([k, t]) => `<button class="btn chico" data-lote="${k}" data-lista="${lista}">${t}</button>`).join('')}<button class="btn chico" data-lote="ninguno">Quitar selección</button></div>` : ''}
    <div class="tabla tarjetas-movil"><table><thead><tr><th><input type="checkbox" aria-label="Elegir todos" data-todos="${lista}" style="width:20px;height:20px"></th><th>#</th><th>Foto</th><th>Nombre</th><th>Estado (tocá para cambiar)</th><th></th></tr></thead><tbody>
    ${items.map((s) => `<tr class="fs"><td class="sel"><input type="checkbox" aria-label="Elegir ${esc(s.nombre)}" data-sel="${s.id}" ${seleccion.has(s.id) ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--choco)"></td><td class="id">#${s.id}</td><td>${s.foto ? `<img class="mini ${lista === 'xl' ? 'xl' : ''}" src="${esc(s.foto)}" alt="">` : ''}</td><td><b>${esc(s.nombre)}</b>${s.descripcion ? `<br><small>${esc(s.descripcion)}</small>` : ''}</td><td class="full">${selectorEstado(s, lista)}</td>
    <td class="full"><div class="acciones"><button class="btn chico" data-editar="${lista}" data-id="${s.id}">Editar</button><button class="btn chico peligro" data-borrar="${lista}" data-id="${s.id}">Eliminar</button></div></td></tr>`).join('')}
    </tbody></table>${items.length ? '' : '<div class="vacio">No hay nada con esa búsqueda.</div>'}</div>
    <p><small><b>Disponible:</b> normal. <b>Hoy no hay:</b> se puede pedir solo para otro día. <b>Agotado:</b> se ve pero no se puede pedir. <b>Oculto:</b> no aparece en la web.</small></p>`;
  }

  function render() {
    if (!db) return;
    cont.innerHTML = vistas[modulo]();
    document.querySelectorAll('.menu [data-m]').forEach((b) => b.classList.toggle('activo', b.dataset.m === modulo));
    $('#titulo-top').textContent = NOMBRES[modulo];
    $('#n-pedidos').textContent = db.resumen.nuevos || '';
    $('#n-papelera').textContent = db.papelera.length || '';
  }
  async function ir(m, opciones = {}) {
    modulo = m; pagina = 1; seleccion.clear(); busqueda = ''; filtro = { ...FILTRO0, ...opciones };
    cerrarLado(); cerrarMenu();
    if (m === 'pedidos') { ped = null; render(); await cargarPedidos(); }
    render(); cont.focus?.(); scrollTo(0, 0);
  }
  async function refrescarPedidos() { await cargarPedidos(); render(); }

  // ---------- menú ----------
  const menu = $('#menu'), btnMenu = $('#abrir-menu');
  function cerrarMenu() { menu.classList.remove('abierto'); btnMenu.setAttribute('aria-expanded', 'false'); $('.velo')?.remove(); }
  btnMenu.onclick = () => { if (menu.classList.contains('abierto')) return cerrarMenu(); menu.classList.add('abierto'); btnMenu.setAttribute('aria-expanded', 'true'); const v = document.createElement('div'); v.className = 'velo'; v.onclick = cerrarMenu; document.body.appendChild(v); };
  menu.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) ir(b.dataset.m); });
  $('#salir').onclick = async () => { await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); location.assign('/gestionar/entrar'); };

  // ---------- formularios ----------
  const buscar = (lista, id) => db[lista].find((x) => x.id == id);
  function formulario(lista, item) {
    const nuevo = !item;
    if (lista === 'sabores' || lista === 'xl') {
      return lado(nuevo ? (lista === 'xl' ? 'Nuevo XL' : 'Nuevo sabor') : 'Editar ' + item.nombre,
        campo('nombre', 'Nombre', item?.nombre, 'text', '', 'maxlength="60" required') +
        (lista === 'xl' ? campo('descripcion', 'Descripción', item?.descripcion, 'text', 'Por ejemplo: con raspas de dulce de leche.', 'maxlength="120"') : campo('color', 'Color de fondo de la tarjeta', item?.color || '#F4B9BF', 'color')) +
        campoFoto(item?.foto) + '<small>Subí la foto del heladito con fondo blanco o liso.</small>',
        async (f, d) => {
          const nombre = String(f.get('nombre') || '').trim(); if (!nombre) { avisar('Poné un nombre'); return false; }
          const foto = await subirFoto(d.querySelector('#f-foto').files[0]); if (foto === false) return false;
          return hacer({ accion: 'guardar_producto', lista, id: item?.id, nombre, descripcion: lista === 'xl' ? String(f.get('descripcion') || '') : undefined, color: lista === 'sabores' ? String(f.get('color')) : undefined, foto: foto || undefined });
        });
    }
    if (lista === 'promos') {
      return lado(nuevo ? 'Nueva promo' : 'Editar promo',
        campo('titulo', 'Título', item?.titulo, 'text', 'Es lo que se lee grande y lo que llega en el mensaje de WhatsApp.', 'maxlength="100" required') + campo('detalle', 'Detalle', item?.detalle, 'textarea', '', 'maxlength="400"') + campoFoto(item?.foto) +
        campo('desde', 'Desde', item ? item.desde : hoyISO(), 'date') + campo('hasta', 'Hasta (opcional)', item?.hasta, 'date', 'Si la dejás vacía, la promo queda hasta que toques "Terminar promo".'),
        async (f, d) => {
          const titulo = String(f.get('titulo') || '').trim(); if (!titulo) { avisar('Poné un título'); return false; }
          const foto = await subirFoto(d.querySelector('#f-foto').files[0]); if (foto === false) return false;
          return hacer({ accion: 'guardar_promo', id: item?.id, titulo, detalle: String(f.get('detalle') || ''), desde: String(f.get('desde') || ''), hasta: String(f.get('hasta') || ''), foto: foto || undefined });
        });
    }
    if (lista === 'puntos') {
      return lado(nuevo ? 'Nuevo local' : 'Editar ' + item.nombre,
        campo('nombre', 'Nombre del local', item?.nombre, 'text', '', 'maxlength="80" required') + campo('barrio', 'Barrio (opcional)', item?.barrio, 'text', '', 'maxlength="80"') + campo('mapa', 'Link de Google Maps', item?.mapa, 'url', 'Abrí el local en Google Maps, tocá Compartir y pegá el link acá.'),
        (f) => {
          const nombre = String(f.get('nombre') || '').trim(), mapa = String(f.get('mapa') || '').trim();
          if (!nombre || !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|maps\.google\.com)\//.test(mapa)) { avisar('Revisá el nombre y que el link sea de Google Maps'); return false; }
          return hacer({ accion: 'guardar_punto', id: item?.id, nombre, barrio: String(f.get('barrio') || ''), mapa });
        });
    }
    if (lista === 'precios') {
      return lado('Nuevo escalón', `<div class="campo"><label for="f-producto">Producto</label><select id="f-producto" name="producto"><option value="gourmet">Heladito</option><option value="xl">Helado XL</option></select></div>` + campo('desde', 'Desde (unidades)', '', 'number', '', 'min="2"') + campo('precio', 'Precio cada uno (G.)', '', 'number', '', 'min="0" step="500"'),
        (f) => {
          const desde = +f.get('desde'), precio = +f.get('precio');
          if (!(desde > 1 && precio > 0)) { avisar('Revisá cantidad y precio'); return false; }
          return hacer({ accion: 'nuevo_precio', producto: f.get('producto'), desde, precio });
        });
    }
  }
  function verPedido(p) {
    const fac = p.factura;
    lado('Pedido ' + p.codigo,
      `<div class="previa detalle-pedido"><b>${esc(p.nombre)}</b>
        <span>${p.detalle.map((l) => `${l.cantidad} ${l.tipo === 'xl' ? 'XL' : 'heladitos'} de ${esc(l.sabor)}`).join('<br>')}</span>
        <span>${p.modalidad === 'hoy' ? 'Para hoy' : 'Para otro día'}: <b>${cap(diaTxt(p.fechaEntrega))}</b> (${fecha(p.fechaEntrega)}) · ${p.entrega === 'bolt' ? 'Bolt Envíos' : 'Retiro en Reducto'}</span>
        ${p.unidadesGourmet ? `<span>${p.unidadesGourmet} heladitos a ${gs(p.precioGourmet)}</span>` : ''}${p.unidadesXl ? `<span>${p.unidadesXl} XL a ${gs(p.precioXl)}</span>` : ''}
        <span>Total <b>${gs(p.total)}</b> · Seña <b>${gs(p.sena)}</b></span>
        ${fac ? `<span><b>Factura electrónica:</b><br>${esc(fac.nombre_apellido)} · RUC ${esc(fac.ruc)} · ${esc(fac.correo)}</span>` : ''}
        <small>Entró el ${new Date(p.creado).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>` +
      campo('notas', 'Notas internas', p.notas, 'textarea', 'Solo las ves vos.', 'maxlength="1000"'),
      async (f) => { const ok = await hacer({ accion: 'notas_pedido', id: p.id, notas: String(f.get('notas') || '') }, { recargar: false }); if (ok) await refrescarPedidos(); return ok; },
      { boton: 'Guardar notas' });
  }
  function cambiarClave() {
    lado('Cambiar contraseña',
      campo('actual', 'Contraseña actual', '', 'password', '', 'autocomplete="current-password"') + campo('nueva', 'Contraseña nueva', '', 'password', '10 caracteres o más.', 'autocomplete="new-password" minlength="10"') + campo('repetir', 'Repetila', '', 'password', '', 'autocomplete="new-password"'),
      async (f) => {
        const nueva = String(f.get('nueva')); if (nueva.length < 10) { avisar('La contraseña nueva tiene que tener 10 caracteres o más'); return false; }
        if (nueva !== String(f.get('repetir'))) { avisar('Las dos contraseñas no son iguales'); return false; }
        const r = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword: f.get('actual'), newPassword: nueva, revokeOtherSessions: true }) });
        if (r.ok) { avisar('Contraseña cambiada'); return true; }
        avisar(r.status === 429 ? 'Probaste muchas veces. Esperá 15 minutos.' : 'La contraseña actual no coincide'); return false;
      }, { boton: 'Cambiar contraseña' });
  }

  // ---------- eventos ----------
  cont.addEventListener('click', async (e) => {
    const t = e.target.closest('button,a'); if (!t) return;
    const d = t.dataset;
    if (d.ir) return ir(d.ir, d.dia ? { dia: d.dia } : {});
    if (d.e) return hacer({ accion: 'estado', lista: d.lista, ids: [+d.id], estado: d.e });
    if (d.lote) { if (d.lote === 'ninguno') { seleccion.clear(); return render(); } const ids = [...seleccion]; seleccion.clear(); return hacer({ accion: 'estado', lista: d.lista, ids, estado: d.lote }); }
    if (d.accion === 'todo-disponible') return hacer({ accion: 'todo_disponible' });
    if (d.accion === 'prueba') { if ($('#f-email').value.trim() !== db.ajustes.email) return avisar('Primero guardá los ajustes con el email nuevo'); return hacer({ accion: 'email_prueba' }, { recargar: false }); }
    if (d.accion === 'copiar-pago') { const v = $('#f-pago').value; try { navigator.clipboard.writeText(v).then(() => avisar('Copiado'), () => {}); } catch (err) {} return; }
    if (d.accion === 'cambiar-clave') return cambiarClave();
    if (t.matches('button[data-original]')) { const el = cont.querySelector('#t-' + d.original); el.value = el.dataset.original; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); return avisar('Volvió al original. Tocá "Guardar textos".'); }
    if (d.nuevo) return formulario(d.nuevo);
    if (d.editar) return formulario(d.editar, buscar(d.editar, d.id));
    if (d.borrar) { const it = buscar(d.borrar, d.id); const nom = it.nombre || it.titulo; return confirmar(`¿Eliminar "${nom}"? Va a la papelera y lo podés restaurar durante 30 días.`, () => hacer({ accion: 'borrar', lista: d.borrar, id: +d.id })); }
    if (d.borrarPrecio) { const p = db.precios.find((x) => x.id == d.borrarPrecio); return confirmar(`¿Eliminar el precio de ${PRODUCTO[p.producto]} desde ${p.desde}?`, () => hacer({ accion: 'borrar_precio', id: p.id })); }
    if (d.terminar) { const p = buscar('promos', d.terminar); return confirmar(`¿Terminar la promo "${p.titulo}"? Deja de verse en la web, pero no se borra.`, () => hacer({ accion: 'terminar_promo', id: p.id }), 'Terminar promo'); }
    if (d.duplicar) return hacer({ accion: 'duplicar_promo', id: +d.duplicar });
    if (d.restaurar) return hacer({ accion: 'restaurar', lista: d.restaurar, id: +d.id });
    if (d.verPedido) return verPedido(ped.filas.find((x) => x.id == d.verPedido));
    if (d.fEstado !== undefined) { filtro.estado = d.fEstado; pagina = 1; return refrescarPedidos(); }
    if (d.pag && !t.disabled) { pagina = +d.pag; await refrescarPedidos(); cont.querySelector('.cabeza')?.scrollIntoView({ block: 'start' }); return; }
    if (d.limpiar !== undefined) { filtro = { ...FILTRO0 }; busqueda = ''; pagina = 1; await refrescarPedidos(); return avisar('Filtros limpios'); }
  });
  cont.addEventListener('change', async (e) => {
    const t = e.target, d = t.dataset;
    if (d.estadoPedido) { const ok = await hacer({ accion: 'estado_pedido', id: +d.estadoPedido, estado: t.value }, { recargar: false }); if (ok) { await cargar(); await refrescarPedidos(); } return; }
    if (d.precio) { const min = d.k === 'desde' ? 2 : 0; const v = Math.max(min, Math.round(+t.value || 0)); return hacer({ accion: 'precio', id: +d.precio, campo: d.k, valor: v }); }
    if (d.visible) return hacer({ accion: 'visible_punto', id: +d.visible, visible: t.checked });
    if (d.sel) { t.checked ? seleccion.add(+d.sel) : seleccion.delete(+d.sel); return render(); }
    if (d.todos) { db[d.todos].forEach((s) => (t.checked ? seleccion.add(s.id) : seleccion.delete(s.id))); return render(); }
    if (d.porPagina !== undefined) { porPagina = +t.value; pagina = 1; return refrescarPedidos(); }
    if (d.filtro) { filtro[d.filtro] = t.value; pagina = 1; await refrescarPedidos(); cont.querySelector('#f-' + d.filtro)?.focus(); }
  });
  let tBusca;
  cont.addEventListener('input', (e) => {
    const n = e.target.name && cont.querySelector(`[data-cuenta="${e.target.name}"]`);
    if (n) n.textContent = e.target.value.length;
    if (e.target.dataset.buscar === undefined) return;
    busqueda = e.target.value.toLowerCase(); pagina = 1;
    const reponer = () => { const i = cont.querySelector('[data-buscar]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
    if (modulo === 'pedidos') { clearTimeout(tBusca); tBusca = setTimeout(async () => { await refrescarPedidos(); reponer(); }, 300); }
    else { render(); reponer(); }
  });
  cont.addEventListener('submit', async (e) => {
    if (e.target.id === 'form-textos') {
      e.preventDefault();
      const valores = {};
      e.target.querySelectorAll('[data-original]:is(input,textarea)').forEach((el) => {
        const v = el.value.trim();
        valores[el.name] = v === el.dataset.original.trim() ? '' : v; // igual al original = no se guarda
      });
      const abiertos = [...e.target.querySelectorAll('details[open] summary h3')].map((h) => h.textContent);
      await hacer({ accion: 'textos', valores });
      cont.querySelectorAll('details.bloque-textos').forEach((d) => { if (abiertos.includes(d.querySelector('h3').textContent)) d.open = true; });
      return;
    }
    if (e.target.id !== 'form-ajustes') return;
    e.preventDefault();
    const f = new FormData(e.target), g = (k) => String(f.get(k) || '').trim();
    await hacer({ accion: 'ajustes', email: g('email'), whatsapp: g('whatsapp'), instagram: g('instagram'), tiktok: g('tiktok'), horario: g('horario'), mapa: g('mapa'), sena: Math.round(+g('sena') || 0), pago: String(f.get('pago') || '') });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarLado(); cerrarMenu(); $('.confirmar')?.remove(); } });

  // ---------- arranque ----------
  (async () => {
    await cargar();
    const m = /^#pedido-\d+$/.test(location.hash) ? 'pedidos' : 'inicio';
    if (m === 'pedidos') await ir('pedidos'); else render();
  })();
})();

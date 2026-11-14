import { crearBackend, MODO_DEMO, traducirError, uid } from './datos.js';

const CONFIG = window.CONFIG || {};

// ───────────────────────── Constantes ─────────────────────────
const FUENTES = [
  ['Lora', 'Lora — de libro'],
  ['EB Garamond', 'Garamond — clásica'],
  ['Cormorant Garamond', 'Cormorant — elegante'],
  ['Playfair Display', 'Playfair — títulos'],
  ['Dancing Script', 'Dancing — manuscrita'],
  ['Great Vibes', 'Great Vibes — caligrafía'],
  ['Caveat', 'Caveat — a mano'],
  ['Patrick Hand', 'Patrick — cuaderno'],
  ['Amatic SC', 'Amatic — divertida'],
  ['Quicksand', 'Quicksand — redondita'],
  ['Montserrat', 'Montserrat — moderna'],
  ['Josefin Sans', 'Josefin — minimalista'],
];
const PAPELES = [
  ['crema', 'Crema'], ['blanco', 'Blanco'], ['rosa', 'Rosa'], ['celeste', 'Celeste'],
  ['kraft', 'Kraft'], ['rayado', 'Cuaderno rayado'], ['noche', 'Noche'],
];
const TAPAS = ['#5b1a26', '#1f2a44', '#2f4a3a', '#b9787c', '#1d1b1a', '#6b4f2a', '#4a3561'];
const COLORES_TEXTO = ['#2b2321', '#5b1a26', '#9c2f3f', '#1f2a44', '#2f4a3a', '#6b4f2a', '#7a7068', '#ffffff'];
const ASPECTO_HOJA = 0.72; // ancho / alto

const AJUSTES_BASE = {
  titulo: CONFIG.TITULO || 'Nuestro libro',
  subtitulo: 'Nuestra historia, hoja por hoja',
  tapa: '#5b1a26',
  papel: 'crema',
  fuente: 'Lora',
  fuenteTitulos: 'Playfair Display',
  tam: 3.4,
  tamTitulo: 7,
  color: '#2b2321',
  interlineado: 1.45,
  fechas: [],
};

// ───────────────────────── Estado ─────────────────────────
const S = {
  be: null, user: null, perfil: null, esDueno: false,
  ajustes: { ...AJUSTES_BASE },
  paginas: [], elementos: [], urls: {},
  pliego: 0, editar: false, sel: null, editandoTexto: null,
  hojaActiva: null, panel: null, perfilesLista: null,
  prefs: cargarPrefs(),
};

function cargarPrefs() {
  try { return { zoom: 1, noche: false, ...JSON.parse(localStorage.getItem('libro.prefs') || '{}') }; }
  catch { return { zoom: 1, noche: false }; }
}
function guardarPrefs() { try { localStorage.setItem('libro.prefs', JSON.stringify(S.prefs)); } catch { /* sin almacenamiento */ } }

// ───────────────────────── Utilidades DOM ─────────────────────────
function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (val === undefined || val === null) continue;
        if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const $ = (s, r = document) => r.querySelector(s);
const ICON = {
  lapiz: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>',
  rueda: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  indice: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  izq: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  der: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  ojo: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  ojoNo: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  basura: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  copia: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  arriba: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  abajo: '<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  salir: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  rotar: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  listo: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
};
const icono = (n) => h('span', { class: 'ico', html: ICON[n] });

function toast(texto, tipo = '') {
  const t = h('div', { class: 'toast ' + tipo }, texto);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('fuera'), tipo === 'error' ? 5200 : 2800);
  setTimeout(() => t.remove(), tipo === 'error' ? 5800 : 3400);
}
function fallo(e) { console.error(e); toast(traducirError(e), 'error'); }

const limpiar = (html) => window.DOMPurify
  ? DOMPurify.sanitize(html || '', { ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'div', 'p', 'span'], ALLOWED_ATTR: [] })
  : (html || '').replace(/<(?!\/?(b|strong|i|em|u|br|div|p|span)\b)[^>]*>/gi, '').replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
const textoPlano = (html) => { const d = document.createElement('div'); d.innerHTML = limpiar(html); return (d.textContent || '').trim(); };

// ───────────────────────── Guardado diferido ─────────────────────────
const pendientes = new Map();
function guardarElemento(id, cambios, inmediato = false) {
  const el = S.elementos.find(e => e.id === id);
  if (!el) return;
  Object.assign(el, cambios);
  const p = pendientes.get(id) || { cambios: {}, t: null };
  Object.assign(p.cambios, cambios);
  clearTimeout(p.t);
  const enviar = async () => {
    pendientes.delete(id);
    try { await S.be.editarElemento(id, p.cambios); } catch (e) { fallo(e); }
  };
  if (inmediato) enviar(); else { p.t = setTimeout(enviar, 700); pendientes.set(id, p); }
}
let tAjustes = null;
function guardarAjustes() {
  clearTimeout(tAjustes);
  tAjustes = setTimeout(async () => {
    try { await S.be.guardarAjustes(S.ajustes); } catch (e) { fallo(e); }
  }, 600);
}
window.addEventListener('beforeunload', () => {
  for (const [id, p] of pendientes) { clearTimeout(p.t); S.be.editarElemento(id, p.cambios).catch(() => {}); }
});

// ───────────────────────── Arranque ─────────────────────────
async function iniciar() {
  try {
    S.be = await crearBackend();
  } catch (e) {
    $('#app').replaceChildren(h('div', { class: 'cargando' }, 'No se pudo conectar con la base de datos. Revisá js/config.js.'));
    console.error(e); return;
  }
  aplicarPrefs();
  const u = await S.be.sesion().catch(() => null);
  if (u) await entrarCon(u); else pantallaEntrada();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

function aplicarPrefs() {
  document.body.classList.toggle('noche', !!S.prefs.noche);
  document.documentElement.style.setProperty('--zoom', S.prefs.zoom || 1);
}

function pantallaEntrada(error) {
  S.user = null;
  const usuario = h('input', { type: 'text', name: 'usuario', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', placeholder: 'Usuario', required: true });
  const clave = h('input', { type: 'password', name: 'clave', autocomplete: 'current-password', placeholder: 'Contraseña', required: true });
  const msg = h('p', { class: 'entrada-error', role: 'alert' }, error || '');
  const boton = h('button', { class: 'btn primario ancho', type: 'submit' }, 'Abrir el libro');
  const form = h('form', {
    class: 'entrada-form',
    onsubmit: async (ev) => {
      ev.preventDefault();
      boton.disabled = true; boton.textContent = 'Abriendo…'; msg.textContent = '';
      try { const u = await S.be.entrar(usuario.value, clave.value); await entrarCon(u); }
      catch (e) { msg.textContent = traducirError(e); boton.disabled = false; boton.textContent = 'Abrir el libro'; }
    },
  }, usuario, clave, boton, msg);

  $('#app').replaceChildren(h('main', { class: 'entrada' },
    h('div', { class: 'entrada-tapa' },
      h('div', { class: 'tapa-borde' },
        h('div', { class: 'tapa-ornamento' }, '❦'),
        h('h1', null, CONFIG.TITULO || 'Nuestro libro'),
        h('p', { class: 'tapa-sub' }, 'Solo para quienes tienen la llave'),
        form,
      ),
    ),
    MODO_DEMO ? h('div', { class: 'demo-aviso' },
      h('b', null, 'Modo demo. '), 'Entrá con ', h('code', null, 'ari'), ', ', h('code', null, 'mile'), ' o ', h('code', null, 'invitado'),
      ' y contraseña ', h('code', null, 'demo'), '. Nada se guarda al recargar.') : null,
  ));
  setTimeout(() => usuario.focus(), 50);
}

async function entrarCon(u) {
  S.user = u;
  $('#app').replaceChildren(h('div', { class: 'cargando' }, 'Abriendo el libro…'));
  try {
    S.perfil = await S.be.perfil(u.id);
    if (!S.perfil) throw new Error('Este usuario no tiene perfil. Corré de nuevo el archivo esquema.sql en Supabase.');
    S.esDueno = S.perfil.rol === 'dueno';
    await recargar(false);
  } catch (e) {
    await S.be.salir().catch(() => {});
    pantallaEntrada(traducirError(e)); return;
  }
  S.pliego = 0; S.editar = false; S.sel = null;
  pintar();
  avisoFechasCercanas();
}

async function recargar(repintar = true) {
  const [aj, pags, els] = await Promise.all([S.be.ajustes(), S.be.paginas(), S.be.elementos()]);
  S.ajustes = { ...AJUSTES_BASE, ...(aj || {}) };
  S.paginas = pags || [];
  S.elementos = els || [];
  await refrescarUrls();
  if (repintar) pintar();
}
async function refrescarUrls(soloNuevas = false) {
  const rutas = S.elementos.map(e => e.archivo).filter(Boolean).filter(r => !soloNuevas || !S.urls[r]);
  if (!rutas.length) return;
  try { Object.assign(S.urls, await S.be.urls([...new Set(rutas)])); } catch (e) { console.warn(e); }
}
// Las URLs firmadas duran 6 h: se renuevan solas
setInterval(() => { if (S.user && !S.editar) { S.urls = {}; refrescarUrls().then(() => pintarLibro()); } }, 5 * 60 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.user && !S.editar && !S.panel && pendientes.size === 0) recargar().catch(() => {});
});

// ───────────────────────── Estructura del libro ─────────────────────────
function esDoble() { return window.innerWidth >= 880 && window.innerWidth / window.innerHeight > 1.05; }
// Índice 0 = tapa; 1..n = hojas
function pliegos() {
  const n = S.paginas.length;
  const out = [[0]];
  if (esDoble()) for (let i = 1; i <= n; i += 2) out.push(i + 1 <= n ? [i, i + 1] : [i]);
  else for (let i = 1; i <= n; i++) out.push([i]);
  return out;
}
function pliegoDeHoja(idx) { return Math.max(0, pliegos().findIndex(p => p.includes(idx))); }
function irA(n, dir) {
  const total = pliegos().length;
  n = Math.max(0, Math.min(total - 1, n));
  if (n === S.pliego) return;
  terminarEdicionTexto();
  S.pliego = n; S.sel = null;
  pintarLibro(dir || 'sig');
}

// ───────────────────────── Pintado general ─────────────────────────
function pintar() {
  $('#app').replaceChildren(
    h('div', { class: 'app' + (S.editar ? ' editando' : '') },
      barraSuperior(),
      h('div', { class: 'escenario', id: 'escenario' }),
      S.editar ? barraHerramientas() : null,
      h('div', { id: 'panel-elemento' }),
      h('div', { id: 'capa-panel' }),
    ),
  );
  pintarLibro();
  pintarPanelLateral();
}

function barraSuperior() {
  const prox = proximasFechas()[0];
  const chip = prox && prox.dias <= 7
    ? h('div', { class: 'chip-fecha', title: 'Próxima fecha especial' }, `${prox.emoji || '✨'} ${textoFecha(prox, true)}`)
    : null;
  const inicial = (S.perfil.nombre || S.perfil.usuario || '?').trim().charAt(0).toUpperCase();
  return h('header', { class: 'barra' },
    h('button', { class: 'barra-titulo', onclick: () => irA(0, 'ant'), title: 'Ir a la tapa' }, S.ajustes.titulo),
    chip,
    h('div', { class: 'barra-acciones' },
      h('button', { class: 'btn-ico', title: 'Índice', 'aria-label': 'Índice', onclick: () => abrirPanel('indice') }, icono('indice')),
      S.esDueno ? h('button', {
        class: 'btn-ico' + (S.editar ? ' activo' : ''), title: S.editar ? 'Terminar de editar' : 'Editar el libro',
        'aria-label': 'Editar', onclick: alternarEdicion,
      }, icono(S.editar ? 'listo' : 'lapiz')) : null,
      h('button', { class: 'btn-ico', title: 'Ajustes', 'aria-label': 'Ajustes', onclick: () => abrirPanel('ajustes') }, icono('rueda')),
      h('button', { class: 'avatar', title: `${S.perfil.nombre} — tocá para salir`, onclick: () => abrirPanel('cuenta') }, inicial),
    ),
  );
}

function alternarEdicion() {
  terminarEdicionTexto();
  S.editar = !S.editar; S.sel = null;
  if (S.editar && S.pliego === 0 && S.paginas.length) S.pliego = 1;
  if (!S.editar) for (const [id, p] of pendientes) { clearTimeout(p.t); guardarElemento(id, {}, true); }
  pintar();
  if (S.editar) toast('Modo edición: arrastrá, agrandá y girá lo que quieras');
}

function medidasHoja() {
  const esc = $('#escenario');
  const W = esc.clientWidth, H = esc.clientHeight;
  const doble = esDoble();
  let ph = Math.min(H * 0.94, (W * (doble ? 0.94 : 0.96)) / (doble ? 2 : 1) / ASPECTO_HOJA);
  ph = Math.max(ph, 200);
  return { pw: ph * ASPECTO_HOJA, ph, doble };
}

function pintarLibro(animar) {
  const esc = $('#escenario');
  if (!esc) return;
  const lista = pliegos();
  if (S.pliego >= lista.length) S.pliego = lista.length - 1;
  const actual = lista[S.pliego];
  const { pw, ph, doble } = medidasHoja();

  const libro = h('div', { class: 'libro' + (doble ? ' doble' : ' simple') + (actual[0] === 0 ? ' en-tapa' : '') });
  libro.style.setProperty('--pw', pw + 'px');
  libro.style.setProperty('--ph', ph + 'px');

  if (actual[0] === 0) {
    libro.append(nodoTapa());
  } else {
    actual.forEach((idx, i) => libro.append(nodoHoja(S.paginas[idx - 1], idx, doble ? (i === 0 ? 'izq' : 'der') : 'unica')));
    if (doble && actual.length === 1) {
      libro.append(S.esDueno && S.editar
        ? h('div', { class: 'hoja der hoja-vacia' }, h('button', { class: 'btn-agregar-hoja', onclick: () => agregarHoja() }, '+ Agregar hoja'))
        : h('div', { class: 'hoja der hoja-fin' }, h('div', { class: 'fin-ornamento' }, '❦')));
    }
  }
  if (S.editar && !S.hojaActiva) S.hojaActiva = actual[0] > 0 ? S.paginas[actual[actual.length - 1] - 1]?.id : null;

  const ant = h('button', { class: 'flecha izq', 'aria-label': 'Hoja anterior', disabled: S.pliego === 0, onclick: () => irA(S.pliego - 1, 'ant') }, icono('izq'));
  const sig = h('button', { class: 'flecha der', 'aria-label': 'Hoja siguiente', disabled: S.pliego >= lista.length - 1, onclick: () => irA(S.pliego + 1, 'sig') }, icono('der'));

  const vacio = S.paginas.length === 0 && S.pliego === 0;
  const pie = h('div', { class: 'pie' },
    actual[0] === 0 ? (vacio ? (S.esDueno ? 'El libro está vacío: tocá el lápiz para empezar' : 'Todavía no hay hojas') : 'Tapa')
      : `${actual.join(' – ')} de ${S.paginas.length}`);

  esc.replaceChildren(ant, libro, sig, pie);
  if (animar) {
    libro.classList.add(animar === 'ant' ? 'gira-ant' : 'gira-sig');
    setTimeout(() => libro.classList.remove('gira-ant', 'gira-sig'), 600);
  }
  pintarPanelElemento();
}

// ───────────────────────── Tapa ─────────────────────────
function nodoTapa() {
  const fechas = proximasFechas().slice(0, 3);
  return h('div', {
    class: 'hoja tapa', style: { '--tapa': S.ajustes.tapa },
    onclick: (ev) => { if (!ev.target.closest('button') && S.paginas.length) irA(1, 'sig'); },
  },
    h('div', { class: 'tapa-borde' },
      h('div', { class: 'tapa-ornamento' }, '❦'),
      h('h1', { style: { fontFamily: `'${S.ajustes.fuenteTitulos}', serif` } }, S.ajustes.titulo),
      S.ajustes.subtitulo ? h('p', { class: 'tapa-sub' }, S.ajustes.subtitulo) : null,
      fechas.length ? h('ul', { class: 'tapa-fechas' }, fechas.map(f =>
        h('li', { class: f.dias <= 7 ? 'cerca' : '' }, h('span', { class: 'emo' }, f.emoji || '✨'), textoFecha(f)))) : null,
      S.paginas.length
        ? h('button', { class: 'btn tapa-abrir', onclick: () => irA(1, 'sig') }, 'Abrir ›')
        : (S.esDueno ? h('button', { class: 'btn tapa-abrir', onclick: () => agregarHoja() }, '+ Primera hoja') : null),
    ),
  );
}

// ───────────────────────── Hojas ─────────────────────────
function nodoHoja(pag, idx, lado) {
  const papel = pag.fondo || S.ajustes.papel;
  const activa = S.editar && S.hojaActiva === pag.id;
  const hoja = h('div', {
    class: `hoja ${lado} papel-${papel}` + (pag.oculta ? ' oculta' : '') + (activa ? ' activa' : ''),
    'data-pagina': pag.id,
    style: {
      '--fuente': `'${S.ajustes.fuente}'`, '--fuente-t': `'${S.ajustes.fuenteTitulos}'`,
      '--tam': S.ajustes.tam, '--tam-t': S.ajustes.tamTitulo, '--color': S.ajustes.color, '--interlineado': S.ajustes.interlineado,
    },
    onpointerdown: (ev) => {
      if (!S.editar) return;
      if (S.hojaActiva !== pag.id) {
        S.hojaActiva = pag.id;
        document.querySelectorAll('.hoja.activa').forEach(x => x.classList.remove('activa'));
        hoja.classList.add('activa');
      }
      if (ev.target === hoja || ev.target.classList.contains('hoja-contenido')) { terminarEdicionTexto(); seleccionar(null); }
    },
  });
  const cont = h('div', { class: 'hoja-contenido' });
  S.elementos.filter(e => e.pagina_id === pag.id).sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(e => cont.append(nodoElemento(e)));
  hoja.append(cont, h('div', { class: 'num-hoja' }, String(idx)));

  if (pag.oculta && S.esDueno) hoja.append(h('div', { class: 'sello-oculta' }, icono('ojoNo'), 'Hoja oculta para invitados'));
  if (S.editar) hoja.append(barraHoja(pag, idx));
  if (!S.editar && S.elementos.every(e => e.pagina_id !== pag.id)) cont.append(h('div', { class: 'hoja-sin-nada' }, '❦'));

  // Soltar archivos directamente sobre una hoja
  if (S.editar) {
    hoja.addEventListener('dragover', ev => { ev.preventDefault(); hoja.classList.add('soltar'); });
    hoja.addEventListener('dragleave', () => hoja.classList.remove('soltar'));
    hoja.addEventListener('drop', ev => {
      ev.preventDefault(); hoja.classList.remove('soltar');
      S.hojaActiva = pag.id;
      if (ev.dataTransfer.files.length) dialogoArchivos([...ev.dataTransfer.files]);
    });
  }
  return hoja;
}

function barraHoja(pag, idx) {
  const sel = h('select', {
    class: 'mini-select', title: 'Papel de esta hoja',
    onchange: async (ev) => { pag.fondo = ev.target.value || null; pintarLibro(); try { await S.be.editarPagina(pag.id, { fondo: pag.fondo }); } catch (e) { fallo(e); } },
  }, h('option', { value: '' }, 'Papel del libro'), PAPELES.map(([v, t]) => h('option', { value: v, selected: pag.fondo === v }, t)));
  return h('div', { class: 'barra-hoja', onpointerdown: ev => ev.stopPropagation() },
    h('span', { class: 'bh-num' }, `Hoja ${idx}`),
    h('button', { class: 'mini', title: 'Mover antes', disabled: idx === 1, onclick: () => moverHoja(pag, -1) }, icono('izq')),
    h('button', { class: 'mini', title: 'Mover después', disabled: idx === S.paginas.length, onclick: () => moverHoja(pag, 1) }, icono('der')),
    sel,
    h('button', {
      class: 'mini' + (pag.oculta ? ' on' : ''), title: pag.oculta ? 'Oculta para invitados (tocar para mostrar)' : 'Ocultar hoja a invitados',
      onclick: async () => { pag.oculta = !pag.oculta; pintarLibro(); try { await S.be.editarPagina(pag.id, { oculta: pag.oculta }); toast(pag.oculta ? 'Hoja oculta para invitados' : 'Hoja visible para invitados'); } catch (e) { fallo(e); } },
    }, icono(pag.oculta ? 'ojoNo' : 'ojo')),
    h('button', { class: 'mini peligro', title: 'Borrar hoja', onclick: () => borrarHoja(pag) }, icono('basura')),
  );
}

async function agregarHoja() {
  const idxActual = pliegos()[S.pliego];
  const ultima = idxActual[idxActual.length - 1];
  // Se inserta después de la hoja visible (o al final si estamos en la tapa)
  const pos = ultima === 0 ? S.paginas.length : ultima;
  const antes = S.paginas[pos - 1], despues = S.paginas[pos];
  const orden = antes && despues ? (antes.orden + despues.orden) / 2 : antes ? antes.orden + 1 : despues ? despues.orden - 1 : 1;
  try {
    const p = await S.be.crearPagina({ orden });
    S.paginas.splice(pos, 0, p);
    S.hojaActiva = p.id;
    if (!S.editar) { S.editar = true; pintar(); }
    S.pliego = pliegoDeHoja(pos + 1);
    pintarLibro('sig');
    toast('Hoja nueva agregada');
    return p;
  } catch (e) { fallo(e); }
}

async function moverHoja(pag, dir) {
  const i = S.paginas.indexOf(pag), j = i + dir;
  if (j < 0 || j >= S.paginas.length) return;
  const otra = S.paginas[j];
  [pag.orden, otra.orden] = [otra.orden, pag.orden];
  if (pag.orden === otra.orden) pag.orden += dir * 0.5;
  S.paginas.sort((a, b) => a.orden - b.orden);
  S.pliego = pliegoDeHoja(S.paginas.indexOf(pag) + 1);
  pintarLibro(dir > 0 ? 'sig' : 'ant');
  try { await Promise.all([S.be.editarPagina(pag.id, { orden: pag.orden }), S.be.editarPagina(otra.id, { orden: otra.orden })]); } catch (e) { fallo(e); }
}

async function borrarHoja(pag) {
  const cant = S.elementos.filter(e => e.pagina_id === pag.id).length;
  const ok = await confirmar('¿Borrar esta hoja?', cant ? `Se borran también sus ${cant} elemento${cant > 1 ? 's' : ''} y los archivos. No se puede deshacer.` : 'No se puede deshacer.', 'Borrar hoja');
  if (!ok) return;
  const archivos = S.elementos.filter(e => e.pagina_id === pag.id && e.archivo).map(e => e.archivo);
  try {
    await S.be.borrarPagina(pag.id);
    await S.be.borrarArchivos(archivos).catch(() => {});
    S.paginas = S.paginas.filter(p => p.id !== pag.id);
    S.elementos = S.elementos.filter(e => e.pagina_id !== pag.id);
    if (S.hojaActiva === pag.id) S.hojaActiva = null;
    pintarLibro('ant');
    toast('Hoja borrada');
  } catch (e) { fallo(e); }
}

// ───────────────────────── Elementos ─────────────────────────
function estiloTexto(e) {
  const st = e.estilo || {};
  const titulo = e.tipo === 'titulo';
  const o = {};
  if (st.fuente) o.fontFamily = `'${st.fuente}', serif`;
  const tam = st.tam || null;
  if (tam) o.fontSize = `calc(${tam} * 1cqw * var(--zoom, 1))`;
  if (st.color) o.color = st.color;
  if (st.negrita !== undefined) o.fontWeight = st.negrita ? '700' : '400';
  if (st.cursiva !== undefined) o.fontStyle = st.cursiva ? 'italic' : 'normal';
  if (st.subrayado) o.textDecoration = 'underline';
  o.textAlign = st.alinear || (titulo ? 'center' : 'left');
  if (st.interlineado) o.lineHeight = st.interlineado;
  return o;
}

function nodoElemento(e) {
  const st = e.estilo || {};
  const nodo = h('div', {
    class: `elem tipo-${e.tipo}` + (e.oculto ? ' es-oculto' : '') + (S.sel === e.id ? ' sel' : '') +
      (st.marco ? ' marco-' + st.marco : '') + (st.caja ? ' caja-' + st.caja : ''),
    'data-id': e.id,
    style: {
      left: e.x + '%', top: e.y + '%', width: e.w + '%',
      transform: e.rot ? `rotate(${e.rot}deg)` : '', zIndex: e.z || 1,
    },
  });

  if (e.tipo === 'titulo' || e.tipo === 'texto') {
    const t = h('div', { class: 'elem-texto', style: estiloTexto(e), html: limpiar(e.contenido) });
    nodo.append(t);
  } else if (e.tipo === 'imagen' || e.tipo === 'video') {
    const url = S.urls[e.archivo];
    const caja = h('div', { class: 'media', style: { aspectRatio: String(st.ar || 1.333) } });
    if (!url) caja.append(h('div', { class: 'media-falta' }, e.tipo === 'imagen' ? '🖼️' : '🎬'));
    else if (e.tipo === 'imagen') caja.append(h('img', { src: url, alt: e.descripcion || '', loading: 'lazy', draggable: 'false' }));
    else caja.append(h('video', { src: url, controls: !S.editar, playsinline: true, preload: 'metadata' }));
    if (e.tipo === 'video') caja.append(h('div', { class: 'media-badge' }, '▶'));
    nodo.append(caja);
    if (st.verDesc && e.descripcion) nodo.append(h('div', { class: 'media-desc', style: estiloTexto({ ...e, tipo: 'texto', estilo: { alinear: 'center', ...st } }) }, e.descripcion));
    if (!S.editar && url) nodo.addEventListener('click', (ev) => { if (e.tipo === 'imagen' || ev.target.tagName !== 'VIDEO') lightbox(e); });
  } else if (e.tipo === 'audio') {
    const url = S.urls[e.archivo];
    nodo.append(
      h('div', { class: 'audio-tarjeta' },
        h('div', { class: 'audio-ico' }, '♫'),
        h('div', { class: 'audio-cuerpo' },
          e.descripcion ? h('div', { class: 'audio-desc', style: estiloTexto({ ...e, tipo: 'texto' }) }, e.descripcion) : null,
          url ? h('audio', { src: url, controls: true, preload: 'metadata' }) : h('div', { class: 'media-falta chica' }, 'Audio no disponible'),
        ),
      ),
    );
  }

  if (e.oculto && S.esDueno) nodo.append(h('div', { class: 'insignia-oculto', title: 'Oculto para invitados' }, icono('ojoNo')));

  if (S.editar) {
    nodo.append(
      h('div', { class: 'tirador redim', title: 'Agrandar / achicar' }),
      h('div', { class: 'tirador giro', title: 'Girar' }, icono('rotar')),
    );
    nodo.addEventListener('pointerdown', (ev) => iniciarArrastre(ev, e, nodo));
    nodo.addEventListener('dblclick', () => { if (e.tipo === 'titulo' || e.tipo === 'texto') editarTexto(e.id); });
  }
  return nodo;
}

function seleccionar(id) {
  if (S.sel === id) return;
  if (S.editandoTexto && S.editandoTexto !== id) terminarEdicionTexto();
  S.sel = id;
  document.querySelectorAll('.elem.sel').forEach(n => n.classList.remove('sel'));
  if (id) document.querySelector(`.elem[data-id="${id}"]`)?.classList.add('sel');
  pintarPanelElemento();
}

function iniciarArrastre(ev, e, nodo) {
  if (S.editandoTexto === e.id && !ev.target.closest('.tirador')) return; // escribiendo: no arrastrar
  if (ev.button !== undefined && ev.button !== 0) return;
  const yaSel = S.sel === e.id;
  seleccionar(e.id);
  const hoja = nodo.closest('.hoja');
  S.hojaActiva = e.pagina_id;
  const r = hoja.getBoundingClientRect();
  const modo = ev.target.closest('.redim') ? 'redim' : ev.target.closest('.giro') ? 'giro' : 'mover';
  const ini = { px: ev.clientX, py: ev.clientY, x: e.x, y: e.y, w: e.w, rot: e.rot || 0 };
  const nr = nodo.getBoundingClientRect();
  const centro = { x: nr.left + nr.width / 2, y: nr.top + nr.height / 2 };
  const angIni = Math.atan2(ev.clientY - centro.y, ev.clientX - centro.x) * 180 / Math.PI;
  let movio = false;
  ev.preventDefault();
  nodo.setPointerCapture?.(ev.pointerId);
  nodo.classList.add('arrastrando');

  const mover = (m) => {
    const dx = (m.clientX - ini.px) / r.width * 100;
    const dy = (m.clientY - ini.py) / r.height * 100;
    if (!movio && Math.hypot(m.clientX - ini.px, m.clientY - ini.py) < 4) return;
    movio = true;
    if (modo === 'mover') {
      e.x = clamp(ini.x + dx, -ini.w + 8, 92);
      e.y = clamp(ini.y + dy, -5, 95);
      nodo.style.left = e.x + '%'; nodo.style.top = e.y + '%';
    } else if (modo === 'redim') {
      // proyecta el movimiento sobre la diagonal (tiene en cuenta el giro)
      const a = (ini.rot) * Math.PI / 180;
      const proy = dx * Math.cos(a) + dy * (r.height / r.width) * Math.sin(a);
      e.w = clamp(ini.w + proy, 8, 120);
      nodo.style.width = e.w + '%';
    } else {
      const ang = Math.atan2(m.clientY - centro.y, m.clientX - centro.x) * 180 / Math.PI;
      let rot = ini.rot + (ang - angIni);
      rot = ((rot + 540) % 360) - 180;
      if (Math.abs(rot) < 3) rot = 0;
      e.rot = Math.round(rot * 10) / 10;
      nodo.style.transform = e.rot ? `rotate(${e.rot}deg)` : '';
    }
  };
  const fin = () => {
    nodo.removeEventListener('pointermove', mover);
    nodo.removeEventListener('pointerup', fin);
    nodo.removeEventListener('pointercancel', fin);
    nodo.classList.remove('arrastrando');
    if (movio) {
      const c = modo === 'mover' ? { x: r2(e.x), y: r2(e.y) } : modo === 'redim' ? { w: r2(e.w) } : { rot: e.rot };
      guardarElemento(e.id, c);
    } else if (yaSel && modo === 'mover' && (e.tipo === 'titulo' || e.tipo === 'texto')) {
      editarTexto(e.id); // segundo toque = escribir
    }
  };
  nodo.addEventListener('pointermove', mover);
  nodo.addEventListener('pointerup', fin);
  nodo.addEventListener('pointercancel', fin);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;

function editarTexto(id) {
  const nodo = document.querySelector(`.elem[data-id="${id}"]`);
  const t = nodo?.querySelector('.elem-texto');
  if (!t) return;
  seleccionar(id);
  S.editandoTexto = id;
  nodo.classList.add('escribiendo');
  t.contentEditable = 'true';
  t.focus();
  const rango = document.createRange(); rango.selectNodeContents(t);
  const s = getSelection(); s.removeAllRanges(); s.addRange(rango);
  t.oninput = () => guardarElemento(id, { contenido: limpiar(t.innerHTML) });
  t.onpaste = (ev) => {
    ev.preventDefault();
    const texto = (ev.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, texto);
  };
  t.onkeydown = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); terminarEdicionTexto(); } };
  pintarPanelElemento();
}
function terminarEdicionTexto() {
  const id = S.editandoTexto;
  if (!id) return;
  S.editandoTexto = null;
  const nodo = document.querySelector(`.elem[data-id="${id}"]`);
  const t = nodo?.querySelector('.elem-texto');
  if (t) {
    t.contentEditable = 'false';
    const limpio = limpiar(t.innerHTML);
    const el = S.elementos.find(x => x.id === id);
    if (el && el.contenido !== limpio) guardarElemento(id, { contenido: limpio });
    nodo.classList.remove('escribiendo');
  }
  getSelection()?.removeAllRanges();
  pintarPanelElemento();
}

function zSiguiente(paginaId) {
  return Math.max(0, ...S.elementos.filter(e => e.pagina_id === paginaId).map(e => e.z || 0)) + 1;
}

async function hojaDestino() {
  if (S.hojaActiva && S.paginas.some(p => p.id === S.hojaActiva)) {
    const idx = S.paginas.findIndex(p => p.id === S.hojaActiva) + 1;
    if (!pliegos()[S.pliego].includes(idx)) S.hojaActiva = null;
  }
  if (!S.hojaActiva) {
    const vis = pliegos()[S.pliego].filter(i => i > 0);
    if (vis.length) S.hojaActiva = S.paginas[vis[vis.length - 1] - 1].id;
  }
  if (!S.hojaActiva) { const p = await agregarHoja(); return p?.id; }
  return S.hojaActiva;
}

async function agregarElemento(tipo, extra = {}) {
  const pagina_id = await hojaDestino();
  if (!pagina_id) return;
  const cuantos = S.elementos.filter(e => e.pagina_id === pagina_id).length;
  const desfase = (cuantos % 5) * 4;
  const base = tipo === 'titulo'
    ? { x: 8, y: 6 + desfase, w: 84, contenido: 'Un título' }
    : tipo === 'texto'
      ? { x: 12, y: 26 + desfase, w: 76, contenido: 'Escribí acá tu recuerdo…' }
      : { x: 18 + desfase, y: 18 + desfase, w: tipo === 'audio' ? 70 : 62 };
  try {
    const nuevo = await S.be.crearElemento({ pagina_id, tipo, rot: 0, z: zSiguiente(pagina_id), estilo: {}, oculto: false, ...base, ...extra });
    S.elementos.push(nuevo);
    if (nuevo.archivo) await refrescarUrls(true);
    pintarLibro();
    seleccionar(nuevo.id);
    if (tipo === 'titulo' || tipo === 'texto') setTimeout(() => editarTexto(nuevo.id), 30);
    return nuevo;
  } catch (e) { fallo(e); }
}

async function borrarElemento(e) {
  const ok = await confirmar('¿Borrar este elemento?', e.archivo ? 'También se borra el archivo. No se puede deshacer.' : 'No se puede deshacer.', 'Borrar');
  if (!ok) return;
  try {
    pendientes.delete(e.id);
    await S.be.borrarElemento(e.id);
    if (e.archivo && !S.elementos.some(x => x.id !== e.id && x.archivo === e.archivo)) await S.be.borrarArchivos([e.archivo]).catch(() => {});
    S.elementos = S.elementos.filter(x => x.id !== e.id);
    S.sel = null; S.editandoTexto = null;
    pintarLibro();
  } catch (err) { fallo(err); }
}

async function duplicarElemento(e) {
  const { id, creado, creado_por, ...resto } = e;
  try {
    const n = await S.be.crearElemento({ ...resto, x: e.x + 4, y: e.y + 4, z: zSiguiente(e.pagina_id) });
    S.elementos.push(n); pintarLibro(); seleccionar(n.id);
  } catch (err) { fallo(err); }
}

// ───────────────────────── Barra de herramientas (edición) ─────────────────────────
function barraHerramientas() {
  const entrada = (accept, multiple = true) => {
    const i = h('input', { type: 'file', accept, multiple, hidden: true, onchange: () => { if (i.files.length) dialogoArchivos([...i.files]); i.value = ''; } });
    return i;
  };
  const fFoto = entrada('image/*'), fVideo = entrada('video/*'), fAudio = entrada('audio/*,.m4a,.mp3,.ogg,.opus,.wav,.aac');
  const b = (emoji, texto, fn) => h('button', { class: 'herr', onclick: fn }, h('span', { class: 'herr-emo' }, emoji), h('span', { class: 'herr-txt' }, texto));
  return h('nav', { class: 'herramientas', 'aria-label': 'Agregar al libro' },
    b('𝐓', 'Título', () => agregarElemento('titulo')),
    b('¶', 'Texto', () => agregarElemento('texto')),
    b('🖼️', 'Foto', () => fFoto.click()),
    b('🎬', 'Video', () => fVideo.click()),
    b('🎙️', 'Audio', () => fAudio.click()),
    h('span', { class: 'herr-sep' }),
    b('📄', 'Hoja', () => agregarHoja()),
    fFoto, fVideo, fAudio,
  );
}

// ───────────────────────── Panel del elemento seleccionado ─────────────────────────
function pintarPanelElemento() {
  const cont = $('#panel-elemento');
  if (!cont) return;
  const e = S.editar && S.sel ? S.elementos.find(x => x.id === S.sel) : null;
  if (!e) {
    if (S.editar) {
      cont.className = 'abierto';
      cont.replaceChildren(h('div', { class: 'pe-pista' },
        h('b', null, 'Tocá cualquier cosa de la hoja para editarla.'), h('br'), h('br'),
        '• Arrastrala para moverla.', h('br'), '• El círculo de abajo la agranda; el de arriba la gira.', h('br'),
        '• En los textos, tocá de nuevo para escribir.', h('br'), '• Podés soltar fotos desde la compu directo sobre una hoja.'));
    } else { cont.replaceChildren(); cont.className = ''; }
    return;
  }
  cont.className = 'abierto';
  const st = e.estilo || {};
  const esTexto = e.tipo === 'titulo' || e.tipo === 'texto';
  const set = (cambios, repintarNodo = true) => {
    guardarElemento(e.id, { estilo: { ...(e.estilo || {}), ...cambios } });
    if (repintarNodo) reemplazarNodo(e);
  };
  const tamBase = e.tipo === 'titulo' ? S.ajustes.tamTitulo : S.ajustes.tam;
  const tam = st.tam || tamBase;

  const formato = (cmd, clave) => h('button', {
    class: 'pe-btn' + (st[clave] ? ' on' : ''), title: { bold: 'Negrita', italic: 'Cursiva', underline: 'Subrayado' }[cmd],
    onpointerdown: (ev) => ev.preventDefault(), // no robar el foco al texto
    onclick: () => {
      if (S.editandoTexto === e.id && !getSelection().isCollapsed) {
        document.execCommand(cmd);
        const t = document.querySelector(`.elem[data-id="${e.id}"] .elem-texto`);
        guardarElemento(e.id, { contenido: limpiar(t.innerHTML) });
      } else set({ [clave]: !st[clave] }, true);
    },
  }, { bold: 'B', italic: 'I', underline: 'U' }[cmd]);

  const filas = [];
  if (esTexto || e.tipo === 'audio' || st.verDesc) {
    filas.push(h('div', { class: 'pe-fila' },
      h('select', { class: 'pe-select', title: 'Tipo de letra', onchange: ev => set({ fuente: ev.target.value || undefined }) },
        h('option', { value: '' }, 'Letra del libro'),
        FUENTES.map(([f, n]) => h('option', { value: f, selected: st.fuente === f, style: { fontFamily: `'${f}'` } }, n))),
      h('div', { class: 'pe-tam' },
        h('button', { class: 'pe-btn', title: 'Más chica', onpointerdown: ev => ev.preventDefault(), onclick: () => set({ tam: r2(Math.max(1.2, tam / 1.12)) }) }, 'A−'),
        h('span', { class: 'pe-tam-num' }, String(Math.round(tam * 10))),
        h('button', { class: 'pe-btn', title: 'Más grande', onpointerdown: ev => ev.preventDefault(), onclick: () => set({ tam: r2(Math.min(30, tam * 1.12)) }) }, 'A+'),
      ),
    ));
    filas.push(h('div', { class: 'pe-fila' },
      formato('bold', 'negrita'), formato('italic', 'cursiva'), formato('underline', 'subrayado'),
      h('span', { class: 'pe-sep' }),
      ['left', 'center', 'right'].map(a => h('button', {
        class: 'pe-btn' + ((st.alinear || (e.tipo === 'titulo' ? 'center' : 'left')) === a ? ' on' : ''),
        title: { left: 'Izquierda', center: 'Centro', right: 'Derecha' }[a], onpointerdown: ev => ev.preventDefault(),
        onclick: () => set({ alinear: a }),
      }, h('span', { class: 'ico-alinear al-' + a }, h('i'), h('i'), h('i')))),
      h('span', { class: 'pe-sep' }),
      h('div', { class: 'pe-colores' }, COLORES_TEXTO.map(c => h('button', {
        class: 'pe-color' + (st.color === c ? ' on' : ''), style: { background: c }, title: 'Color',
        onpointerdown: ev => ev.preventDefault(), onclick: () => set({ color: c }),
      })), h('label', { class: 'pe-color otro', title: 'Otro color' }, '+', h('input', { type: 'color', value: st.color || S.ajustes.color, oninput: ev => set({ color: ev.target.value }) }))),
    ));
  }
  if (esTexto) {
    filas.push(h('div', { class: 'pe-fila' },
      h('label', { class: 'pe-etq' }, 'Caja'),
      [['', 'Sin caja'], ['nota', 'Notita'], ['etiqueta', 'Etiqueta'], ['cinta', 'Cinta']].map(([v, t]) =>
        h('button', { class: 'pe-chip' + ((st.caja || '') === v ? ' on' : ''), onclick: () => set({ caja: v || undefined }) }, t)),
    ));
  }
  if (e.tipo === 'imagen' || e.tipo === 'video') {
    filas.push(h('div', { class: 'pe-fila' },
      h('label', { class: 'pe-etq' }, 'Marco'),
      [['', 'Ninguno'], ['polaroid', 'Polaroid'], ['sombra', 'Sombra'], ['cinta', 'Cinta'], ['redondo', 'Redondeado']].map(([v, t]) =>
        h('button', { class: 'pe-chip' + ((st.marco || '') === v ? ' on' : ''), onclick: () => set({ marco: v || undefined }) }, t)),
    ));
  }
  if (!esTexto) {
    const ta = h('textarea', {
      class: 'pe-desc', rows: 2, placeholder: 'Descripción de este recuerdo…', value: e.descripcion || '',
      oninput: () => { guardarElemento(e.id, { descripcion: ta.value }); clearTimeout(ta._t); ta._t = setTimeout(() => reemplazarNodo(e), 500); },
    });
    filas.push(h('div', { class: 'pe-fila col' }, ta,
      e.tipo !== 'audio' ? h('label', { class: 'pe-check' },
        h('input', { type: 'checkbox', checked: !!st.verDesc, onchange: ev => set({ verDesc: ev.target.checked }) }),
        'Mostrar la descripción en la hoja') : null,
    ));
  }
  filas.push(h('div', { class: 'pe-fila acciones' },
    h('button', {
      class: 'pe-accion' + (e.oculto ? ' on' : ''), onclick: () => {
        guardarElemento(e.id, { oculto: !e.oculto }, true); reemplazarNodo(e);
        toast(e.oculto ? 'Ahora los invitados no lo ven' : 'Ahora los invitados lo ven');
      },
    }, icono(e.oculto ? 'ojoNo' : 'ojo'), e.oculto ? 'Oculto a invitados' : 'Visible para todos'),
    esTexto ? h('button', { class: 'pe-accion', onclick: () => editarTexto(e.id) }, icono('lapiz'), 'Escribir') : null,
    h('button', { class: 'pe-accion', title: 'Traer adelante', onclick: () => { guardarElemento(e.id, { z: zSiguiente(e.pagina_id) }); reemplazarNodo(e); } }, icono('arriba')),
    h('button', {
      class: 'pe-accion', title: 'Mandar atrás', onclick: () => {
        const min = Math.min(...S.elementos.filter(x => x.pagina_id === e.pagina_id).map(x => x.z || 0));
        guardarElemento(e.id, { z: min - 1 }); reemplazarNodo(e);
      },
    }, icono('abajo')),
    h('button', { class: 'pe-accion', title: 'Enderezar', disabled: !e.rot, onclick: () => { guardarElemento(e.id, { rot: 0 }); reemplazarNodo(e); } }, icono('rotar')),
    h('button', { class: 'pe-accion', title: 'Duplicar', onclick: () => duplicarElemento(e) }, icono('copia')),
    h('button', { class: 'pe-accion peligro', title: 'Borrar', onclick: () => borrarElemento(e) }, icono('basura')),
    h('button', { class: 'pe-accion cerrar', title: 'Listo', onclick: () => { terminarEdicionTexto(); seleccionar(null); } }, icono('cerrar')),
  ));
  cont.replaceChildren(h('div', { class: 'pe', onpointerdown: ev => { if (ev.target.tagName !== 'TEXTAREA' && ev.target.tagName !== 'SELECT' && ev.target.tagName !== 'INPUT') ev.stopPropagation(); } }, filas));
}

function reemplazarNodo(e) {
  const viejo = document.querySelector(`.elem[data-id="${e.id}"]`);
  const estabaEscribiendo = S.editandoTexto === e.id;
  if (estabaEscribiendo) {
    // mientras se escribe, solo actualizamos estilos para no perder el cursor
    const t = viejo.querySelector('.elem-texto');
    Object.assign(t.style, { fontFamily: '', fontSize: '', color: '', fontWeight: '', fontStyle: '', textDecoration: '', lineHeight: '' }, estiloTexto(e));
    viejo.className = viejo.className.replace(/\b(caja|marco)-\S+/g, '').trim() + (e.estilo?.caja ? ' caja-' + e.estilo.caja : '');
    pintarPanelElemento(); return;
  }
  if (viejo) viejo.replaceWith(nodoElemento(e));
  pintarPanelElemento();
}

// ───────────────────────── Subida de archivos ─────────────────────────
const MAX_BYTES = 50 * 1024 * 1024;
function tipoDe(file) {
  if (file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(file.name)) return 'imagen';
  if (file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) return 'video';
  if (file.type.startsWith('audio/') || /\.(mp3|m4a|ogg|opus|wav|aac)$/i.test(file.name)) return 'audio';
  return null;
}
const mb = (b) => (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';

function dialogoArchivos(files) {
  const items = files.map(f => ({ f, tipo: tipoDe(f), desc: '', oculto: false, verDesc: false })).filter(i => {
    if (!i.tipo) { toast(`"${i.f.name}" no es foto, video ni audio`, 'error'); return false; }
    if (i.tipo !== 'imagen' && i.f.size > MAX_BYTES) { toast(`"${i.f.name}" pesa ${mb(i.f.size)}. El máximo es 50 MB: probá recortarlo o comprimirlo.`, 'error'); return false; }
    return true;
  });
  if (!items.length) return;

  const lista = h('div', { class: 'subir-lista' }, items.map(it => {
    const url = URL.createObjectURL(it.f);
    it.url = url;
    const vista = it.tipo === 'imagen' ? h('img', { src: url, alt: '' })
      : it.tipo === 'video' ? h('video', { src: url, muted: true, playsinline: true, preload: 'metadata' })
        : h('div', { class: 'subir-audio' }, '♫');
    const ta = h('textarea', { rows: 2, placeholder: 'Descripción (qué fue, cuándo, dónde…)', oninput: ev => { it.desc = ev.target.value; } });
    return h('div', { class: 'subir-item' },
      h('div', { class: 'subir-vista' }, vista),
      h('div', { class: 'subir-campos' },
        h('div', { class: 'subir-nombre' }, it.f.name, h('span', null, ' · ' + mb(it.f.size))),
        ta,
        h('div', { class: 'subir-opciones' },
          it.tipo !== 'audio' ? h('label', { class: 'pe-check' }, h('input', { type: 'checkbox', onchange: ev => { it.verDesc = ev.target.checked; } }), 'Mostrar descripción en la hoja') : null,
          h('label', { class: 'pe-check' }, h('input', { type: 'checkbox', onchange: ev => { it.oculto = ev.target.checked; } }), 'Ocultar a invitados'),
        ),
      ),
    );
  }));
  const estado = h('div', { class: 'subir-estado' });
  const boton = h('button', { class: 'btn primario' }, items.length > 1 ? `Agregar ${items.length} archivos` : 'Agregar a la hoja');
  const cerrar = modal(h('div', { class: 'dialogo subir' },
    h('h2', null, items.length > 1 ? 'Agregar recuerdos' : 'Agregar recuerdo'),
    lista, estado,
    h('div', { class: 'dialogo-botones' }, h('button', { class: 'btn', onclick: () => cerrar() }, 'Cancelar'), boton),
  ), () => items.forEach(i => URL.revokeObjectURL(i.url)));

  boton.onclick = async () => {
    boton.disabled = true;
    let hechos = 0;
    for (const it of items) {
      estado.textContent = `Subiendo ${hechos + 1} de ${items.length}… (${it.f.name})`;
      try {
        await subirUno(it);
        hechos++;
      } catch (e) { fallo(e); }
    }
    estado.textContent = '';
    cerrar();
    if (hechos) toast(hechos > 1 ? `Se agregaron ${hechos} recuerdos` : 'Recuerdo agregado');
  };
}

async function subirUno(it) {
  let blob = it.f, tipo = it.f.type || '', ar = 1.333;
  if (it.tipo === 'imagen') {
    const r = await prepararImagen(it.f);
    blob = r.blob; tipo = r.tipo; ar = r.ar;
  } else if (it.tipo === 'video') {
    ar = await aspectoVideo(it.url).catch(() => 1.777);
    if (!tipo) tipo = 'video/mp4';
  } else if (!tipo) {
    tipo = 'audio/mpeg';
  }
  if (blob.size > MAX_BYTES) throw new Error(`"${it.f.name}" pesa ${mb(blob.size)}. El máximo es 50 MB.`);
  const ruta = await S.be.subir(blob, tipo, it.f.name);
  const extra = { archivo: ruta, descripcion: it.desc.trim() || null, oculto: it.oculto, estilo: {} };
  if (it.tipo === 'imagen') {
    extra.estilo = { ar: r2(ar), marco: 'polaroid', verDesc: it.verDesc };
    extra.rot = r2((Math.random() * 6) - 3);
    extra.w = ar < 1 ? 46 : 62;
  } else if (it.tipo === 'video') {
    extra.estilo = { ar: r2(ar), marco: 'sombra', verDesc: it.verDesc };
    extra.w = ar < 1 ? 44 : 70;
  }
  await agregarElemento(it.tipo, extra);
}

function cargarImg(url) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo leer la imagen (si es HEIC, exportala como JPG).')); i.src = url; });
}
async function prepararImagen(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await cargarImg(url);
    const w = img.naturalWidth, hh = img.naturalHeight, ar = w / hh;
    const MAX = 2200;
    const escala = Math.min(1, MAX / Math.max(w, hh));
    const directo = file.type === 'image/gif' || (escala === 1 && file.size < 1.5 * 1024 * 1024 && /image\/(jpeg|png|webp)/.test(file.type));
    if (directo) return { blob: file, tipo: file.type, ar };
    const c = document.createElement('canvas');
    c.width = Math.round(w * escala); c.height = Math.round(hh * escala);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    if (!blob) throw new Error('No se pudo comprimir la imagen.');
    return { blob, tipo: 'image/jpeg', ar };
  } finally { URL.revokeObjectURL(url); }
}
function aspectoVideo(url) {
  return new Promise((ok, mal) => {
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => ok(v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 1.777);
    v.onerror = mal; v.src = url;
    setTimeout(() => ok(1.777), 6000);
  });
}

// ───────────────────────── Modales y paneles ─────────────────────────
function modal(contenido, alCerrar) {
  const fondo = h('div', { class: 'modal-fondo', onclick: (ev) => { if (ev.target === fondo) cerrar(); } }, contenido);
  const tecla = (ev) => { if (ev.key === 'Escape') cerrar(); };
  function cerrar() { fondo.classList.add('fuera'); setTimeout(() => fondo.remove(), 200); document.removeEventListener('keydown', tecla); alCerrar?.(); }
  document.addEventListener('keydown', tecla);
  document.body.append(fondo);
  return cerrar;
}
function confirmar(titulo, texto, accion = 'Aceptar') {
  return new Promise(ok => {
    let r = false;
    const cerrar = modal(h('div', { class: 'dialogo chico' },
      h('h2', null, titulo), h('p', null, texto),
      h('div', { class: 'dialogo-botones' },
        h('button', { class: 'btn', onclick: () => cerrar() }, 'Cancelar'),
        h('button', { class: 'btn peligro', onclick: () => { r = true; cerrar(); } }, accion)),
    ), () => ok(r));
  });
}

function lightbox(e) {
  const url = S.urls[e.archivo];
  const media = e.tipo === 'imagen' ? h('img', { src: url, alt: e.descripcion || '' }) : h('video', { src: url, controls: true, autoplay: true, playsinline: true });
  const cerrar = modal(h('div', { class: 'lightbox', onclick: (ev) => { if (ev.target.classList.contains('lightbox')) cerrar(); } },
    h('button', { class: 'lb-cerrar btn-ico', 'aria-label': 'Cerrar', onclick: () => cerrar() }, icono('cerrar')),
    media,
    e.descripcion ? h('p', { class: 'lb-desc' }, e.descripcion) : null,
  ));
}

function abrirPanel(nombre) {
  terminarEdicionTexto();
  S.panel = S.panel === nombre ? null : nombre;
  if (nombre === 'ajustes' && S.esDueno && !S.perfilesLista) S.be.perfiles().then(l => { S.perfilesLista = l; if (S.panel === 'ajustes') pintarPanelLateral(); }).catch(() => {});
  pintarPanelLateral();
}

function pintarPanelLateral() {
  const capa = $('#capa-panel');
  if (!capa) return;
  if (!S.panel) { capa.replaceChildren(); capa.className = ''; return; }
  capa.className = 'abierta';
  const cerrar = () => { S.panel = null; pintarPanelLateral(); };
  const cuerpo = S.panel === 'indice' ? panelIndice() : S.panel === 'cuenta' ? panelCuenta() : panelAjustes();
  const titulos = { indice: 'Índice', cuenta: 'Tu sesión', ajustes: 'Ajustes' };
  capa.replaceChildren(
    h('div', { class: 'panel-fondo', onclick: cerrar }),
    h('aside', { class: 'panel' },
      h('div', { class: 'panel-cab' }, h('h2', null, titulos[S.panel]), h('button', { class: 'btn-ico', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar'))),
      h('div', { class: 'panel-cuerpo' }, cuerpo),
    ),
  );
}

function panelIndice() {
  const tapa = h('button', { class: 'ind-item', onclick: () => { S.panel = null; pintarPanelLateral(); irA(0, 'ant'); } }, h('span', { class: 'ind-num' }, '—'), 'Tapa');
  const lista = h('div', { class: 'ind-lista' });
  const ir = (p) => { S.panel = null; pintarPanelLateral(); irA(pliegoDeHoja(S.paginas.indexOf(p) + 1), 'sig'); };
  const mover = (p, dir) => {
    const i = S.paginas.indexOf(p), j = i + dir;
    if (j < 0 || j >= S.paginas.length) return;
    const nuevas = [...S.paginas];
    [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
    reordenarHojas(nuevas);
  };
  S.paginas.forEach((p, i) => {
    const tit = S.elementos.filter(e => e.pagina_id === p.id && e.tipo === 'titulo').sort((a, b) => a.y - b.y)[0];
    const otro = S.elementos.filter(e => e.pagina_id === p.id && e.tipo === 'texto').sort((a, b) => a.y - b.y)[0];
    const nombre = (tit && textoPlano(tit.contenido)) || (otro && textoPlano(otro.contenido).slice(0, 40)) || 'Hoja sin título';
    const fotos = S.elementos.filter(e => e.pagina_id === p.id && e.archivo).length;
    const boton = h('button', { class: 'ind-item', onclick: () => ir(p) },
      h('span', { class: 'ind-num' }, String(i + 1)), h('span', { class: 'ind-nombre' }, nombre),
      fotos ? h('span', { class: 'ind-extra' }, `${fotos} 📎`) : null,
      p.oculta && S.esDueno ? h('span', { class: 'ind-extra' }, icono('ojoNo')) : null);
    if (!S.esDueno) { lista.append(boton); return; }
    const manija = h('span', { class: 'ind-manija', title: 'Arrastrá para cambiar el orden', 'aria-label': 'Mover hoja' }, '⋮⋮');
    const fila = h('div', { class: 'ind-fila', 'data-id': p.id },
      manija, boton,
      h('button', { class: 'mini', title: 'Subir', disabled: i === 0, onclick: () => mover(p, -1) }, icono('arriba')),
      h('button', { class: 'mini', title: 'Bajar', disabled: i === S.paginas.length - 1, onclick: () => mover(p, 1) }, icono('abajo')));
    manija.addEventListener('pointerdown', (ev) => arrastrarEnIndice(ev, fila, lista, manija));
    lista.append(fila);
  });
  const partes = [tapa, lista];
  if (S.esDueno && S.paginas.length > 1) partes.splice(1, 0, h('p', { class: 'gris chico ind-ayuda' }, 'Para cambiar el orden, arrastrá desde ⋮⋮ o usá las flechitas.'));
  if (S.esDueno) partes.push(h('button', { class: 'btn ancho', style: { marginTop: '12px' }, onclick: () => { S.panel = null; pintarPanelLateral(); agregarHoja(); } }, '+ Agregar hoja'));
  return h('div', { class: 'indice' }, partes);
}

function arrastrarEnIndice(ev, fila, lista, manija) {
  ev.preventDefault();
  const puntero = ev.pointerId;
  fila.classList.add('arrastrando-ind');
  const cuerpo = fila.closest('.panel-cuerpo');
  const antes = [...lista.children].map(f => f.dataset.id).join();
  const mover = (m) => {
    if (m.pointerId !== puntero) return;
    m.preventDefault();
    const otras = [...lista.querySelectorAll('.ind-fila:not(.arrastrando-ind)')];
    const destino = otras.find(o => { const r = o.getBoundingClientRect(); return m.clientY < r.top + r.height / 2; });
    if (destino) { if (destino !== fila.nextElementSibling) lista.insertBefore(fila, destino); }
    else if (lista.lastElementChild !== fila) lista.append(fila);
    if (cuerpo) {
      const r = cuerpo.getBoundingClientRect();
      if (m.clientY < r.top + 40) cuerpo.scrollTop -= 12; else if (m.clientY > r.bottom - 40) cuerpo.scrollTop += 12;
    }
  };
  const fin = () => {
    document.removeEventListener('pointermove', mover);
    document.removeEventListener('pointerup', fin);
    document.removeEventListener('pointercancel', fin);
    fila.classList.remove('arrastrando-ind');
    const ids = [...lista.children].map(f => f.dataset.id);
    if (ids.join() !== antes) reordenarHojas(ids.map(id => S.paginas.find(p => p.id === id)));
  };
  document.addEventListener('pointermove', mover, { passive: false });
  document.addEventListener('pointerup', fin);
  document.addEventListener('pointercancel', fin);
}

async function reordenarHojas(nuevas) {
  const vista = pliegos()[S.pliego]?.[0] > 0 ? S.paginas[pliegos()[S.pliego][0] - 1] : null;
  const cambiadas = [];
  nuevas.forEach((p, i) => { if (p.orden !== i + 1) { p.orden = i + 1; cambiadas.push(p); } });
  S.paginas = nuevas;
  if (vista) S.pliego = pliegoDeHoja(S.paginas.indexOf(vista) + 1);
  pintarLibro();
  pintarPanelLateral();
  try {
    await Promise.all(cambiadas.map(p => S.be.editarPagina(p.id, { orden: p.orden })));
    toast('Orden de las hojas guardado');
  } catch (e) { fallo(e); }
}

function panelCuenta() {
  const cont = h('div', { class: 'cuenta' },
    h('div', { class: 'cuenta-quien' },
      h('div', { class: 'avatar grande' }, (S.perfil.nombre || '?').charAt(0).toUpperCase()),
      h('div', null, h('b', null, S.perfil.nombre || S.perfil.usuario), h('div', { class: 'gris' }, S.esDueno ? 'Dueño del libro: ve y edita todo' : 'Invitado: solo lectura, no ve lo oculto')),
    ),
  );
  if (!S.be.demo) {
    const nueva = h('input', { type: 'password', placeholder: 'Contraseña nueva (mín. 6)', autocomplete: 'new-password' });
    cont.append(h('div', { class: 'aj-grupo' }, h('h3', null, 'Cambiar mi contraseña'),
      h('div', { class: 'aj-fila' }, nueva, h('button', {
        class: 'btn', onclick: async () => {
          if (nueva.value.length < 6) return toast('Tiene que tener al menos 6 caracteres', 'error');
          try { await S.be.cambiarClave(nueva.value); nueva.value = ''; toast('Contraseña cambiada'); } catch (e) { fallo(e); }
        },
      }, 'Guardar'))));
  }
  cont.append(h('button', {
    class: 'btn ancho peligro-suave', onclick: async () => {
      await S.be.salir(); S.panel = null; S.perfilesLista = null; pantallaEntrada();
    },
  }, icono('salir'), 'Cerrar sesión'));
  return cont;
}

function panelAjustes() {
  const A = S.ajustes;
  const cambiar = (clave, valor, repintarTodo = false) => {
    A[clave] = valor; guardarAjustes();
    if (repintarTodo) pintar(); else pintarLibro();
  };
  const grupos = [];

  // Lectura (todos, se guarda en este dispositivo)
  grupos.push(h('div', { class: 'aj-grupo' },
    h('h3', null, 'Lectura ', h('span', { class: 'gris' }, '(solo en este dispositivo)')),
    h('label', { class: 'aj-etq' }, 'Tamaño de letra para leer'),
    h('div', { class: 'aj-fila' },
      h('span', { class: 'aj-a chica' }, 'A'),
      h('input', {
        type: 'range', min: '0.7', max: '1.6', step: '0.05', value: S.prefs.zoom,
        oninput: ev => { S.prefs.zoom = +ev.target.value; aplicarPrefs(); guardarPrefs(); },
      }),
      h('span', { class: 'aj-a grande' }, 'A')),
    h('label', { class: 'pe-check' }, h('input', { type: 'checkbox', checked: S.prefs.noche, onchange: ev => { S.prefs.noche = ev.target.checked; aplicarPrefs(); guardarPrefs(); } }), 'Fondo oscuro (modo noche)'),
  ));

  if (S.esDueno) {
    // Libro
    grupos.push(h('div', { class: 'aj-grupo' },
      h('h3', null, 'El libro'),
      h('label', { class: 'aj-etq' }, 'Título'),
      h('input', { type: 'text', value: A.titulo, oninput: ev => { A.titulo = ev.target.value; guardarAjustes(); pintarLibro(); const b = $('.barra-titulo'); if (b) b.textContent = A.titulo; } }),
      h('label', { class: 'aj-etq' }, 'Frase de la tapa'),
      h('input', { type: 'text', value: A.subtitulo || '', oninput: ev => cambiar('subtitulo', ev.target.value) }),
      h('label', { class: 'aj-etq' }, 'Color de tapa'),
      h('div', { class: 'aj-colores' }, TAPAS.map(c => h('button', { class: 'aj-color' + (A.tapa === c ? ' on' : ''), style: { background: c }, onclick: () => { cambiar('tapa', c); pintarPanelLateral(); } })),
        h('label', { class: 'aj-color otro', title: 'Otro' }, '+', h('input', { type: 'color', value: A.tapa, oninput: ev => cambiar('tapa', ev.target.value) }))),
      h('label', { class: 'aj-etq' }, 'Papel de las hojas'),
      h('div', { class: 'aj-papeles' }, PAPELES.map(([v, t]) => h('button', {
        class: `aj-papel papel-${v}` + (A.papel === v ? ' on' : ''), title: t, onclick: () => { cambiar('papel', v); pintarPanelLateral(); },
      }, h('span', null, t)))),
    ));

    // Formato de texto
    const selFuente = (clave) => h('select', { onchange: ev => cambiar(clave, ev.target.value) },
      FUENTES.map(([f, n]) => h('option', { value: f, selected: A[clave] === f, style: { fontFamily: `'${f}'` } }, n)));
    const muestra = h('div', { class: 'aj-muestra papel-' + A.papel },
      h('div', { style: { fontFamily: `'${A.fuenteTitulos}'`, fontSize: '26px', color: A.color, textAlign: 'center' } }, 'Nuestro primer viaje'),
      h('div', { style: { fontFamily: `'${A.fuente}'`, fontSize: '16px', color: A.color, lineHeight: A.interlineado } }, 'Ese día llovía, pero no nos importó: caminamos hasta la costa y nos reímos de todo.'));
    grupos.push(h('div', { class: 'aj-grupo' },
      h('h3', null, 'Formato de texto'),
      h('p', { class: 'gris chico' }, 'Es la letra de todo el libro. Cada texto se puede cambiar aparte desde el lápiz.'),
      h('label', { class: 'aj-etq' }, 'Letra de los textos'), selFuente('fuente'),
      h('label', { class: 'aj-etq' }, 'Letra de los títulos'), selFuente('fuenteTitulos'),
      h('label', { class: 'aj-etq' }, 'Tamaño de los textos'),
      h('input', { type: 'range', min: '2', max: '6', step: '0.1', value: A.tam, oninput: ev => cambiar('tam', +ev.target.value) }),
      h('label', { class: 'aj-etq' }, 'Tamaño de los títulos'),
      h('input', { type: 'range', min: '4', max: '12', step: '0.2', value: A.tamTitulo, oninput: ev => cambiar('tamTitulo', +ev.target.value) }),
      h('label', { class: 'aj-etq' }, 'Interlineado'),
      h('input', { type: 'range', min: '1.1', max: '2', step: '0.05', value: A.interlineado, oninput: ev => cambiar('interlineado', +ev.target.value) }),
      h('label', { class: 'aj-etq' }, 'Color del texto'),
      h('div', { class: 'aj-colores' }, COLORES_TEXTO.slice(0, 7).map(c => h('button', { class: 'aj-color' + (A.color === c ? ' on' : ''), style: { background: c }, onclick: () => { cambiar('color', c); pintarPanelLateral(); } }))),
      muestra,
    ));
  }

  // Fechas especiales
  grupos.push(panelFechas());

  if (S.esDueno) {
    const lista = S.perfilesLista;
    grupos.push(h('div', { class: 'aj-grupo' },
      h('h3', null, 'Perfiles'),
      h('p', { class: 'gris chico' }, 'Los usuarios se crean en Supabase (ver instructivo). Acá les ponés el nombre y elegís quién es dueño.'),
      !lista ? h('p', { class: 'gris' }, 'Cargando…') : h('div', { class: 'perfiles' }, lista.map(p => h('div', { class: 'perfil-fila' },
        h('div', { class: 'avatar' }, (p.nombre || p.usuario || '?').charAt(0).toUpperCase()),
        h('input', {
          type: 'text', value: p.nombre || '', placeholder: p.usuario,
          onchange: async ev => { try { await S.be.guardarPerfil(p.id, { nombre: ev.target.value }); p.nombre = ev.target.value; if (p.id === S.perfil.id) { S.perfil.nombre = p.nombre; } toast('Nombre guardado'); } catch (e) { fallo(e); } },
        }),
        h('select', {
          disabled: p.id === S.perfil.id, title: p.id === S.perfil.id ? 'No podés cambiar tu propio rol' : '',
          onchange: async ev => { try { await S.be.guardarPerfil(p.id, { rol: ev.target.value }); p.rol = ev.target.value; toast('Rol actualizado'); } catch (e) { fallo(e); } },
        }, h('option', { value: 'dueno', selected: p.rol === 'dueno' }, 'Dueño'), h('option', { value: 'invitado', selected: p.rol === 'invitado' }, 'Invitado')),
        h('span', { class: 'gris chico usuario' }, '@' + p.usuario),
      ))),
    ));
  }

  grupos.push(h('div', { class: 'aj-grupo' },
    h('h3', null, 'Instalar como app'),
    h('p', { class: 'gris chico' }, 'iPhone: en Safari, tocá Compartir → "Agregar a inicio". Android: en Chrome, menú ⋮ → "Instalar app" o "Agregar a pantalla principal".'),
  ));
  return h('div', { class: 'ajustes' }, grupos);
}

// ───────────────────────── Fechas especiales ─────────────────────────
function proximasFechas() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return (S.ajustes.fechas || []).filter(f => f.fecha && f.nombre).map(f => {
    const [y, m, d] = f.fecha.split('-').map(Number);
    let prox;
    if (f.anual !== false) {
      prox = new Date(hoy.getFullYear(), m - 1, d);
      if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, m - 1, d);
    } else prox = new Date(y, m - 1, d);
    const dias = Math.round((prox - hoy) / 864e5);
    return { ...f, prox, dias, anios: prox.getFullYear() - y };
  }).filter(f => f.dias >= 0).sort((a, b) => a.dias - b.dias);
}
function textoFecha(f, corto = false) {
  const anios = f.anual !== false && f.anios > 0 ? ` (${f.anios} ${f.anios === 1 ? 'año' : 'años'})` : '';
  if (f.dias === 0) return `¡Hoy: ${f.nombre}!${anios}`;
  if (f.dias === 1) return `Mañana: ${f.nombre}${corto ? '' : anios}`;
  return corto ? `${f.nombre} en ${f.dias} días` : `Faltan ${f.dias} días: ${f.nombre}${anios}`;
}
let avisado = false;
function avisoFechasCercanas() {
  if (avisado) return; avisado = true;
  const f = proximasFechas()[0];
  if (f && f.dias <= 7) setTimeout(() => toast(`${f.emoji || '✨'} ${textoFecha(f)}`), 900);
}

function panelFechas() {
  const A = S.ajustes;
  A.fechas = A.fechas || [];
  const grupo = h('div', { class: 'aj-grupo' }, h('h3', null, 'Fechas especiales'));
  const proximas = proximasFechas();
  if (!S.esDueno) {
    grupo.append(proximas.length ? h('ul', { class: 'fechas-lectura' }, proximas.map(f => h('li', null, `${f.emoji || '✨'} ${textoFecha(f)}`))) : h('p', { class: 'gris' }, 'No hay fechas cargadas.'));
  } else {
    grupo.append(h('p', { class: 'gris chico' }, 'Aniversarios, cumples, lo que quieran. Aparecen en la tapa con cuenta regresiva.'));
    const lista = h('div', { class: 'fechas' });
    const repintar = () => { const nuevo = panelFechas(); grupo.replaceWith(nuevo); };
    A.fechas.forEach((f) => {
      lista.append(h('div', { class: 'fecha-fila' },
        h('input', { class: 'fecha-emo', type: 'text', value: f.emoji || '', placeholder: '✨', maxlength: 4, oninput: ev => { f.emoji = ev.target.value; guardarAjustes(); } }),
        h('input', { class: 'fecha-nombre', type: 'text', value: f.nombre || '', placeholder: 'Ej: Nuestro aniversario', oninput: ev => { f.nombre = ev.target.value; guardarAjustes(); } }),
        h('input', { class: 'fecha-dia', type: 'date', value: f.fecha || '', onchange: ev => { f.fecha = ev.target.value; guardarAjustes(); } }),
        h('label', { class: 'pe-check chico', title: 'Se repite todos los años' }, h('input', { type: 'checkbox', checked: f.anual !== false, onchange: ev => { f.anual = ev.target.checked; guardarAjustes(); } }), 'Cada año'),
        h('button', { class: 'mini peligro', title: 'Quitar', onclick: () => { A.fechas = A.fechas.filter(x => x !== f); guardarAjustes(); repintar(); } }, icono('basura')),
      ));
    });
    grupo.append(lista,
      h('button', { class: 'btn', onclick: () => { A.fechas.push({ id: uid(), emoji: '', nombre: '', fecha: '', anual: true }); repintar(); setTimeout(() => grupo.parentNode && document.querySelectorAll('.fecha-nombre').forEach((x, i, all) => { if (i === all.length - 1) x.focus(); }), 30); } }, '+ Agregar fecha'),
    );
  }
  if (S.esDueno ? (A.fechas || []).length : (A.fechas || []).some(f => f.fecha && f.nombre)) {
    grupo.append(
      h('div', { class: 'aj-calendario' },
        h('p', { class: 'chico' }, '📅 Para que el celular te avise solo, descargá el calendario y abrilo: te avisa ', h('b', null, 'una semana antes'), ' y ', h('b', null, 'el mismo día'), '.'),
        h('button', { class: 'btn primario', onclick: descargarCalendario }, 'Descargar calendario (.ics)'),
      ),
    );
  }
  return grupo;
}

function descargarCalendario() {
  if (!(S.ajustes.fechas || []).some(f => f.fecha && f.nombre)) return toast('Completá el nombre y el día de al menos una fecha', 'error');
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nuestro libro//Recuerdos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(S.ajustes.titulo)}`];
  for (const f of S.ajustes.fechas || []) {
    if (!f.fecha || !f.nombre) continue;
    const [y, m, d] = f.fecha.split('-').map(Number);
    const ini = new Date(y, m - 1, d), fin = new Date(y, m - 1, d + 1);
    const nombre = `${f.emoji ? f.emoji + ' ' : ''}${f.nombre}`;
    lineas.push('BEGIN:VEVENT', `UID:${f.id || uid()}@nuestrolibro`, `DTSTAMP:${ahora}`,
      `DTSTART;VALUE=DATE:${ymd(ini)}`, `DTEND;VALUE=DATE:${ymd(fin)}`,
      ...(f.anual !== false ? ['RRULE:FREQ=YEARLY'] : []),
      `SUMMARY:${esc(nombre)}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('En una semana: ' + nombre)}`, 'TRIGGER:-P6DT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Hoy: ' + nombre)}`, 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT');
  }
  lineas.push('END:VCALENDAR');
  const blob = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'fechas-especiales.ics' });
  document.body.append(a); a.click(); a.remove();
  toast('Calendario descargado: abrilo para agregarlo');
}

// ───────────────────────── Teclado, gestos y tamaño ─────────────────────────
document.addEventListener('keydown', (ev) => {
  if (!S.user || document.querySelector('.modal-fondo')) return;
  const escribiendo = S.editandoTexto || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (escribiendo) return;
  if (ev.key === 'ArrowRight') irA(S.pliego + 1, 'sig');
  else if (ev.key === 'ArrowLeft') irA(S.pliego - 1, 'ant');
  else if (ev.key === 'Escape') { if (S.panel) { S.panel = null; pintarPanelLateral(); } else seleccionar(null); }
  else if ((ev.key === 'Delete' || ev.key === 'Backspace') && S.editar && S.sel) { ev.preventDefault(); const e = S.elementos.find(x => x.id === S.sel); if (e) borrarElemento(e); }
});

let toqueIni = null;
document.addEventListener('pointerdown', (ev) => {
  if (S.editar || !ev.target.closest?.('#escenario') || ev.target.closest('video,audio,button')) { toqueIni = null; return; }
  toqueIni = { x: ev.clientX, y: ev.clientY, t: Date.now() };
});
document.addEventListener('pointerup', (ev) => {
  if (!toqueIni) return;
  const dx = ev.clientX - toqueIni.x, dy = ev.clientY - toqueIni.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - toqueIni.t < 800) irA(S.pliego + (dx < 0 ? 1 : -1), dx < 0 ? 'sig' : 'ant');
  toqueIni = null;
});

let tResize = null, ultimoDoble = null;
window.addEventListener('resize', () => {
  clearTimeout(tResize);
  tResize = setTimeout(() => {
    if (!S.user || !$('#escenario')) return;
    const d = esDoble();
    if (ultimoDoble !== null && d !== ultimoDoble) {
      const primera = pliegosAntes(ultimoDoble)[S.pliego]?.[0] || 0;
      S.pliego = pliegoDeHoja(primera);
    }
    ultimoDoble = d;
    if (!S.editandoTexto) pintarLibro();
  }, 120);
});
function pliegosAntes(doble) {
  const n = S.paginas.length, out = [[0]];
  if (doble) for (let i = 1; i <= n; i += 2) out.push(i + 1 <= n ? [i, i + 1] : [i]);
  else for (let i = 1; i <= n; i++) out.push([i]);
  return out;
}
ultimoDoble = esDoble();

iniciar();

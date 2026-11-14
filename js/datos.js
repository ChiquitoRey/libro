// Capa de datos: Supabase de verdad, o un "modo demo" en memoria con las
// mismas reglas (los invitados no reciben lo oculto).

const C = window.CONFIG || {};
export const MODO_DEMO = !C.SUPABASE_URL || !C.SUPABASE_KEY;
const BUCKET = 'recuerdos';

export function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
}

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
  'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm', 'audio/opus': 'opus',
};
function extension(tipo, nombre) {
  if (EXT[tipo]) return EXT[tipo];
  const m = /\.([a-z0-9]{2,5})$/i.exec(nombre || '');
  return m ? m[1].toLowerCase() : 'bin';
}

function traducirError(e) {
  const msg = (e && (e.message || e.error_description || String(e))) || 'Error desconocido';
  if (/invalid login credentials/i.test(msg)) return 'Usuario o contraseña incorrectos.';
  if (/email not confirmed/i.test(msg)) return 'Ese usuario no está confirmado. En Supabase, al crearlo, tildá "Auto Confirm User".';
  if (/failed to fetch|network/i.test(msg)) return 'No hay conexión con el servidor. Revisá internet.';
  if (/row-level security|permission|not authorized|unauthorized/i.test(msg)) return 'Tu perfil no tiene permiso para hacer eso.';
  if (/exceeded the maximum allowed size|payload too large|413/i.test(msg)) return 'El archivo es demasiado grande (máximo 50 MB).';
  if (/quota|storage limit/i.test(msg)) return 'Se llenó el espacio gratuito de archivos.';
  return msg;
}
export { traducirError };

export async function crearBackend() {
  return MODO_DEMO ? crearDemo() : await crearSupabase();
}

// ───────────────────────── Supabase ─────────────────────────
async function crearSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const sb = createClient(C.SUPABASE_URL.trim(), C.SUPABASE_KEY.trim(), {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  const ok = (r) => { if (r.error) throw r.error; return r.data; };
  const aEmail = (u) => {
    u = (u || '').trim().toLowerCase();
    return u.includes('@') ? u : `${u}@${C.DOMINIO_USUARIOS || 'nuestrolibro.app'}`;
  };

  return {
    demo: false,
    async sesion() { const { data } = await sb.auth.getSession(); return data.session ? data.session.user : null; },
    async entrar(usuario, clave) {
      const r = await sb.auth.signInWithPassword({ email: aEmail(usuario), password: clave });
      if (r.error) throw r.error; return r.data.user;
    },
    async salir() { await sb.auth.signOut(); },
    async cambiarClave(nueva) { ok(await sb.auth.updateUser({ password: nueva })); },

    async perfil(id) { return ok(await sb.from('perfiles').select('*').eq('id', id).maybeSingle()); },
    async perfiles() { return ok(await sb.from('perfiles').select('*').order('usuario')); },
    async guardarPerfil(id, cambios) { ok(await sb.from('perfiles').update(cambios).eq('id', id)); },

    async ajustes() { const d = ok(await sb.from('ajustes').select('datos').eq('id', 1).maybeSingle()); return d ? (d.datos || {}) : {}; },
    async guardarAjustes(datos) { ok(await sb.from('ajustes').upsert({ id: 1, datos, actualizado: new Date().toISOString() })); },

    async paginas() { return ok(await sb.from('paginas').select('*').order('orden')); },
    async crearPagina(p) { return ok(await sb.from('paginas').insert(p).select().single()); },
    async editarPagina(id, c) { ok(await sb.from('paginas').update(c).eq('id', id)); },
    async borrarPagina(id) { ok(await sb.from('paginas').delete().eq('id', id)); },

    async elementos() { return ok(await sb.from('elementos').select('*')); },
    async crearElemento(e) { return ok(await sb.from('elementos').insert(e).select().single()); },
    async editarElemento(id, c) { ok(await sb.from('elementos').update(c).eq('id', id)); },
    async borrarElemento(id) { ok(await sb.from('elementos').delete().eq('id', id)); },

    async subir(blob, tipo, nombre) {
      const ruta = `${new Date().getFullYear()}/${uid()}.${extension(tipo, nombre)}`;
      ok(await sb.storage.from(BUCKET).upload(ruta, blob, { contentType: tipo, cacheControl: '31536000', upsert: false }));
      return ruta;
    },
    async urls(rutas) {
      const m = {};
      for (let i = 0; i < rutas.length; i += 100) {
        const d = ok(await sb.storage.from(BUCKET).createSignedUrls(rutas.slice(i, i + 100), 60 * 60 * 6));
        d.forEach(x => { if (x.signedUrl) m[x.path] = x.signedUrl; });
      }
      return m;
    },
    async borrarArchivos(rutas) { if (rutas.length) ok(await sb.storage.from(BUCKET).remove(rutas)); },
  };
}

// ───────────────────────── Modo demo ─────────────────────────
function crearDemo() {
  const usuarios = {
    ari: { id: 'u-ari', usuario: 'ari', nombre: 'Ari', rol: 'dueno' },
    mile: { id: 'u-mile', usuario: 'mile', nombre: 'Mile', rol: 'dueno' },
    invitado: { id: 'u-inv', usuario: 'invitado', nombre: 'Invitados', rol: 'invitado' },
  };
  let actual = null;
  let ajustes = {};
  const paginas = [];
  const elementos = [];
  const archivos = {};
  const espera = (ms = 120) => new Promise(r => setTimeout(r, ms));
  const esDueno = () => actual && actual.rol === 'dueno';
  const exigirDueno = () => { if (!esDueno()) throw new Error('permission denied (row-level security)'); };
  const copia = (o) => JSON.parse(JSON.stringify(o));

  // Hoja de bienvenida para que la demo no arranque vacía
  const p1 = { id: uid(), orden: 1, oculta: false, fondo: null };
  paginas.push(p1);
  elementos.push(
    { id: uid(), pagina_id: p1.id, tipo: 'titulo', x: 8, y: 7, w: 84, rot: 0, z: 1, contenido: '¡Bienvenidos!', estilo: {}, oculto: false },
    { id: uid(), pagina_id: p1.id, tipo: 'texto', x: 10, y: 24, w: 80, rot: 0, z: 2, estilo: {},
      contenido: 'Esto es una demo. Tocá el <b>lápiz</b> de arriba para editar: agregá títulos, textos, fotos, videos y audios, y movelos donde quieras.<br><br>Con la <b>ruedita</b> cambiás la letra, el tamaño y las fechas especiales.<br><br>Entrá como <i>invitado</i> para ver qué esconden los ojitos tachados.', oculto: false },
    { id: uid(), pagina_id: p1.id, tipo: 'texto', x: 14, y: 76, w: 72, rot: -2, z: 3, estilo: { caja: 'nota', fuente: 'Caveat', tam: 4.2 },
      contenido: 'Esta notita está oculta para los invitados 🤫', oculto: true },
  );

  return {
    demo: true,
    async sesion() { return actual ? { id: actual.id } : null; },
    async entrar(usuario, clave) {
      await espera(300);
      const u = usuarios[(usuario || '').trim().toLowerCase()];
      if (!u || clave !== 'demo') throw new Error('Invalid login credentials');
      actual = u; return { id: u.id };
    },
    async salir() { actual = null; },
    async cambiarClave() { throw new Error('En el modo demo no se pueden cambiar contraseñas.'); },

    async perfil(id) { return copia(Object.values(usuarios).find(u => u.id === id) || null); },
    async perfiles() { return copia(Object.values(usuarios)); },
    async guardarPerfil(id, c) { exigirDueno(); Object.assign(Object.values(usuarios).find(u => u.id === id), c); },

    async ajustes() { await espera(); return copia(ajustes); },
    async guardarAjustes(d) { exigirDueno(); ajustes = copia(d); },

    async paginas() {
      await espera();
      return copia(paginas.filter(p => esDueno() || !p.oculta).sort((a, b) => a.orden - b.orden));
    },
    async crearPagina(p) { exigirDueno(); const n = { id: uid(), oculta: false, fondo: null, ...p }; paginas.push(n); return copia(n); },
    async editarPagina(id, c) { exigirDueno(); Object.assign(paginas.find(p => p.id === id), c); },
    async borrarPagina(id) {
      exigirDueno();
      paginas.splice(paginas.findIndex(p => p.id === id), 1);
      for (let i = elementos.length - 1; i >= 0; i--) if (elementos[i].pagina_id === id) elementos.splice(i, 1);
    },

    async elementos() {
      const visibles = new Set(paginas.filter(p => esDueno() || !p.oculta).map(p => p.id));
      return copia(elementos.filter(e => visibles.has(e.pagina_id) && (esDueno() || !e.oculto)));
    },
    async crearElemento(e) { exigirDueno(); const n = { id: uid(), rot: 0, z: 1, estilo: {}, oculto: false, ...e }; elementos.push(n); return copia(n); },
    async editarElemento(id, c) { exigirDueno(); const e = elementos.find(x => x.id === id); if (e) Object.assign(e, copia(c)); },
    async borrarElemento(id) { exigirDueno(); const i = elementos.findIndex(x => x.id === id); if (i >= 0) elementos.splice(i, 1); },

    async subir(blob, tipo, nombre) {
      exigirDueno(); await espera(400);
      const ruta = `demo/${uid()}.${extension(tipo, nombre)}`;
      archivos[ruta] = URL.createObjectURL(blob); return ruta;
    },
    async urls(rutas) {
      const visibles = new Set((await this.elementos()).map(e => e.archivo));
      const m = {}; rutas.forEach(r => { if (archivos[r] && visibles.has(r)) m[r] = archivos[r]; }); return m;
    },
    async borrarArchivos(rutas) { exigirDueno(); rutas.forEach(r => { if (archivos[r]) URL.revokeObjectURL(archivos[r]); delete archivos[r]; }); },
  };
}

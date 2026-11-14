// Service worker: permite instalar el libro como app y abrirlo rápido.
// Los archivos de la app se buscan primero en internet (para tener
// siempre la última versión) y, si no hay conexión, se usa la copia.
// Los datos y fotos NUNCA se guardan acá: siempre vienen de Supabase.
const CACHE = 'libro-v1';
const APP = ['./', 'index.html', 'css/estilos.css', 'js/app.js', 'js/datos.js', 'js/config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

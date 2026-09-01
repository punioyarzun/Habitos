/* ============================================================================
   Bitácora — Service Worker
   Objetivo: que la app cargue y se pueda seguir usando (localStorage) sin
   conexión, y que sea instalable como app. NO cachea ni intercepta llamadas
   a Supabase ni a /api/*: esas siempre van a la red, para no servir nunca
   datos de hábitos/gastos desactualizados ni interferir con el login.

   Estrategia: "stale-while-revalidate" para el shell estático de la app
   (HTML/CSS/JS/manifest/iconos same-origin): responde rápido desde caché y
   actualiza en segundo plano para la próxima visita.
   ============================================================================ */

const CACHE_NAME = 'bitacora-shell-v1';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/auth.js',
  '/supabase.config.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET, y solo mismo origen: nunca tocar Supabase, /api/*, ni POST.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached); // sin red: usar lo cacheado si existe

        return cached || network;
      })
    )
  );
});

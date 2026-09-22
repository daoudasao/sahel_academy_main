// Service Worker — Sahel Academy PWA (Gestion hors connexion & Cache Shell).
// Stratégie « Network-First avec Fallback Cache » : sert toujours les données fraîches
// en ligne, tout en garantissant le fonctionnement complet de l'application hors connexion.

// Incrémenter cette version force, à l'activation, la suppression des anciens
// caches : c'est le moyen sûr de purger un ancien bundle resté sur l'appareil.
const CACHE_NAME = 'sahel-pwa-v3';

const ASSETS_STATIQUES_DE_BASE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/Icon-192.png',
  '/icons/Icon-512.png',
];

// Extensions de ressources statiques à mettre automatiquement en cache
const EXTENSIONS_STATIQUES = /\.(js|wasm|css|png|jpg|jpeg|svg|webp|ttf|otf|woff|woff2|json)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_STATIQUES_DE_BASE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Nettoyage des versions antérieures du cache
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Navigation SPA : réseau d'abord, index.html mis en cache si hors ligne
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. Ressources de même origine ou polices externes (Google Fonts)
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFonts = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  if (isSameOrigin || isGoogleFonts) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Si la ressource est valide, on l'ajoute au cache pour l'usage hors-ligne
          if (res.status === 200 && (isGoogleFonts || EXTENSIONS_STATIQUES.test(url.pathname) || ASSETS_STATIQUES_DE_BASE.includes(url.pathname))) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          // En cas de coupure, servir depuis le cache
          const cached = await caches.match(req);
          if (cached) return cached;

          // Si c'est une image non trouvée hors ligne, renvoyer une réponse vide propre
          if (req.destination === 'image') {
            return new Response('', { status: 408, headers: { 'Content-Type': 'image/svg+xml' } });
          }
          return new Response('Hors connexion', { status: 503, statusText: 'Offline' });
        })
    );
  }
});

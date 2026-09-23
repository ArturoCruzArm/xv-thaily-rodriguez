/* Service Worker — XV Años Thaily Rodríguez
   Shell: red primero con respaldo en caché.
   Imágenes: caché primero (las fotos no cambian). */
const CACHE_SHELL  = 'thailyrodriguez-shell-v1';
const CACHE_IMAGES = 'thailyrodriguez-images-v1';

const SHELL = [
    './',
    './index.html',
    './selector.html',
    './album.html',
    './css/base.css',
    './css/selector.css',
    './css/album.css',
    './js/config.js',
    './js/photos.js',
    './js/supabase-api.js',
    './js/selector.js',
    './visitas.js',
    './js/album.js',
    './js/ayuda.js',
    './favicon.svg'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_SHELL)
            .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(ks => Promise.all(
                ks.filter(k => k !== CACHE_SHELL && k !== CACHE_IMAGES).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return;   // Supabase y fuentes: sin tocar
    if (e.request.method !== 'GET') return;

    if (url.pathname.includes('/img/')) {
        e.respondWith(
            caches.open(CACHE_IMAGES).then(cache =>
                cache.match(e.request).then(hit =>
                    hit || fetch(e.request).then(r => {
                        if (r.ok) cache.put(e.request, r.clone());
                        return r;
                    }).catch(() => new Response('', { status: 503 }))
                )
            )
        );
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then(r => {
                if (r.ok) {
                    const clon = r.clone();
                    caches.open(CACHE_SHELL).then(c => c.put(e.request, clon));
                }
                return r;
            })
            .catch(() => caches.match(e.request))
    );
});

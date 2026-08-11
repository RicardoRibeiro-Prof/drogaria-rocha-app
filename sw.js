const CACHE = 'drogaria-rocha-v12';
const BASE = '/drogaria-rocha-app/';
const APP_SHELL = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon.svg`,
  `${BASE}approved-ui.css?v=4`,
  `${BASE}approved-responsive-v2.css?v=4`,
  `${BASE}approved-features-v3.css?v=4`,
  `${BASE}approved-banners-v4.css?v=4`,
  `${BASE}approved-ui.js?v=4`,
  `${BASE}approved-features-v3.js?v=4`,
  `${BASE}approved-banners-v4.js?v=4`,
  `${BASE}assets/banner-higiene-beleza.webp`,
  `${BASE}assets/banner-vitaminas-bem-estar.webp`,
  `${BASE}assets/banner-app-facilidade.webp`
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(`${BASE}index.html`))));
});

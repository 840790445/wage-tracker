// Service Worker - 让 PWA 离线也能运行
const CACHE_NAME = 'wage-tracker-v1';
const ASSETS = ['./index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached => {
    if (cached) return cached;
    return fetch(e.request).then(r => { if (r.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; });
  }).catch(() => caches.match('./index.html')));
});

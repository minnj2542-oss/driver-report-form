const CACHE_NAME = 'dashboard-v2';
const APP_SHELL = ['./dashboard.html', './dashboard-manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // 백엔드 API 요청(Apps Script / Cloudflare Worker 프록시)은 항상 최신 데이터가
  // 필요하므로 캐시하지 않고 그대로 통과
  if (
    e.request.url.includes('script.google.com') ||
    e.request.url.includes('script.googleusercontent.com') ||
    e.request.url.includes('workers.dev')
  ) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

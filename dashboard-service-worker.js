const CACHE_NAME = 'dashboard-v3';
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

  // 네트워크 우선: 온라인일 땐 항상 최신 버전을 받아오고, 오프라인일 때만
  // 저장된 캐시로 대체.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

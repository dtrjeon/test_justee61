// 61기 전도보고서 — 서비스워커 (오프라인 캐싱 + 설치 가능성 확보)
const CACHE_NAME = 'jee61-report-cache-v1';
const PRECACHE_URLS = [
  './index_61th_JEE.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 우선, 실패하면 캐시로 폴백 (오프라인 대응)
// ⚠️ 이 서비스워커의 scope는 폴더 전체('./')라서 아무 필터 없이 가로채면
//    같은 폴더의 justee61_admin.html 요청이나 구글 Apps Script API 호출까지
//    영향을 받는다. 그래서 "이 앱 자신의 파일"에 대한 요청만 처리하고
//    나머지는 아예 손대지 않고 그대로 통과시킨다.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // 다른 출처(구글 Apps Script 등) 요청은 절대 가로채지 않음
  if (url.origin !== self.location.origin) return;

  // 같은 폴더라도 이 앱 소관 파일(precache 목록 + 루트/자기 자신)이 아니면 통과
  // → justee61_admin.html 등 다른 페이지는 이 서비스워커의 영향을 받지 않음
  var isOwnFile = PRECACHE_URLS.some(function (p) {
    return url.pathname.endsWith(p.replace('./', '/'));
  }) || url.pathname === '/' || url.pathname.endsWith('/index_61th_JEE.html');

  if (!isOwnFile) return;

  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, resClone);
        });
        return res;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./index_61th_JEE.html');
        });
      })
  );
});

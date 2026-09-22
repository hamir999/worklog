/* 업무 기록 서비스워커 — 오프라인 지원 + 자동 갱신 */
var CACHE = "worklog-v1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest",
              "./icon-192.png", "./icon-512.png", "./icon-maskable.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ASSETS).catch(function () { return null; });
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 화면과 코드는 네트워크 우선 — 고치면 바로 반영, 오프라인이면 캐시
  if (req.mode === "navigate" || url.pathname.endsWith(".html") ||
      url.pathname.endsWith("/") || url.pathname.endsWith(".webmanifest")) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match("./index.html"); });
      })
    );
    return;
  }

  // 아이콘 등은 캐시 우선
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});

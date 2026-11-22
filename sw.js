// 초세계급 게시판 알림 전용 서비스 워커
// 화면 파일을 저장(캐시)하지 않는다 → 게시판은 늘 최신으로 열림. 알림만 처리.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// 게시판 페이지(index.html)는 폰이 예전 것을 기억해 두지 않게 늘 새로 받아 온다
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate") return;
  e.respondWith(fetch(r.url, { cache: "no-store", credentials: "same-origin" })
    .then(res => res.redirected || !res.ok ? fetch(r) : res)
    .catch(() => fetch(r)));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  const title = d.title || "초세계급 게시판";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "새 글이 올라왔어요",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "board-new",      // 여러 개 와도 하나로 합쳐 보이게
    renotify: true,
    data: { url: d.url || "./" }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const scope = self.registration.scope;
  let url = new URL(e.notification.data && e.notification.data.url || "./", scope).href;
  if (!url.startsWith(scope)) url = scope;  // 게시판 밖 주소로는 안 감
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) if (c.url.startsWith(scope) && "focus" in c) {
      try { const n = await c.focus(); if (c.url !== url && "navigate" in c) await c.navigate(url); return n; } catch (err) {}
    }
    return self.clients.openWindow(url);
  })());
});

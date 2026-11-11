// Background push is optional for this prototype. A failed remote import must never
// prevent the service worker from registering its offline shell and fetch handlers.
try {
  importScripts(
    "https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js",
    "/api/firebase/messaging-sw-config"
  );
} catch (error) {
  console.warn("Background messaging is unavailable; offline app-shell support remains enabled.", error);
}

let lefifiMessaging = null;
try {
  const config = self.__LEFIFI_FIREBASE_CONFIG__;
  if (config && config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
    firebase.initializeApp(config);
    lefifiMessaging = firebase.messaging();
    lefifiMessaging.onBackgroundMessage((payload) => {
      // Notification payloads are displayed automatically by Firebase. Only render
      // data-only pushes here to avoid showing the same notification twice.
      if (payload.notification) return;
      const title = payload.data?.title || "Lefifi update";
      const options = {
        body: payload.data?.body || "Open the app to check your latest information.",
        icon: "/lefifi.jpg",
        badge: "/lefifi.jpg",
        data: { link: payload.data?.link || "/account" },
      };
      self.registration.showNotification(title, options);
    });
  } else {
    console.error("Lefifi Firebase Messaging web config is incomplete.");
  }
} catch (error) {
  console.error("Lefifi Firebase Messaging service worker could not initialize.", error);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || "/account";
  const link = rawLink.startsWith("/") ? rawLink : "/account";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ("focus" in client) {
        void client.navigate(link);
        return client.focus();
      }
    }
    return clients.openWindow(link);
  }));
});

const CACHE_VERSION = "lefifi-shell-v3";
const MEDIA_CACHE = "lefifi-media-v1";
const SHELL_CACHE = CACHE_VERSION;
const STATIC_LIMIT = 100;
const PUBLIC_PAGE_LIMIT = 12;
const MEDIA_LIMIT = 40;
const MEDIA_HOSTS = ["images.unsplash.com", "utfs.io", "ufs.sh"];
// Only the essential offline shell participates in service-worker installation.
// Secondary routes and Next.js chunks are cached naturally as customers visit them.
const APP_SHELL = ["/", "/offline", "/lefifi-mark.svg", "/lefifi.jpg", "/manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await precacheShell();
    // Do not make browser install eligibility wait for secondary pages or JS chunks.
    await self.skipWaiting();
  })());
});

async function precacheShell() {
  const shell = await caches.open(SHELL_CACHE);
  await Promise.all(APP_SHELL.map(async path => {
    try {
      const request = new Request(path, { cache: "reload" });
      const response = await fetch(request);
      if (response.ok) await shell.put(request, response.clone());
    } catch {
      // A failed asset must not block the remaining essential shell.
    }
  }));
  await trimCache(SHELL_CACHE, STATIC_LIMIT);
}
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CACHE_MEDIA" && Array.isArray(event.data.urls)) {
    const urls = [...new Set(event.data.urls.filter(url => typeof url === "string" && isApprovedMediaUrl(url)))].slice(0, MEDIA_LIMIT);
    event.waitUntil(cacheMediaBatch(urls));
  }
});

function isApprovedMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && MEDIA_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

async function cacheMediaBatch(urls) {
  // Limit concurrency and total entries: large media must not crowd out the app shell.
  for (let index = 0; index < urls.length; index += 3) {
    await Promise.all(urls.slice(index, index + 3).map(cacheMediaUrl));
  }
  await trimCache(MEDIA_CACHE, MEDIA_LIMIT);
}

async function cacheMediaUrl(value) {
  if (!isApprovedMediaUrl(value)) return;
  const request = new Request(value, { mode: "no-cors", credentials: "omit", cache: "reload" });
  const cache = await caches.open(MEDIA_CACHE);
  if (await cache.match(request)) return;
  try {
    const response = await fetch(request);
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if ((response.ok || response.type === "opaque") && (!declaredSize || declaredSize <= 20 * 1024 * 1024)) {
      await cache.put(request, response.clone());
      await trimCache(MEDIA_CACHE, MEDIA_LIMIT);
    }
  } catch {
    // Media remains optional; a failed prefetch must never interrupt app-shell use.
  }
}

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("theplug-shell-") || key.startsWith("theplug-media-") || key.startsWith("iteration13-shell-") || key.startsWith("iteration13-media-") || (key.startsWith("lefifi-shell-") && key !== SHELL_CACHE) || (key.startsWith("lefifi-media-") && key !== MEDIA_CACHE)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cache only explicitly approved image/video CDNs. This lets previously viewed
  // Store media remain visible offline without caching arbitrary third-party traffic.
  if (["image", "video"].includes(request.destination) && isApprovedMediaUrl(request.url)) {
    event.respondWith(cacheMediaRequest(request, event));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isNavigation = request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
  const isPrivate = /^\/(?:account|requests|orders|admin|invite)(?:\/|$)/.test(url.pathname);

  // Private/member routes are network-only. Never serve a cached account/request page as
  // a substitute for a different route or when the authenticated page cannot be fetched.
  if (isNavigation && isPrivate) {
    event.respondWith(fetch(request).catch(() => caches.open(SHELL_CACHE).then(cache => cache.match("/offline")).then(response => response || Response.error())));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest" || /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|webp|svg|ico|avif)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isNavigation) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) void caches.open(SHELL_CACHE).then(async cache => {
        await cache.put(request, response.clone());
        await trimCache(SHELL_CACHE, PUBLIC_PAGE_LIMIT + STATIC_LIMIT);
      });
      return response;
    }).catch(async () => {
      const cache = await caches.open(SHELL_CACHE);
      return await cache.match(request) || await cache.match("/") || await cache.match("/offline") || Response.error();
    }));
  }
});

async function cacheMediaRequest(request, event) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background while returning the cached immutable media immediately.
    event.waitUntil(fetch(request).then(async response => {
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
        await trimCache(MEDIA_CACHE, MEDIA_LIMIT);
      }
    }).catch(() => {}));
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      event.waitUntil(cache.put(request, response.clone()).then(() => trimCache(MEDIA_CACHE, MEDIA_LIMIT)));
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await trimCache(SHELL_CACHE, STATIC_LIMIT + PUBLIC_PAGE_LIMIT);
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map(request => cache.delete(request)));
}

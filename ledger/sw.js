// Ledger service worker — caches the app shell for offline use and installability.
// Bump CACHE_NAME whenever files change so returning users get the update
// instead of a stale cached copy.
const CACHE_NAME = "ledger-cache-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./css/styles.css",
  "./js/constants.js",
  "./js/utils.js",
  "./js/store.js",
  "./js/modals.js",
  "./js/modals/entity-modals.js",
  "./js/components/transaction-row.js",
  "./js/pages/overview.js",
  "./js/pages/register.js",
  "./js/pages/accounts.js",
  "./js/pages/people.js",
  "./js/pages/reports.js",
  "./js/pages/recurring.js",
  "./js/pages/settings.js",
  "./js/services/backup.js",
  "./js/services/csv-import.js",
  "./js/services/import-preview.js",
  "./js/app.js"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Cache-first for the app shell, so the app opens instantly and works offline.
// Falls back to network for anything not pre-cached (e.g. if new files are added later).
self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).catch(function(){
        // Offline and not cached: for navigations, fall back to the cached app shell
        if(event.request.mode === "navigate"){
          return caches.match("./index.html");
        }
      });
    })
  );
});

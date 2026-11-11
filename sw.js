/* Fun Padel : service worker minimal. Il rend le site installable et l'ouvre même sans réseau
   (avec les derniers scores connus). Les données Supabase ne passent jamais par ce cache. */
const CACHE = "fun-padel-v1";
const FICHIERS = ["./", "index.html", "admin.html", "config.js", "commun.js", "classement.js", "planning.js", "logo.svg", "icone-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
// Réseau d'abord (pour toujours avoir la dernière version), cache en secours hors connexion
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});

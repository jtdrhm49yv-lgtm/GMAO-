// Service Worker - Drilling GMAO
// Permet a l’application de fonctionner hors-ligne (sans reseau)
// Version du cache : changer ce numero a chaque mise a jour importante pour forcer le rafraichissement
var CACHE_NAME = “gmao-cache-v1”;

// Fichiers a mettre en cache des l’installation
var URLS_TO_CACHE = [
“./”,
“./index.html”,
“./manifest.json”,
“https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js”
];

// Installation : on met en cache les fichiers essentiels
self.addEventListener(“install”, function(event) {
event.waitUntil(
caches.open(CACHE_NAME).then(function(cache) {
return cache.addAll(URLS_TO_CACHE).catch(function(){ /* ignore les echecs reseau partiels */ });
})
);
self.skipWaiting();
});

// Activation : on supprime les anciens caches
self.addEventListener(“activate”, function(event) {
event.waitUntil(
caches.keys().then(function(keys) {
return Promise.all(keys.map(function(key) {
if (key !== CACHE_NAME) return caches.delete(key);
}));
})
);
self.clients.claim();
});

// Strategie : “network first, fallback cache”
// On essaie le reseau d’abord (pour avoir la derniere version), et si pas de reseau on prend le cache
self.addEventListener(“fetch”, function(event) {
if (event.request.method !== “GET”) return;
event.respondWith(
fetch(event.request).then(function(response) {
// si la requete reseau marche, on met a jour le cache et on renvoie la reponse
var copy = response.clone();
caches.open(CACHE_NAME).then(function(cache) {
cache.put(event.request, copy).catch(function(){});
});
return response;
}).catch(function() {
// pas de reseau : on sert depuis le cache
return caches.match(event.request).then(function(cached) {
if (cached) return cached;
// en dernier recours, pour une navigation, on renvoie l’index en cache
if (event.request.mode === “navigate”) return caches.match(”./index.html”);
});
})
);
});

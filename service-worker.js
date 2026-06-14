// Service Worker - Drilling GMAO
// Strategie robuste : navigation servie depuis le cache en priorite (hors-ligne fiable).
var CACHE_NAME = “gmao-cache-v7”;

var CORE = [
“./”,
“./accueil.html”,
“./index.html”,
“./pdm.html”,
“./manifest.json”,
“./icon-192.png”,
“./icon-512.png”
];
var EXTRA = [
“https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js”,
“https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js”,
“https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js”
];

self.addEventListener(“install”, function(event) {
event.waitUntil(
caches.open(CACHE_NAME).then(function(cache) {
return cache.addAll(CORE).then(function(){
return Promise.all(EXTRA.map(function(url){
return cache.add(url).catch(function(){});
}));
});
})
);
self.skipWaiting();
});

self.addEventListener(“activate”, function(event) {
event.waitUntil(
caches.keys().then(function(keys) {
return Promise.all(keys.map(function(key) {
if (key !== CACHE_NAME) return caches.delete(key);
}));
}).then(function(){ return self.clients.claim(); })
);
});

// Renvoie une page HTML du cache, quelle que soit l’URL exacte demandee
function offlinePage(){
return caches.open(CACHE_NAME).then(function(cache){
return cache.match(”./accueil.html”, {ignoreSearch:true}).then(function(a){
if(a) return a;
return cache.match(”./index.html”, {ignoreSearch:true}).then(function(b){
if(b) return b;
return cache.match(”./”, {ignoreSearch:true});
});
});
});
}

self.addEventListener(“fetch”, function(event) {
var req = event.request;
if (req.method !== “GET”) return;

// 1) NAVIGATION (ouverture d’une page) : cache d’abord, et si rien -> accueil en cache.
//    C’est ce qui garantit l’ouverture hors-ligne depuis l’icone.
if (req.mode === “navigate”) {
event.respondWith(
caches.match(req, {ignoreSearch:true}).then(function(cached){
if (cached) return cached;
return fetch(req).then(function(resp){
if (resp && resp.status === 200) {
var copy = resp.clone();
caches.open(CACHE_NAME).then(function(c){ c.put(req, copy).catch(function(){}); });
}
return resp;
}).catch(function(){
// hors-ligne et URL non trouvee telle quelle -> on sert l’accueil en cache
return offlinePage();
});
})
);
return;
}

// 2) AUTRES FICHIERS (css/js/img/manifest) : cache d’abord, reseau en secours.
event.respondWith(
caches.match(req, {ignoreSearch:true}).then(function(cached){
if (cached) return cached;
return fetch(req).then(function(resp){
if (resp && resp.status === 200) {
var copy = resp.clone();
caches.open(CACHE_NAME).then(function(c){ c.put(req, copy).catch(function(){}); });
}
return resp;
}).catch(function(){
return new Response(””, {status: 503, statusText: “Hors-ligne”});
});
})
);
});

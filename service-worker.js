// Service Worker - Drilling GMAO
// Strategie “cache d’abord” : l’app s’ouvre instantanement depuis le cache,
// meme sans reseau. Le reseau sert seulement a mettre a jour en arriere-plan.
// Changer le numero de version force le rafraichissement chez tout le monde.
var CACHE_NAME = “gmao-cache-v3”;

// Fichiers essentiels (l’app doit pouvoir s’ouvrir entierement avec ceux-la)
var CORE = [
“./”,
“./accueil.html”,
“./index.html”,
“./pdm.html”,
“./manifest.json”
];
// Fichier externe (jsPDF) - mis en cache si possible, mais non bloquant
var EXTRA = [
“https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js”
];

// Installation : on met en cache les fichiers essentiels (de maniere fiable)
self.addEventListener(“install”, function(event) {
event.waitUntil(
caches.open(CACHE_NAME).then(function(cache) {
// les fichiers du coeur sont indispensables
return cache.addAll(CORE).then(function(){
// jsPDF : on essaie, mais on n’echoue pas si le reseau coupe
return Promise.all(EXTRA.map(function(url){
return cache.add(url).catch(function(){});
}));
});
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
}).then(function(){ return self.clients.claim(); })
);
});

// Strategie “cache d’abord” :
// 1) si le fichier est en cache -> on le sert TOUT DE SUITE (ouverture instantanee, meme hors-reseau)
//    et on rafraichit le cache en arriere-plan si le reseau est dispo
// 2) si pas en cache -> on va le chercher sur le reseau et on le met en cache
// 3) si tout echoue et que c’est une navigation -> on renvoie l’accueil en cache
self.addEventListener(“fetch”, function(event) {
if (event.request.method !== “GET”) return;
event.respondWith(
caches.match(event.request).then(function(cached) {
// mise a jour en arriere-plan (ne bloque pas la reponse)
var networkFetch = fetch(event.request).then(function(response) {
if (response && response.status === 200) {
var copy = response.clone();
caches.open(CACHE_NAME).then(function(cache) {
cache.put(event.request, copy).catch(function(){});
});
}
return response;
}).catch(function(){ return null; });

```
  // si on a le fichier en cache, on le renvoie immediatement
  if (cached) return cached;

  // sinon on attend le reseau
  return networkFetch.then(function(response) {
    if (response) return response;
    // dernier recours : pour une navigation, renvoyer l'accueil en cache
    if (event.request.mode === "navigate") {
      return caches.match("./accueil.html").then(function(acc){
        return acc || caches.match("./index.html");
      });
    }
    return new Response("", {status: 503, statusText: "Hors-ligne"});
  });
})
```

);
});

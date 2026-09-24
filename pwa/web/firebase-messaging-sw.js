// Service worker Firebase Cloud Messaging (Web Push) — Sahel Academy PWA.
// Enregistré automatiquement par le plugin firebase_messaging côté web.
// Gère les notifications reçues quand l'onglet est en arrière-plan / fermé.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Écran à ouvrir : champ `route` envoyé par l'API (chemin interne uniquement).
function routeDe(data) {
  const route = data && typeof data.route === 'string' ? data.route : '';
  return /^\/[A-Za-z0-9/_-]*$/.test(route) ? route : '/notifications';
}

// Clic sur une notification.
// ⚠️ Enregistré AVANT firebase.messaging() : le SDK installe son propre
// écouteur, qui intercepte les notifications qu'il affiche et n'ouvre rien
// sans lien. Le nôtre passe donc en premier et arrête la propagation.
self.addEventListener('notificationclick', function (event) {
  const donnees = event.notification.data || {};
  // Notification affichée par le SDK : charge utile sous la clé FCM_MSG.
  const data = (donnees.FCM_MSG && donnees.FCM_MSG.data) || donnees;
  const route = routeDe(data);

  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (fenetres) {
      const fenetre = fenetres.find(function (c) {
        return new URL(c.url).origin === self.location.origin && 'focus' in c;
      });
      if (fenetre) {
        // App déjà ouverte : elle navigue elle-même (pas de rechargement).
        fenetre.postMessage({ type: 'sahel-notification-click', route: route });
        return fenetre.focus();
      }
      // App fermée : ouverture directe sur l'écran (le routeur garde la cible
      // pendant le démarrage et la connexion).
      if (clients.openWindow) return clients.openWindow(route);
    })
  );
});

firebase.initializeApp({
  apiKey: 'AIzaSyBIKM9Gt194VnziSB0sGuxsK-EUlz6URww',
  appId: '1:326315783454:web:2be0a5dba079a86d5a050f',
  messagingSenderId: '326315783454',
  projectId: 'sahel-academy',
  authDomain: 'sahel-academy.firebaseapp.com',
  storageBucket: 'sahel-academy.firebasestorage.app',
  measurementId: 'G-SSCDFSNSYC',
});

const messaging = firebase.messaging();

// Les push de l'API contiennent un bloc « notification » : le SDK les affiche
// lui-même. On n'affiche ici que les messages de données seules, sinon chaque
// notification apparaîtrait en double.
messaging.onBackgroundMessage(function (payload) {
  if (payload.notification) return;
  const data = payload.data || {};
  self.registration.showNotification(data.titre || 'Sahel Academy', {
    body: data.message || '',
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-192.png',
    data: data,
  });
});

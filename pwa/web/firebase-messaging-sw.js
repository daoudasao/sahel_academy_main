// Service worker Firebase Cloud Messaging (Web Push) — Sahel Academy PWA.
// Enregistré automatiquement par le plugin firebase_messaging côté web.
// Gère les notifications reçues quand l'onglet est en arrière-plan / fermé.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const title = notification.title || 'Sahel Academy';
  const options = {
    body: notification.body || '',
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Clic sur la notification : focalise/ouvre l'app.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

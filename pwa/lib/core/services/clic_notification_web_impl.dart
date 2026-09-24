import 'dart:js_interop';

import 'package:flutter/foundation.dart';
import 'package:web/web.dart' as web;

/// Type du message envoyé par `web/firebase-messaging-sw.js` au clic.
const _typeClic = 'sahel-notification-click';

/// Web : quand l'app est déjà ouverte, le service worker lui transmet la
/// route de la notification cliquée (au lieu d'ouvrir un nouvel onglet).
void ecouterClicsNotificationWeb(void Function(String route) ouvrir) {
  try {
    final sw = web.window.navigator.serviceWorker;
    sw.addEventListener(
      'message',
      ((web.MessageEvent event) {
        final data = event.data.dartify();
        if (data is Map && data['type'] == _typeClic) {
          final route = data['route'];
          if (route is String && route.startsWith('/')) ouvrir(route);
        }
      }).toJS,
    );
    sw.startMessages();
  } catch (e) {
    // Service workers indisponibles (navigation privée, HTTP…).
    debugPrint('⚠️ [FCM Web] Écoute des clics de notification impossible: $e');
  }
}

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import '../api/api_client.dart';
import '../../models/notification_item.dart';

/// Service gérant les notifications push Firebase Cloud Messaging (FCM).
class FcmService {
  FcmService._();
  static final FcmService instance = FcmService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final ApiClient _api = ApiClient.instance;

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'high_importance_channel', // id
    'Notifications Importantes', // title
    description: 'Ce canal est utilisé pour les notifications importantes.',
    importance: Importance.high,
  );

  bool _initialized = false;
  GoRouter? _router;

  /// Attache le GoRouter principal pour la redirection au clic des notifications
  void attachRouter(GoRouter router) {
    _router = router;
    _checkInitialMessage();
  }

  void _navigateToRoute(String? route) {
    if (route != null && route.isNotEmpty && _router != null) {
      debugPrint('🔔 [FCM Service] Navigation vers la route: $route');
      try {
        _router!.push(route);
      } catch (e) {
        debugPrint('⚠️ [FCM Service] Erreur lors de la navigation: $e');
      }
    }
  }

  void _handleRemoteMessage(RemoteMessage message) {
    final typeStr = (message.data['type'] ?? '').toString();
    final type = TypeNotification.values.firstWhere(
      (t) => t.name == typeStr,
      orElse: () => TypeNotification.systeme,
    );
    final route = NotificationItem.determinerRoute(
      type: type,
      cible: message.data['cible']?.toString(),
      cibleId: message.data['cibleId']?.toString(),
      titre: message.notification?.title ?? '',
      message: message.notification?.body ?? '',
    );
    debugPrint('🔔 [FCM Service] Clic notification push -> Route calculée: $route');
    _navigateToRoute(route);
  }

  Future<void> _checkInitialMessage() async {
    try {
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('🔔 [FCM Service] Application lancée depuis une notification push!');
        _handleRemoteMessage(initialMessage);
      }
    } catch (e) {
      debugPrint('⚠️ [FCM Service] Erreur vérification initial message: $e');
    }
  }

  /// Initialise FCM, demande les permissions et enregistre le token auprès du backend.
  /// Clé VAPID (Web Push) — Firebase Console > Cloud Messaging > Certificats
  /// Web Push. Fournie au build : --dart-define=WEB_PUSH_VAPID_KEY=xxxx
  static const String _webVapidKey =
      String.fromEnvironment('WEB_PUSH_VAPID_KEY');

  Future<void> initialize() async {
    // Le web a son propre chemin d'init (pas de flutter_local_notifications,
    // notifications système gérées par firebase-messaging-sw.js).
    if (kIsWeb) {
      await _initializeWeb();
      return;
    }
    debugPrint('🔔 [FCM Service] Initialisation demandée...');
    try {
      // 1. Demande d'autorisation des notifications (iOS & Android 13+)
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      debugPrint(
        '🔔 [FCM Service] Statut d\'autorisation: ${settings.authorizationStatus}',
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('🔔 [FCM Service] Autorisation accordée par l’utilisateur.');

        // 2. Configuration des notifications locales et d'affichage premier plan
        await _setupForegroundNotifications();

        // 3. S'abonne au topic global
        try {
          await _messaging.subscribeToTopic('global');
          debugPrint('🔔 [FCM Service] Abonnement au topic "global" réussi.');
        } catch (e) {
          debugPrint('⚠️ [FCM Service] Erreur abonnement topic global: $e');
        }

        if (!_initialized) {
          // 4. Écoute le rafraîchissement du token FCM
          _messaging.onTokenRefresh.listen((newToken) async {
            debugPrint('🔔 [FCM Service] Nouveau token FCM généré: $newToken');
            await _sendTokenToBackend(newToken);
          });

          // 5. Écoute du clic sur notification quand l'app était en arrière-plan
          FirebaseMessaging.onMessageOpenedApp.listen(_handleRemoteMessage);

          // 6. Écoute des messages reçus au premier plan (Foreground)
          FirebaseMessaging.onMessage.listen((RemoteMessage message) {
            final notification = message.notification;
            final android = message.notification?.android;

            debugPrint(
              '🔔 [FCM Service] Notification 1er plan reçue: ${notification?.title} - ${notification?.body}',
            );

            final typeStr = (message.data['type'] ?? '').toString();
            final type = TypeNotification.values.firstWhere(
              (t) => t.name == typeStr,
              orElse: () => TypeNotification.systeme,
            );
            final route = NotificationItem.determinerRoute(
              type: type,
              cible: message.data['cible']?.toString(),
              cibleId: message.data['cibleId']?.toString(),
              titre: notification?.title ?? '',
              message: notification?.body ?? '',
            );

            // Affiche la notification système locale même en 1er plan
            if (notification != null) {
              _localNotifications.show(
                id: notification.hashCode,
                title: notification.title,
                body: notification.body,
                payload: route,
                notificationDetails: NotificationDetails(
                  android: AndroidNotificationDetails(
                    _channel.id,
                    _channel.name,
                    channelDescription: _channel.description,
                    icon: android?.smallIcon ?? '@mipmap/ic_launcher',
                    importance: Importance.max,
                    priority: Priority.high,
                  ),
                  iOS: const DarwinNotificationDetails(
                    presentAlert: true,
                    presentBadge: true,
                    presentSound: true,
                  ),
                ),
              );
            }
          });

          _initialized = true;
        }

        // 7. Récupère le token FCM et l'envoie au serveur
        await syncTokenWithBackend();
      } else {
        debugPrint('❌ [FCM Service] Autorisation refusée par l’utilisateur.');
      }
    } catch (e, stack) {
      debugPrint('❌ [FCM Service] Erreur lors de l’initialisation FCM: $e\n$stack');
    }
  }

  /// Initialisation FCM spécifique au web (PWA).
  ///
  /// Utilise l'API Notification du navigateur + le service worker
  /// `firebase-messaging-sw.js`. N'utilise pas flutter_local_notifications
  /// (pas de support web) ni subscribeToTopic (non supporté sur web).
  Future<void> _initializeWeb() async {
    try {
      final hasToken = await _api.hasToken();
      if (!hasToken) {
        debugPrint('⚠️ [FCM Web] Non connecté — sync push ignorée.');
        return;
      }

      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        debugPrint('❌ [FCM Web] Autorisation notifications refusée.');
        return;
      }

      if (_webVapidKey.isEmpty) {
        debugPrint(
          '⚠️ [FCM Web] WEB_PUSH_VAPID_KEY absent — push web désactivé. '
          'Rebuild avec --dart-define=WEB_PUSH_VAPID_KEY=<clé>.',
        );
        return;
      }

      if (!_initialized) {
        FirebaseMessaging.onMessageOpenedApp.listen(_handleRemoteMessage);
        // Au premier plan, la notification système est gérée par le SW ;
        // ici on se contente de tracer (le routage se fait au clic).
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint(
            '🔔 [FCM Web] Message 1er plan: ${message.notification?.title}',
          );
        });
        _messaging.onTokenRefresh.listen((newToken) {
          _sendTokenToBackend(newToken);
        });
        _initialized = true;
      }

      final token = await _messaging.getToken(vapidKey: _webVapidKey);
      if (token != null && token.isNotEmpty) {
        debugPrint('🔔 [FCM Web] Token web obtenu.');
        await _sendTokenToBackend(token);
      } else {
        debugPrint('⚠️ [FCM Web] Token web null/vide.');
      }
    } catch (e) {
      debugPrint('⚠️ [FCM Web] Init push web échouée: $e');
    }
  }

  /// Configure le canal Android et la gestion des clics sur toasts locales
  Future<void> _setupForegroundNotifications() async {
    try {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(_channel);

      const initSettings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      );

      await _localNotifications.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          debugPrint('🔔 [FCM Service] Clic sur toast local: ${response.payload}');
          _navigateToRoute(response.payload);
        },
      );

      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (e) {
      debugPrint('⚠️ [FCM Service] Erreur config notifications local: $e');
    }
  }

  /// Récupère le token FCM actuel et l'envoie au backend NestJS.
  Future<void> syncTokenWithBackend() async {
    debugPrint('🔔 [FCM Service] Lancement de syncTokenWithBackend()...');
    try {
      final hasToken = await _api.hasToken();
      if (!hasToken) {
        debugPrint(
          '⚠️ [FCM Service] Sync FCM ignoré: Aucun jeton de session utilisateur présent dans l\'app (non connecté).',
        );
        return;
      }

      debugPrint(
        '🔔 [FCM Service] Récupération du token depuis FirebaseMessaging.getToken()...',
      );
      final fcmToken = await _messaging.getToken();
      if (fcmToken != null && fcmToken.isNotEmpty) {
        debugPrint('🔔 [FCM Service] Token FCM récupéré avec succès: $fcmToken');
        await _sendTokenToBackend(fcmToken);
      } else {
        debugPrint(
          '⚠️ [FCM Service] Le token FCM retourné par Firebase me NULL ou VIDE.',
        );
      }
    } catch (e, stack) {
      debugPrint(
        '❌ [FCM Service] Erreur lors de la synchronisation du token: $e\n$stack',
      );
    }
  }

  /// Envoie le token au backend via l'endpoint PATCH /users/fcm-token
  Future<void> _sendTokenToBackend(String token) async {
    try {
      debugPrint(
        '🔔 [FCM Service] Envoi du PATCH /users/fcm-token vers l\'API backend...',
      );
      final res = await _api.patch('/users/fcm-token', {'fcmToken': token});
      debugPrint(
        '✅ [FCM Service] Token FCM enregistré avec succès en BDD! Réponse serveur: $res',
      );
    } catch (e, stack) {
      debugPrint(
        '❌ [FCM Service] Erreur HTTP lors de l’envoi du token au serveur: $e\n$stack',
      );
    }
  }
}

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import '../../core/api/api_client.dart';
import '../../core/api/api_config.dart';
import '../../core/utils/safe_change_notifier.dart';
import '../../models/alerte_urgente.dart';
import '../../models/notification_item.dart';

/// Gère les notifications de l'utilisateur, branché sur l'API NestJS + WebSockets (Socket.IO).
///
/// [ChangeNotifier] : la pastille de non-lues et la liste se mettent à jour
/// automatiquement en temps réel.
/// - REST: `GET /notifications`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id`
/// - WebSockets: connexion à `/notifications` pour recevoir l'évènement `new_notification` en temps réel.
class NotificationRepository extends ChangeNotifier with SafeChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  final List<NotificationItem> _items = [];
  bool _enChargement = false;
  bool _charge = false;
  String? _erreur;

  socket_io.Socket? _socket;
  bool _socketInitialise = false;
  Timer? _pollTimer;

  /// Notifications, de la plus récente à la plus ancienne.
  List<NotificationItem> get items {
    final copie = [..._items]..sort((a, b) => b.date.compareTo(a.date));
    return List.unmodifiable(copie);
  }

  int get nonLues => _items.where((n) => !n.lu).length;
  bool get enChargement => _enChargement;
  bool get estCharge => _charge;
  String? get erreur => _erreur;
  bool get estConnecteSocket => _socket?.connected ?? false;

  NotificationRepository() {
    charger();
    _demarrerPeriodicSync();
  }

  /// Inicie la connexion WebSocket pour recevoir les notifications en temps réel.
  Future<void> initialiserSocket() async {
    if (_socketInitialise && _socket != null && _socket!.connected) return;

    final token = await _api.getToken();
    final socketUrl = ApiConfig.baseUrl.replaceAll(RegExp(r'/api/v1/?$'), '');

    _socket?.dispose();
    _socket = socket_io.io(
      '$socketUrl/notifications',
      socket_io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token ?? ''})
          .build(),
    );

    _socket?.onConnect((_) {
      _socketInitialise = true;
      notifyListeners();
    });

    _socket?.onDisconnect((_) {
      _socketInitialise = false;
      notifyListeners();
    });

    _socket?.on('new_notification', (data) {
      if (data is Map) {
        final notif = NotificationItem.fromJson(Map<String, dynamic>.from(data));
        ajouter(notif);
      }
    });

    _socket?.connect();
  }

  /// Ferme la connexion WebSocket.
  void deconnecterSocket() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _socketInitialise = false;
  }

  /// Synchronisation périodique de secours (toutes les 30 sec).
  void _demarrerPeriodicSync() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_charge && !_enChargement) {
        charger(forcer: true);
      }
    });
  }

  /// Charge (ou recharge) les notifications depuis l'API.
  Future<void> charger({bool forcer = false}) async {
    if (_enChargement) return;
    if (_charge && !forcer) return;
    _enChargement = true;
    _erreur = null;
    notifyListeners();
    try {
      final data = await _api.get('/notifications');
      final liste = _versListe(data)
          .map((e) => NotificationItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      _items
        ..clear()
        ..addAll(liste);
      _charge = true;

      // Connexion au canal WebSocket
      await initialiserSocket();
    } catch (e) {
      _erreur = e.toString();
    } finally {
      _enChargement = false;
      notifyListeners();
    }
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }

  Future<void> marquerLu(String id) async {
    var change = false;
    for (final n in _items) {
      if (n.id == id && !n.lu) {
        n.lu = true;
        change = true;
        break;
      }
    }
    if (!change) return;
    notifyListeners();
    try {
      await _api.patch('/notifications/$id/read');
    } catch (_) {
      /* conserve l'état optimiste */
    }
  }

  Future<void> toutMarquerLu() async {
    final aMarquer = _items.where((n) => !n.lu).map((n) => n.id).toList();
    if (aMarquer.isEmpty) return;
    for (final n in _items) {
      n.lu = true;
    }
    notifyListeners();
    await Future.wait(
      aMarquer.map(
        (id) => _api.patch('/notifications/$id/read').catchError((_) => null),
      ),
    );
  }

  /// Supprime une notification par son ID.
  Future<void> supprimer(String id) async {
    final idx = _items.indexWhere((n) => n.id == id);
    if (idx == -1) return;
    _items.removeAt(idx);
    notifyListeners();
    try {
      await _api.delete('/notifications/$id');
    } catch (_) {
      /* suppression locale conservée */
    }
  }

  /// Supprime toutes les notifications.
  Future<void> effacerTout() async {
    if (_items.isEmpty) return;
    final ids = _items.map((n) => n.id).toList();
    _items.clear();
    notifyListeners();
    await Future.wait(
      ids.map(
        (id) => _api.delete('/notifications/$id').catchError((_) => null),
      ),
    );
  }

  /// Ajoute une notification reçue (en évitant les doublons).
  void ajouter(NotificationItem notif) {
    final idx = _items.indexWhere((n) => n.id == notif.id);
    if (idx != -1) {
      _items[idx] = notif;
    } else {
      _items.add(notif);
    }
    notifyListeners();
  }

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _keyAlertesVues = 'sa_alertes_vues_ids';

  /// Récupère l'ensemble des IDs d'alertes déjà fermées ou consultées par l'utilisateur.
  Future<Set<String>> getAlertesVuesIds() async {
    try {
      final brut = await _secureStorage.read(key: _keyAlertesVues);
      if (brut != null && brut.isNotEmpty) {
        final decoded = jsonDecode(brut);
        if (decoded is List) {
          return decoded.map((e) => e.toString()).toSet();
        }
      }
    } catch (_) {}
    return <String>{};
  }

  /// Mémorise de façon permanente dans la base de données (et en secours local)
  /// qu'une ou plusieurs alertes ont été vues/fermées.
  Future<void> enregistrerAlertesVues(Iterable<String> ids) async {
    final list = ids.toList();
    if (list.isEmpty) return;

    // 1. Sauvegarde directe dans la base de données PostgreSQL
    try {
      await _api.post('/notifications/urgentes/read', {'alerteIds': list});
    } catch (_) {}

    // 2. Cache local de secours (mode hors ligne)
    try {
      final existants = await getAlertesVuesIds();
      existants.addAll(list);
      await _secureStorage.write(
        key: _keyAlertesVues,
        value: jsonEncode(existants.toList()),
      );
    } catch (_) {}
  }

  /// Récupère les alertes urgentes et prioritaires pour l'utilisateur
  /// (retards de paiement, acceptation de bourse, notifications critiques),
  /// en excluant automatiquement celles déjà vues ou fermées si demandé.
  Future<List<AlerteUrgente>> getAlertesUrgentes({bool exclureDejaVues = true}) async {
    try {
      final res = await _api.get('/notifications/urgentes');
      if (res is List) {
        final alertes = res
            .map((e) => AlerteUrgente.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();

        if (exclureDejaVues) {
          final vues = await getAlertesVuesIds();
          return alertes.where((a) => !vues.contains(a.id)).toList();
        }
        return alertes;
      }
    } catch (_) {}
    return const [];
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    deconnecterSocket();
    super.dispose();
  }
}

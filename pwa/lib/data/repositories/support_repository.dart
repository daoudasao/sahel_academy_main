import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import '../../core/api/api_client.dart';
import '../../core/api/api_config.dart';
import '../../core/utils/safe_change_notifier.dart';
import '../../models/support_message.dart';

/// Chat entre le client et le support, branché sur l'API NestJS + WebSocket (Socket.IO).
class SupportRepository extends ChangeNotifier with SafeChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  List<SupportMessage> _messages = [];
  bool _enChargement = false;
  bool _charge = false;
  String? _erreur;
  socket_io.Socket? _socket;
  bool _socketInitialise = false;

  List<SupportMessage> get messages => List.unmodifiable(_messages);
  bool get enChargement => _enChargement;
  bool get estCharge => _charge;
  String? get erreur => _erreur;
  bool get estConnecteSocket => _socket?.connected ?? false;

  /// Inicie la connexion WebSocket pour écouter les messages en temps réel.
  Future<void> initialiserSocket() async {
    if (_socketInitialise && _socket != null && _socket!.connected) return;

    final token = await _api.getToken();
    final socketUrl = ApiConfig.baseUrl.replaceAll(RegExp(r'/api/v1/?$'), '');

    _socket?.dispose();
    _socket = socket_io.io(
      '$socketUrl/support',
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
      notifyListeners();
    });

    _socket?.on('new_message', (data) {
      if (data is Map) {
        final msg = SupportMessage.fromJson(Map<String, dynamic>.from(data));
        final existe = _messages.any((m) => m.id == msg.id);
        if (!existe) {
          _messages.add(msg);
          notifyListeners();
        }
      }
    });

    _socket?.on('delete_message', (data) {
      if (data is Map && data['id'] != null) {
        final id = data['id'].toString();
        _messages.removeWhere((m) => m.id == id);
        notifyListeners();
      }
    });

    _socket?.connect();
  }

  /// Ferme la connexion WebSocket lors de la destruction/fermeture du fil.
  void deconnecterSocket() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _socketInitialise = false;
  }

  /// Charge le fil de discussion complet depuis l'API REST et connecte le WebSocket.
  Future<void> charger({bool silencieux = false}) async {
    if (_enChargement) return;
    if (!silencieux) {
      _enChargement = true;
      _erreur = null;
      notifyListeners();
    }
    try {
      final data = await _api.get('/support/messages');
      _messages = _versListe(data)
          .map((e) => SupportMessage.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      _charge = true;
      _erreur = null;
      // Connecter le socket si ce n'est pas encore fait
      await initialiserSocket();
    } catch (e) {
      if (!silencieux) _erreur = e.toString();
    } finally {
      if (!silencieux) _enChargement = false;
      notifyListeners();
    }
  }

  /// Envoie un message du client.
  Future<void> envoyer(String contenu) async {
    final data = await _api.post('/support/messages', {'contenu': contenu});
    if (data is Map) {
      final msg = SupportMessage.fromJson(Map<String, dynamic>.from(data));
      final existe = _messages.any((m) => m.id == msg.id);
      if (!existe) {
        _messages.add(msg);
        notifyListeners();
      }
    }
  }

  /// Envoie un message vocal du client.
  Future<void> envoyerAudio(List<int> bytes, int dureeSeconds) async {
    final fileName = 'vocal_${DateTime.now().millisecondsSinceEpoch}.m4a';
    final audioUrl = await _api.uploadMultipart(bytes, fileName, folder: 'support');

    final data = await _api.post('/support/messages', {
      'contenu': audioUrl,
      'type': 'audio',
      'audioUrl': audioUrl,
      'dureeSeconds': dureeSeconds,
    });

    if (data is Map) {
      final msg = SupportMessage.fromJson(Map<String, dynamic>.from(data));
      final existe = _messages.any((m) => m.id == msg.id);
      if (!existe) {
        _messages.add(msg);
        notifyListeners();
      }
    }
  }

  /// Supprime un message du fil de discussion (des deux côtés).
  Future<void> supprimerMessage(String messageId) async {
    try {
      await _api.delete('/support/messages/$messageId');
    } catch (_) {
      // Ignorer l'erreur REST si le socket supprime déjà ou si la suppression a réussi
    }
    _messages.removeWhere((m) => m.id == messageId);
    notifyListeners();
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }

  @override
  void dispose() {
    deconnecterSocket();
    super.dispose();
  }
}

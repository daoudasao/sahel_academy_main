import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import '../config/app_version.dart';

/// Service qui signale au backend l'appareil courant (installation / utilisation).
///
/// Au premier appel, un identifiant d'empreinte aléatoire est généré et
/// persisté de façon sécurisée. Les appels suivants réutilisent le même
/// identifiant. Le backend dédoublonne sur (userId + deviceFingerprint).
///
/// Appeler [ping] une seule fois après la connexion ou la restauration de
/// session réussie.
class AppInstallService {
  AppInstallService._();
  static final AppInstallService instance = AppInstallService._();

  static const _fingerprintKey = 'sa_device_fingerprint';
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  bool _pingEnvoye = false;

  /// Génère ou récupère une empreinte aléatoire unique pour cet appareil.
  Future<String> _getFingerprint() async {
    try {
      final existing = await _storage.read(key: _fingerprintKey);
      if (existing != null && existing.isNotEmpty) return existing;
    } catch (_) {}

    // Générer un identifiant aléatoire de 32 caractères hex
    final random = Random.secure();
    final values = List<int>.generate(16, (_) => random.nextInt(256));
    final fingerprint = values.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

    try {
      await _storage.write(key: _fingerprintKey, value: fingerprint);
    } catch (_) {}

    return fingerprint;
  }

  /// Détermine la plateforme courante.
  String _getPlateforme() {
    if (kIsWeb) return 'web';
    try {
      // dart:io n'est pas disponible sur le web
      // On utilise defaultTargetPlatform qui fonctionne partout
      switch (defaultTargetPlatform) {
        case TargetPlatform.android:
          return 'android';
        case TargetPlatform.iOS:
          return 'ios';
        case TargetPlatform.linux:
          return 'linux';
        case TargetPlatform.macOS:
          return 'macos';
        case TargetPlatform.windows:
          return 'windows';
        case TargetPlatform.fuchsia:
          return 'fuchsia';
      }
    } catch (_) {
      return 'unknown';
    }
  }

  /// Détermine le type d'installation (pwa, native, navigateur).
  String _getTypeInstallation() {
    if (kIsWeb) {
      // Sur le web, on essaie de détecter si l'app tourne en mode standalone (PWA installée)
      // Malheureusement, on ne peut pas accéder directement à window.matchMedia
      // depuis Dart. On considère "pwa" si web, car l'app est pensée comme PWA.
      // Le service worker + manifest font de cette app une PWA.
      return 'pwa';
    }
    // Sur Android/iOS/desktop : c'est une app native
    return 'native';
  }

  /// Détermine un nom descriptif de l'appareil.
  String _getDeviceModel() {
    if (kIsWeb) return 'Navigateur Web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'Android';
      case TargetPlatform.iOS:
        return 'iPhone/iPad';
      case TargetPlatform.linux:
        return 'Linux Desktop';
      case TargetPlatform.macOS:
        return 'macOS Desktop';
      case TargetPlatform.windows:
        return 'Windows Desktop';
      default:
        return 'Inconnu';
    }
  }

  /// Envoie un ping au backend pour signaler l'appareil courant.
  ///
  /// Ne fait rien si le ping a déjà été envoyé dans cette session ou
  /// si l'utilisateur n'a pas de token de session valide.
  Future<void> ping() async {
    if (_pingEnvoye) return;

    final api = ApiClient.instance;
    if (!await api.hasToken()) return;

    try {
      final fingerprint = await _getFingerprint();
      final body = {
        'deviceFingerprint': fingerprint,
        'plateforme': _getPlateforme(),
        'typeInstallation': _getTypeInstallation(),
        'appVersion': AppVersion.version,
        'deviceModel': _getDeviceModel(),
      };

      await api.post('/app-installs/ping', body);
      _pingEnvoye = true;
      debugPrint('📱 App install ping envoyé avec succès');
    } catch (e) {
      // Ne jamais bloquer l'app si le ping échoue
      debugPrint('⚠️ Ping install ignoré : $e');
    }
  }

  /// Réinitialise l'état du ping (à appeler lors de la déconnexion).
  void reset() {
    _pingEnvoye = false;
  }
}

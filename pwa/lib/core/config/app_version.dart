import 'package:package_info_plus/package_info_plus.dart';

/// Version de l'application, lue depuis le `version:` du pubspec.yaml
/// (donc toujours celle du binaire réellement installé).
///
/// À appeler une fois au démarrage : `await AppVersion.init()`.
/// Les valeurs par défaut ne servent que si la lecture échoue.
class AppVersion {
  AppVersion._();

  /// Numéro de version sémantique (ex. « 1.1.2 »)
  static String version = '1.1.2';

  /// Numéro de build (ex. 108)
  static int buildNumber = 108;

  /// Libellé complet à afficher dans l'interface
  static String get label => 'v$version (Build $buildNumber)';

  /// Version complète envoyée au backend (ex. « 1.1.2+108 »)
  static String get full => '$version+$buildNumber';

  static Future<void> init() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (info.version.isNotEmpty) version = info.version;
      final build = int.tryParse(info.buildNumber);
      if (build != null) buildNumber = build;
    } catch (_) {
      // On garde les valeurs par défaut : ne jamais bloquer le démarrage.
    }
  }
}

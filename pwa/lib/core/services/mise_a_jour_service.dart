import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:in_app_update/in_app_update.dart';

/// Vérifie au lancement si une nouvelle version est disponible sur le
/// Play Store et propose de l'installer sans quitter l'app (API « in-app
/// updates » de Google Play).
///
/// Android uniquement, et seulement pour une app installée depuis le Play
/// Store : ailleurs (web, iOS, `flutter run`), la vérification est ignorée.
///
/// Deux modes, choisis par la priorité donnée à la version dans la Play
/// Console (0 à 5) :
/// * priorité ≥ 4 → mise à jour **immédiate** : écran Google plein écran,
///   l'utilisateur doit mettre à jour pour continuer (correctif critique) ;
/// * sinon → mise à jour **flexible** : téléchargement en arrière-plan pendant
///   que l'utilisateur continue, puis bandeau « Redémarrer ».
class MiseAJourService {
  MiseAJourService._();
  static final MiseAJourService instance = MiseAJourService._();

  static const int _prioriteImmediate = 4;

  bool _dejaVerifie = false;

  Future<void> verifier(GlobalKey<ScaffoldMessengerState> messengerKey) async {
    if (_dejaVerifie || kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return;
    }
    _dejaVerifie = true;

    try {
      final info = await InAppUpdate.checkForUpdate();

      // Une mise à jour flexible téléchargée lors d'une session précédente
      // attend encore d'être installée.
      if (info.installStatus == InstallStatus.downloaded) {
        _proposerRedemarrage(messengerKey);
        return;
      }

      // Mise à jour immédiate interrompue (app fermée pendant l'installation) :
      // Google demande de la reprendre.
      if (info.updateAvailability ==
          UpdateAvailability.developerTriggeredUpdateInProgress) {
        await InAppUpdate.performImmediateUpdate();
        return;
      }

      if (info.updateAvailability != UpdateAvailability.updateAvailable) return;

      final critique = info.updatePriority >= _prioriteImmediate;
      if ((critique || !info.flexibleUpdateAllowed) && info.immediateUpdateAllowed) {
        await InAppUpdate.performImmediateUpdate();
      } else if (info.flexibleUpdateAllowed) {
        final resultat = await InAppUpdate.startFlexibleUpdate();
        if (resultat == AppUpdateResult.success) {
          _proposerRedemarrage(messengerKey);
        }
      }
    } catch (e) {
      // Pas installée depuis le Play Store, Play Store absent, hors ligne… :
      // la vérification ne doit jamais gêner le démarrage.
      debugPrint('Vérification de mise à jour ignorée : $e');
    }
  }

  void _proposerRedemarrage(GlobalKey<ScaffoldMessengerState> messengerKey) {
    messengerKey.currentState
      ?..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: const Text('Une nouvelle version est prête.'),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(days: 1),
          action: SnackBarAction(
            label: 'Redémarrer',
            onPressed: () => InAppUpdate.completeFlexibleUpdate(),
          ),
        ),
      );
  }
}

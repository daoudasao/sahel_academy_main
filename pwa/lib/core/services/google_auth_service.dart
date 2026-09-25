import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../api/api_config.dart';

/// Encapsule la connexion Google, qui n'emprunte pas le même chemin selon la
/// plateforme :
///
/// * **Android / iOS** — SDK natif (`google_sign_in`). L'app récupère un
///   `id_token` et le poste sur `POST /auth/sign-in/social`.
/// * **Web / PWA** — redirection. L'app navigue vers
///   `GET /oauth/google/start`, le backend orchestre le va-et-vient avec
///   Google puis renvoie le navigateur avec un jeton à usage unique.
///
/// Dans les deux cas, c'est le backend qui vérifie l'identité auprès de Google
/// et qui délivre la session.
class GoogleAuthService {
  GoogleAuthService._();
  static final GoogleAuthService instance = GoogleAuthService._();

  bool _initialise = false;
  bool _disponible = false;

  /// `true` si le parcours Google est utilisable sur cette plateforme.
  ///
  /// Sur le web, tout se joue côté backend : le bouton est donc toujours
  /// proposé. Sur mobile, il faut que le SDK ait pu s'initialiser avec un
  /// identifiant client valide, sinon le bouton est masqué.
  bool get disponible => _disponible;

  /// `true` là où l'app peut déclencher elle-même la feuille de connexion
  /// (Android, iOS). `false` sur le web, où l'on passe par une redirection.
  bool get supporteConnexionDirecte => !kIsWeb && _disponible;

  /// À appeler une seule fois au démarrage, avant tout autre appel.
  Future<void> initialiser() async {
    if (_initialise) return;
    _initialise = true;

    // Web : aucun SDK à charger, la redirection est toujours disponible.
    if (kIsWeb) {
      _disponible = true;
      return;
    }

    final String? clientId =
        (defaultTargetPlatform == TargetPlatform.iOS ||
            defaultTargetPlatform == TargetPlatform.macOS)
        ? _ouNull(ApiConfig.googleIosClientId)
        : null;

    try {
      await GoogleSignIn.instance.initialize(
        clientId: clientId,
        // L'id token doit porter l'audience du client « Web », c'est-à-dire le
        // GOOGLE_CLIENT_ID connu du backend.
        serverClientId: _ouNull(ApiConfig.googleWebClientId),
      );
      _disponible = true;
    } catch (e) {
      // Identifiants absents ou invalides : on désactive proprement Google.
      _disponible = false;
      debugPrint('Google Sign-In indisponible (clientId manquant ?) : $e');
    }
  }

  /// Ouvre la feuille de connexion native et renvoie l'`id_token` Google.
  ///
  /// Android / iOS uniquement. Lève [GoogleSignInException] en cas d'échec,
  /// y compris `canceled` : sur Android, Google renvoie aussi « annulé »
  /// quand l'app n'est pas reconnue (client OAuth Android ou SHA-1 manquant,
  /// écran de consentement en mode test). L'ignorer laissait l'utilisateur
  /// bloqué sur l'écran de connexion sans explication.
  Future<String?> connexion() async {
    if (!supporteConnexionDirecte) {
      throw StateError(
        'Sur cette plateforme, la connexion Google passe par une redirection.',
      );
    }
    final GoogleSignInAccount compte = await GoogleSignIn.instance
        .authenticate();
    return compte.authentication.idToken;
  }

  /// Oublie le compte Google côté SDK (appelé à la déconnexion de l'app).
  Future<void> deconnexion() async {
    if (!_disponible || kIsWeb) return;
    try {
      await GoogleSignIn.instance.signOut();
    } catch (e) {
      debugPrint('Déconnexion Google ignorée : $e');
    }
  }

  static String? _ouNull(String valeur) => valeur.isEmpty ? null : valeur;
}

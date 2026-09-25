import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_config.dart';
import '../../core/services/fcm_service.dart';
import '../../core/services/google_auth_service.dart';
import '../../core/services/oauth_web_bridge.dart';
import '../../core/utils/safe_change_notifier.dart';
import '../../models/app_user.dart';

/// Gère l'état de connexion de l'utilisateur via l'API (better-auth).
///
/// L'authentification mobile utilise un **token bearer** : le token de session
/// renvoyé par le backend est capturé et persisté par [ApiClient], puis envoyé
/// dans l'en-tête `Authorization` à chaque requête.
class AuthRepository extends ChangeNotifier with SafeChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  AppUser? _utilisateur;
  bool _pretInitial = false;
  bool _googleEnCours = false;
  String? _erreurGoogle;

  AppUser? get utilisateur => _utilisateur;
  bool get estConnecte => _utilisateur != null;

  /// Passe à `true` une fois la tentative de restauration de session terminée.
  bool get pretInitial => _pretInitial;

  /// `true` pendant l'échange de l'id token Google contre une session backend.
  bool get googleEnCours => _googleEnCours;

  /// `true` quand il manque des informations obligatoires au profil.
  ///
  /// Le téléphone est exigé à l'inscription, mais deux cas y échappent : les
  /// comptes créés via Google (qui ne fournit pas de numéro) et les comptes
  /// plus anciens, créés avant que le champ ne devienne obligatoire. Le
  /// routeur s'appuie dessus pour imposer l'écran de complétion.
  bool get profilIncomplet =>
      _utilisateur != null && _utilisateur!.telephone.trim().isEmpty;

  /// Dernière erreur de connexion Google (consommée par l'UI puis effacée).
  String? get erreurGoogle => _erreurGoogle;

  AuthRepository() {
    _api.onUnauthenticated = _handleUnauthenticated;
    _restaurerSession();
  }

  /// À appeler après affichage du message d'erreur, pour ne pas le rejouer.
  void effacerErreurGoogle() {
    if (_erreurGoogle == null) return;
    _erreurGoogle = null;
    notifyListeners();
  }

  void _handleUnauthenticated() {
    if (_utilisateur != null) {
      _utilisateur = null;
      notifyListeners();
    }
  }

  /// Au démarrage : si un token est stocké, on tente de restaurer la session.
  /// En cas d'erreur réseau (ex: hors-ligne), on conserve le profil utilisateur mis en cache.
  Future<void> _restaurerSession() async {
    try {
      // 0. Web : retour du flux Google (fragment `#ott=…` posé par le backend).
      await _traiterRetourOAuthWeb();

      // 1. Restauration instantanée depuis le cache local (mode hors-ligne ou démarrage rapide)
      final cachedJson = await _api.getCachedUserJson();
      if (cachedJson != null && cachedJson.isNotEmpty) {
        try {
          final decoded = jsonDecode(cachedJson);
          if (decoded is Map<String, dynamic>) {
            _utilisateur = AppUser.fromJson(decoded);
            notifyListeners();
            FcmService.instance.initialize();
          }
        } catch (_) {}
      }

      // 2. Si un token existe, on vérifie / rafraîchit la session auprès du serveur
      if (await _api.hasToken()) {
        try {
          // Utilise /users/me pour avoir les données profil à jour directement depuis la BDD
          dynamic data;
          try {
            data = await _api.get('/users/me');
          } catch (_) {
            data = await _api.get('/auth/get-session');
          }
          _appliquerSession(data);
        } on ApiException catch (e) {
          if (e.statusCode == 401) {
            // Session expirée ou révoquée sur le serveur
            _utilisateur = null;
            await _api.clearToken();
          } else {
            // Erreur réseau (0) ou serveur (5xx) : conserver le cache local
            debugPrint('Vérification session en attente (code ${e.statusCode}): $e');
          }
        } catch (e) {
          debugPrint('Problème réseau lors de la vérification de session: $e');
        }
      } else {
        _utilisateur = null;
        await _api.clearCachedUserJson();
      }
    } finally {
      _pretInitial = true;
      notifyListeners();
    }
  }

  /// Rafraîchit manuellement les informations de l'utilisateur (ex: lors d'un pull-to-refresh).
  Future<void> rafraichirSession() async {
    if (await _api.hasToken()) {
      try {
        dynamic data;
        try {
          data = await _api.get('/users/me');
        } catch (_) {
          data = await _api.get('/auth/get-session');
        }
        _appliquerSession(data);
        notifyListeners();
      } catch (e) {
        debugPrint('Erreur lors du rafraîchissement du profil: $e');
      }
    }
  }

  /// Met à jour les informations du profil de l'utilisateur (nom, téléphone, avatarUrl).
  Future<void> mettreAJourProfil({
    required String nom,
    required String telephone,
    String? avatarUrl,
  }) async {
    try {
      final res = await _api.patch('/users/me', {
        'name': nom.trim(),
        'telephone': telephone.trim(),
        'avatarUrl': ?avatarUrl,
        'image': ?avatarUrl,
      });
      if (res is Map) {
        _utilisateur = AppUser(
          id: (res['id'] ?? _utilisateur?.id ?? '').toString(),
          nom: (res['name'] ?? res['nom'] ?? nom).toString(),
          email: (res['email'] ?? _utilisateur?.email ?? '').toString(),
          telephone: (res['telephone'] ?? telephone).toString(),
          avatarUrl: res['avatarUrl']?.toString() ??
              res['image']?.toString() ??
              avatarUrl ??
              _utilisateur?.avatarUrl,
          role: (res['role'] ?? _utilisateur?.role ?? 'ETUDIANT').toString(),
        );
        await _api.setCachedUserJson(jsonEncode(_utilisateur!.toJson()));
      }
    } catch (e) {
      debugPrint('Mise à jour distante échouée, fallback local: $e');
      if (_utilisateur != null) {
        _utilisateur = _utilisateur!.copyWith(
          nom: nom.trim(),
          telephone: telephone.trim(),
          avatarUrl: avatarUrl ?? _utilisateur!.avatarUrl,
        );
        await _api.setCachedUserJson(jsonEncode(_utilisateur!.toJson()));
      }
    }
    notifyListeners();
  }

  /// Enregistre le numéro de téléphone manquant (écran de complétion).
  Future<void> enregistrerTelephone(String telephone) async {
    final numero = telephone.trim();
    final res = await _api.patch('/users/me', {'telephone': numero});

    final actuel = _utilisateur;
    if (actuel == null) return;
    _utilisateur = actuel.copyWith(
      telephone: (res is Map ? res['telephone']?.toString() : null) ?? numero,
    );
    await _api.setCachedUserJson(jsonEncode(_utilisateur!.toJson()));
    notifyListeners();
  }

  void _appliquerSession(dynamic data) {
    final user = (data is Map) ? (data['user'] ?? data) : null;
    if (user is Map) {
      _utilisateur = AppUser(
        id: (user['id'] ?? '').toString(),
        nom: (user['name'] ?? user['nom'] ?? '').toString(),
        email: (user['email'] ?? '').toString(),
        telephone: (user['telephone'] ?? '').toString(),
        avatarUrl: user['avatarUrl']?.toString() ?? user['image']?.toString(),
        // Le rôle décide de l'espace affiché (élève ou formateur).
        role: (user['role'] ?? _utilisateur?.role ?? 'ETUDIANT').toString(),
      );
      _api.setCachedUserJson(jsonEncode(_utilisateur!.toJson()));
      FcmService.instance.initialize();
    } else {
      _utilisateur = null;
      _api.clearCachedUserJson();
    }
  }

  /// Connexion par e-mail/mot de passe.
  Future<void> connexionEmail({
    required String email,
    required String motDePasse,
  }) async {
    try {
      await _api.post('/auth/sign-in/email', {
        'email': email.trim(),
        'password': motDePasse,
      });
    } catch (e) {
      debugPrint('Connexion échouée: $e');
      throw const ApiException(401, 'Connexion impossible. Réessayez.');
    }

    final data = await _api.get('/auth/get-session');
    _appliquerSession(data);
    if (_utilisateur == null) {
      throw const ApiException(401, 'Connexion impossible. Réessayez.');
    }
    notifyListeners();
  }

  /// Création de compte.
  Future<void> inscription({
    required String nom,
    required String email,
    required String telephone,
    required String motDePasse,
  }) async {
    await _api.post('/auth/sign-up/email', {
      'name': nom.trim(),
      'email': email.trim(),
      'password': motDePasse,
      'telephone': telephone.trim(),
    });
    final data = await _api.get('/auth/get-session');
    _appliquerSession(data);
    notifyListeners();
  }

  /// Connexion via un fournisseur OAuth (Google, Apple...).
  Future<void> connexionOAuth(String fournisseur) async {
    if (fournisseur == 'google') return connexionGoogle();
    throw ApiException(
      501,
      'La connexion via $fournisseur sera bientôt disponible.',
    );
  }

  /// Connexion Google.
  ///
  /// * Android / iOS : feuille native, puis échange de l'id token.
  /// * Web / PWA : redirection vers le backend, qui orchestre le va-et-vient
  ///   avec Google. La page est quittée ; la suite se joue au retour, dans
  ///   [_traiterRetourOAuthWeb].
  Future<void> connexionGoogle() async {
    final google = GoogleAuthService.instance;
    if (!google.disponible) {
      throw const ApiException(
        501,
        "La connexion Google n'est pas configurée sur cette application.",
      );
    }

    if (!google.supporteConnexionDirecte) {
      final urlRetour = urlApplicationCourante();
      if (urlRetour == null) {
        throw const ApiException(
          501,
          'La connexion Google est indisponible sur cette plateforme.',
        );
      }
      _erreurGoogle = null;
      _googleEnCours = true;
      notifyListeners();
      naviguerVers(ApiConfig.urlDemarrageGoogle(urlRetour));
      return;
    }

    String? idToken;
    try {
      idToken = await google.connexion();
    } catch (e) {
      debugPrint('Connexion Google échouée: $e');
      throw const ApiException(401, 'Connexion Google impossible. Réessayez.');
    }
    // Annulation par l'utilisateur : rien à signaler.
    if (idToken == null || idToken.isEmpty) return;

    await connexionAvecIdTokenGoogle(idToken);
  }

  /// Web : consomme le jeton à usage unique déposé par le backend dans le
  /// fragment de l'URL et l'échange contre une session.
  ///
  /// Le jeton est à usage unique et vit 3 minutes ; l'échange renvoie le token
  /// bearer dans l'en-tête `set-auth-token`, capturé par [ApiClient].
  Future<void> _traiterRetourOAuthWeb() async {
    final params = consommerFragmentOAuth();
    if (params.isEmpty) return;

    final erreur = params['erreur'];
    if (erreur != null && erreur.isNotEmpty) {
      _erreurGoogle = _messageErreurOAuth(erreur);
      return;
    }

    final ott = params['ott'];
    if (ott == null || ott.isEmpty) return;

    _googleEnCours = true;
    notifyListeners();
    try {
      final data = await _api.post('/auth/one-time-token/verify', {
        'token': ott,
      });
      _appliquerSession(data);
      if (_utilisateur == null) {
        _erreurGoogle = 'Connexion Google impossible. Réessayez.';
      }
    } catch (e) {
      debugPrint('Échange du jeton OAuth échoué: $e');
      _erreurGoogle = 'Connexion Google impossible. Réessayez.';
    } finally {
      _googleEnCours = false;
      notifyListeners();
    }
  }

  /// Traduit les codes d'erreur renvoyés par better-auth (et par le pont
  /// OAuth) en messages compréhensibles, qui disent quoi faire ensuite.
  String _messageErreurOAuth(String code) {
    switch (code) {
      // Un compte e-mail existe déjà avec cette adresse et n'a pas pu être
      // rattaché automatiquement au compte Google.
      case 'account_not_linked':
        return 'Un compte existe déjà avec cette adresse e-mail. '
            'Connecte-toi avec ton mot de passe.';
      case 'account_already_linked_to_different_user':
        return 'Ce compte Google est déjà relié à un autre utilisateur.';
      case 'email_does_not_match':
        return "L'adresse Google ne correspond pas à celle de ton compte.";
      case 'email_not_verified':
        return "Ton adresse Google n'est pas vérifiée. "
            'Vérifie-la chez Google puis réessaie.';
      case 'email_not_found':
      case 'unable_to_get_user_info':
        return "Google n'a pas transmis ton adresse e-mail. "
            'Réessaie en autorisant le partage de ton adresse.';
      case 'unable_to_link_account':
        return 'Impossible de relier ce compte Google. Réessayez.';

      // Configuration serveur incomplète.
      case 'google_indisponible':
      case 'oauth_provider_not_found':
        return "La connexion Google n'est pas encore activée côté serveur.";

      // Parcours interrompu (retour en arrière, session expirée, lien rejoué…).
      case 'session_absente':
      case 'echange_impossible':
      case 'no_code':
      case 'invalid_code':
      case 'state_mismatch':
      case 'state_not_found':
      case 'nonce_binding_missing':
      case 'issuer_mismatch':
      case 'issuer_missing':
      case 'access_denied':
        return 'Connexion Google interrompue. Réessayez.';

      default:
        return 'Connexion Google impossible ($code). Réessayez.';
    }
  }

  /// Échange un id token Google contre une session better-auth.
  ///
  /// Le backend vérifie la signature et l'audience du jeton auprès de Google,
  /// crée le compte à la première connexion, puis renvoie le token de session
  /// dans l'en-tête `set-auth-token` (capturé par [ApiClient]).
  Future<void> connexionAvecIdTokenGoogle(String idToken) async {
    _erreurGoogle = null;
    _googleEnCours = true;
    notifyListeners();
    try {
      final data = await _api.post('/auth/sign-in/social', {
        'provider': 'google',
        'idToken': {'token': idToken},
      });
      _appliquerSession(data);

      // Certaines réponses ne portent pas l'utilisateur complet : on relit la
      // session avec le token fraîchement stocké.
      if (_utilisateur == null) {
        _appliquerSession(await _api.get('/auth/get-session'));
      }
      if (_utilisateur == null) {
        throw const ApiException(401, 'Connexion Google impossible. Réessayez.');
      }
    } on ApiException catch (e) {
      _erreurGoogle = e.message;
      rethrow;
    } catch (e) {
      debugPrint('Échange id token Google échoué: $e');
      _erreurGoogle = 'Connexion Google impossible. Réessayez.';
      throw const ApiException(401, 'Connexion Google impossible. Réessayez.');
    } finally {
      _googleEnCours = false;
      notifyListeners();
    }
  }

  Future<void> changerMotDePasse({
    required String ancienMotDePasse,
    required String nouveauMotDePasse,
  }) async {
    try {
      await _api.post('/auth/change-password', {
        'currentPassword': ancienMotDePasse,
        'newPassword': nouveauMotDePasse,
        'revokeOtherSessions': false,
      });
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(500, 'Erreur lors de la modification du mot de passe: $e');
    }
  }

  /// Supprime définitivement le compte connecté (exigence Google Play), puis
  /// déconnecte localement. Le serveur a déjà révoqué toutes les sessions.
  Future<void> supprimerCompte() async {
    await _api.delete('/users/me');
    deconnexion();
  }

  void deconnexion() {
    _utilisateur = null;
    notifyListeners();
    // Best-effort côté serveur + purge local.
    _api.post('/auth/sign-out').catchError((_) => null);
    _api.clearToken();
    GoogleAuthService.instance.deconnexion();
  }
}

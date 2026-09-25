/// Configuration de l'accès à l'API backend (NestJS).
///
/// L'URL de base peut être surchargée au build sans toucher au code :
///   flutter run --dart-define=API_URL=https://mon-api.onrender.com/api/v1
///
/// Valeurs utiles selon la cible :
///   - Émulateur Android : http://10.0.2.2:3001/api/v1  (10.0.2.2 = localhost de la machine hôte)
///   - Simulateur iOS / desktop / web : http://localhost:3001/api/v1
///   - Téléphone physique : `http://IP_LAN_DE_LA_MACHINE:3001/api/v1`
///   - Production : `https://app.sahel-academy.com/api/v1` (valeur par défaut)
class ApiConfig {
  const ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://app.sahel-academy.com/api/v1',
  );

  /// Base des routes better-auth (montées sous /api/v1/auth côté backend).
  static String get authBase => '$baseUrl/auth';

  // ─── Google Sign-In ───
  // Les identifiants viennent de la console Google Cloud (mêmes projets que
  // Firebase). Ils se passent au build, sans jamais toucher au code :
  //   flutter build web --dart-define=GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
  //   flutter build ipa --dart-define=GOOGLE_IOS_CLIENT_ID=yyy.apps.googleusercontent.com

  /// Client OAuth de type « Application Web ».
  ///
  /// Sert de `clientId` sur le web (Google Identity Services) et de
  /// `serverClientId` sur Android/iOS : c'est lui qui devient l'audience de
  /// l'id token vérifié par le backend (`GOOGLE_CLIENT_ID`).
  static const String googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
  );

  /// Client OAuth de type « iOS » (requis uniquement sur iOS, sauf s'il est
  /// déjà déclaré via `GIDClientID` dans `ios/Runner/Info.plist`).
  static const String googleIosClientId = String.fromEnvironment(
    'GOOGLE_IOS_CLIENT_ID',
  );

  /// Point d'entrée du flux Google par redirection (web / PWA).
  ///
  /// Le backend renverra le navigateur vers [urlRetour] avec un jeton à usage
  /// unique dans le fragment. Aucun identifiant Google n'est nécessaire côté
  /// app : tout est configuré côté serveur.
  static String urlDemarrageGoogle(String urlRetour) =>
      '$baseUrl/oauth/google/start?redirect=${Uri.encodeComponent(urlRetour)}';
}

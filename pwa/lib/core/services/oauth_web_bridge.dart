// Point d'entrée multiplateforme pour le pont OAuth web.
//
// - Web (`dart.library.js_interop`) : navigation vers le backend et lecture du
//   fragment de retour (`#ott=…`).
// - Mobile / desktop : no-op, la connexion Google y passe par le SDK natif.
export 'oauth_web_bridge_stub.dart'
    if (dart.library.js_interop) 'oauth_web_bridge_web.dart';

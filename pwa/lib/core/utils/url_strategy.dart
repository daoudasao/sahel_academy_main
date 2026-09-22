// Point d'entrée multiplateforme pour la stratégie d'URL.
//
// - Web (`dart.library.js_interop`) : active `usePathUrlStrategy()`.
// - Mobile / desktop : no-op.
export 'url_strategy_stub.dart'
    if (dart.library.js_interop) 'url_strategy_web.dart';

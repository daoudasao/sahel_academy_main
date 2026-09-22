import 'package:flutter_web_plugins/url_strategy.dart';

/// Sur le web : active les URLs « propres » (sans #), ex. `/actualite`.
/// Le fallback SPA (toute route -> index.html) est assuré par `web/vercel.json`.
void configurerUrlStrategy() => usePathUrlStrategy();

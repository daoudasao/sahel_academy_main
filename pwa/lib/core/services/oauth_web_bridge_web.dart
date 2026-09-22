import 'package:web/web.dart' as web;

/// URL de la page courante, sans fragment ni paramètres.
///
/// C'est l'adresse à laquelle le backend renverra le navigateur une fois
/// Google passé.
String? urlApplicationCourante() {
  final location = web.window.location;
  return '${location.origin}${location.pathname}';
}

/// Navigation de premier niveau : indispensable pour que les cookies posés par
/// le backend pendant le flux OAuth reviennent au moment du callback.
void naviguerVers(String url) => web.window.location.assign(url);

/// Lit puis efface le fragment de retour OAuth.
///
/// Le jeton arrive dans le fragment (`#ott=…`) : il n'est donc jamais transmis
/// au serveur qui héberge la PWA. On nettoie l'URL dans la foulée pour ne pas
/// le laisser dans la barre d'adresse ni dans l'historique.
Map<String, String> consommerFragmentOAuth() {
  final location = web.window.location;
  final fragment = location.hash;
  if (fragment.length < 2) return const <String, String>{};

  Map<String, String> params;
  try {
    params = Uri.splitQueryString(fragment.substring(1));
  } catch (_) {
    return const <String, String>{};
  }
  if (!params.containsKey('ott') && !params.containsKey('erreur')) {
    return const <String, String>{};
  }

  web.window.history.replaceState(
    null,
    '',
    '${location.pathname}${location.search}',
  );
  return params;
}

// Implémentation par défaut (mobile / desktop) : il n'y a pas de navigateur
// à piloter, la connexion Google passe par le SDK natif.

/// URL de la page courante, sans fragment ni paramètres.
String? urlApplicationCourante() => null;

/// Navigation de premier niveau vers [url].
void naviguerVers(String url) {}

/// Lit puis efface le fragment de retour OAuth (`#ott=…` ou `#erreur=…`).
Map<String, String> consommerFragmentOAuth() => const <String, String>{};

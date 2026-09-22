/// Un bouton d'action affiché sous un post d'actualité, qui redirige vers une
/// page précise de l'application.
///
/// [route] est une page de l'app (ex: '/paiements', '/bourses', '/resultats', '/bourse/:id/resultat').
class ActionPost {
  final String label;
  final String route;
  final String? icone; // clé d'icône optionnelle : verifier, paiement, ...

  const ActionPost({required this.label, required this.route, this.icone});

  /// Construit une ActionPost depuis le JSON de l'API.
  ///
  /// Le backend stocke une [cible] logique (resultats | bourses | paiements |
  /// formations | resultats:bourseId) ; on la traduit en route de l'app + clé d'icône.
  factory ActionPost.fromJson(Map<String, dynamic> j) {
    final cible = (j['cible'] ?? j['route'] ?? '').toString();
    return ActionPost(
      label: (j['label'] ?? '').toString(),
      route: _routeDepuisCible(cible),
      icone: _iconeDepuisCible(cible),
    );
  }

  static String _routeDepuisCible(String cible) {
    if (cible.startsWith('/')) return cible;
    if (cible.startsWith('bourse/')) return '/$cible';
    if (cible.startsWith('resultats:')) {
      final id = cible.substring('resultats:'.length);
      return '/bourse/$id/resultat';
    }
    switch (cible) {
      case 'formations':
        return '/formations';
      case 'bourses':
        return '/bourses';
      case 'paiements':
        return '/paiements';
      case 'resultats':
        return '/resultats';
      default:
        return cible.isEmpty ? '/' : '/$cible';
    }
  }

  static String? _iconeDepuisCible(String cible) {
    if (cible.contains('resultat') || cible.startsWith('resultats')) {
      return 'verifier';
    }
    switch (cible) {
      case 'paiements':
        return 'paiement';
      case 'bourses':
        return 'bourse';
      case 'formations':
        return 'formation';
      case 'resultats':
        return 'verifier';
      default:
        return null;
    }
  }
}

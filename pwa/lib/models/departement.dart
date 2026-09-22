/// Un département regroupe des formations d'un même domaine
/// (ex: Informatique, Comptabilité, Langues...).
///
/// Modèle "pur" : aucune dépendance à Flutter, pour qu'il soit facile
/// à remplir plus tard avec les données du backend NestJS.
class Departement {
  final String id;
  final String nom;
  final String description;
  final int nombreFormations;

  const Departement({
    required this.id,
    required this.nom,
    required this.description,
    required this.nombreFormations,
  });

  /// Construit un Departement depuis le JSON de l'API backend.
  factory Departement.fromJson(Map<String, dynamic> j) {
    final count = j['_count'];
    final nb =
        (count is Map ? count['formations'] : null) ??
        j['nombreFormations'] ??
        0;
    return Departement(
      id: (j['id'] ?? '').toString(),
      nom: (j['nom'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      nombreFormations: nb is num ? nb.toInt() : int.tryParse('$nb') ?? 0,
    );
  }
}

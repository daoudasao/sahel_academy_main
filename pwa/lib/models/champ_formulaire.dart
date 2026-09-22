/// Type d'un champ de formulaire (comme les types de question d'un Google Form).
enum TypeChamp { texte, paragraphe, email, telephone, nombre, choix, lien }

/// Définition d'un champ à remplir dans un formulaire de candidature.
///
/// Ces champs sont censés être créés par l'admin (façon Google Forms).
class ChampFormulaire {
  final String id;
  final String label;
  final TypeChamp type;
  final bool obligatoire;
  final List<String> options; // uniquement pour le type `choix`
  final String? aide; // texte d'aide / exemple
  final String? cle; // clé sémantique optionnelle ('nom', 'email'...)

  const ChampFormulaire({
    required this.id,
    required this.label,
    this.type = TypeChamp.texte,
    this.obligatoire = true,
    this.options = const [],
    this.aide,
    this.cle,
  });

  /// Construit un ChampFormulaire depuis le JSON de l'API (entité backend
  /// `ChampFormulaire`, dont l'enum `type` a les mêmes noms).
  factory ChampFormulaire.fromJson(Map<String, dynamic> j) {
    final typeStr = (j['type'] ?? 'texte').toString();
    final type = TypeChamp.values.firstWhere(
      (t) => t.name == typeStr,
      orElse: () => TypeChamp.texte,
    );
    final opts = j['options'];
    final aide = j['aide'];
    final cle = j['cle'];
    return ChampFormulaire(
      id: (j['id'] ?? '').toString(),
      label: (j['label'] ?? '').toString(),
      type: type,
      obligatoire: j['obligatoire'] == true,
      options: opts is List ? opts.map((e) => e.toString()).toList() : const [],
      aide: (aide is String && aide.isNotEmpty) ? aide : null,
      cle: (cle is String && cle.isNotEmpty) ? cle : null,
    );
  }
}

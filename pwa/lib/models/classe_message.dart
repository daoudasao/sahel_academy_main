/// Un commentaire (réponse) sous un message de classe ou un post d'actualité.
/// Peut lui-même contenir des réponses (via [reponses]).
class Commentaire {
  final String id;
  final String auteurNom;
  final String auteurRole; // Formateur / Élève / Admin
  final String contenu;
  final DateTime date;
  final List<Commentaire> reponses;

  Commentaire({
    required this.id,
    required this.auteurNom,
    required this.auteurRole,
    required this.contenu,
    required this.date,
    List<Commentaire>? reponses,
  }) : reponses = reponses ?? [];

  /// Construit un Commentaire depuis le JSON de l'API.
  /// Le backend expose `auteur` + `role` + `createdAt` ; les [reponses] sont
  /// imbriquées (un seul niveau).
  factory Commentaire.fromJson(Map<String, dynamic> j) {
    final reps = j['reponses'];
    return Commentaire(
      id: (j['id'] ?? '').toString(),
      auteurNom: (j['auteur'] ?? j['auteurNom'] ?? '').toString(),
      auteurRole: (j['role'] ?? j['auteurRole'] ?? 'Élève').toString(),
      contenu: (j['contenu'] ?? '').toString(),
      date:
          DateTime.tryParse('${j['createdAt'] ?? j['date'] ?? ''}') ??
          DateTime.now(),
      reponses: reps is List
          ? reps
                .map((e) => Commentaire.fromJson(Map<String, dynamic>.from(e)))
                .toList()
          : null,
    );
  }
}

/// Un message publié par le formateur dans le fil d'une classe.
/// Les élèves peuvent y répondre via [commentaires].
class ClasseMessage {
  final String id;
  final String formationId;
  final String auteurNom;
  final String auteurRole; // Formateur
  final String contenu;
  final DateTime date;
  final String? documentNom;
  final List<Commentaire> commentaires;

  ClasseMessage({
    required this.id,
    required this.formationId,
    required this.auteurNom,
    required this.auteurRole,
    required this.contenu,
    required this.date,
    this.documentNom,
    List<Commentaire>? commentaires,
  }) : commentaires = commentaires ?? [];

  /// Construit un ClasseMessage depuis le JSON de l'API.
  factory ClasseMessage.fromJson(Map<String, dynamic> j) {
    final coms = j['commentaires'];
    final doc = j['documentNom'];
    return ClasseMessage(
      id: (j['id'] ?? '').toString(),
      formationId: (j['formationId'] ?? '').toString(),
      auteurNom: (j['auteurNom'] ?? '').toString(),
      auteurRole: (j['auteurRole'] ?? 'Formateur').toString(),
      contenu: (j['contenu'] ?? '').toString(),
      date:
          DateTime.tryParse('${j['createdAt'] ?? j['date'] ?? ''}') ??
          DateTime.now(),
      documentNom: (doc is String && doc.isNotEmpty) ? doc : null,
      commentaires: coms is List
          ? coms
                .map((e) => Commentaire.fromJson(Map<String, dynamic>.from(e)))
                .toList()
          : null,
    );
  }
}

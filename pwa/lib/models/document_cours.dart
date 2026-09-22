/// Un document mis à disposition dans une classe (onglet « Cours »).
class DocumentCours {
  final String id;
  final String formationId;
  final String titre;
  final String type; // PDF, Lien, Vidéo...
  final String taille; // ex: "1,2 Mo", "12 min", "—"
  final String? url;

  const DocumentCours({
    required this.id,
    required this.formationId,
    required this.titre,
    required this.type,
    this.taille = '—',
    this.url,
  });

  /// Construit un DocumentCours depuis le JSON de l'API.
  factory DocumentCours.fromJson(Map<String, dynamic> j) {
    final t = j['taille'];
    final u = j['url'];
    return DocumentCours(
      id: (j['id'] ?? '').toString(),
      formationId: (j['formationId'] ?? '').toString(),
      titre: (j['titre'] ?? j['nom'] ?? '').toString(),
      type: (j['type'] ?? 'PDF').toString(),
      taille: (t is String && t.isNotEmpty) ? t : '—',
      url: u?.toString(),
    );
  }
}

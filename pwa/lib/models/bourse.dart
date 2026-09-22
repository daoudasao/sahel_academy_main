import 'champ_formulaire.dart';

/// Une bourse proposée dans l'application (entité **distincte** d'une
/// [Formation] : côté backend c'est une ressource `/bourses` à part entière).
///
/// Une bourse porte son propre titre, sa description, son image, ses dates et
/// le formulaire de candidature ([champs]) défini par l'admin.
class Bourse {
  final String id;
  final String? formationId; // lien optionnel vers une formation (informatif)
  final String? departementId; // département / catégorie
  final String titre;
  final String description;
  final String? imageUrl; // image d'illustration (bannière)
  final DateTime? datePublication;
  final DateTime? dateLimite; // date limite pour postuler
  final String statut; // ouverte / fermee / en_attente
  final String? documentAdmissionUrl;
  final String? documentAdmissionNom;
  final String? messageAdmission;
  final List<ChampFormulaire> champs;
  final int nbCandidatures;

  const Bourse({
    required this.id,
    this.formationId,
    this.departementId,
    required this.titre,
    this.description = '',
    this.imageUrl,
    this.datePublication,
    this.dateLimite,
    this.statut = 'ouverte',
    this.documentAdmissionUrl,
    this.documentAdmissionNom,
    this.messageAdmission,
    this.champs = const [],
    this.nbCandidatures = 0,
  });

  bool get estOuverte => statut == 'ouverte';

  /// URL d'image à afficher (celle du modèle, sinon une image de démonstration
  /// stable propre à cette bourse).
  String get imageBanniere =>
      imageUrl ?? 'https://picsum.photos/seed/bourse-$id/700/360';

  /// Construit une Bourse depuis le JSON de l'API backend (`/bourses`).
  factory Bourse.fromJson(Map<String, dynamic> j) {
    DateTime? toDate(dynamic v) =>
        (v == null || '$v'.isEmpty) ? null : DateTime.tryParse('$v');
    final img = j['imageUrl'];
    final champsJson = j['champs'];
    final count = j['_count'];
    final dept = j['departement'];
    return Bourse(
      id: (j['id'] ?? '').toString(),
      formationId: (j['formationId'])?.toString(),
      departementId: j['departementId']?.toString() ??
          (dept is Map ? dept['id']?.toString() : null),
      titre: (j['titre'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      imageUrl: (img is String && img.isNotEmpty) ? img : null,
      datePublication: toDate(j['datePublication']),
      dateLimite: toDate(j['dateLimite']),
      statut: (j['statut'] ?? 'ouverte').toString(),
      documentAdmissionUrl: j['documentAdmissionUrl']?.toString(),
      documentAdmissionNom: j['documentAdmissionNom']?.toString(),
      messageAdmission: j['messageAdmission']?.toString(),
      champs: (champsJson is List)
          ? champsJson
                .map(
                  (e) => ChampFormulaire.fromJson(Map<String, dynamic>.from(e)),
                )
                .toList()
          : const [],
      nbCandidatures: (count is Map && count['candidatures'] is int)
          ? count['candidatures'] as int
          : 0,
    );
  }
}

/// Une formation proposée dans l'application.
///
/// `estBourse` = true lorsque la formation est une bourse (financée / gratuite).
/// Les prix sont exprimés en FCFA.
/// `datePublication` et `dateLimite` sont surtout utilisées pour les bourses.
class Formation {
  final String id;
  final String titre;
  final String description;
  final String departementId;
  final String? departementNom;
  final String formateurNom;
  final double prixInscription;
  final double prixMensualite;
  final int dureeMois;
  final String niveau; // Débutant, Intermédiaire, Avancé
  final bool estBourse;
  final DateTime? datePublication;
  final DateTime? dateLimite; // date limite pour postuler
  final String? imageUrl; // image d'illustration (bannière)
  final String? formateurUserId; // ID du compte utilisateur du formateur
  final bool estFormateur; // Indique si la session courante enseigne cette classe

  const Formation({
    required this.id,
    required this.titre,
    required this.description,
    required this.departementId,
    this.departementNom,
    required this.formateurNom,
    required this.prixInscription,
    required this.prixMensualite,
    required this.dureeMois,
    required this.niveau,
    this.estBourse = false,
    this.datePublication,
    this.dateLimite,
    this.imageUrl,
    this.formateurUserId,
    this.estFormateur = false,
  });

  /// Construit une Formation depuis le JSON de l'API backend.
  factory Formation.fromJson(Map<String, dynamic> j) {
    double toD(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;
    int toI(dynamic v) =>
        v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
    DateTime? toDate(dynamic v) =>
        (v == null || '$v'.isEmpty) ? null : DateTime.tryParse('$v');
    final formateur = j['formateur'];
    final img = j['imageUrl'];
    final dept = j['departement'];
    final deptNom = (dept is Map ? dept['nom'] : null)?.toString() ??
        (j['departementNom'] as String?);
    final fUserId = (formateur is Map ? formateur['userId'] : null)?.toString() ??
        (j['formateurUserId'] as String?);

    return Formation(
      id: (j['id'] ?? '').toString(),
      titre: (j['titre'] ?? '').toString(),
      description: (j['description'] ?? '').toString(),
      departementId: (j['departementId'] ?? '').toString(),
      departementNom: deptNom,
      formateurNom:
          (formateur is Map ? formateur['nom'] : null)?.toString() ??
          (j['formateurNom'] ?? '').toString(),
      prixInscription: toD(j['prixInscription']),
      prixMensualite: toD(j['prixMensualite']),
      dureeMois: toI(j['dureeMois']),
      niveau: (j['niveau'] ?? '').toString(),
      estBourse: j['estBourse'] == true,
      datePublication: toDate(j['datePublication']),
      dateLimite: toDate(j['dateLimite']),
      imageUrl: (img is String && img.isNotEmpty) ? img : null,
      formateurUserId: fUserId,
      estFormateur: j['estFormateur'] == true,
    );
  }

  /// Vérifie si l'utilisateur donné est le formateur de ce cours.
  bool estMonCours(String? userId) =>
      estFormateur || (userId != null && formateurUserId == userId);

  /// URL d'image à afficher (celle du modèle, sinon une image de démonstration
  /// stable propre à cette formation).
  String get imageBanniere =>
      imageUrl ?? 'https://picsum.photos/seed/sahel-$id/700/360';
}

/// Statut d'une candidature / admission.
enum StatutAdmission { enAttente, admis, refuse }

/// Résultat d'admission associé à une candidature.
class Admission {
  final String numeroForm; // identifiant de la candidature (référence)
  final String bourseId; // identifiant de la bourse visée
  final String? formationId; // identifiant de la formation associée (si disponible)
  final StatutAdmission statut;
  final String nom; // nom du candidat (info de profil)
  final String? email;
  final String titreBourse; // bourse / formation visée
  final String? bourseImageUrl;
  final String? documentAdmissionUrl;
  final String? documentAdmissionNom;
  final String? messageAdmission;
  final Map<String, dynamic>? reponses;
  final DateTime? dateDepot;

  const Admission({
    required this.numeroForm,
    required this.bourseId,
    this.formationId,
    required this.statut,
    required this.nom,
    this.email,
    required this.titreBourse,
    this.bourseImageUrl,
    this.documentAdmissionUrl,
    this.documentAdmissionNom,
    this.messageAdmission,
    this.reponses,
    this.dateDepot,
  });

  bool get admis => statut == StatutAdmission.admis;

  /// Construit une Admission depuis le JSON d'une candidature de l'API.
  factory Admission.fromJson(Map<String, dynamic> j) {
    final statutStr = (j['statut'] ?? '').toString();
    final statut = StatutAdmission.values.firstWhere(
      (s) => s.name == statutStr,
      orElse: () => StatutAdmission.enAttente,
    );
    final bourse = j['bourse'];
    String titre = '';
    String bId = (j['bourseId'] ?? '').toString();
    String? fId = (j['formationId'] ?? j['formation']?['id'])?.toString();
    String? imgUrl;
    String? docUrl;
    String? docNom;
    String? msgAdm;

    if (bourse is Map) {
      if (bId.isEmpty) bId = (bourse['id'] ?? '').toString();
      if (fId == null || fId.isEmpty) fId = (bourse['formationId'])?.toString();
      final formation = bourse['formation'];
      if (formation is Map) {
        if (fId == null || fId.isEmpty) fId = (formation['id'])?.toString();
        titre = (bourse['titre'] ?? formation['titre'] ?? '').toString();
      } else {
        titre = (bourse['titre'] ?? '').toString();
      }
      final img = bourse['imageUrl'];
      if (img is String && img.isNotEmpty) imgUrl = img;

      docUrl = bourse['documentAdmissionUrl']?.toString();
      docNom = bourse['documentAdmissionNom']?.toString();
      msgAdm = bourse['messageAdmission']?.toString();
    }

    final rep = j['reponses'];
    Map<String, dynamic>? reponsesMap;
    if (rep is Map) {
      reponsesMap = Map<String, dynamic>.from(rep);
    }
    return Admission(
      numeroForm: (j['id'] ?? '').toString(),
      bourseId: bId,
      formationId: fId,
      statut: statut,
      nom: (j['nom'] ?? j['user']?['nom'] ?? '').toString(),
      email: (j['email'] ?? j['user']?['email'])?.toString(),
      titreBourse: titre,
      bourseImageUrl: imgUrl,
      documentAdmissionUrl: docUrl,
      documentAdmissionNom: docNom,
      messageAdmission: msgAdm,
      reponses: reponsesMap,
      dateDepot: DateTime.tryParse('${j['dateDepot'] ?? j['createdAt'] ?? ''}'),
    );
  }
}

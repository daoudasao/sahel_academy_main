/// Données de l'espace formateur (`GET /espace-formateur/tableau-de-bord`).
class EspaceFormateur {
  final FicheFormateur formateur;
  final ResumeFormateur resume;
  final List<ClasseFormateur> classes;
  final List<FicheSalaireFormateur> salaires;

  const EspaceFormateur({
    required this.formateur,
    required this.resume,
    required this.classes,
    required this.salaires,
  });

  factory EspaceFormateur.fromJson(Map<String, dynamic> j) => EspaceFormateur(
        formateur: FicheFormateur.fromJson(_map(j['formateur'])),
        resume: ResumeFormateur.fromJson(_map(j['resume'])),
        classes: _liste(j['classes']).map(ClasseFormateur.fromJson).toList(),
        salaires:
            _liste(j['salaires']).map(FicheSalaireFormateur.fromJson).toList(),
      );
}

class FicheFormateur {
  final String id;
  final String nom;
  final String? specialite;
  final double salaireMensuel;

  const FicheFormateur({
    required this.id,
    required this.nom,
    this.specialite,
    required this.salaireMensuel,
  });

  factory FicheFormateur.fromJson(Map<String, dynamic> j) => FicheFormateur(
        id: '${j['id'] ?? ''}',
        nom: '${j['nom'] ?? ''}',
        specialite: _texte(j['specialite']),
        salaireMensuel: _nombre(j['salaireMensuel']),
      );
}

class ResumeFormateur {
  final int classes;
  final int apprenants;
  final double totalEncaissements;
  final double totalGains;
  final double totalSalaireDu;
  final double totalSalaireVerse;
  final double resteSalaire;

  const ResumeFormateur({
    required this.classes,
    required this.apprenants,
    required this.totalEncaissements,
    required this.totalGains,
    required this.totalSalaireDu,
    required this.totalSalaireVerse,
    required this.resteSalaire,
  });

  factory ResumeFormateur.fromJson(Map<String, dynamic> j) => ResumeFormateur(
        classes: _nombre(j['classes']).toInt(),
        apprenants: _nombre(j['apprenants']).toInt(),
        totalEncaissements: _nombre(j['totalEncaissements']),
        totalGains: _nombre(j['totalGains']),
        totalSalaireDu: _nombre(j['totalSalaireDu']),
        totalSalaireVerse: _nombre(j['totalSalaireVerse']),
        resteSalaire: _nombre(j['resteSalaire']),
      );
}

class ClasseFormateur {
  final String id;
  final String titre;
  final String? imageUrl;
  final String statut;
  final String departementId;
  final String? departementNom;
  final int apprenants;
  final int messages;
  final int documents;
  final double pourcentage;
  final double encaissements;
  final double gain;

  const ClasseFormateur({
    required this.id,
    required this.titre,
    this.imageUrl,
    required this.statut,
    required this.departementId,
    this.departementNom,
    required this.apprenants,
    required this.messages,
    required this.documents,
    required this.pourcentage,
    required this.encaissements,
    required this.gain,
  });

  factory ClasseFormateur.fromJson(Map<String, dynamic> j) => ClasseFormateur(
        id: '${j['id'] ?? ''}',
        titre: '${j['titre'] ?? ''}',
        imageUrl: _texte(j['imageUrl']),
        statut: '${j['statut'] ?? ''}',
        departementId: '${j['departementId'] ?? ''}',
        departementNom: _texte(j['departementNom']),
        apprenants: _nombre(j['apprenants']).toInt(),
        messages: _nombre(j['messages']).toInt(),
        documents: _nombre(j['documents']).toInt(),
        pourcentage: _nombre(j['pourcentage']),
        encaissements: _nombre(j['encaissements']),
        gain: _nombre(j['gain']),
      );
}

enum StatutSalaire { paye, partiel, impaye }

class FicheSalaireFormateur {
  final String id;
  final String mois;
  final double montantDu;
  final double montantVerse;
  final double reste;
  final StatutSalaire statut;
  final List<VersementFormateur> versements;

  const FicheSalaireFormateur({
    required this.id,
    required this.mois,
    required this.montantDu,
    required this.montantVerse,
    required this.reste,
    required this.statut,
    required this.versements,
  });

  factory FicheSalaireFormateur.fromJson(Map<String, dynamic> j) =>
      FicheSalaireFormateur(
        id: '${j['id'] ?? ''}',
        mois: '${j['mois'] ?? ''}',
        montantDu: _nombre(j['montantDu']),
        montantVerse: _nombre(j['montantVerse']),
        reste: _nombre(j['reste']),
        statut: switch ('${j['statut']}') {
          'paye' => StatutSalaire.paye,
          'partiel' => StatutSalaire.partiel,
          _ => StatutSalaire.impaye,
        },
        versements:
            _liste(j['versements']).map(VersementFormateur.fromJson).toList(),
      );
}

class VersementFormateur {
  final String id;
  final double montant;
  final DateTime? date;
  final String? note;

  const VersementFormateur({
    required this.id,
    required this.montant,
    this.date,
    this.note,
  });

  factory VersementFormateur.fromJson(Map<String, dynamic> j) =>
      VersementFormateur(
        id: '${j['id'] ?? ''}',
        montant: _nombre(j['montant']),
        date: DateTime.tryParse('${j['date'] ?? ''}')?.toLocal(),
        note: _texte(j['note']),
      );
}

/// Apprenant d'une classe (`GET /espace-formateur/classes/:id/apprenants`).
class ApprenantClasse {
  final String userId;
  final String nom;
  final String? image;
  final String statut;
  final DateTime? dateInscription;

  const ApprenantClasse({
    required this.userId,
    required this.nom,
    this.image,
    required this.statut,
    this.dateInscription,
  });

  factory ApprenantClasse.fromJson(Map<String, dynamic> j) => ApprenantClasse(
        userId: '${j['userId'] ?? ''}',
        nom: '${j['nom'] ?? ''}',
        image: _texte(j['image']),
        statut: '${j['statut'] ?? ''}',
        dateInscription:
            DateTime.tryParse('${j['dateInscription'] ?? ''}')?.toLocal(),
      );
}

Map<String, dynamic> _map(dynamic v) =>
    v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

List<Map<String, dynamic>> _liste(dynamic v) => v is List
    ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
    : const [];

double _nombre(dynamic v) =>
    v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;

String? _texte(dynamic v) {
  final s = v?.toString().trim();
  return (s == null || s.isEmpty) ? null : s;
}

import 'centre.dart';

enum StatutRendezVous { enAttente, confirme, annule, honore }

extension StatutRendezVousX on StatutRendezVous {
  String get libelle => switch (this) {
    StatutRendezVous.enAttente => 'En attente de confirmation',
    StatutRendezVous.confirme => 'Confirmé',
    StatutRendezVous.annule => 'Annulé',
    StatutRendezVous.honore => 'Effectué',
  };

  /// Le rendez-vous peut encore être annulé par l'utilisateur.
  bool get annulable =>
      this == StatutRendezVous.enAttente || this == StatutRendezVous.confirme;

  static StatutRendezVous depuisApi(Object? v) => switch ('$v') {
    'confirme' => StatutRendezVous.confirme,
    'annule' => StatutRendezVous.annule,
    'honore' => StatutRendezVous.honore,
    _ => StatutRendezVous.enAttente,
  };
}

/// Rendez-vous pris par l'utilisateur dans un centre.
class RendezVous {
  final String id;
  final DateTime dateHeure;
  final String? motif;
  final StatutRendezVous statut;
  final Centre centre;

  const RendezVous({
    required this.id,
    required this.dateHeure,
    required this.statut,
    required this.centre,
    this.motif,
  });

  bool get aVenir => dateHeure.isAfter(DateTime.now());

  factory RendezVous.fromJson(Map<String, dynamic> j) {
    final c = j['centre'];
    final motif = j['motif']?.toString().trim();
    return RendezVous(
      id: (j['id'] ?? '').toString(),
      dateHeure:
          (DateTime.tryParse('${j['dateHeure'] ?? ''}') ?? DateTime.now())
              .toLocal(),
      motif: (motif == null || motif.isEmpty) ? null : motif,
      statut: StatutRendezVousX.depuisApi(j['statut']),
      centre: Centre.fromJson(
        c is Map ? Map<String, dynamic>.from(c) : const {},
      ),
    );
  }
}

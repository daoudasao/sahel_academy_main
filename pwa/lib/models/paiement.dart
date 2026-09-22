/// État d'une échéance de paiement.
enum StatutPaiement { paye, partiel, aVenir, enRetard }

/// Une échéance : une somme à payer à une date donnée (inscription ou
/// mensualité), avec ce qui a déjà été réglé.
class Echeance {
  final String id;
  final String formationId;
  final String libelle; // "Inscription", "Mensualité — Août"...
  final double montantDu;
  final double montantPaye;
  final DateTime dateEcheance;
  final DateTime? datePaiement;

  const Echeance({
    required this.id,
    required this.formationId,
    required this.libelle,
    required this.montantDu,
    required this.montantPaye,
    required this.dateEcheance,
    this.datePaiement,
  });

  /// Construit une Echeance depuis le JSON de l'API backend.
  factory Echeance.fromJson(Map<String, dynamic> j) {
    double toD(dynamic v) =>
        v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;
    DateTime toDate(dynamic v) =>
        DateTime.tryParse('${v ?? ''}') ?? DateTime.now();
    DateTime? toDateN(dynamic v) =>
        (v == null || '$v'.isEmpty) ? null : DateTime.tryParse('$v');
    return Echeance(
      id: (j['id'] ?? '').toString(),
      formationId: (j['formationId'] ?? '').toString(),
      libelle: (j['libelle'] ?? '').toString(),
      montantDu: toD(j['montantDu']),
      montantPaye: toD(j['montantPaye']),
      dateEcheance: toDate(j['dateEcheance']),
      datePaiement: toDateN(j['datePaiement']),
    );
  }

  /// Ce qu'il reste à payer sur cette échéance.
  double get restant {
    final r = montantDu - montantPaye;
    return r < 0 ? 0 : r;
  }

  /// L'échéance est-elle entièrement réglée ?
  bool get soldee => montantPaye >= montantDu;

  /// Statut calculé automatiquement.
  StatutPaiement get statut {
    if (soldee) return StatutPaiement.paye;
    if (montantPaye > 0) return StatutPaiement.partiel;
    if (dateEcheance.isBefore(DateTime.now())) return StatutPaiement.enRetard;
    return StatutPaiement.aVenir;
  }
}

/// Résumé des paiements (d'une formation ou de toutes).
class ResumePaiement {
  final double total;
  final double paye;
  final Echeance? prochaine; // prochaine échéance non soldée

  const ResumePaiement({
    required this.total,
    required this.paye,
    this.prochaine,
  });

  double get restant {
    final r = total - paye;
    return r < 0 ? 0 : r;
  }

  /// Part payée entre 0 et 1 (pour la barre de progression).
  double get progression => total <= 0 ? 1 : (paye / total).clamp(0.0, 1.0);
}

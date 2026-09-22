import 'package:flutter/material.dart';

import '../../../models/paiement.dart';

/// Style visuel associé à un statut de paiement.
({Color couleur, String libelle, IconData icone}) styleStatut(
    StatutPaiement statut) {
  switch (statut) {
    case StatutPaiement.paye:
      return (
        couleur: const Color(0xFF059669),
        libelle: 'Payé',
        icone: Icons.check_circle,
      );
    case StatutPaiement.partiel:
      return (
        couleur: const Color(0xFFD97706),
        libelle: 'Partiel',
        icone: Icons.timelapse,
      );
    case StatutPaiement.enRetard:
      return (
        couleur: const Color(0xFFDC2626),
        libelle: 'En retard',
        icone: Icons.error,
      );
    case StatutPaiement.aVenir:
      return (
        couleur: const Color(0xFF64748B),
        libelle: 'À venir',
        icone: Icons.schedule,
      );
  }
}

/// Petite pastille colorée indiquant le statut d'une échéance.
class StatutChip extends StatelessWidget {
  final StatutPaiement statut;
  const StatutChip({super.key, required this.statut});

  @override
  Widget build(BuildContext context) {
    final s = styleStatut(statut);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: s.couleur.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(s.icone, size: 14, color: s.couleur),
          const SizedBox(width: 4),
          Text(
            s.libelle,
            style: TextStyle(
              color: s.couleur,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

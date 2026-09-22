import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../models/paiement.dart';
import 'statut_chip.dart';

/// Grande carte en dégradé : reste à payer, progression, payé / total.
class ResumeCarte extends StatelessWidget {
  final ResumePaiement resume;
  const ResumeCarte({super.key, required this.resume});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.emerald, Color(0xFF047857)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Reste à payer',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.85))),
          const SizedBox(height: 4),
          Text(
            formatFcfa(resume.restant),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 18),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: resume.progression,
              minHeight: 8,
              backgroundColor: Colors.white.withValues(alpha: 0.25),
              valueColor: const AlwaysStoppedAnimation(Colors.white),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Payé  ${formatFcfa(resume.paye)}',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
              Text('Total  ${formatFcfa(resume.total)}',
                  style:
                      TextStyle(color: Colors.white.withValues(alpha: 0.85))),
            ],
          ),
        ],
      ),
    );
  }
}

/// Carte mettant en avant la prochaine échéance à régler.
class ProchaineEcheanceCarte extends StatelessWidget {
  final Echeance echeance;
  final String formationTitre;

  const ProchaineEcheanceCarte({
    super.key,
    required this.echeance,
    required this.formationTitre,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final s = styleStatut(echeance.statut);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: s.couleur.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: s.couleur.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: s.couleur.withValues(alpha: 0.16),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.event, color: s.couleur),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Prochaine échéance',
                    style: TextStyle(color: scheme.outline, fontSize: 12)),
                const SizedBox(height: 2),
                Text(formatFcfa(echeance.restant),
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800)),
                Text(formationTitre,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: scheme.outline, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatutChip(statut: echeance.statut),
              const SizedBox(height: 6),
              Text(formatDate(echeance.dateEcheance),
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}

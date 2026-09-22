import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/format.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../data/repositories/paiement_repository.dart';
import '../../models/paiement.dart';
import '../../widgets/erreur_chargement.dart';
import 'widgets/resume_cartes.dart';
import 'widgets/statut_chip.dart';

/// Détail des paiements d'une formation : résumé + échéancier complet.
class PaiementDetailScreen extends StatefulWidget {
  final String formationId;

  const PaiementDetailScreen({super.key, required this.formationId});

  @override
  State<PaiementDetailScreen> createState() => _PaiementDetailScreenState();
}

class _PaiementDetailScreenState extends State<PaiementDetailScreen> {
  late Future<void> _future;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _userId = context.read<AuthRepository>().utilisateur?.id;
    _future = _charger();
  }

  Future<void> _charger({bool forcer = false}) {
    final uid = _userId;
    return Future.wait([
      context.read<FormationRepository>().charger(forcer: forcer),
      if (uid != null && uid.isNotEmpty)
        context.read<PaiementRepository>().charger(uid, forcer: forcer),
    ]);
  }

  void _reessayer() {
    setState(() {
      _future = _charger(forcer: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final formationRepo = context.read<FormationRepository>();
    final paiementRepo = context.read<PaiementRepository>();

    return Scaffold(
      appBar: AppBar(title: const Text('Paiements')),
      body: FutureBuilder<void>(
        future: _future,
        builder: (context, snap) {
          final pret = paiementRepo.estCharge && formationRepo.estCharge;
          if (!pret && snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!pret && snap.hasError) {
            return ErreurChargement(onRetry: _reessayer);
          }
          return _contenu(context, formationRepo, paiementRepo);
        },
      ),
    );
  }

  Widget _contenu(
    BuildContext context,
    FormationRepository formationRepo,
    PaiementRepository paiementRepo,
  ) {
    final formation = formationRepo.getFormationParId(widget.formationId);
    if (formation == null) {
      return const Center(child: Text('Formation introuvable.'));
    }

    final echeances = paiementRepo.echeances(widget.formationId);
    final resume = paiementRepo.resume(widget.formationId);
    final scheme = Theme.of(context).colorScheme;

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
          child: Text(
            formation.titre,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
        ),

        ResumeCarte(resume: resume),

        if (resume.prochaine != null)
          ProchaineEcheanceCarte(
            echeance: resume.prochaine!,
            formationTitre: formation.titre,
          ),

        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
          child: Text(
            'Échéancier',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: scheme.onSurface,
            ),
          ),
        ),

        for (final e in echeances) _EcheanceTuile(echeance: e),

        // Information sur le mode de paiement
        Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, size: 20, color: scheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Les paiements sont enregistrés par l\'administration. ',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Une ligne de l'échéancier.
class _EcheanceTuile extends StatelessWidget {
  final Echeance echeance;
  const _EcheanceTuile({required this.echeance});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final s = styleStatut(echeance.statut);
    final partiel = echeance.statut == StatutPaiement.partiel;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: s.couleur.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(s.icone, color: s.couleur),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    echeance.libelle,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Échéance : ${formatDate(echeance.dateEcheance)}',
                    style: TextStyle(color: scheme.outline, fontSize: 12.5),
                  ),
                  if (partiel) ...[
                    const SizedBox(height: 2),
                    Text(
                      'Payé ${formatFcfa(echeance.montantPaye)} · reste ${formatFcfa(echeance.restant)}',
                      style: const TextStyle(
                        color: Color(0xFFD97706),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatFcfa(echeance.montantDu),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 6),
                StatutChip(statut: echeance.statut),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

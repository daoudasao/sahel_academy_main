import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/utils/departement_ui.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../data/repositories/paiement_repository.dart';
import '../../models/formation.dart';
import '../../models/paiement.dart';
import '../../widgets/erreur_chargement.dart';
import 'widgets/resume_cartes.dart';

/// Vue d'ensemble des paiements de l'utilisateur (toutes ses formations).
class PaiementsScreen extends StatefulWidget {
  const PaiementsScreen({super.key});

  @override
  State<PaiementsScreen> createState() => _PaiementsScreenState();
}

class _PaiementsScreenState extends State<PaiementsScreen> {
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
    final scheme = Theme.of(context).colorScheme;
    final formationRepo = context.read<FormationRepository>();
    final paiementRepo = context.read<PaiementRepository>();

    return Scaffold(
      appBar: AppBar(title: const Text('Mes paiements')),
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

          final ids = paiementRepo.formationIds;
          final resumeGlobal = ids.isNotEmpty ? paiementRepo.resumeGlobal(ids) : null;
          final formations = ids
              .map(formationRepo.getFormationParId)
              .whereType<Formation>()
              .toList();

          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = _charger(forcer: true);
              });
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 20),
              children: [
                if (ids.isEmpty)
                  _EtatVide(scheme: scheme)
                else ...[
                  // Résumé global
                  if (resumeGlobal != null) ResumeCarte(resume: resumeGlobal),

                  // Prochaine échéance (toutes formations confondues)
                  if (resumeGlobal?.prochaine != null)
                    ProchaineEcheanceCarte(
                      echeance: resumeGlobal!.prochaine!,
                      formationTitre:
                          formationRepo
                              .getFormationParId(
                                resumeGlobal.prochaine!.formationId,
                              )
                              ?.titre ??
                          '',
                    ),

                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
                    child: Text(
                      'Par formation',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),

                  for (final f in formations)
                    _CarteFormation(
                      formation: f,
                      resume: paiementRepo.resume(f.id),
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Affiché quand l'utilisateur n'a aucune échéance de paiement.
class _EtatVide extends StatelessWidget {
  final ColorScheme scheme;
  const _EtatVide({required this.scheme});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined, size: 52, color: scheme.outline),
            const SizedBox(height: 12),
            const Text(
              'Aucun paiement pour le moment',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'Tes échéances apparaîtront ici une fois ton inscription '
              'enregistrée par l\'administration.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.outline),
            ),
          ],
        ),
      ),
    );
  }
}

/// Carte résumant les paiements d'une formation, cliquable vers le détail.
class _CarteFormation extends StatelessWidget {
  final Formation formation;
  final ResumePaiement resume;

  const _CarteFormation({required this.formation, required this.resume});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final couleur = couleurDepartement(formation.departementId);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        onTap: () => context.push('/paiements/${formation.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: couleur,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      formation.titre,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  Icon(Icons.chevron_right, color: scheme.outline),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: resume.progression,
                  minHeight: 7,
                  backgroundColor: scheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(couleur),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Payé ${formatFcfa(resume.paye)}',
                    style: TextStyle(color: scheme.outline, fontSize: 13),
                  ),
                  Text(
                    'Reste ${formatFcfa(resume.restant)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

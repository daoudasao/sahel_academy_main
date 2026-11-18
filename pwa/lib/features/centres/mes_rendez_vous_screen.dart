import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/format.dart';
import '../../core/utils/itineraire.dart';
import '../../data/repositories/rendez_vous_repository.dart';
import '../../models/rendez_vous.dart';
import '../../widgets/erreur_chargement.dart';

/// Mes rendez-vous dans les centres (`/rendez-vous`) : statut, itinéraire
/// vers le centre, annulation. Ouvert aussi au clic sur la notification de
/// confirmation / d'annulation envoyée par l'équipe.
class MesRendezVousScreen extends StatefulWidget {
  const MesRendezVousScreen({super.key});

  @override
  State<MesRendezVousScreen> createState() => _MesRendezVousScreenState();
}

class _MesRendezVousScreenState extends State<MesRendezVousScreen> {
  late Future<List<RendezVous>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<RendezVousRepository>().mesRendezVous();
  }

  Future<void> _recharger() async {
    final f = context.read<RendezVousRepository>().mesRendezVous();
    setState(() => _future = f);
    await f.catchError((_) => <RendezVous>[]);
  }

  Future<void> _annuler(RendezVous rdv) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Annuler le rendez-vous ?'),
        content: Text('${rdv.centre.nom}\n${formatCreneauLong(rdv.dateHeure)}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Garder'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Annuler le RDV'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final repo = context.read<RendezVousRepository>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      await repo.annuler(rdv.id);
      messenger.showSnackBar(
        const SnackBar(content: Text('Rendez-vous annulé.')),
      );
      await _recharger();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Mes rendez-vous')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/centres'),
        icon: const Icon(Icons.add),
        label: const Text('Prendre RDV'),
      ),
      body: FutureBuilder<List<RendezVous>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) return ErreurChargement(onRetry: _recharger);
          final rdvs = snap.data ?? const [];
          final aVenir = rdvs.where((r) => r.aVenir).toList()
            ..sort((a, b) => a.dateHeure.compareTo(b.dateHeure));
          final passes = rdvs.where((r) => !r.aVenir).toList();

          return RefreshIndicator(
            onRefresh: _recharger,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              children: [
                if (rdvs.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.event_busy, size: 48, color: scheme.outline),
                        const SizedBox(height: 12),
                        Text(
                          'Tu n\'as encore pris aucun rendez-vous.\n'
                          'Choisis un centre et un créneau qui te conviennent.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                if (aVenir.isNotEmpty) ...[
                  _titre(context, 'À venir'),
                  for (final r in aVenir)
                    _CarteRendezVous(rdv: r, onAnnuler: () => _annuler(r)),
                ],
                if (passes.isNotEmpty) ...[
                  _titre(context, 'Historique'),
                  for (final r in passes) _CarteRendezVous(rdv: r),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _titre(BuildContext context, String texte) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 12, 4, 4),
    child: Text(
      texte,
      style: TextStyle(
        fontWeight: FontWeight.w800,
        color: Theme.of(context).colorScheme.onSurface,
      ),
    ),
  );
}

class _CarteRendezVous extends StatelessWidget {
  final RendezVous rdv;
  final VoidCallback? onAnnuler;
  const _CarteRendezVous({required this.rdv, this.onAnnuler});

  Color _couleur(ColorScheme scheme) => switch (rdv.statut) {
    StatutRendezVous.enAttente => Colors.orange.shade700,
    StatutRendezVous.confirme => Colors.green.shade700,
    StatutRendezVous.annule => scheme.error,
    StatutRendezVous.honore => scheme.primary,
  };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final couleur = _couleur(scheme);
    final actif = rdv.aVenir && rdv.statut.annulable;
    final d = rdv.dateHeure;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Bloc date : jour + mois, lisible d'un coup d'œil.
                Container(
                  width: 56,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: actif
                        ? scheme.primaryContainer
                        : scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${d.day}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: actif
                              ? scheme.onPrimaryContainer
                              : scheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        DateFormat('MMM', 'fr_FR').format(d),
                        style: TextStyle(
                          fontSize: 12,
                          color: actif
                              ? scheme.onPrimaryContainer
                              : scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rdv.centre.nom,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${formatJourCreneau(d)} · ${formatHeure(d)}',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: couleur,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              rdv.statut.libelle,
                              style: TextStyle(
                                color: couleur,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (rdv.motif != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          rdv.motif!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            if (actif) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (onAnnuler != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onAnnuler,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: scheme.error,
                        ),
                        child: const Text('Annuler'),
                      ),
                    ),
                  if (onAnnuler != null && rdv.centre.localisable)
                    const SizedBox(width: 8),
                  if (rdv.centre.localisable)
                    Expanded(
                      child: FilledButton.tonalIcon(
                        onPressed: () async {
                          final messenger = ScaffoldMessenger.of(context);
                          if (!await ouvrirItineraire(rdv.centre)) {
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Impossible d\'ouvrir la carte.'),
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.directions_outlined),
                        label: const Text('Itinéraire'),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

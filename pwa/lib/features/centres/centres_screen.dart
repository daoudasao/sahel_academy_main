import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/format.dart';
import '../../data/repositories/centre_repository.dart';
import '../../models/centre.dart';
import '../../widgets/erreur_chargement.dart';

/// Liste des centres avec leur localisation ; permet de choisir un créneau
/// et de prendre rendez-vous.
class CentresScreen extends StatefulWidget {
  const CentresScreen({super.key});

  @override
  State<CentresScreen> createState() => _CentresScreenState();
}

class _CentresScreenState extends State<CentresScreen> {
  late Future<void> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<CentreRepository>().charger();
  }

  void _reessayer() {
    setState(() {
      _future = context.read<CentreRepository>().charger(forcer: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final repo = context.read<CentreRepository>();

    return Scaffold(
      appBar: AppBar(title: const Text('Prendre rendez-vous')),
      body: FutureBuilder<void>(
        future: _future,
        builder: (context, snap) {
          if (!repo.estCharge && snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!repo.estCharge && snap.hasError) {
            return ErreurChargement(onRetry: _reessayer);
          }
          final centres = repo.getCentres();
          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = repo.charger(forcer: true);
              });
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              children: [
                if (centres.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        'Aucun centre disponible pour le moment.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: scheme.outline),
                      ),
                    ),
                  )
                else ...[
                  Text(
                    'Choisis un centre proche de toi, puis un créneau disponible.',
                    style: TextStyle(color: scheme.onSurfaceVariant, height: 1.4),
                  ),
                  const SizedBox(height: 8),
                  for (final c in centres) _CarteCentre(centre: c),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _CarteCentre extends StatelessWidget {
  final Centre centre;
  const _CarteCentre({required this.centre});

  void _confirmer(BuildContext context, DateTime creneau) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Confirmer le rendez-vous'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              centre.nom,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(centre.adresse),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.event, size: 18),
                const SizedBox(width: 6),
                Expanded(child: Text(formatCreneauLong(creneau))),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Rendez-vous confirmé · ${centre.nom} · '
                    '${formatCreneau(creneau)} ✅',
                  ),
                ),
              );
            },
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 7),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.location_on,
                    color: scheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        centre.nom,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        centre.ville,
                        style: TextStyle(color: scheme.outline),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Localisation
            _infoLigne(context, Icons.place_outlined, centre.adresse),
            const SizedBox(height: 6),
            _infoLigne(context, Icons.phone_outlined, centre.telephone),

            const Divider(height: 22),

            Text(
              'Créneaux disponibles',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: scheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final creneau in centre.creneaux)
                  ActionChip(
                    avatar: Icon(
                      Icons.schedule,
                      size: 16,
                      color: scheme.primary,
                    ),
                    label: Text(formatCreneau(creneau)),
                    onPressed: () => _confirmer(context, creneau),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoLigne(BuildContext context, IconData icon, String texte) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: scheme.outline),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            texte,
            style: TextStyle(color: scheme.onSurfaceVariant, height: 1.3),
          ),
        ),
      ],
    );
  }
}

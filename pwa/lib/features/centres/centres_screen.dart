import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/format.dart';
import '../../core/utils/itineraire.dart';
import '../../data/repositories/centre_repository.dart';
import '../../data/repositories/rendez_vous_repository.dart';
import '../../models/centre.dart';
import '../../widgets/erreur_chargement.dart';

/// Liste des centres avec leur localisation (bouton « Itinéraire ») ; permet
/// de choisir un créneau et de prendre rendez-vous. Le rendez-vous est
/// enregistré côté serveur puis confirmé par l'équipe depuis le dashboard.
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
      appBar: AppBar(
        title: const Text('Prendre rendez-vous'),
        actions: [
          TextButton.icon(
            onPressed: () => context.push('/rendez-vous'),
            icon: const Icon(Icons.event_note_outlined),
            label: const Text('Mes RDV'),
          ),
        ],
      ),
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
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      height: 1.4,
                    ),
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

  void _confirmer(BuildContext context, CreneauCentre creneau) {
    showDialog<void>(
      context: context,
      builder: (_) => _DialogueReservation(centre: centre, creneau: creneau),
    );
  }

  Future<void> _itineraire(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!await ouvrirItineraire(centre)) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir la carte.')),
      );
    }
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
            if (centre.adresse.isNotEmpty) ...[
              _infoLigne(context, Icons.place_outlined, centre.adresse),
              const SizedBox(height: 6),
            ],
            if (centre.telephone.isNotEmpty)
              _infoLigne(context, Icons.phone_outlined, centre.telephone),
            if (centre.localisable) ...[
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => _itineraire(context),
                icon: const Icon(Icons.directions_outlined),
                label: const Text('Itinéraire'),
              ),
            ],

            const Divider(height: 22),

            Text(
              'Créneaux disponibles',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: scheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            if (centre.creneauxAVenir.isEmpty)
              Text(
                'Aucun créneau disponible pour le moment.',
                style: TextStyle(color: scheme.outline),
              )
            else
              // Regroupés par jour : avec les créneaux hebdomadaires, la liste
              // couvre plusieurs semaines.
              for (final jour in _parJour(centre.creneauxAVenir)) ...[
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 6),
                  child: Text(
                    formatJourCreneau(jour.first.dateHeure),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final creneau in jour)
                      ActionChip(
                        avatar: Icon(
                          Icons.schedule,
                          size: 16,
                          color: scheme.primary,
                        ),
                        label: Text(formatHeure(creneau.dateHeure)),
                        onPressed: () => _confirmer(context, creneau),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
          ],
        ),
      ),
    );
  }

  /// Créneaux (déjà triés) regroupés par jour calendaire.
  static List<List<CreneauCentre>> _parJour(List<CreneauCentre> creneaux) {
    final groupes = <List<CreneauCentre>>[];
    for (final c in creneaux) {
      final d = c.dateHeure;
      final dernier = groupes.isEmpty ? null : groupes.last.first.dateHeure;
      if (dernier != null &&
          dernier.year == d.year &&
          dernier.month == d.month &&
          dernier.day == d.day) {
        groupes.last.add(c);
      } else {
        groupes.add([c]);
      }
    }
    return groupes;
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

/// Confirmation d'un créneau, avec un motif facultatif, puis réservation.
class _DialogueReservation extends StatefulWidget {
  final Centre centre;
  final CreneauCentre creneau;
  const _DialogueReservation({required this.centre, required this.creneau});

  @override
  State<_DialogueReservation> createState() => _DialogueReservationState();
}

class _DialogueReservationState extends State<_DialogueReservation> {
  final _motif = TextEditingController();
  bool _envoi = false;
  String? _erreur;

  @override
  void dispose() {
    _motif.dispose();
    super.dispose();
  }

  Future<void> _reserver() async {
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    final repo = context.read<RendezVousRepository>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await repo.prendre(widget.creneau.id, motif: _motif.text);
      navigator.pop();
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Demande envoyée · ${widget.centre.nom} · '
            '${formatCreneau(widget.creneau.dateHeure)}. '
            'Tu seras notifié dès sa confirmation.',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _envoi = false;
        _erreur = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _envoi = false;
        _erreur = 'Réservation impossible. Réessaie plus tard.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AlertDialog(
      title: const Text('Confirmer le rendez-vous'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.centre.nom,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            if (widget.centre.adresse.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(widget.centre.adresse),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.event, size: 18),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(formatCreneauLong(widget.creneau.dateHeure)),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _motif,
              enabled: !_envoi,
              maxLength: 500,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Motif (facultatif)',
                hintText: 'Ex. : dépôt de dossier, inscription…',
              ),
            ),
            if (_erreur != null)
              Text(_erreur!, style: TextStyle(color: scheme.error)),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _envoi ? null : () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: _envoi ? null : _reserver,
          child: _envoi
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Confirmer'),
        ),
      ],
    );
  }
}

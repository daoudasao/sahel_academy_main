import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/format.dart';
import '../../core/utils/itineraire.dart';
import '../../data/repositories/centre_repository.dart';
import '../../data/repositories/rendez_vous_repository.dart';
import '../../models/centre.dart';
import '../../widgets/erreur_chargement.dart';

/// Prise de rendez-vous : liste compacte des centres. Un appui sur
/// « Choisir un créneau » ouvre une feuille unique (jour → heure → confirmer).
/// Le rendez-vous est enregistré côté serveur puis confirmé par l'équipe.
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
          IconButton(
            tooltip: 'Mes rendez-vous',
            onPressed: () => context.push('/rendez-vous'),
            icon: const Icon(Icons.event_note_outlined),
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
              setState(() => _future = repo.charger(forcer: true));
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                if (centres.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      children: [
                        Icon(
                          Icons.place_outlined,
                          size: 48,
                          color: scheme.outline,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Aucun centre disponible pour le moment.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 4, 4, 12),
                    child: Text(
                      'Choisis un centre',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
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

/// Carte compacte : nom, ville, prochain créneau, deux actions.
class _CarteCentre extends StatelessWidget {
  final Centre centre;
  const _CarteCentre({required this.centre});

  Future<void> _itineraire(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!await ouvrirItineraire(centre)) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir la carte.')),
      );
    }
  }

  void _ouvrirReservation(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _FeuilleReservation(centre: centre),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final creneaux = centre.creneauxAVenir;
    final prochain = creneaux.isEmpty ? null : creneaux.first;
    final lieu = [
      if (centre.ville.isNotEmpty) centre.ville,
      if (centre.adresse.isNotEmpty) centre.adresse,
    ].join(' · ');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: prochain == null ? null : () => _ouvrirReservation(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
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
                        if (lieu.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            lieu,
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
              const SizedBox(height: 12),
              // Prochaine disponibilité : l'info qui compte, en un coup d'œil.
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: prochain == null
                      ? scheme.surfaceContainerHighest
                      : scheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(
                      prochain == null
                          ? Icons.event_busy_outlined
                          : Icons.schedule,
                      size: 16,
                      color: prochain == null ? scheme.outline : scheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        prochain == null
                            ? 'Aucun créneau disponible'
                            : 'Prochain : ${formatCreneau(prochain.dateHeure)}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: prochain == null
                              ? scheme.onSurfaceVariant
                              : scheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (centre.localisable) ...[
                    IconButton.outlined(
                      tooltip: 'Itinéraire',
                      onPressed: () => _itineraire(context),
                      icon: const Icon(Icons.directions_outlined),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (centre.telephone.isNotEmpty) ...[
                    IconButton.outlined(
                      tooltip: centre.telephone,
                      onPressed: () => launchUrl(
                        Uri(
                          scheme: 'tel',
                          path: centre.telephone.replaceAll(' ', ''),
                        ),
                      ),
                      icon: const Icon(Icons.phone_outlined),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: FilledButton(
                      onPressed: prochain == null
                          ? null
                          : () => _ouvrirReservation(context),
                      child: const Text('Choisir un créneau'),
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

/// Feuille unique de réservation : jour → heure → motif facultatif → confirmer.
class _FeuilleReservation extends StatefulWidget {
  final Centre centre;
  const _FeuilleReservation({required this.centre});

  @override
  State<_FeuilleReservation> createState() => _FeuilleReservationState();
}

class _FeuilleReservationState extends State<_FeuilleReservation> {
  late final List<List<CreneauCentre>> _jours = _parJour(
    widget.centre.creneauxAVenir,
  );
  int _jour = 0;
  CreneauCentre? _creneau;
  final _motif = TextEditingController();
  bool _envoi = false;
  String? _erreur;

  @override
  void dispose() {
    _motif.dispose();
    super.dispose();
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

  Future<void> _reserver() async {
    final creneau = _creneau;
    if (creneau == null) return;
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    final repo = context.read<RendezVousRepository>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await repo.prendre(creneau.id, motif: _motif.text);
      navigator.pop();
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Demande envoyée pour le ${formatCreneau(creneau.dateHeure)}. '
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

  Widget _etape(BuildContext context, String texte) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      texte,
      style: Theme.of(
        context,
      ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final heures = _jours.isEmpty ? const <CreneauCentre>[] : _jours[_jour];
    final creneau = _creneau;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.centre.nom,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            if (widget.centre.ville.isNotEmpty)
              Text(
                widget.centre.ville,
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
            const SizedBox(height: 20),

            _etape(context, '1. Le jour'),
            SizedBox(
              height: 76,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _jours.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) => _PastilleJour(
                  date: _jours[i].first.dateHeure,
                  choisi: i == _jour,
                  onTap: () => setState(() {
                    _jour = i;
                    _creneau = null;
                  }),
                ),
              ),
            ),
            const SizedBox(height: 20),

            _etape(context, '2. L\'heure'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in heures)
                  ChoiceChip(
                    label: Text(formatHeure(c.dateHeure)),
                    selected: c == creneau,
                    showCheckmark: false,
                    onSelected: _envoi
                        ? null
                        : (_) => setState(() => _creneau = c),
                  ),
              ],
            ),
            const SizedBox(height: 20),

            TextField(
              controller: _motif,
              enabled: !_envoi,
              maxLength: 500,
              maxLines: 1,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Motif (facultatif)',
                hintText: 'Ex. : dépôt de dossier, inscription…',
                counterText: '',
              ),
            ),
            if (_erreur != null) ...[
              const SizedBox(height: 8),
              Text(_erreur!, style: TextStyle(color: scheme.error)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
                onPressed: creneau == null || _envoi ? null : _reserver,
                child: _envoi
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        creneau == null
                            ? 'Choisis une heure'
                            : 'Réserver · ${formatCreneauLong(creneau.dateHeure)}',
                        textAlign: TextAlign.center,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pastille de jour : « mar. / 19 / nov. ».
class _PastilleJour extends StatelessWidget {
  final DateTime date;
  final bool choisi;
  final VoidCallback onTap;
  const _PastilleJour({
    required this.date,
    required this.choisi,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = choisi ? scheme.onPrimary : scheme.onSurface;
    return Material(
      color: choisi ? scheme.primary : scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: SizedBox(
          width: 60,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                DateFormat('EEE', 'fr_FR').format(date),
                style: TextStyle(fontSize: 12, color: fg),
              ),
              Text(
                '${date.day}',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: fg,
                ),
              ),
              Text(
                DateFormat('MMM', 'fr_FR').format(date),
                style: TextStyle(fontSize: 12, color: fg),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

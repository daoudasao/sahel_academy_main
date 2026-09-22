import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/repositories/formation_repository.dart';
import '../../models/formation.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/info_page_sheet.dart';
import 'widgets/formation_card.dart';

/// Catalogue des formations : recherche, filtre par département,
/// filtres avancés (niveau, type) et tri.
class FormationsScreen extends StatefulWidget {
  const FormationsScreen({super.key});

  @override
  State<FormationsScreen> createState() => _FormationsScreenState();
}

class _FormationsScreenState extends State<FormationsScreen> {
  final _rechercheController = TextEditingController();

  String _recherche = '';
  String? _departementId; // null = "Tous"
  String _niveau = 'Tous';
  String _type = 'Toutes';
  String _tri = 'Défaut';

  late Future<void> _catalogue;

  @override
  void initState() {
    super.initState();
    _catalogue = context.read<FormationRepository>().charger();
  }

  void _reessayerCatalogue() {
    setState(() {
      _catalogue = context.read<FormationRepository>().charger(forcer: true);
    });
  }

  @override
  void dispose() {
    _rechercheController.dispose();
    super.dispose();
  }

  int get _filtresActifs =>
      (_niveau != 'Tous' ? 1 : 0) +
      (_type != 'Toutes' ? 1 : 0) +
      (_tri != 'Défaut' ? 1 : 0);

  Future<void> _ouvrirFiltres() async {
    final resultat = await showModalBottomSheet<(String, String, String)>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _FiltresSheet(niveau: _niveau, type: _type, tri: _tri),
    );
    if (resultat != null) {
      setState(() {
        _niveau = resultat.$1;
        _type = resultat.$2;
        _tri = resultat.$3;
      });
    }
  }

  void _reinitialiser() {
    setState(() {
      _recherche = '';
      _rechercheController.clear();
      _departementId = null;
      _niveau = 'Tous';
      _type = 'Toutes';
      _tri = 'Défaut';
    });
  }

  @override
  Widget build(BuildContext context) {
    final repo = context.read<FormationRepository>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Formations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Comment fonctionne le catalogue ?',
            onPressed: () => afficherInfoPage(
              context: context,
              titre: 'Catalogue des Formations',
              description:
                  'Découvrez l\'ensemble des parcours certifiants et programmes dispensés par nos formateurs experts.',
              points: [
                (
                  Icons.search,
                  'Filtres & Recherche',
                  'Utilisez la barre de recherche et les badges pour filtrer par domaine (Informatique, Comptabilité, etc.).',
                ),
                (
                  Icons.school,
                  'Détails d\'un cours',
                  'Cliquez sur une carte pour consulter le programme, les tarifs, la durée et le formateur.',
                ),
                (
                  Icons.how_to_reg,
                  'Inscription facile',
                  'Déposez votre demande d\'inscription directement depuis la fiche détaillée.',
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: FutureBuilder<void>(
        future: _catalogue,
        builder: (context, snap) {
          if (!repo.estCharge && snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!repo.estCharge && snap.hasError) {
            return ErreurChargement(onRetry: _reessayerCatalogue);
          }
          final departements = repo.getDepartements();
          final List<Formation> formations = repo.rechercher(
            texte: _recherche,
            departementId: _departementId,
            niveau: _niveau,
            type: _type,
            tri: _tri,
          );
          return RefreshIndicator(
            onRefresh: () async {
              await context.read<FormationRepository>().charger(forcer: true);
              if (mounted) setState(() {});
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // ---- Barre de recherche ----
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: TextField(
                      controller: _rechercheController,
                      onChanged: (v) => setState(() => _recherche = v),
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: 'Rechercher une formation, un formateur…',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _recherche.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () => setState(() {
                                  _recherche = '';
                                  _rechercheController.clear();
                                  FocusScope.of(context).unfocus();
                                }),
                              )
                            : null,
                        isDense: true,
                      ),
                    ),
                  ),
                ),

                // ---- Puces de département ----
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 46,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        _chipDep(label: 'Tous', id: null),
                        for (final d in departements)
                          _chipDep(label: d.nom, id: d.id),
                      ],
                    ),
                  ),
                ),

                // ---- Compteur + bouton Filtres ----
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(18, 8, 12, 4),
                    child: Row(
                      children: [
                        Text(
                          '${formations.length} '
                          'résultat${formations.length > 1 ? 's' : ''}',
                          style: TextStyle(color: scheme.outline, fontSize: 13),
                        ),
                        const Spacer(),
                        OutlinedButton.icon(
                          onPressed: _ouvrirFiltres,
                          icon: const Icon(Icons.tune, size: 18),
                          label: Text(
                            _filtresActifs > 0
                                ? 'Filtres ($_filtresActifs)'
                                : 'Filtres',
                          ),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            backgroundColor: _filtresActifs > 0
                                ? scheme.primaryContainer.withValues(alpha: 0.5)
                                : null,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ---- Résultats ----
                if (formations.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EtatVide(onReinitialiser: _reinitialiser),
                  )
                else
                  SliverList.builder(
                    itemCount: formations.length,
                    itemBuilder: (context, i) =>
                        FormationCard(formation: formations[i]),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _chipDep({required String label, required String? id}) {
    final selectionne = _departementId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Center(
        child: ChoiceChip(
          label: Text(label),
          selected: selectionne,
          onSelected: (_) => setState(() => _departementId = id),
        ),
      ),
    );
  }
}

/// État affiché quand aucune formation ne correspond.
class _EtatVide extends StatelessWidget {
  final VoidCallback onReinitialiser;
  const _EtatVide({required this.onReinitialiser});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 56, color: scheme.outline),
            const SizedBox(height: 14),
            const Text(
              'Aucune formation trouvée',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'Essaie d\'autres mots-clés ou réinitialise les filtres.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.outline),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onReinitialiser,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Réinitialiser'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 44),
                padding: const EdgeInsets.symmetric(horizontal: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Panneau (bottom sheet) des filtres avancés.
class _FiltresSheet extends StatefulWidget {
  final String niveau;
  final String type;
  final String tri;

  const _FiltresSheet({
    required this.niveau,
    required this.type,
    required this.tri,
  });

  @override
  State<_FiltresSheet> createState() => _FiltresSheetState();
}

class _FiltresSheetState extends State<_FiltresSheet> {
  late String _niveau = widget.niveau;
  late String _type = widget.type;
  late String _tri = widget.tri;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Filtres',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => setState(() {
                  _niveau = 'Tous';
                  _type = 'Toutes';
                  _tri = 'Défaut';
                }),
                child: const Text('Réinitialiser'),
              ),
            ],
          ),
          const SizedBox(height: 8),

          _titre('Niveau'),
          _groupe(
            options: const ['Tous', 'Débutant', 'Intermédiaire', 'Avancé'],
            valeur: _niveau,
            onChange: (v) => setState(() => _niveau = v),
          ),
          const SizedBox(height: 18),

          _titre('Type'),
          _groupe(
            options: const ['Toutes', 'Payantes'],
            valeur: _type,
            onChange: (v) => setState(() => _type = v),
          ),
          const SizedBox(height: 18),

          _titre('Trier par'),
          _groupe(
            options: const [
              'Défaut',
              'Prix croissant',
              'Prix décroissant',
              'Durée',
            ],
            valeur: _tri,
            onChange: (v) => setState(() => _tri = v),
          ),
          const SizedBox(height: 24),

          FilledButton(
            onPressed: () => Navigator.of(context).pop((_niveau, _type, _tri)),
            child: const Text('Appliquer'),
          ),
        ],
      ),
    );
  }

  Widget _titre(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(
      t,
      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
    ),
  );

  Widget _groupe({
    required List<String> options,
    required String valeur,
    required ValueChanged<String> onChange,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in options)
          ChoiceChip(
            label: Text(o),
            selected: valeur == o,
            onSelected: (_) => onChange(o),
          ),
      ],
    );
  }
}

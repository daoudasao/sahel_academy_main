import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../data/repositories/bourse_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../models/bourse.dart';
import '../../widgets/app_filter_bar.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/info_page_sheet.dart';
import 'widgets/bourse_card.dart';

/// Écran listant toutes les bourses disponibles, avec recherche et filtre par département/catégorie.
class BoursesScreen extends StatefulWidget {
  const BoursesScreen({super.key});

  @override
  State<BoursesScreen> createState() => _BoursesScreenState();
}

class _BoursesScreenState extends State<BoursesScreen> {
  final _controller = TextEditingController();
  String _recherche = '';
  String? _departementIdSelectionne;

  late Future<void> _future;

  @override
  void initState() {
    super.initState();
    _future = _charger(forcer: true);
  }

  Future<void> _charger({bool forcer = false}) {
    return Future.wait([
      context.read<BourseRepository>().charger(forcer: forcer),
      context.read<FormationRepository>().charger(forcer: forcer),
    ]);
  }

  void _reessayer() {
    setState(() {
      _future = _charger(forcer: true);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Minuscules + suppression des accents (pour une recherche tolérante).
  String _normaliser(String s) {
    var r = s.toLowerCase();
    const accents = 'àâäáãçéèêëíìîïñóòôöõúùûüÿ';
    const sans = 'aaaaaceeeeiiiinooooouuuuy';
    for (var i = 0; i < accents.length; i++) {
      r = r.replaceAll(accents[i], sans[i]);
    }
    return r;
  }

  List<Bourse> _filtrer(
    List<Bourse> bourses,
    Map<String, String> formationDeptMap,
  ) {
    // Le serveur ne renvoie au public que les bourses ouvertes : plus besoin
    // de filtrer par statut ici.
    var liste = bourses;

    if (_departementIdSelectionne != null) {
      liste = liste.where((b) {
        final deptId = b.departementId ??
            (b.formationId != null ? formationDeptMap[b.formationId] : null);
        return deptId == _departementIdSelectionne;
      }).toList();
    }

    final q = _normaliser(_recherche);
    if (q.isEmpty) return liste;
    return liste
        .where(
          (b) => _normaliser('${b.titre} ${b.description}').contains(q),
        )
        .toList();
  }



  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bourseRepo = context.read<BourseRepository>();
    final formationRepo = context.read<FormationRepository>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bourses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Comment fonctionnent les bourses ?',
            onPressed: () => afficherInfoPage(
              context: context,
              titre: 'Bourses d\'Études Sahel Academy',
              description:
                  'Consultez les programmes de bourses d\'études financées ou partiellement prises en charge.',
              points: [
                (
                  Icons.card_giftcard,
                  'Bourses disponibles',
                  'Parcourez les bourses actuellement ouvertes aux candidatures.',
                ),
                (
                  Icons.assignment,
                  'Formulaire de candidature',
                  'Postulez directement en remplissant les critères demandés par le jury.',
                ),
                (
                  Icons.mark_email_read,
                  'Suivi & Décisions',
                  'Suivez l\'avancement et les réponses relatives à vos candidatures depuis votre Profil.',
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: FutureBuilder<void>(
        future: _future,
        builder: (context, snap) {
          final pret = bourseRepo.estCharge && formationRepo.estCharge;
          if (!pret && snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!pret && snap.hasError) {
            return ErreurChargement(onRetry: _reessayer);
          }

          final toutesLesBourses = bourseRepo.getBourses();
          final departements = formationRepo.getDepartements();
          final formationDeptMap = {
            for (final f in formationRepo.getFormations()) f.id: f.departementId
          };

          final bourses = _filtrer(toutesLesBourses, formationDeptMap);

          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = _charger(forcer: true);
              });
              await _future;
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // Bandeau explicatif
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.emerald.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.volunteer_activism,
                          color: AppColors.emerald,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Postule aux différentes bourses d\'études. '
                            'Candidate avant la date limite indiquée.',
                            style: TextStyle(color: scheme.onSurface, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Barre de recherche
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: TextField(
                      controller: _controller,
                      onChanged: (v) => setState(() => _recherche = v),
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: 'Rechercher une bourse…',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _recherche.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () => setState(() {
                                  _recherche = '';
                                  _controller.clear();
                                  FocusScope.of(context).unfocus();
                                }),
                              )
                            : null,
                        isDense: true,
                      ),
                    ),
                  ),
                ),

                // Filtres par département / catégorie (AppFilterBar)
                SliverToBoxAdapter(
                  child: AppFilterBar<String?>(
                    selectedValue: _departementIdSelectionne,
                    onSelected: (id) =>
                        setState(() => _departementIdSelectionne = id),
                    items: [
                      AppFilterItem(
                        label: 'Tous',
                        value: null,
                        count: toutesLesBourses.length,
                      ),
                      for (final d in departements)
                        AppFilterItem(
                          label: d.nom,
                          value: d.id,
                          count: toutesLesBourses.where((b) {
                            final deptId = b.departementId ??
                                (b.formationId != null
                                    ? formationDeptMap[b.formationId]
                                    : null);
                            return deptId == d.id;
                          }).length,
                        ),
                    ],
                  ),
                ),

                // Compteur
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '${bourses.length} bourse${bourses.length > 1 ? 's' : ''}',
                        style: TextStyle(color: scheme.outline, fontSize: 13),
                      ),
                    ),
                  ),
                ),

                // Résultats
                if (bourses.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.search_off,
                              size: 52,
                              color: scheme.outline,
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Aucune bourse trouvée',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _recherche.isEmpty && _departementIdSelectionne == null
                                  ? 'Reviens bientôt pour de nouvelles bourses.'
                                  : 'Essaie d\'autres filtres ou un autre mot-clé.',
                              style: TextStyle(color: scheme.outline),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  SliverList.builder(
                    itemCount: bourses.length,
                    itemBuilder: (context, i) => BourseCard(bourse: bourses[i]),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
              ],
            ),
          );
        },
      ),
    );
  }
}

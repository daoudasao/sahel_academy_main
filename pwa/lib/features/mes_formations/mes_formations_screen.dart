import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/utils/avatar.dart';
import '../../core/utils/departement_ui.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/classe_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../models/formation.dart';
import '../../widgets/app_filter_bar.dart';
import '../../widgets/coming_soon.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/info_page_sheet.dart';
import '../../widgets/photo_banniere.dart';

/// « Mes formations » : les classes où l'utilisateur est inscrit.
/// Chaque classe fonctionne comme un Google Classroom.
class MesFormationsScreen extends StatefulWidget {
  const MesFormationsScreen({super.key});

  @override
  State<MesFormationsScreen> createState() => _MesFormationsScreenState();
}

class _MesFormationsScreenState extends State<MesFormationsScreen> {
  final _searchController = TextEditingController();
  late Future<void> _future;
  String? _userId;

  String _recherche = '';
  String? _departementId; // null = Tous
  String _typeFiltre = 'Tous'; // 'Tous', 'Standard', 'Bourses'

  @override
  void initState() {
    super.initState();
    _userId = context.read<AuthRepository>().utilisateur?.id;
    _future = _charger();
  }

  Future<void> _charger({bool forcer = false}) async {
    final uid = _userId;
    final formationRepo = context.read<FormationRepository>();
    final classeRepo = context.read<ClasseRepository>();

    await Future.wait([
      formationRepo.charger(forcer: forcer),
      if (uid != null && uid.isNotEmpty)
        classeRepo.charger(uid, forcer: forcer),
    ]);

    if (uid != null && uid.isNotEmpty) {
      await Future.wait(
        classeRepo.mesFormationIds.map(
          (fid) => classeRepo.chargerContenu(fid, forcer: forcer),
        ),
      );
    }
  }

  void _reessayer() {
    setState(() => _future = _charger(forcer: true));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _reinitialiserFiltres() {
    setState(() {
      _recherche = '';
      _searchController.clear();
      _departementId = null;
      _typeFiltre = 'Tous';
    });
  }

  @override
  Widget build(BuildContext context) {
    final formationRepo = context.watch<FormationRepository>();
    final classeRepo = context.watch<ClasseRepository>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes formations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Comment fonctionnent vos espaces de cours ?',
            onPressed: () => afficherInfoPage(
              context: context,
              titre: 'Mes Formations & Classes',
              description:
                  'Retrouvez ici toutes les classes virtuelles des formations auxquelles vous êtes inscrit.',
              points: [
                (
                  Icons.class_,
                  'Accès aux espaces de classe',
                  'Cliquez sur n\'importe quelle carte de cours pour ouvrir son espace d\'échange type Classroom.',
                ),
                (
                  Icons.campaign,
                  'Fil du Formateur',
                  'Recevez les annonces, consignes et actualités publiées par vos professeurs.',
                ),
                (
                  Icons.folder,
                  'Documents & Exercices',
                  'Téléchargez directement tous les supports de cours et exercices joints.',
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
          final pret = classeRepo.estCharge && formationRepo.estCharge;
          if (!pret && snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!pret && snap.hasError) {
            return ErreurChargement(onRetry: _reessayer);
          }

          final toutesMesFormations = classeRepo.mesFormationIds
              .map(formationRepo.getFormationParId)
              .whereType<Formation>()
              .toList();

          final departements = formationRepo.getDepartements();

          // Application des filtres
          final formationsFiltrees = toutesMesFormations.where((f) {
            final matchDept =
                _departementId == null || f.departementId == _departementId;
            final matchType = _typeFiltre == 'Tous' ||
                (_typeFiltre == 'Bourses' && f.estBourse) ||
                (_typeFiltre == 'Standard' && !f.estBourse);

            final q = _recherche.trim().toLowerCase();
            final matchTexte = q.isEmpty ||
                f.titre.toLowerCase().contains(q) ||
                f.formateurNom.toLowerCase().contains(q) ||
                f.description.toLowerCase().contains(q);

            return matchDept && matchType && matchTexte;
          }).toList();

          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _future = _charger(forcer: true);
              });
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: 10),
              children: [
                if (toutesMesFormations.isEmpty)
                  const ComingSoon(
                    icon: Icons.menu_book,
                    titre: 'Tu n\'es inscrit à aucune formation',
                    message:
                        'Inscris-toi à une formation depuis le catalogue : elle '
                        'apparaîtra ici comme une classe.',
                  )
                else ...[
                  // ---- Barre de recherche ----
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _recherche = v),
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: 'Rechercher un cours ou un formateur...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: _recherche.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _recherche = '');
                                },
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),

                  // ---- Rangée de filtres unifiée ----
                  AppFilterBar<String>(
                    selectedValue: _departementId != null
                        ? 'dept_$_departementId'
                        : (_typeFiltre == 'Bourses' ? 'bourses' : 'tous'),
                    onSelected: (val) {
                      setState(() {
                        if (val == 'tous') {
                          _reinitialiserFiltres();
                        } else if (val == 'bourses') {
                          _departementId = null;
                          _typeFiltre = 'Bourses';
                        } else if (val.startsWith('dept_')) {
                          _departementId = val.substring(5);
                          _typeFiltre = 'Tous';
                        }
                      });
                    },
                    items: [
                      const AppFilterItem(label: 'Tous', value: 'tous'),
                      const AppFilterItem(label: 'Bourses', value: 'bourses'),
                      for (final dept in departements)
                        AppFilterItem(label: dept.nom, value: 'dept_${dept.id}'),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // ---- Résultat du filtrage ----
                  if (formationsFiltrees.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(Icons.search_off, size: 48, color: scheme.outline),
                            const SizedBox(height: 12),
                            const Text(
                              'Aucun cours ne correspond à ces filtres',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: _reinitialiserFiltres,
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('Réinitialiser les filtres'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    for (final f in formationsFiltrees)
                      _ClasseCard(
                        formation: f,
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

/// Carte d'une classe dans « Mes formations ».
class _ClasseCard extends StatelessWidget {
  final Formation formation;

  const _ClasseCard({required this.formation});

  @override
  Widget build(BuildContext context) {
    final authUser = context.read<AuthRepository>().utilisateur;
    final couleur = couleurDepartement(formation.departementId);
    final classeRepo = context.watch<ClasseRepository>();
    final estProf = formation.estMonCours(authUser?.id) ||
        classeRepo.estFormateurDe(formation.id) ||
        (authUser?.estFormateur == true && formation.formateurNom.toLowerCase() == (authUser?.nom ?? '').toLowerCase());
    final messages = classeRepo.messages(formation.id);
    final dernierMessage = messages.isNotEmpty ? messages.first : null;
    final texteMessage = dernierMessage?.contenu.replaceAll('\n', ' ').trim();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shadowColor: Colors.black12,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () => context.push('/classe/${formation.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- Bannière image (titre + formateur superposés) ----
            Stack(
              children: [
                PhotoBanniere(
                  url: formation.imageBanniere,
                  couleur: couleur,
                  icone: iconeDepartement(formation.departementId),
                  hauteur: 130,
                  heroTag: 'cours-image-${formation.id}',
                ),
                // Voile sombre pour lisibilité du titre
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black26, Colors.black87],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  right: 12,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white24, width: 0.8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              iconeDepartement(formation.departementId),
                              size: 13,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              formation.departementNom ??
                                  nomDepartement(formation.departementId),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (estProf)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F766E),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white38, width: 0.8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.school, size: 13, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Votre classe',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 14,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        formation.titre,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                          shadows: [
                            Shadow(color: Colors.black54, blurRadius: 6),
                          ],
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formation.formateurNom,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.95),
                          shadows: const [
                            Shadow(color: Colors.black54, blurRadius: 6),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // ---- Pied : avatar formateur + résumé du dernier message ----
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: couleurAvatar(formation.formateurNom),
                    child: Text(
                      initiales(formation.formateurNom),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (dernierMessage != null && texteMessage != null && texteMessage.isNotEmpty) ...[
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  texteMessage,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.onSurface,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                tempsEcoule(dernierMessage.date),
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.outline,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          Text(
                            'Pas encore de message',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.outline,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 15,
                    color: Theme.of(context).colorScheme.outline,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

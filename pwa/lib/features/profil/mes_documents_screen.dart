import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/document_downloader.dart';
import '../../data/repositories/actualite_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/classe_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../widgets/app_filter_bar.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/info_page_sheet.dart';

/// Structure unifiée pour représenter un document reçu (Actualité ou Cours)
class ItemDocument {
  final String id;
  final String titre;
  final String rawDocumentNom;
  final String provenance;
  final IconData provenanceIcon;
  final Color provenanceColor;
  final String type;
  final DateTime date;

  const ItemDocument({
    required this.id,
    required this.titre,
    required this.rawDocumentNom,
    required this.provenance,
    required this.provenanceIcon,
    required this.provenanceColor,
    required this.type,
    required this.date,
  });
}

/// Page « Mes documents » : regroupe TOUS les documents reçus (Actualités et Cours).
class MesDocumentsScreen extends StatefulWidget {
  const MesDocumentsScreen({super.key});

  @override
  State<MesDocumentsScreen> createState() => _MesDocumentsScreenState();
}

class _MesDocumentsScreenState extends State<MesDocumentsScreen> {
  final _searchController = TextEditingController();
  String _recherche = '';
  String _filtreType = 'Tous';

  @override
  void initState() {
    super.initState();
    _chargerTout();
  }

  Future<void> _chargerTout() async {
    final uid = context.read<AuthRepository>().utilisateur?.id;
    final classeRepo = context.read<ClasseRepository>();
    final actualiteRepo = context.read<ActualiteRepository>();

    actualiteRepo.charger();

    if (uid != null && uid.isNotEmpty) {
      await classeRepo.charger(uid);
    }
    for (final fid in classeRepo.mesFormationIds) {
      classeRepo.chargerContenu(fid);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classeRepo = context.watch<ClasseRepository>();
    final formationRepo = context.watch<FormationRepository>();
    final actualiteRepo = context.watch<ActualiteRepository>();
    final scheme = Theme.of(context).colorScheme;

    final List<ItemDocument> tousLesDocuments = [];

    // 1. Documents issus des Actualités
    for (final post in actualiteRepo.getPosts()) {
      if (post.documentNom != null && post.documentNom!.trim().isNotEmpty) {
        final info = DocumentDownloader.analyserDocument(post.documentNom!);
        final nom = info['nom']!;
        final ext = nom.contains('.') ? nom.split('.').last.toUpperCase() : 'PDF';
        tousLesDocuments.add(
          ItemDocument(
            id: 'actu-${post.id}',
            titre: nom,
            rawDocumentNom: post.documentNom!,
            provenance: '📰 Actualité',
            provenanceIcon: Icons.newspaper,
            provenanceColor: const Color(0xFF2563EB),
            type: ext,
            date: post.date,
          ),
        );
      }
    }

    // 2. Documents issus des Cours / Formations (Annonces et Fichiers séparés)
    for (final fId in classeRepo.mesFormationIds) {
      final formation = formationRepo.getFormationParId(fId);
      final titreForm = formation?.titre ?? 'Cours';

      // Annonces du formateur
      final messages = classeRepo.messages(fId);
      for (final m in messages) {
        if (m.documentNom != null && m.documentNom!.trim().isNotEmpty) {
          final info = DocumentDownloader.analyserDocument(m.documentNom!);
          final nom = info['nom']!;
          final ext = nom.contains('.') ? nom.split('.').last.toUpperCase() : 'PDF';
          tousLesDocuments.add(
            ItemDocument(
              id: 'msg-${m.id}',
              titre: nom,
              rawDocumentNom: m.documentNom!,
              provenance: '📘 Cours · $titreForm',
              provenanceIcon: Icons.school,
              provenanceColor: const Color(0xFF059669),
              type: ext,
              date: m.date,
            ),
          );
        }
      }

      // Documents séparés
      final docsSepares = classeRepo.documents(fId);
      for (final doc in docsSepares) {
        tousLesDocuments.add(
          ItemDocument(
            id: 'doc-${doc.id}',
            titre: doc.titre,
            rawDocumentNom: doc.titre,
            provenance: '📘 Cours · $titreForm',
            provenanceIcon: Icons.school,
            provenanceColor: const Color(0xFF059669),
            type: doc.type,
            date: DateTime.now(),
          ),
        );
      }
    }

    // Trier du plus récent au plus ancien
    tousLesDocuments.sort((a, b) => b.date.compareTo(a.date));

    // Filtrer par recherche et type
    final documentsFiltres = tousLesDocuments.where((doc) {
      final matchType = _filtreType == 'Tous' ||
          doc.type == _filtreType ||
          (_filtreType == 'PDF' && doc.type == 'PDF') ||
          (_filtreType == 'Word' && (doc.type == 'DOC' || doc.type == 'DOCX' || doc.type == 'WORD'));
      final matchTexte = _recherche.isEmpty ||
          doc.titre.toLowerCase().contains(_recherche.toLowerCase()) ||
          doc.provenance.toLowerCase().contains(_recherche.toLowerCase());
      return matchType && matchTexte;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            const BrandLogo(height: 28),
            const SizedBox(width: 10),
            const Text('Mes documents'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Comment fonctionnent vos documents ?',
            onPressed: () => afficherInfoPage(
              context: context,
              titre: 'Gestionnaire de Documents',
              description:
                  'Regroupe tous les documents pédagogiques et fichiers joints reçus depuis vos cours et les actualités.',
              points: [
                (
                  Icons.auto_awesome,
                  'Centralisation',
                  'Retrouvez au même endroit les PDF, Word et fiches d\'exercices transmis par vos formateurs.',
                ),
                (
                  Icons.style,
                  'Badges de provenance',
                  'Chaque document indique sa source (📰 Actualités ou 📘 Cours) pour vous repérer facilement.',
                ),
                (
                  Icons.folder_open,
                  'Stockage local',
                  'Une fois téléchargé, le fichier est conservé sur votre téléphone et s\'ouvre instantanément.',
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // ---- Recherche ----
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (v) => setState(() => _recherche = v),
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Rechercher un document ou une source...',
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
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ),

          // ---- Filtres par type ----
          AppFilterBar<String>(
            selectedValue: _filtreType,
            onSelected: (t) => setState(() => _filtreType = t),
            items: const [
              AppFilterItem(label: 'Tous', value: 'Tous'),
              AppFilterItem(label: 'PDF', value: 'PDF'),
              AppFilterItem(label: 'Word', value: 'Word'),
              AppFilterItem(label: 'Vidéo', value: 'Vidéo'),
              AppFilterItem(label: 'Lien', value: 'Lien'),
            ],
          ),

          const SizedBox(height: 8),

          // ---- Compteur ----
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '${documentsFiltres.length} document${documentsFiltres.length > 1 ? 's' : ''} disponible${documentsFiltres.length > 1 ? 's' : ''}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: scheme.outline,
                ),
              ),
            ),
          ),

          const SizedBox(height: 8),

          // ---- Liste ----
          Expanded(
            child: RefreshIndicator(
              onRefresh: _chargerTout,
              child: documentsFiltres.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [_buildEmptyState(context)],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                      itemCount: documentsFiltres.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        return _DocumentTile(item: documentsFiltres[index]);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.folder_off_outlined, size: 56, color: scheme.outline),
            const SizedBox(height: 14),
            const Text(
              'Aucun document trouvé',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              _recherche.isNotEmpty || _filtreType != 'Tous'
                  ? 'Essaie d\'autres filtres ou mots-clés.'
                  : 'Vous n\'avez encore reçu aucun document.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.outline),
            ),
            const SizedBox(height: 20),
            if (_recherche.isNotEmpty || _filtreType != 'Tous')
              OutlinedButton.icon(
                onPressed: () => setState(() {
                  _recherche = '';
                  _searchController.clear();
                  _filtreType = 'Tous';
                }),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Réinitialiser les filtres'),
              ),
          ],
        ),
      ),
    );
  }
}

/// Carte représentant un document récapitulatif avec provenance et bouton interactif.
class _DocumentTile extends StatefulWidget {
  final ItemDocument item;
  const _DocumentTile({required this.item});

  @override
  State<_DocumentTile> createState() => _DocumentTileState();
}

class _DocumentTileState extends State<_DocumentTile> {
  bool _enChargement = false;
  bool _estEnLocal = false;

  @override
  void initState() {
    super.initState();
    _verifierCache();
  }

  Future<void> _verifierCache() async {
    final existe = await DocumentDownloader.estEnCacheLocal(widget.item.rawDocumentNom);
    if (mounted) setState(() => _estEnLocal = existe);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final item = widget.item;
    final (icone, couleur) = _styleType(item.type);

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: _estEnLocal
              ? const Color(0xFF059669).withValues(alpha: 0.35)
              : scheme.outlineVariant,
        ),
      ),
      child: InkWell(
        onTap: _enChargement
            ? null
            : () async {
                await DocumentDownloader.telechargerEtOuvrir(
                  context,
                  item.rawDocumentNom,
                  afficherModale: false,
                  onLoadingStateChanged: (enCours) {
                    if (mounted) setState(() => _enChargement = enCours);
                  },
                );
                _verifierCache();
              },
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Icône du type
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: _estEnLocal
                      ? const Color(0xFF059669).withValues(alpha: 0.12)
                      : couleur.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _estEnLocal ? Icons.folder_open_rounded : icone,
                  color: _estEnLocal ? const Color(0xFF059669) : couleur,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),

              // Titre + Badge de provenance
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.titre,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: item.provenanceColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(item.provenanceIcon, size: 11, color: item.provenanceColor),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    item.provenance,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                      color: item.provenanceColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Bouton avec état de téléchargement
              _buildRightButton(scheme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRightButton(ColorScheme scheme) {
    if (_enChargement) {
      return SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation<Color>(scheme.primary),
        ),
      );
    }
    if (_estEnLocal) {
      return const Icon(
        Icons.check_circle_rounded,
        color: Color(0xFF059669),
        size: 24,
      );
    }
    return Icon(
      Icons.download_for_offline_outlined,
      color: scheme.primary,
      size: 24,
    );
  }

  (IconData, Color) _styleType(String type) {
    switch (type.toUpperCase()) {
      case 'PDF':
        return (Icons.picture_as_pdf, const Color(0xFFDC2626));
      case 'DOC':
      case 'DOCX':
      case 'WORD':
        return (Icons.description, const Color(0xFF2563EB));
      case 'XLS':
      case 'XLSX':
        return (Icons.table_chart, const Color(0xFF059669));
      default:
        return (Icons.insert_drive_file, const Color(0xFF6B7280));
    }
  }
}

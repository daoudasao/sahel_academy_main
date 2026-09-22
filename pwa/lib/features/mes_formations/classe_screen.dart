import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/avatar.dart';
import '../../core/utils/departement_ui.dart';
import '../../core/utils/document_downloader.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/classe_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../models/document_cours.dart';
import '../../models/formation.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/photo_banniere.dart';
import 'widgets/message_classe_card.dart';

/// Écran d'une classe (façon Google Classroom) : onglets Flux et Cours.
class ClasseScreen extends StatefulWidget {
  final String formationId;

  const ClasseScreen({super.key, required this.formationId});

  @override
  State<ClasseScreen> createState() => _ClasseScreenState();
}

class _ClasseScreenState extends State<ClasseScreen> {
  late Future<Formation?> _formation;

  @override
  void initState() {
    super.initState();
    context.read<ClasseRepository>().chargerContenu(widget.formationId);
    _formation = _chargerFormation();
  }

  Future<Formation?> _chargerFormation() => context
      .read<FormationRepository>()
      .chargerFormationParId(widget.formationId);

  @override
  Widget build(BuildContext context) {
    // La formation peut ne pas être encore chargée (ouverture directe depuis
    // l'espace formateur, un lien ou une notification) : on l'attend.
    return FutureBuilder<Formation?>(
      future: _formation,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final formation = snap.data;
        if (formation == null) {
          return Scaffold(
            appBar: AppBar(),
            body: ErreurChargement(
              message: snap.hasError
                  ? 'Impossible de charger cette classe.\nVérifiez votre connexion.'
                  : 'Classe introuvable.',
              onRetry: () => setState(() => _formation = _chargerFormation()),
            ),
          );
        }
        return _contenu(context, formation);
      },
    );
  }

  Widget _contenu(BuildContext context, Formation formation) {
    final authUser = context.watch<AuthRepository>().utilisateur;
    final classeRepo = context.watch<ClasseRepository>();
    final estProf = formation.estMonCours(authUser?.id) ||
        classeRepo.estFormateurDe(formation.id) ||
        (authUser?.estFormateur == true &&
            formation.formateurNom.toLowerCase() ==
                (authUser?.nom ?? '').toLowerCase());

    final couleur = couleurDepartement(formation.departementId);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          body: Column(
            children: [
              // ---- Header avec l'image en arrière-plan + Hero transition ----
              Stack(
                children: [
                  PhotoBanniere(
                    url: formation.imageBanniere,
                    couleur: couleur,
                    icone: iconeDepartement(formation.departementId),
                    hauteur: 175,
                    heroTag: 'cours-image-${formation.id}',
                    overlays: [
                      // Voile sombre progressif pour lisibilité maximale des textes
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.black54, Colors.black87],
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Contenu superposé (Retour, Titre, Formateur, Onglets)
                  Positioned.fill(
                    child: SafeArea(
                      bottom: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const BackButton(color: Colors.white),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      formation.titre,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        shadows: [
                                          Shadow(
                                            color: Colors.black87,
                                            blurRadius: 8,
                                          ),
                                        ],
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        Text(
                                          'Formateur · ${formation.formateurNom}',
                                          style: TextStyle(
                                            color: Colors.white.withValues(
                                              alpha: 0.9,
                                            ),
                                            fontSize: 12,
                                            shadows: const [
                                              Shadow(
                                                color: Colors.black87,
                                                blurRadius: 8,
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (estProf) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 1.5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF0F766E),
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                            child: const Text(
                                              'Vous',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                            ],
                          ),
                          const Spacer(),
                          const TabBar(
                            labelColor: Colors.white,
                            unselectedLabelColor: Colors.white70,
                            indicatorColor: Colors.white,
                            indicatorWeight: 3,
                            labelStyle: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                            tabs: [
                              Tab(text: 'Flux'),
                              Tab(text: 'Documents'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // ---- Contenu des onglets ----
              Expanded(
                child: TabBarView(
                  children: [
                    _FluxTab(formation: formation, estProf: estProf),
                    _CoursTab(formation: formation, estProf: estProf),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Onglet « Flux » : les messages du formateur avec commentaires et publication.
class _FluxTab extends StatelessWidget {
  final Formation formation;
  final bool estProf;

  const _FluxTab({required this.formation, required this.estProf});

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<ClasseRepository>();
    final scheme = Theme.of(context).colorScheme;
    final fid = formation.id;

    if (!repo.contenuCharge(fid) && repo.contenuEnChargement(fid)) {
      return const Center(child: CircularProgressIndicator());
    }
    if (!repo.contenuCharge(fid) && repo.contenuErreur(fid) != null) {
      return ErreurChargement(
        onRetry: () => repo.chargerContenu(fid, forcer: true),
      );
    }

    final messages = repo.messages(fid);
    return RefreshIndicator(
      onRefresh: () => repo.chargerContenu(fid, forcer: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // Espace de diffusion ouvert à tous (formateurs et élèves façon Google Classroom)
          _CartePublicationAnnonce(
            formation: formation,
            estProf: estProf,
          ),

          if (messages.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.forum_outlined,
                        size: 44, color: scheme.outline.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text(
                      'Aucun message pour le moment.',
                      style: TextStyle(
                        color: scheme.outline,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      estProf
                          ? 'Partagez une première annonce avec vos élèves ci-dessus.'
                          : 'Partagez un premier message avec votre classe ci-dessus.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: scheme.outline, fontSize: 12),
                    ),
                  ],
                ),
              ),
            )
          else
            for (final m in messages) MessageClasseCard(message: m),
        ],
      ),
    );
  }
}

/// Carte d'incitation à la publication (façon Google Classroom).
class _CartePublicationAnnonce extends StatelessWidget {
  final Formation formation;
  final bool estProf;

  const _CartePublicationAnnonce({
    required this.formation,
    required this.estProf,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthRepository>();
    final user = auth.utilisateur;
    final nom = user?.nom ?? (estProf ? 'Formateur' : 'Élève');
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 2,
      shadowColor: Colors.black12,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _ouvrirModalPublication(context),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 19,
                backgroundColor: couleurAvatar(nom),
                child: Text(
                  initiales(nom),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  estProf
                      ? 'Annoncer quelque chose à votre classe...'
                      : 'Partager quelque chose avec la classe...',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.8),
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Icon(Icons.edit_note_rounded, color: scheme.primary, size: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _ouvrirModalPublication(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ModalPublicationAnnonce(
        formation: formation,
        estProf: estProf,
      ),
    );
  }
}

/// Modal moderne de rédaction d'annonce ou de message avec pièce jointe.
class _ModalPublicationAnnonce extends StatefulWidget {
  final Formation formation;
  final bool estProf;

  const _ModalPublicationAnnonce({
    required this.formation,
    this.estProf = false,
  });

  @override
  State<_ModalPublicationAnnonce> createState() =>
      _ModalPublicationAnnonceState();
}

class _ModalPublicationAnnonceState extends State<_ModalPublicationAnnonce> {
  final _texteController = TextEditingController();
  List<int>? _fichierBytes;
  String? _fichierNom;
  String? _fichierTaille;
  bool _enPublication = false;

  @override
  void dispose() {
    _texteController.dispose();
    super.dispose();
  }

  Future<void> _choisirFichier() async {
    try {
      final result = await FilePicker.pickFiles(
        withData: true,
        type: FileType.custom,
        allowedExtensions: [
          'pdf',
          'doc',
          'docx',
          'ppt',
          'pptx',
          'xls',
          'xlsx',
          'txt',
          'png',
          'jpg',
          'jpeg',
        ],
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        List<int>? bytes = file.bytes;
        if (bytes == null && file.path != null && !kIsWeb) {
          bytes = await File(file.path!).readAsBytes();
        }

        if (bytes == null || bytes.isEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Impossible de lire le fichier sélectionné.'),
              ),
            );
          }
          return;
        }

        if (bytes.length > 5 * 1024 * 1024) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Le fichier dépasse la taille maximale de 5 Mo.'),
              ),
            );
          }
          return;
        }

        setState(() {
          _fichierBytes = bytes;
          _fichierNom = file.name;
          final sizeKb = (bytes!.length / 1024).round();
          _fichierTaille = sizeKb > 1024
              ? '${(sizeKb / 1024).toStringAsFixed(1)} Mo'
              : '$sizeKb Ko';
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de la sélection : $e')),
        );
      }
    }
  }

  Future<void> _publier() async {
    final texte = _texteController.text.trim();
    if (texte.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez saisir un message.')),
      );
      return;
    }

    final authUser = context.read<AuthRepository>().utilisateur;
    final classeRepo = context.read<ClasseRepository>();
    final nomParDefaut = widget.estProf ? 'Formateur' : 'Élève';
    final roleParDefaut = widget.estProf ? 'Formateur' : 'Élève';

    setState(() => _enPublication = true);
    try {
      String? documentNom;
      if (_fichierBytes != null && _fichierNom != null) {
        final url = await ApiClient.instance.uploadMultipart(
          _fichierBytes!,
          _fichierNom!,
          folder: 'documents',
        );
        documentNom = '$_fichierNom|$url';
      }

      await classeRepo.publierMessage(
        formationId: widget.formation.id,
        contenu: texte,
        documentNom: documentNom,
        auteurNom: authUser?.nom ?? nomParDefaut,
        auteurRole: roleParDefaut,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.estProf
                  ? 'Annonce publiée avec succès !'
                  : 'Message publié avec succès !',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur publication : $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _enPublication = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(18, 18, 18, 18 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.estProf ? 'Nouvelle annonce' : 'Nouveau message',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      widget.formation.titre,
                      style: TextStyle(color: scheme.outline, fontSize: 12),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _enPublication ? null : () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _texteController,
              maxLines: 5,
              minLines: 3,
              enabled: !_enPublication,
              decoration: InputDecoration(
                hintText: widget.estProf
                    ? 'Écrivez vos consignes, actualités ou devoirs pour la classe...'
                    : 'Posez une question ou partagez une information avec la classe...',
                hintStyle: TextStyle(color: scheme.outline, fontSize: 13.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            if (_fichierNom != null) ...[
              const SizedBox(height: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.attach_file, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$_fichierNom (${_fichierTaille ?? ''})',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (!_enPublication)
                      IconButton(
                        icon: const Icon(Icons.close, size: 16),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () {
                          setState(() {
                            _fichierBytes = null;
                            _fichierNom = null;
                            _fichierTaille = null;
                          });
                        },
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _enPublication ? null : _choisirFichier,
                  icon: const Icon(Icons.attach_file, size: 18),
                  label: Text(_fichierNom == null ? 'Joindre un fichier' : 'Changer'),
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: _enPublication ? null : _publier,
                  icon: _enPublication
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded, size: 17),
                  label: Text(_enPublication ? 'Envoi...' : 'Publier'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Onglet « Documents » : recensement des supports de cours + ajout par le formateur.
class _CoursTab extends StatelessWidget {
  final Formation formation;
  final bool estProf;

  const _CoursTab({required this.formation, required this.estProf});

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<ClasseRepository>();
    final scheme = Theme.of(context).colorScheme;
    final fid = formation.id;

    if (!repo.contenuCharge(fid) && repo.contenuEnChargement(fid)) {
      return const Center(child: CircularProgressIndicator());
    }
    if (!repo.contenuCharge(fid) && repo.contenuErreur(fid) != null) {
      return ErreurChargement(
        onRetry: () => repo.chargerContenu(fid, forcer: true),
      );
    }

    final messages = repo.messages(fid);
    final docsSepares = repo.documents(fid);

    // Extraction de tous les documents rattachés aux annonces du formateur
    final docsDesMessages = <DocumentCours>[];
    for (final m in messages) {
      if (m.documentNom != null && m.documentNom!.trim().isNotEmpty) {
        final info = DocumentDownloader.analyserDocument(m.documentNom!);
        final nom = info['nom']!;
        final url = info['url']!;
        final ext = nom.contains('.')
            ? nom.split('.').last.toUpperCase()
            : 'PDF';

        docsDesMessages.add(
          DocumentCours(
            id: 'msg-doc-${m.id}',
            formationId: fid,
            titre: nom,
            type: ext,
            taille: 'Fichier joint d\'annonce',
            url: url,
          ),
        );
      }
    }

    final tousLesDocuments = [...docsDesMessages, ...docsSepares];

    return RefreshIndicator(
      onRefresh: () => repo.chargerContenu(fid, forcer: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // Carte d'ajout de document pour le formateur
          if (estProf) _CarteAjoutDocument(formation: formation),

          if (tousLesDocuments.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.folder_open_outlined,
                        size: 44, color: scheme.outline.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text(
                      'Aucun document téléversé pour le moment.',
                      style: TextStyle(
                        color: scheme.outline,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (estProf) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Ajoutez un premier support de cours via le bouton ci-dessus.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: scheme.outline, fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                children: [
                  for (final doc in tousLesDocuments) ...[
                    _DocumentCard(
                      document: doc,
                      peutSupprimer:
                          estProf && !doc.id.startsWith('msg-doc-'),
                      onSupprimer: () =>
                          _confirmerSuppressionDocument(context, doc),
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  void _confirmerSuppressionDocument(
      BuildContext context, DocumentCours document) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce document ?'),
        content: Text('Voulez-vous supprimer « ${document.titre} » de la classe ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<ClasseRepository>().supprimerDocument(
                      formationId: formation.id,
                      documentId: document.id,
                    );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Document supprimé')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e')),
                  );
                }
              }
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}

/// Carte d'ajout d'un document de cours (formateur).
class _CarteAjoutDocument extends StatelessWidget {
  final Formation formation;

  const _CarteAjoutDocument({required this.formation});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 2,
      shadowColor: Colors.black12,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _ouvrirModalAjout(context),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.upload_file_rounded,
                    color: scheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Ajouter un document de cours',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      'PDF, Word, diapositives, exercices...',
                      style: TextStyle(color: scheme.outline, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Icon(Icons.add_circle_outline_rounded,
                  color: scheme.primary, size: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _ouvrirModalAjout(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ModalAjoutDocument(formation: formation),
    );
  }
}

/// Modal d'upload et d'ajout de document pédagogique.
class _ModalAjoutDocument extends StatefulWidget {
  final Formation formation;

  const _ModalAjoutDocument({required this.formation});

  @override
  State<_ModalAjoutDocument> createState() => _ModalAjoutDocumentState();
}

class _ModalAjoutDocumentState extends State<_ModalAjoutDocument> {
  final _titreController = TextEditingController();
  List<int>? _fichierBytes;
  String? _fichierNom;
  String? _fichierTaille;
  String _typeChoisi = 'PDF';
  bool _enUpload = false;

  @override
  void dispose() {
    _titreController.dispose();
    super.dispose();
  }

  Future<void> _choisirFichier() async {
    try {
      final result = await FilePicker.pickFiles(
        withData: true,
        type: FileType.custom,
        allowedExtensions: [
          'pdf',
          'doc',
          'docx',
          'ppt',
          'pptx',
          'xls',
          'xlsx',
          'txt',
          'png',
          'jpg',
          'jpeg',
        ],
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        List<int>? bytes = file.bytes;
        if (bytes == null && file.path != null && !kIsWeb) {
          bytes = await File(file.path!).readAsBytes();
        }

        if (bytes == null || bytes.isEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Impossible de lire le fichier sélectionné.'),
              ),
            );
          }
          return;
        }

        if (bytes.length > 5 * 1024 * 1024) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Le fichier dépasse la limite maximale de 5 Mo.'),
              ),
            );
          }
          return;
        }

        final ext = file.name.contains('.')
            ? file.name.split('.').last.toUpperCase()
            : 'PDF';

        setState(() {
          _fichierBytes = bytes;
          _fichierNom = file.name;
          _typeChoisi = ext;
          if (_titreController.text.trim().isEmpty) {
            _titreController.text = file.name;
          }
          final sizeKb = (bytes!.length / 1024).round();
          _fichierTaille = sizeKb > 1024
              ? '${(sizeKb / 1024).toStringAsFixed(1)} Mo'
              : '$sizeKb Ko';
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur choix fichier : $e')),
        );
      }
    }
  }

  Future<void> _enregistrer() async {
    if (_fichierBytes == null || _fichierNom == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner un fichier.')),
      );
      return;
    }

    final titre = _titreController.text.trim().isNotEmpty
        ? _titreController.text.trim()
        : _fichierNom!;

    final classeRepo = context.read<ClasseRepository>();

    setState(() => _enUpload = true);
    try {
      final url = await ApiClient.instance.uploadMultipart(
        _fichierBytes!,
        _fichierNom!,
        folder: 'documents',
      );

      await classeRepo.publierDocument(
        formationId: widget.formation.id,
        titre: titre,
        url: url,
        type: _typeChoisi,
        taille: _fichierTaille,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document ajouté au cours avec succès !')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur ajout document : $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _enUpload = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(18, 18, 18, 18 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Ajouter un document de cours',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _enUpload ? null : () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _titreController,
              enabled: !_enUpload,
              decoration: InputDecoration(
                labelText: 'Titre du document',
                hintText: 'Ex: Support Chapitre 1, Fiche d\'exercice...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: _enUpload ? null : _choisirFichier,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _fichierNom != null
                        ? scheme.primary
                        : scheme.outline.withValues(alpha: 0.4),
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: _fichierNom != null
                      ? scheme.primary.withValues(alpha: 0.05)
                      : null,
                ),
                child: Row(
                  children: [
                    Icon(
                      _fichierNom != null
                          ? Icons.check_circle_rounded
                          : Icons.file_upload_outlined,
                      color: _fichierNom != null
                          ? scheme.primary
                          : scheme.outline,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _fichierNom ?? 'Sélectionner un fichier (PDF, Word...)',
                            style: TextStyle(
                              fontWeight: _fichierNom != null
                                  ? FontWeight.w700
                                  : FontWeight.normal,
                              fontSize: 13.5,
                            ),
                          ),
                          if (_fichierTaille != null)
                            Text(
                              'Format : $_typeChoisi · $_fichierTaille',
                              style: TextStyle(
                                  color: scheme.outline, fontSize: 12),
                            ),
                        ],
                      ),
                    ),
                    Text(
                      _fichierNom != null ? 'Changer' : 'Parcourir',
                      style: TextStyle(
                        color: scheme.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed: _enUpload ? null : _enregistrer,
                icon: _enUpload
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.add_task_rounded),
                label: Text(
                  _enUpload
                      ? 'Téléversement en cours...'
                      : 'Ajouter le document',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  final DocumentCours document;
  final bool peutSupprimer;
  final VoidCallback? onSupprimer;

  const _DocumentCard({
    required this.document,
    this.peutSupprimer = false,
    this.onSupprimer,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (icone, couleur) = _styleType(document.type);

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: couleur.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icone, color: couleur, size: 22),
        ),
        title: Text(
          document.titre,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          '${document.type} · ${document.taille}',
          style: TextStyle(color: scheme.outline, fontSize: 12.5),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (peutSupprimer)
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded,
                    size: 20, color: Colors.red),
                tooltip: 'Supprimer ce document',
                onPressed: onSupprimer,
              ),
            IconButton(
              icon: Icon(Icons.download_for_offline_outlined,
                  color: scheme.primary),
              tooltip: 'Télécharger',
              onPressed: () {
                final target = document.url?.isNotEmpty == true
                    ? '${document.titre}|${document.url}'
                    : document.titre;
                DocumentDownloader.telechargerEtOuvrir(context, target);
              },
            ),
          ],
        ),
      ),
    );
  }

  (IconData, Color) _styleType(String type) {
    switch (type.toUpperCase()) {
      case 'PDF':
        return (Icons.picture_as_pdf, const Color(0xFFDC2626));
      case 'DOC':
      case 'DOCX':
        return (Icons.description, const Color(0xFF2563EB));
      case 'PPT':
      case 'PPTX':
        return (Icons.slideshow, const Color(0xFFD97706));
      case 'XLS':
      case 'XLSX':
        return (Icons.table_chart, const Color(0xFF059669));
      case 'PNG':
      case 'JPG':
      case 'JPEG':
        return (Icons.image, const Color(0xFF7C3AED));
      case 'LIEN':
        return (Icons.link, const Color(0xFF2563EB));
      case 'VIDÉO':
      case 'VIDEO':
        return (Icons.play_circle_fill, const Color(0xFF7C3AED));
      default:
        return (Icons.insert_drive_file, const Color(0xFF059669));
    }
  }
}

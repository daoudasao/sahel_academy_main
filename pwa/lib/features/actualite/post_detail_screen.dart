import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/utils/avatar.dart';
import '../../core/utils/document_downloader.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/actualite_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../../models/classe_message.dart';
import '../../models/post.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/signaler_contenu.dart';
import '../../widgets/texte_avec_liens.dart';
import 'widgets/actions_post.dart';
import 'widgets/medias_post.dart';

/// Détail d'un post : contenu complet + commentaires + réponses.
///
/// Prend en charge deux cas d'usage :
///   1. Navigation interne : le post est déjà en mémoire dans [ActualiteRepository].
///   2. Deep link (froid ou arrière-plan) : le post est chargé via
///      `GET /actualites/:id` et inséré dans le repository pour les
///      mises à jour temps réel WebSocket.
class PostDetailScreen extends StatefulWidget {
  final String postId;

  const PostDetailScreen({super.key, required this.postId});

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final _controller = TextEditingController();
  Commentaire? _repondreA; // commentaire auquel on répond (null = nouveau)
  late Future<Post> _chargement;

  @override
  void initState() {
    super.initState();
    _chargement = context.read<ActualiteRepository>().detail(widget.postId);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Déclenche un rechargement forcé depuis l'API (pull-to-refresh ou réessai).
  void _reessayer() {
    setState(() {
      _chargement = context.read<ActualiteRepository>().detail(
        widget.postId,
        forcer: true,
      );
    });
  }

  Future<void> _envoyer() async {
    final texte = _controller.text.trim();
    if (texte.isEmpty) return;
    final repo = context.read<ActualiteRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final nom = context.read<AuthRepository>().utilisateur?.nom ?? 'Moi';
    final aRepondre = _repondreA;

    // Optimiste côté UI : on vide le champ tout de suite.
    _controller.clear();
    setState(() => _repondreA = null);
    FocusScope.of(context).unfocus();

    try {
      if (aRepondre != null) {
        await repo.ajouterReponse(
          postId: widget.postId,
          commentaireId: aRepondre.id,
          auteurNom: nom,
          contenu: texte,
        );
      } else {
        await repo.ajouterCommentaire(
          postId: widget.postId,
          auteurNom: nom,
          contenu: texte,
        );
      }
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Échec de l\'envoi. Réessaie.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Post>(
      future: _chargement,
      builder: (context, snap) {
        // ── Chargement initial ──
        if (snap.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Publication'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/actualite');
                  }
                },
              ),
            ),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        // ── Erreur (réseau, post introuvable…) ──
        if (snap.hasError) {
          final estIntrouvable =
              snap.error.toString().contains('404') ||
              snap.error.toString().toLowerCase().contains('non trouvé');
          return Scaffold(
            appBar: AppBar(
              title: const Text('Publication'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/actualite');
                  }
                },
              ),
            ),
            body: ErreurChargement(
              onRetry: _reessayer,
              message: estIntrouvable
                  ? 'Cette publication n\'existe pas ou a été supprimée.'
                  : null,
            ),
          );
        }

        // ── Succès : on écoute le repository pour les mises à jour temps réel ──
        // `context.watch` assure la reconstruction lors d'un nouveau commentaire
        // ou d'un like reçu via WebSocket.
        final post =
            context.watch<ActualiteRepository>().getPost(widget.postId) ??
            snap.data!;

        return _PostContenu(
          post: post,
          controller: _controller,
          repondreA: _repondreA,
          onChangerRepondreA: (c) => setState(() => _repondreA = c),
          onEnvoyer: _envoyer,
          onRefresh: () async => _reessayer(),
        );
      },
    );
  }
}

/// Corps complet de l'écran une fois le post chargé.
class _PostContenu extends StatelessWidget {
  final Post post;
  final TextEditingController controller;
  final Commentaire? repondreA;
  final ValueChanged<Commentaire?> onChangerRepondreA;
  final VoidCallback onEnvoyer;
  final Future<void> Function() onRefresh;

  const _PostContenu({
    required this.post,
    required this.controller,
    required this.repondreA,
    required this.onChangerRepondreA,
    required this.onEnvoyer,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return PopScope(
      canPop: context.canPop(),
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          context.go('/actualite');
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Publication'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/actualite');
              }
            },
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.share_outlined),
              tooltip: 'Partager',
              onPressed: () {
                final postUrl =
                    'https://sahel-academy-verif.vercel.app/app/post/${post.id}';
                final text =
                    '${post.auteurNom} sur Sahel Academy :\n\n${post.contenu}\n\n👉 $postUrl';
                // ignore: deprecated_member_use
                Share.share(text, subject: 'Publication de ${post.auteurNom}');
              },
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                onRefresh: onRefresh,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.only(bottom: 12),
                  children: [
                    _Entete(post: post),
                    Divider(
                      color: scheme.outlineVariant.withValues(alpha: 0.6),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                      child: Text(
                        'Commentaires (${post.nbCommentaires})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ),
                    if (post.commentaires.isEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                        child: Text(
                          'Sois le premier à commenter.',
                          style: TextStyle(color: scheme.outline),
                        ),
                      )
                    else
                      for (final c in post.commentaires)
                        _CommentaireBloc(
                          commentaire: c,
                          onRepondre: () => onChangerRepondreA(c),
                        ),
                  ],
                ),
              ),
            ),
            _Composer(
              controller: controller,
              repondreA: repondreA,
              onChangerRepondreA: onChangerRepondreA,
              onEnvoyer: onEnvoyer,
            ),
          ],
        ),
      ),
    );
  }
}

/// Barre de composition d'un commentaire ou d'une réponse.
class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final Commentaire? repondreA;
  final ValueChanged<Commentaire?> onChangerRepondreA;
  final VoidCallback onEnvoyer;

  const _Composer({
    required this.controller,
    required this.repondreA,
    required this.onChangerRepondreA,
    required this.onEnvoyer,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final moi = context.read<AuthRepository>().utilisateur?.nom ?? 'Moi';

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (repondreA != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.fromLTRB(12, 6, 6, 6),
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.reply, size: 16, color: scheme.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'En réponse à ${repondreA!.auteurNom}',
                          style: TextStyle(
                            color: scheme.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: () => onChangerRepondreA(null),
                        child: Icon(
                          Icons.close,
                          size: 18,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              Row(
                children: [
                  _Avatar(nom: moi, taille: 34),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: controller,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => onEnvoyer(),
                      decoration: InputDecoration(
                        isDense: true,
                        hintText: repondreA == null
                            ? 'Écrire un commentaire…'
                            : 'Écrire une réponse…',
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: scheme.outlineVariant),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: scheme.outlineVariant),
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onEnvoyer,
                    icon: Icon(Icons.send_rounded, color: scheme.primary),
                    tooltip: 'Envoyer',
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

/// En-tête : le post complet (auteur, contenu avec liens, document).
class _Entete extends StatelessWidget {
  final Post post;
  const _Entete({required this.post});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _Avatar(nom: post.auteurNom, taille: 44),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.auteurNom,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    Text(
                      tempsEcoule(post.date),
                      style: TextStyle(color: scheme.outline, fontSize: 12),
                    ),
                  ],
                ),
              ),
              _RoleBadge(role: post.auteurRole),
            ],
          ),
          const SizedBox(height: 12),
          TexteAvecLiens(post.contenu, style: const TextStyle(height: 1.45)),
          if (post.medias.isNotEmpty) ...[
            const SizedBox(height: 12),
            MediasPostWidget(medias: post.medias),
          ],
          if (post.documentNom != null) ...[
            const SizedBox(height: 12),
            InkWell(
              onTap: () => DocumentDownloader.telechargerEtOuvrir(
                context,
                post.documentNom!,
              ),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: scheme.outlineVariant),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.description,
                        color: scheme.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            DocumentDownloader.analyserDocument(
                              post.documentNom!,
                            )['nom']!,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Appuie pour télécharger et ouvrir',
                            style: TextStyle(
                              color: scheme.outline,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.download_for_offline_outlined,
                      color: scheme.primary,
                      size: 22,
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (post.actions.isNotEmpty) ...[
            const SizedBox(height: 12),
            ActionsPost(actions: post.actions),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.favorite, size: 16, color: Colors.red.shade300),
              const SizedBox(width: 4),
              Text(
                '${post.likes}',
                style: TextStyle(color: scheme.outline, fontSize: 13),
              ),
              const SizedBox(width: 16),
              Icon(
                Icons.mode_comment_outlined,
                size: 16,
                color: scheme.outline,
              ),
              const SizedBox(width: 4),
              Text(
                '${post.nbCommentaires}',
                style: TextStyle(color: scheme.outline, fontSize: 13),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Un commentaire + ses réponses (indentées).
class _CommentaireBloc extends StatelessWidget {
  final Commentaire commentaire;
  final VoidCallback onRepondre;

  const _CommentaireBloc({required this.commentaire, required this.onRepondre});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _LigneCommentaire(commentaire: commentaire, onRepondre: onRepondre),
          if (commentaire.reponses.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 42),
              child: Column(
                children: [
                  for (final r in commentaire.reponses)
                    _LigneCommentaire(commentaire: r, onRepondre: null),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Une ligne de commentaire (bulle + éventuel bouton « Répondre »).
class _LigneCommentaire extends StatelessWidget {
  final Commentaire commentaire;
  final VoidCallback? onRepondre;

  const _LigneCommentaire({required this.commentaire, this.onRepondre});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final estStaff =
        commentaire.auteurRole == 'Admin' ||
        commentaire.auteurRole == 'Formateur';
    final signalable = peutSignaler(
      context,
      auteurId: commentaire.auteurId,
      auteurNom: commentaire.auteurNom,
      auteurRole: commentaire.auteurRole,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Avatar(
            nom: commentaire.auteurNom,
            taille: onRepondre == null ? 28 : 34,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHighest.withValues(
                      alpha: 0.5,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              commentaire.auteurNom,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13.5,
                              ),
                            ),
                          ),
                          if (estStaff) ...[
                            const SizedBox(width: 6),
                            _RoleBadge(
                              role: commentaire.auteurRole,
                              petit: true,
                            ),
                          ],
                          const SizedBox(width: 6),
                          Text(
                            tempsEcoule(commentaire.date),
                            style: TextStyle(
                              color: scheme.outline,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      TexteAvecLiens(
                        commentaire.contenu,
                        style: const TextStyle(fontSize: 13.5, height: 1.35),
                      ),
                    ],
                  ),
                ),
                if (onRepondre != null || signalable)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, top: 2),
                    child: Row(
                      children: [
                        if (onRepondre != null)
                          InkWell(
                            onTap: onRepondre,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Text(
                                'Répondre',
                                style: TextStyle(
                                  color: scheme.primary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12.5,
                                ),
                              ),
                            ),
                          ),
                        if (onRepondre != null && signalable)
                          const SizedBox(width: 16),
                        if (signalable)
                          InkWell(
                            onTap: () => signalerContenu(
                              context,
                              type: TypeContenuSignale.commentairePost,
                              contenuId: commentaire.id,
                              auteurNom: commentaire.auteurNom,
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Text(
                                'Signaler',
                                style: TextStyle(
                                  color: scheme.outline,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12.5,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String nom;
  final double taille;
  const _Avatar({required this.nom, this.taille = 40});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: taille / 2,
      backgroundColor: couleurAvatar(nom),
      child: Text(
        initiales(nom),
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: taille / 2.8,
        ),
      ),
    );
  }
}

/// Badge de rôle (Admin / Formateur).
class _RoleBadge extends StatelessWidget {
  final String role;
  final bool petit;
  const _RoleBadge({required this.role, this.petit = false});

  @override
  Widget build(BuildContext context) {
    if (role != 'Admin' && role != 'Formateur') {
      return const SizedBox.shrink();
    }
    final couleur = role == 'Admin'
        ? const Color(0xFF059669)
        : const Color(0xFFD97706);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: petit ? 6 : 8, vertical: 2),
      decoration: BoxDecoration(
        color: couleur.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        role,
        style: TextStyle(
          color: couleur,
          fontSize: petit ? 10 : 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

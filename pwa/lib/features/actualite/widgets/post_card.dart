import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/utils/avatar.dart';
import '../../../core/utils/document_downloader.dart';
import '../../../core/utils/format.dart';
import '../../../data/repositories/actualite_repository.dart';
import '../../../models/post.dart';
import '../../../widgets/texte_avec_liens.dart';
import 'actions_post.dart';
import 'medias_post.dart';

/// Carte affichant un post du fil d'actualité, avec les boutons
/// "j'aime", "commenter" et "partager".
class PostCard extends StatefulWidget {
  final Post post;

  const PostCard({super.key, required this.post});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late bool _aime = widget.post.aime;
  late int _likes = widget.post.likes;

  void _basculerLike() {
    setState(() {
      _aime = !_aime;
      _likes += _aime ? 1 : -1;
    });
    final repo = context.read<ActualiteRepository>();
    if (_aime) {
      repo.likerPost(widget.post.id);
    } else {
      repo.unlikerPost(widget.post.id);
    }
  }

  void _ouvrirDetail() => context.push('/post/${widget.post.id}');

  void _partagerPost() {
    final postUrl = 'https://sahel-academy-verif.vercel.app/app/post/${widget.post.id}';
    final text = '${widget.post.auteurNom} sur Sahel Academy :\n\n${widget.post.contenu}\n\n👉 $postUrl';
    // ignore: deprecated_member_use
    Share.share(text, subject: 'Publication de ${widget.post.auteurNom}');
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 8, 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- En-tête : auteur, rôle, date ----
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: couleurAvatar(post.auteurNom),
                  child: Text(
                    initiales(post.auteurNom),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              post.auteurNom,
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          _RoleBadge(role: post.auteurRole),
                        ],
                      ),
                      Text(
                        tempsEcoule(post.date),
                        style: TextStyle(color: scheme.outline, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // ---- Contenu (avec liens cliquables) ----
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TexteAvecLiens(
                post.contenu,
                style: const TextStyle(height: 1.4),
              ),
            ),

            // ---- Médias joints (photos, vidéos, audios) ----
            if (post.medias.isNotEmpty) ...[
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: MediasPostWidget(medias: post.medias),
              ),
            ],

            // ---- Document joint (optionnel) ----
            if (post.documentNom != null) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _DocumentTile(nom: post.documentNom!),
              ),
            ],

            // ---- Boutons d'action (redirection) ----
            if (post.actions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ActionsPost(actions: post.actions),
              ),
            ],

            const SizedBox(height: 4),
            const Divider(height: 18),

            // ---- Barre d'actions ----
            Row(
              children: [
                _ActionButton(
                  icon: _aime ? Icons.favorite : Icons.favorite_border,
                  label: '$_likes',
                  color: _aime ? Colors.red : null,
                  onTap: _basculerLike,
                ),
                _ActionButton(
                  icon: Icons.mode_comment_outlined,
                  label: '${post.nbCommentaires}',
                  onTap: _ouvrirDetail,
                ),
                const Spacer(),
                _ActionButton(
                  icon: Icons.share_outlined,
                  label: 'Partager',
                  onTap: _partagerPost,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Petit badge coloré indiquant le rôle de l'auteur (Admin / Formateur).
class _RoleBadge extends StatelessWidget {
  final String role;
  const _RoleBadge({required this.role});

  @override
  Widget build(BuildContext context) {
    if (role != 'Admin' && role != 'Formateur') {
      return const SizedBox.shrink();
    }
    final estAdmin = role == 'Admin';
    final couleur =
        estAdmin ? const Color(0xFF059669) : const Color(0xFFD97706);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: couleur.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        role,
        style: TextStyle(
          color: couleur,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Encadré représentant un document téléchargeable.
class _DocumentTile extends StatefulWidget {
  final String nom;
  const _DocumentTile({required this.nom});

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
    final existe = await DocumentDownloader.estEnCacheLocal(widget.nom);
    if (mounted) setState(() => _estEnLocal = existe);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final info = DocumentDownloader.analyserDocument(widget.nom);
    final nomAffiche = info['nom']!;

    return InkWell(
      onTap: _enChargement
          ? null
          : () async {
              await DocumentDownloader.telechargerEtOuvrir(
                context,
                widget.nom,
                afficherModale: false,
                onLoadingStateChanged: (enCours) {
                  if (mounted) setState(() => _enChargement = enCours);
                },
              );
              _verifierCache();
            },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _estEnLocal
                ? const Color(0xFF059669).withValues(alpha: 0.3)
                : scheme.outlineVariant,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _estEnLocal
                    ? const Color(0xFF059669).withValues(alpha: 0.12)
                    : scheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _estEnLocal ? Icons.folder_open_rounded : Icons.description,
                color: _estEnLocal ? const Color(0xFF059669) : scheme.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    nomAffiche,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _enChargement
                        ? 'Téléchargement...'
                        : (_estEnLocal
                            ? 'Fichier local · Appuie pour ouvrir'
                            : 'Appuie pour télécharger et ouvrir'),
                    style: TextStyle(
                      color: _enChargement || _estEnLocal
                          ? (_estEnLocal ? const Color(0xFF059669) : scheme.primary)
                          : scheme.outline,
                      fontSize: 11,
                      fontWeight: _enChargement || _estEnLocal
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _buildRightButton(scheme),
          ],
        ),
      ),
    );
  }

  Widget _buildRightButton(ColorScheme scheme) {
    if (_enChargement) {
      return SizedBox(
        width: 20,
        height: 20,
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
        size: 22,
      );
    }
    return Icon(
      Icons.download_for_offline_outlined,
      color: scheme.primary,
      size: 22,
    );
  }
}

/// Bouton d'action (like / commenter / partager).
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 20, color: color),
      label: Text(label, style: TextStyle(color: color)),
      style: TextButton.styleFrom(
        foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}

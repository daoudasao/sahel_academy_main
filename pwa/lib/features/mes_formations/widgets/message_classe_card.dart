import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/avatar.dart';
import '../../../core/utils/document_downloader.dart';
import '../../../core/utils/format.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/classe_repository.dart';
import '../../../models/classe_message.dart';
import '../classe_message_detail_screen.dart';

/// Carte d'un message du formateur ou élève, avec ses commentaires et un champ
/// pour répondre.
class MessageClasseCard extends StatefulWidget {
  final ClasseMessage message;

  const MessageClasseCard({super.key, required this.message});

  @override
  State<MessageClasseCard> createState() => _MessageClasseCardState();
}

class _MessageClasseCardState extends State<MessageClasseCard> {
  final _controller = TextEditingController();

  void _ouvrirDetail(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ClasseMessageDetailScreen(
          formationId: widget.message.formationId,
          messageId: widget.message.id,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _envoyer() {
    final texte = _controller.text.trim();
    if (texte.isEmpty) return;
    final auth = context.read<AuthRepository>();
    context.read<ClasseRepository>().ajouterCommentaire(
          formationId: widget.message.formationId,
          messageId: widget.message.id,
          auteurNom: auth.utilisateur?.nom ?? 'Moi',
          contenu: texte,
        );
    _controller.clear();
    FocusScope.of(context).unfocus();
  }

  void _confirmerSuppression(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer l\'annonce ?'),
        content: const Text(
          'Voulez-vous vraiment supprimer cette annonce et ses commentaires ?',
        ),
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
                await context.read<ClasseRepository>().supprimerMessage(
                      formationId: widget.message.formationId,
                      messageId: widget.message.id,
                    );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Annonce supprimée')),
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

  @override
  Widget build(BuildContext context) {
    final message = widget.message;
    final scheme = Theme.of(context).colorScheme;
    final authUser = context.watch<AuthRepository>().utilisateur;
    final classeRepo = context.watch<ClasseRepository>();
    final estMonMessage = authUser != null &&
        authUser.nom.trim().toLowerCase() ==
            message.auteurNom.trim().toLowerCase();
    final peutSupprimer = classeRepo.estFormateurDe(message.formationId) ||
        (authUser?.estFormateur == true) ||
        estMonMessage;
    final moi = authUser?.nom ?? 'Moi';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- En-tête auteur ----
            Row(
              children: [
                _Avatar(nom: message.auteurNom),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(message.auteurNom,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(width: 6),
                          _BadgeRole(role: message.auteurRole),
                        ],
                      ),
                      Text(tempsEcoule(message.date),
                          style:
                              TextStyle(color: scheme.outline, fontSize: 12)),
                    ],
                  ),
                ),
                if (peutSupprimer)
                  IconButton(
                    icon: Icon(Icons.delete_outline_rounded,
                        size: 20, color: scheme.outline),
                    tooltip: 'Supprimer l\'annonce',
                    onPressed: () => _confirmerSuppression(context),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text(message.contenu, style: const TextStyle(height: 1.45)),

            if (message.documentNom != null) ...[
              const SizedBox(height: 12),
              _DocumentJoint(nom: message.documentNom!),
            ],

            const Divider(height: 22),

            // ---- Commentaires (uniquement le dernier + lien vers la page de détail) ----
            if (message.commentaires.isEmpty) ...[
              InkWell(
                onTap: () => _ouvrirDetail(context),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(Icons.chat_bubble_outline_rounded,
                          size: 15, color: scheme.outline),
                      const SizedBox(width: 6),
                      Text(
                        '0 réponse · Appuyez pour répondre',
                        style: TextStyle(
                          color: scheme.outline,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              if (message.commentaires.length > 1)
                InkWell(
                  onTap: () => _ouvrirDetail(context),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 7),
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.forum_outlined,
                            size: 16, color: scheme.primary),
                        const SizedBox(width: 8),
                        Text(
                          'Voir les ${message.commentaires.length} réponses',
                          style: TextStyle(
                            color: scheme.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5,
                          ),
                        ),
                        const Spacer(),
                        Icon(Icons.arrow_forward_ios_rounded,
                            size: 12, color: scheme.primary),
                      ],
                    ),
                  ),
                )
              else
                InkWell(
                  onTap: () => _ouvrirDetail(context),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Icon(Icons.chat_bubble_outline_rounded,
                            size: 14, color: scheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          '1 réponse dans la discussion',
                          style: TextStyle(
                            color: scheme.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Spacer(),
                        Icon(Icons.arrow_forward_ios_rounded,
                            size: 11, color: scheme.primary),
                      ],
                    ),
                  ),
                ),

              // Affiche UNIQUEMENT la dernière réponse sous le message
              _CommentaireLigne(message.commentaires.last),
            ],

            const SizedBox(height: 10),

            // ---- Champ de réponse rapide ----
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _Avatar(nom: moi, taille: 32),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _envoyer(),
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: 'Ajouter une réponse…',
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
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
                  onPressed: _envoyer,
                  icon: Icon(Icons.send_rounded, color: scheme.primary),
                  tooltip: 'Envoyer',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Ligne d'un commentaire.
class _CommentaireLigne extends StatelessWidget {
  final Commentaire commentaire;
  const _CommentaireLigne(this.commentaire);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Avatar(nom: commentaire.auteurNom, taille: 32),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(commentaire.auteurNom,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 13)),
                      ),
                      const SizedBox(width: 6),
                      _BadgeRole(role: commentaire.auteurRole, petit: true),
                      const SizedBox(width: 6),
                      Text(tempsEcoule(commentaire.date),
                          style:
                              TextStyle(color: scheme.outline, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(commentaire.contenu,
                      style: const TextStyle(fontSize: 13.5, height: 1.35)),
                ],
              ),
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

class _BadgeRole extends StatelessWidget {
  final String role;
  final bool petit;
  const _BadgeRole({required this.role, this.petit = false});

  @override
  Widget build(BuildContext context) {
    final r = role.trim().toLowerCase();
    Color bg;
    Color fg;
    String label;

    if (r.contains('formateur') || r.contains('prof')) {
      bg = const Color(0xFFD97706).withValues(alpha: 0.14);
      fg = const Color(0xFF7C2D12);
      label = 'Formateur';
    } else if (r.contains('admin') ||
        r.contains('équipe') ||
        r.contains('equipe') ||
        r.contains('staff')) {
      bg = const Color(0xFF4F46E5).withValues(alpha: 0.14);
      fg = const Color(0xFF4338CA);
      label = 'Équipe';
    } else {
      bg = Colors.grey.withValues(alpha: 0.12);
      fg = Colors.blueGrey.shade700;
      label = 'Élève';
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: petit ? 6 : 8,
        vertical: petit ? 1.5 : 2,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: petit ? 10 : 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DocumentJoint extends StatefulWidget {
  final String nom;
  const _DocumentJoint({required this.nom});

  @override
  State<_DocumentJoint> createState() => _DocumentJointState();
}

class _DocumentJointState extends State<_DocumentJoint> {
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

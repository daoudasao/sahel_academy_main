import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/avatar.dart';
import '../../core/utils/document_downloader.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/classe_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../models/classe_message.dart';
import '../../widgets/signaler_contenu.dart';

/// Écran de détail d'un message de classe (Google Classroom thread),
/// affichant l'intégralité du message, toutes les réponses et une zone
/// de saisie pour participer à la discussion.
class ClasseMessageDetailScreen extends StatefulWidget {
  final String formationId;
  final String messageId;

  const ClasseMessageDetailScreen({
    super.key,
    required this.formationId,
    required this.messageId,
  });

  @override
  State<ClasseMessageDetailScreen> createState() =>
      _ClasseMessageDetailScreenState();
}

class _ClasseMessageDetailScreenState extends State<ClasseMessageDetailScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _enEnvoi = false;

  /// Vrai tant que la classe n'a pas été rechargée à l'ouverture.
  bool _rechargement = true;

  @override
  void initState() {
    super.initState();
    // Ouvert depuis une notification, le message (ou sa dernière réponse)
    // n'est pas forcément en mémoire : on recharge la classe.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await context.read<ClasseRepository>().chargerContenu(
        widget.formationId,
        forcer: true,
      );
      if (mounted) setState(() => _rechargement = false);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _envoyer() async {
    final texte = _controller.text.trim();
    if (texte.isEmpty || _enEnvoi) return;

    final auth = context.read<AuthRepository>();
    final moi = auth.utilisateur?.nom ?? 'Moi';

    FocusScope.of(context).unfocus();
    setState(() => _enEnvoi = true);
    try {
      await context.read<ClasseRepository>().ajouterCommentaire(
        formationId: widget.formationId,
        messageId: widget.messageId,
        auteurNom: moi,
        contenu: texte,
      );
      _controller.clear();

      // Faire défiler jusqu'en bas pour voir la nouvelle réponse
      await Future.delayed(const Duration(milliseconds: 150));
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erreur lors de l\'envoi : $e')));
      }
    } finally {
      if (mounted) setState(() => _enEnvoi = false);
    }
  }

  void _confirmerSuppression(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce message ?'),
        content: const Text(
          'Voulez-vous vraiment supprimer ce message et toutes ses réponses ?',
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
                  formationId: widget.formationId,
                  messageId: widget.messageId,
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Message supprimé')),
                  );
                  Navigator.of(context).pop();
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
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
    final scheme = Theme.of(context).colorScheme;
    final authUser = context.watch<AuthRepository>().utilisateur;
    final classeRepo = context.watch<ClasseRepository>();
    final formation = context.read<FormationRepository>().getFormationParId(
      widget.formationId,
    );

    final messages = classeRepo.messages(widget.formationId);
    final messageIndex = messages.indexWhere((m) => m.id == widget.messageId);

    if (messageIndex == -1 &&
        (_rechargement ||
            classeRepo.contenuEnChargement(widget.formationId) ||
            !classeRepo.contenuCharge(widget.formationId))) {
      final erreur = _rechargement
          ? null
          : classeRepo.contenuErreur(widget.formationId);
      return Scaffold(
        appBar: AppBar(title: const Text('Discussion')),
        body: Center(
          child: erreur == null
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Impossible de charger la discussion.'),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => classeRepo.chargerContenu(
                        widget.formationId,
                        forcer: true,
                      ),
                      child: const Text('Réessayer'),
                    ),
                  ],
                ),
        ),
      );
    }

    if (messageIndex == -1) {
      return Scaffold(
        appBar: AppBar(title: const Text('Discussion')),
        body: const Center(child: Text('Message introuvable ou supprimé.')),
      );
    }

    final message = messages[messageIndex];
    final estMonMessage =
        authUser != null &&
        authUser.nom.trim().toLowerCase() ==
            message.auteurNom.trim().toLowerCase();
    final peutSupprimer =
        classeRepo.estFormateurDe(widget.formationId) ||
        (authUser?.estFormateur == true) ||
        estMonMessage;

    final moi = authUser?.nom ?? 'Moi';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Discussion',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (formation != null)
              Text(
                formation.titre,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.normal,
                ),
              ),
          ],
        ),
        actions: [
          if (peutSignaler(
            context,
            auteurId: message.auteurId,
            auteurNom: message.auteurNom,
            auteurRole: message.auteurRole,
          ))
            IconButton(
              icon: const Icon(Icons.flag_outlined),
              tooltip: 'Signaler le message',
              onPressed: () => signalerContenu(
                context,
                type: TypeContenuSignale.messageClasse,
                contenuId: message.id,
                auteurNom: message.auteurNom,
              ),
            ),
          if (peutSupprimer)
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded),
              tooltip: 'Supprimer le message',
              onPressed: () => _confirmerSuppression(context),
            ),
        ],
      ),
      body: Column(
        children: [
          // Liste défilante contenant le message principal + toutes les réponses
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                // Carte du message d'origine
                _CarteMessagePrincipal(message: message, scheme: scheme),

                const SizedBox(height: 16),

                // En-tête de section des réponses
                Row(
                  children: [
                    Icon(Icons.forum_outlined, size: 18, color: scheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Réponses (${message.commentaires.length})',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: scheme.onSurface,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Liste de tous les commentaires
                if (message.commentaires.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    alignment: Alignment.center,
                    child: Text(
                      'Aucune réponse pour l\'instant.\nSoyez le premier à répondre !',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: scheme.outline,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  )
                else
                  for (final c in message.commentaires)
                    _ItemReponse(commentaire: c, scheme: scheme),

                const SizedBox(height: 24),
              ],
            ),
          ),

          // Barre fixe de saisie de réponse en bas
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  offset: const Offset(0, -2),
                  blurRadius: 6,
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 17,
                    backgroundColor: couleurAvatar(moi),
                    child: Text(
                      initiales(moi),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ),
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
                        hintText: 'Ajouter une réponse...',
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
                  const SizedBox(width: 6),
                  IconButton(
                    onPressed: _enEnvoi ? null : _envoyer,
                    icon: _enEnvoi
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(Icons.send_rounded, color: scheme.primary),
                    tooltip: 'Envoyer',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Carte élégante affichant le message principal de discussion.
class _CarteMessagePrincipal extends StatelessWidget {
  final ClasseMessage message;
  final ColorScheme scheme;

  const _CarteMessagePrincipal({required this.message, required this.scheme});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: couleurAvatar(message.auteurNom),
                child: Text(
                  initiales(message.auteurNom),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            message.auteurNom,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        _BadgeRoleAuteur(role: message.auteurRole),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tempsEcoule(message.date),
                      style: TextStyle(color: scheme.outline, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SelectableText(
            message.contenu,
            style: const TextStyle(fontSize: 14.5, height: 1.45),
          ),
          if (message.documentNom != null) ...[
            const SizedBox(height: 14),
            _DocumentJointElement(nom: message.documentNom!),
          ],
        ],
      ),
    );
  }
}

/// Affiche une réponse dans la liste des commentaires.
class _ItemReponse extends StatelessWidget {
  final Commentaire commentaire;
  final ColorScheme scheme;

  const _ItemReponse({required this.commentaire, required this.scheme});

  void _signaler(BuildContext context) => signalerContenu(
    context,
    type: TypeContenuSignale.commentaireClasse,
    contenuId: commentaire.id,
    auteurNom: commentaire.auteurNom,
  );

  @override
  Widget build(BuildContext context) {
    final signalable = peutSignaler(
      context,
      auteurId: commentaire.auteurId,
      auteurNom: commentaire.auteurNom,
      auteurRole: commentaire.auteurRole,
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 17,
            backgroundColor: couleurAvatar(commentaire.auteurNom),
            child: Text(
              initiales(commentaire.auteurNom),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onLongPress: signalable ? () => _signaler(context) : null,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest.withValues(
                        alpha: 0.5,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: scheme.outlineVariant.withValues(alpha: 0.3),
                      ),
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
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            _BadgeRoleAuteur(
                              role: commentaire.auteurRole,
                              petit: true,
                            ),
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
                        const SizedBox(height: 4),
                        SelectableText(
                          commentaire.contenu,
                          style: const TextStyle(fontSize: 13.5, height: 1.35),
                        ),
                      ],
                    ),
                  ),
                ),
                if (signalable)
                  InkWell(
                    onTap: () => _signaler(context),
                    child: Padding(
                      padding: const EdgeInsets.only(
                        left: 4,
                        top: 4,
                        bottom: 2,
                      ),
                      child: Text(
                        'Signaler',
                        style: TextStyle(
                          color: scheme.outline,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
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

/// Badge adaptable au rôle de l'auteur (Formateur, Équipe, Élève).
class _BadgeRoleAuteur extends StatelessWidget {
  final String role;
  final bool petit;

  const _BadgeRoleAuteur({required this.role, this.petit = false});

  @override
  Widget build(BuildContext context) {
    final r = role.trim().toLowerCase();
    Color bg;
    Color fg;
    String label;

    if (r.contains('formateur') || r.contains('prof')) {
      bg = const Color(0xFFD97706).withValues(alpha: 0.15);
      fg = const Color(0xFFB45309);
      label = 'Formateur';
    } else if (r.contains('admin') ||
        r.contains('équipe') ||
        r.contains('equipe') ||
        r.contains('staff')) {
      bg = const Color(0xFF4F46E5).withValues(alpha: 0.15);
      fg = const Color(0xFF4338CA);
      label = 'Équipe';
    } else {
      bg = Colors.grey.withValues(alpha: 0.12);
      fg = Colors.blueGrey.shade700;
      label = 'Élève';
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: petit ? 6 : 8, vertical: 1.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
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

/// Élément de pièce jointe réutilisable avec téléchargement et ouverture.
class _DocumentJointElement extends StatefulWidget {
  final String nom;
  const _DocumentJointElement({required this.nom});

  @override
  State<_DocumentJointElement> createState() => _DocumentJointElementState();
}

class _DocumentJointElementState extends State<_DocumentJointElement> {
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
                              ? 'Fichier local · Appuyer pour ouvrir'
                              : 'Appuyer pour télécharger et ouvrir'),
                    style: TextStyle(
                      color: _enChargement || _estEnLocal
                          ? (_estEnLocal
                                ? const Color(0xFF059669)
                                : scheme.primary)
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
            if (_enChargement)
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(scheme.primary),
                ),
              )
            else if (_estEnLocal)
              const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF059669),
                size: 22,
              )
            else
              Icon(
                Icons.download_for_offline_outlined,
                color: scheme.primary,
                size: 22,
              ),
          ],
        ),
      ),
    );
  }
}

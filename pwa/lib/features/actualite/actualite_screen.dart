import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../data/repositories/actualite_repository.dart';
import '../../data/repositories/notification_repository.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/info_page_sheet.dart';
import 'widgets/post_card.dart';

/// Fil d'actualité : la page d'accueil de l'application.
/// Remplace les groupes / diffusions WhatsApp : on publie une fois, tout
/// le monde voit l'information ici.
class ActualiteScreen extends StatelessWidget {
  const ActualiteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<ActualiteRepository>();
    final posts = repo.getPosts();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            const BrandLogo(height: 30),
            const SizedBox(width: 10),
            const Text('Sahel Academy'),
          ],
        ),
        actions: [
          IconButton.filledTonal(
            onPressed: () => afficherInfoPage(
              context: context,
              titre: 'Fil d\'actualités',
              description:
                  'Le fil d\'actualité centralise toutes les annonces officielles, nouveautés et opportunités de Sahel Academy.',
              points: [
                (
                  Icons.newspaper,
                  'Annonces officielles',
                  'Consultez les textes, photos et vidéos de l\'administration et des formateurs.',
                ),
                (
                  Icons.download,
                  'Fichiers joints',
                  'Téléchargez directement les documents sur votre téléphone et ouvrez-les avec vos applications.',
                ),
                (
                  Icons.touch_app,
                  'Boutons d\'action',
                  'Utilisez les boutons au bas des annonces pour accéder directement aux bourses ou candidatures.',
                ),
              ],
            ),
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Comment fonctionne cette page ?',
          ),
          const SizedBox(width: 6),
          Builder(
            builder: (context) {
              final nonLues = context.watch<NotificationRepository>().nonLues;
              return Badge.count(
                count: nonLues,
                isLabelVisible: nonLues > 0,
                child: IconButton.filledTonal(
                  onPressed: () => context.push('/notifications'),
                  icon: const Icon(Icons.notifications_none_rounded),
                  tooltip: 'Notifications',
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _corps(context, repo, posts, scheme),
    );
  }

  Widget _corps(
    BuildContext context,
    ActualiteRepository repo,
    List posts,
    ColorScheme scheme,
  ) {
    // Premier chargement en cours (aucune donnée encore).
    if (repo.enChargement && posts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    // Erreur au premier chargement (aucune donnée à montrer).
    if (repo.erreur != null && posts.isEmpty) {
      return ErreurChargement(
        onRetry: () =>
            context.read<ActualiteRepository>().charger(forcer: true),
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          context.read<ActualiteRepository>().charger(forcer: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 8, bottom: 12),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
            child: Text(
              'Actualité',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: scheme.onSurface,
              ),
            ),
          ),
          if (posts.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 40, 20, 20),
              child: Center(
                child: Text(
                  'Aucune publication pour le moment.',
                  style: TextStyle(color: scheme.outline),
                ),
              ),
            )
          else
            for (final post in posts) PostCard(post: post),
        ],
      ),
    );
  }
}

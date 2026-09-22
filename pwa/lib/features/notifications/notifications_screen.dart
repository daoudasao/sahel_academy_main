import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/notification_repository.dart';
import '../../models/notification_item.dart';
import '../../widgets/erreur_chargement.dart';

/// Style et étiquette associés au type de notification.
({Color couleur, IconData icone, String label}) styleType(
  TypeNotification type,
) {
  switch (type) {
    case TypeNotification.actualite:
      return (
        couleur: const Color(0xFF059669),
        icone: Icons.campaign_rounded,
        label: 'Annonce',
      );
    case TypeNotification.paiement:
      return (
        couleur: const Color(0xFFD97706),
        icone: Icons.account_balance_wallet_rounded,
        label: 'Paiement',
      );
    case TypeNotification.classe:
      return (
        couleur: const Color(0xFF4F46E5),
        icone: Icons.menu_book_rounded,
        label: 'Classe',
      );
    case TypeNotification.commentaire:
      return (
        couleur: const Color(0xFF0D9488),
        icone: Icons.forum_rounded,
        label: 'Discussion',
      );
    case TypeNotification.systeme:
      return (
        couleur: const Color(0xFF7C3AED),
        icone: Icons.auto_awesome_rounded,
        label: 'Système',
      );
  }
}

/// Énumération des filtres de recherche.
enum FiltreNotification { tout, nonLues, classes, paiements, annonces }

/// Centre de notifications moderne et interactif.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  FiltreNotification _filtreActif = FiltreNotification.tout;

  List<NotificationItem> _filtrerNotifications(List<NotificationItem> items) {
    switch (_filtreActif) {
      case FiltreNotification.tout:
        return items;
      case FiltreNotification.nonLues:
        return items.where((n) => !n.lu).toList();
      case FiltreNotification.classes:
        return items
            .where(
              (n) =>
                  n.type == TypeNotification.classe ||
                  n.type == TypeNotification.commentaire,
            )
            .toList();
      case FiltreNotification.paiements:
        return items.where((n) => n.type == TypeNotification.paiement).toList();
      case FiltreNotification.annonces:
        return items
            .where(
              (n) =>
                  n.type == TypeNotification.actualite ||
                  n.type == TypeNotification.systeme,
            )
            .toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<NotificationRepository>();
    final allItems = repo.items;
    final filteredItems = _filtrerNotifications(allItems);
    final nonLuesCount = repo.nonLues;
    final scheme = Theme.of(context).colorScheme;

    // Séparer les notifications en Récents (< 24h) et Précédents (>= 24h)
    final maintenant = DateTime.now();
    final recents = filteredItems
        .where((n) => maintenant.difference(n.date).inHours < 24)
        .toList();
    final precedents = filteredItems
        .where((n) => maintenant.difference(n.date).inHours >= 24)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (nonLuesCount > 0) ...[
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: AppColors.emeraldContainer,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.emerald.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  '$nonLuesCount non lue${nonLuesCount > 1 ? "s" : ""}',
                  style: const TextStyle(
                    color: AppColors.emeraldDark,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Options',
            icon: const Icon(Icons.more_vert_rounded),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            onSelected: (value) {
              if (value == 'tout_lire') {
                context.read<NotificationRepository>().toutMarquerLu();
              } else if (value == 'effacer_tout') {
                _confirmerToutEffacer(context);
              }
            },
            itemBuilder: (context) => [
              if (nonLuesCount > 0)
                const PopupMenuItem(
                  value: 'tout_lire',
                  child: Row(
                    children: [
                      Icon(Icons.done_all_rounded, size: 20),
                      SizedBox(width: 12),
                      Text('Tout marquer comme lu'),
                    ],
                  ),
                ),
              if (allItems.isNotEmpty)
                const PopupMenuItem(
                  value: 'effacer_tout',
                  child: Row(
                    children: [
                      Icon(
                        Icons.delete_sweep_rounded,
                        size: 20,
                        color: Colors.redAccent,
                      ),
                      SizedBox(width: 12),
                      Text(
                        'Tout effacer',
                        style: TextStyle(color: Colors.redAccent),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: (repo.enChargement && allItems.isEmpty)
          ? const Center(child: CircularProgressIndicator())
          : (repo.erreur != null && allItems.isEmpty)
          ? ErreurChargement(
              onRetry: () =>
                  context.read<NotificationRepository>().charger(forcer: true),
            )
          : Column(
              children: [
                // Barre de filtres défilante
                _buildFilterBar(allItems),
                const SizedBox(height: 8),

                // Liste des notifications ou Écran vide
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () => context
                        .read<NotificationRepository>()
                        .charger(forcer: true),
                    child: filteredItems.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [_buildEmptyState(context, scheme)],
                          )
                        : ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                            children: [
                              if (recents.isNotEmpty) ...[
                                _buildSectionHeader(
                                  'Aujourd\'hui',
                                  recents.length,
                                ),
                                const SizedBox(height: 8),
                                ...recents.map(
                                  (notif) => _NotifCard(notif: notif),
                                ),
                                const SizedBox(height: 16),
                              ],
                              if (precedents.isNotEmpty) ...[
                                _buildSectionHeader(
                                  'Plus ancien',
                                  precedents.length,
                                ),
                                const SizedBox(height: 8),
                                ...precedents.map(
                                  (notif) => _NotifCard(notif: notif),
                                ),
                              ],
                            ],
                          ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterBar(List<NotificationItem> allItems) {
    final nonLues = allItems.where((n) => !n.lu).length;
    final classes = allItems
        .where(
          (n) =>
              n.type == TypeNotification.classe ||
              n.type == TypeNotification.commentaire,
        )
        .length;
    final paiements = allItems
        .where((n) => n.type == TypeNotification.paiement)
        .length;
    final annonces = allItems
        .where(
          (n) =>
              n.type == TypeNotification.actualite ||
              n.type == TypeNotification.systeme,
        )
        .length;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          _buildFilterChip('Toutes', allItems.length, FiltreNotification.tout),
          const SizedBox(width: 8),
          _buildFilterChip('Non lues', nonLues, FiltreNotification.nonLues),
          const SizedBox(width: 8),
          _buildFilterChip('Classes', classes, FiltreNotification.classes),
          const SizedBox(width: 8),
          _buildFilterChip(
            'Paiements',
            paiements,
            FiltreNotification.paiements,
          ),
          const SizedBox(width: 8),
          _buildFilterChip('Annonces', annonces, FiltreNotification.annonces),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, int count, FiltreNotification filtre) {
    final isSelected = _filtreActif == filtre;
    final scheme = Theme.of(context).colorScheme;

    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.25)
                    : scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : scheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ],
      ),
      onSelected: (_) {
        setState(() {
          _filtreActif = filtre;
        });
      },
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(left: 4, top: 4, bottom: 4),
      child: Row(
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: scheme.outline,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Divider(color: scheme.outlineVariant.withValues(alpha: 0.5)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, ColorScheme scheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.emeraldContainer.withValues(alpha: 0.4),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                size: 56,
                color: AppColors.emerald,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              _filtreActif == FiltreNotification.tout
                  ? 'Aucune notification'
                  : 'Aucun résultat pour ce filtre',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: scheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _filtreActif == FiltreNotification.tout
                  ? 'Vous êtes à jour ! Les nouvelles notifications sur vos cours, devoirs et paiements apparaîtront ici.'
                  : 'Essayez de sélectionner un autre filtre ci-dessus.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: scheme.outline,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmerToutEffacer(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Effacer les notifications ?'),
        content: const Text(
          'Toutes vos notifications seront supprimées de la liste.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              context.read<NotificationRepository>().effacerTout();
              Navigator.pop(ctx);
            },
            child: const Text('Effacer'),
          ),
        ],
      ),
    );
  }
}

/// Carte de notification individuelle avec gestes de suppression et styling premium.
class _NotifCard extends StatelessWidget {
  final NotificationItem notif;
  const _NotifCard({required this.notif});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final s = styleType(notif.type);

    return Dismissible(
      key: Key(notif.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        context.read<NotificationRepository>().supprimer(notif.id);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Notification "${notif.titre}" supprimée.'),
            action: SnackBarAction(label: 'OK', onPressed: () {}),
          ),
        );
      },
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.only(right: 20),
        alignment: Alignment.centerRight,
        decoration: BoxDecoration(
          color: Colors.redAccent.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: Colors.redAccent,
          size: 26,
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: notif.lu
              ? AppColors.surface
              : s.couleur.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: notif.lu
                ? scheme.outlineVariant.withValues(alpha: 0.6)
                : s.couleur.withValues(alpha: 0.3),
            width: notif.lu ? 1 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: notif.lu ? 0.02 : 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () {
              context.read<NotificationRepository>().marquerLu(notif.id);
              final route = notif.route;
              if (route != null) {
                context.push(route);
              }
            },
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Témoin d'état non lu (Bandeau vertical luminescent)
                  if (!notif.lu)
                    Container(
                      width: 4,
                      height: 48,
                      margin: const EdgeInsets.only(right: 12),
                      decoration: BoxDecoration(
                        color: s.couleur,
                        borderRadius: BorderRadius.circular(4),
                        boxShadow: [
                          BoxShadow(
                            color: s.couleur.withValues(alpha: 0.5),
                            blurRadius: 6,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                    ),

                  // Icône thématique de la catégorie
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: s.couleur.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(s.icone, color: s.couleur, size: 24),
                  ),
                  const SizedBox(width: 14),

                  // Contenu texte
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // En-tête : Badge type + Temps écoulé
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: s.couleur.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                s.label.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: s.couleur,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                            Text(
                              tempsEcoule(notif.date),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: scheme.outline,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),

                        // Titre de la notification
                        Text(
                          notif.titre,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: notif.lu
                                ? FontWeight.w700
                                : FontWeight.w800,
                            color: scheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),

                        // Message de la notification
                        Text(
                          notif.message,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: scheme.onSurfaceVariant,
                            height: 1.35,
                          ),
                        ),

                        // Bouton d'action si destination associée
                        if (notif.route != null) ...[
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: scheme.surfaceContainerHighest
                                      .withValues(alpha: 0.7),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Consulter',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: scheme.primary,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Icon(
                                      Icons.arrow_forward_rounded,
                                      size: 14,
                                      color: scheme.primary,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

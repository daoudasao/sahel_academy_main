import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../data/repositories/notification_repository.dart';
import '../../widgets/alerte_modale_dialog.dart';
import 'floating_support_button.dart';

/// Onglets de l'espace élève.
const ongletsEleve = <NavigationDestination>[
  NavigationDestination(
    icon: Icon(Icons.dynamic_feed_outlined),
    selectedIcon: Icon(Icons.dynamic_feed),
    label: 'Actualité',
  ),
  NavigationDestination(
    icon: Icon(Icons.school_outlined),
    selectedIcon: Icon(Icons.school),
    label: 'Formations',
  ),
  NavigationDestination(
    icon: Icon(Icons.menu_book_outlined),
    selectedIcon: Icon(Icons.menu_book),
    label: 'Mes cours',
  ),
  NavigationDestination(
    icon: Icon(Icons.card_giftcard_outlined),
    selectedIcon: Icon(Icons.card_giftcard),
    label: 'Bourses',
  ),
  NavigationDestination(
    icon: Icon(Icons.person_outline),
    selectedIcon: Icon(Icons.person),
    label: 'Profil',
  ),
];

/// Onglets de l'espace formateur.
const ongletsFormateur = <NavigationDestination>[
  NavigationDestination(
    icon: Icon(Icons.dashboard_outlined),
    selectedIcon: Icon(Icons.dashboard),
    label: 'Accueil',
  ),
  NavigationDestination(
    icon: Icon(Icons.co_present_outlined),
    selectedIcon: Icon(Icons.co_present),
    label: 'Mes classes',
  ),
  NavigationDestination(
    icon: Icon(Icons.dynamic_feed_outlined),
    selectedIcon: Icon(Icons.dynamic_feed),
    label: 'Actualité',
  ),
  NavigationDestination(
    icon: Icon(Icons.account_balance_wallet_outlined),
    selectedIcon: Icon(Icons.account_balance_wallet),
    label: 'Revenus',
  ),
  NavigationDestination(
    icon: Icon(Icons.person_outline),
    selectedIcon: Icon(Icons.person),
    label: 'Profil',
  ),
];

/// Ossature principale de l'application : affiche l'onglet courant
/// et la barre de navigation du bas (élève ou formateur selon [onglets]).
class MainShell extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  final List<NavigationDestination> onglets;

  const MainShell({
    super.key,
    required this.navigationShell,
    this.onglets = ongletsEleve,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  static final Set<String> _alertesVuesDansLaSession = <String>{};
  bool _verificationEnCours = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _verifierAlertesUrgentes();
    });
  }

  Future<void> _verifierAlertesUrgentes() async {
    if (!mounted || _verificationEnCours) return;
    _verificationEnCours = true;

    try {
      final notifRepo = context.read<NotificationRepository>();
      final alertes = await notifRepo.getAlertesUrgentes();
      if (!mounted) return;

      final aAfficher = alertes
          .where((a) => !_alertesVuesDansLaSession.contains(a.id))
          .toList();

      if (aAfficher.isNotEmpty && mounted) {
        await AlerteModaleDialog.afficher(
          context,
          aAfficher,
          onFermer: () async {
            for (final a in aAfficher) {
              _alertesVuesDansLaSession.add(a.id);
            }
            try {
              await notifRepo.enregistrerAlertesVues(aAfficher.map((a) => a.id));
            } catch (_) {}
          },
        );
      }
    } catch (_) {
    } finally {
      _verificationEnCours = false;
    }
  }

  void _allerVersOnglet(int index) {
    widget.navigationShell.goBranch(
      index,
      // Retaper sur l'onglet déjà actif revient à sa page d'accueil.
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          widget.navigationShell,
          const FloatingSupportButton(),
          // Bandeau discret en haut lorsque l'application utilise les données en cache (hors ligne)
          ValueListenableBuilder<bool>(
            valueListenable: ApiClient.instance.isOffline,
            builder: (context, offline, child) {
              if (!offline) return const SizedBox.shrink();
              return Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Material(
                  color: Colors.orange.shade800,
                  elevation: 4,
                  child: SafeArea(
                    bottom: false,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 6,
                        horizontal: 16,
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.wifi_off_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Mode hors ligne — Affichage des données enregistrées en cache',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: widget.navigationShell.currentIndex,
        onDestinationSelected: _allerVersOnglet,
        destinations: widget.onglets,
      ),
    );
  }
}

/// Conteneur des onglets sous forme de [PageView] : permet de glisser
/// (swipe) horizontalement d'un onglet à l'autre, en restant synchronisé
/// avec la barre de navigation du bas.
class SwipeBranchContainer extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  final List<Widget> children;

  const SwipeBranchContainer({
    super.key,
    required this.navigationShell,
    required this.children,
  });

  @override
  State<SwipeBranchContainer> createState() => _SwipeBranchContainerState();
}

class _SwipeBranchContainerState extends State<SwipeBranchContainer> {
  late final PageController _pageController =
      PageController(initialPage: widget.navigationShell.currentIndex);

  @override
  void didUpdateWidget(SwipeBranchContainer oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Onglet changé via la barre du bas : on anime le PageView vers le bon écran.
    final index = widget.navigationShell.currentIndex;
    final pageCourante =
        (_pageController.page ?? _pageController.initialPage.toDouble()).round();
    if (_pageController.hasClients && pageCourante != index) {
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  // Swipe terminé : on bascule vers la branche correspondante.
  void _onPageChanged(int index) => widget.navigationShell.goBranch(index);

  @override
  Widget build(BuildContext context) {
    return PageView(
      controller: _pageController,
      onPageChanged: _onPageChanged,
      children: widget.children,
    );
  }
}

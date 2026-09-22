import 'package:go_router/go_router.dart';

import '../../data/repositories/auth_repository.dart';
import '../../features/actualite/actualite_screen.dart';
import '../../features/actualite/post_detail_screen.dart';
import '../../features/auth/completer_profil_screen.dart';
import '../../features/auth/connexion_screen.dart';
import '../../features/auth/inscription_screen.dart';
import '../../features/auth/welcome_screen.dart';
import '../../features/bourses/bourse_detail_screen.dart';
import '../../features/bourses/bourse_resultat_screen.dart';
import '../../features/bourses/bourses_screen.dart';
import '../../features/candidature/candidature_screen.dart';
import '../../features/centres/centres_screen.dart';
import '../../features/formations/formation_detail_screen.dart';
import '../../features/formateur/accueil_formateur_screen.dart';
import '../../features/formateur/apprenants_classe_screen.dart';
import '../../features/formateur/classes_formateur_screen.dart';
import '../../features/formateur/revenus_formateur_screen.dart';
import '../../features/formations/formations_screen.dart';
import '../../features/mes_formations/classe_message_detail_screen.dart';
import '../../features/mes_formations/classe_screen.dart';
import '../../features/mes_formations/mes_formations_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/paiements/paiement_detail_screen.dart';
import '../../features/paiements/paiements_screen.dart';
import '../../features/profil/mes_documents_screen.dart';
import '../../features/profil/parametres_screen.dart';
import '../../features/profil/profil_screen.dart';
import '../../features/resultats/resultat_screen.dart';
import '../../features/shell/main_shell.dart';
import '../../features/support/support_screen.dart';

import '../../features/auth/splash_screen.dart';

/// Variable conservant le deep link cible si l'app démarre à froid.
String? _targetDeepLink;

/// Routes accessibles sans être connecté.
const _routesAuth = {'/bienvenue', '/connexion', '/inscription'};

/// Écran imposé tant que le profil est incomplet (téléphone manquant).
const _routeCompletion = '/completer-profil';

/// Accueil de chaque espace.
const _accueilEleve = '/actualite';
const _accueilFormateur = '/formateur/accueil';

/// Onglets de l'espace élève et leur équivalent dans l'espace formateur.
/// Les pages élève sans équivalent (catalogue, bourses…) ramènent à l'accueil.
const _ongletsEleveVersFormateur = {
  '/actualite': '/formateur/actualite',
  '/formations': _accueilFormateur,
  '/mes-formations': '/formateur/classes',
  '/bourses': _accueilFormateur,
  '/profil': '/formateur/profil',
  '/paiements': '/formateur/revenus',
  '/resultats': _accueilFormateur,
  '/documents': '/formateur/classes',
};

/// Redirige vers l'espace qui correspond au rôle, ou null si c'est déjà le cas.
String? _redirigerSelonRole(bool estFormateur, String location) {
  final dansEspaceFormateur =
      location == '/formateur' || location.startsWith('/formateur/');
  if (estFormateur) {
    if (location == '/formateur') return _accueilFormateur;
    return _ongletsEleveVersFormateur[location];
  }
  return dansEspaceFormateur ? _accueilEleve : null;
}

/// Normalise une URI d'entrée (custom scheme ou URL web /app/) vers une route interne GoRouter.
///
/// Exemple :
/// - `sahelacademy://post/123` -> `/post/123`
/// - `sahelacademy://formation/abc` -> `/formation/abc`
/// - `https://sahel-academy-verif.vercel.app/app/post/123` -> `/post/123`
String _normalizeDeepLinkPath(Uri uri) {
  if (uri.hasScheme && uri.scheme != 'http' && uri.scheme != 'https') {
    final host = uri.host;
    final path = uri.path;
    if (host.isNotEmpty) {
      return '/$host$path';
    }
  }

  String path = uri.path;
  if (path.startsWith('/app/')) {
    path = path.substring(4);
  } else if (path == '/app') {
    path = '/actualite';
  }

  if (path.isEmpty || path == '/') {
    return '/actualite';
  }

  return path;
}

/// Construit la navigation de l'application.
///
/// - `refreshListenable` : le routeur se ré-évalue à chaque changement d'état
///   de connexion (connexion / déconnexion).
/// - `redirect` : redirige vers l'accueil si non connecté, et vers le fil
///   d'actualité ou le deep link cible si on est connecté.
GoRouter createRouter(AuthRepository auth) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: auth,
    redirect: (context, state) {
      final pret = auth.pretInitial;
      final connecte = auth.estConnecte;
      final normalizedLocation = _normalizeDeepLinkPath(state.uri);
      final surSplash = normalizedLocation == '/splash';
      final surAuth = _routesAuth.contains(normalizedLocation);
      final surCompletion = normalizedLocation == _routeCompletion;

      // 1. Si la vérification de session n'est pas encore terminée
      // et qu'aucun utilisateur n'a pu être chargé depuis le cache local :
      if (!pret && !connecte) {
        // Sauvegarde le deep link s'il s'agit d'une URL de contenu direct
        if (!surSplash && !surAuth && !surCompletion) {
          _targetDeepLink = normalizedLocation;
        }
        return surSplash ? null : '/splash';
      }

      // 2. Si l'utilisateur est connecté :
      if (connecte) {
        // 2.a Profil incomplet (pas de téléphone) : passage obligé par l'écran
        //     de complétion. On teste avant de consommer le deep link, pour
        //     que la cible reste en attente jusqu'à la fin.
        if (auth.profilIncomplet) {
          return surCompletion ? null : _routeCompletion;
        }

        final estFormateur = auth.utilisateur?.estFormateur == true;

        if (_targetDeepLink != null) {
          final target = _targetDeepLink!;
          _targetDeepLink = null;
          return _redirigerSelonRole(estFormateur, target) ?? target;
        }
        if (surAuth || surSplash || surCompletion) {
          return estFormateur ? _accueilFormateur : _accueilEleve;
        }
        final versEspace = _redirigerSelonRole(estFormateur, normalizedLocation);
        if (versEspace != null) return versEspace;
        // Si l'URI possède un schéma personnalisé (sahelacademy://) ou un préfixe /app/,
        // on redirige vers la route interne normalisée.
        if ((state.uri.hasScheme && state.uri.scheme != 'http' && state.uri.scheme != 'https') ||
            state.uri.path.startsWith('/app/')) {
          return normalizedLocation;
        }
      }

      // 3. Si l'utilisateur n'est pas connecté et se trouve sur le Splash ou un écran protégé :
      if (!connecte && (!surAuth || surSplash)) {
        return '/bienvenue';
      }

      return null;
    },
    routes: [
      // ---- Écran d'attente / démarrage ----
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // ---- Écrans d'authentification ----
      GoRoute(
        path: '/bienvenue',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/connexion',
        builder: (context, state) => const ConnexionScreen(),
      ),
      GoRoute(
        path: '/inscription',
        builder: (context, state) => const InscriptionScreen(),
      ),
      GoRoute(
        path: _routeCompletion,
        builder: (context, state) => const CompleterProfilScreen(),
      ),

      // ---- Détail d'une formation (par-dessus, avec bouton retour) ----
      GoRoute(
        path: '/formation/:id',
        builder: (context, state) =>
            FormationDetailScreen(formationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/app/formation/:id',
        builder: (context, state) =>
            FormationDetailScreen(formationId: state.pathParameters['id']!),
      ),

      // ---- Détail d'un post (commentaires) ----
      GoRoute(
        path: '/post/:id',
        builder: (context, state) =>
            PostDetailScreen(postId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/app/post/:id',
        builder: (context, state) =>
            PostDetailScreen(postId: state.pathParameters['id']!),
      ),
      // Alias pour la rétrocompatibilité des anciens liens d'actualité
      GoRoute(
        path: '/actualite/:id',
        builder: (context, state) =>
            PostDetailScreen(postId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/app/actualite/:id',
        builder: (context, state) =>
            PostDetailScreen(postId: state.pathParameters['id']!),
      ),

      // ---- Suivi des candidatures de l'utilisateur (cible d'un bouton d'action) ----
      GoRoute(
        path: '/resultats',
        builder: (context, state) => const ResultatScreen(),
      ),

      // ---- Détail d'une bourse (par-dessus, avec bouton retour) ----
      GoRoute(
        path: '/bourse/:id',
        builder: (context, state) =>
            BourseDetailScreen(bourseId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/app/bourse/:id',
        builder: (context, state) =>
            BourseDetailScreen(bourseId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/bourse/:id/resultat',
        builder: (context, state) =>
            BourseResultatScreen(bourseId: state.pathParameters['id']!),
      ),

      // ---- Postuler à une bourse ----
      GoRoute(
        path: '/postuler/:bourseId',
        builder: (context, state) =>
            CandidatureScreen(bourseId: state.pathParameters['bourseId']!),
      ),

      // ---- Prise de rendez-vous dans un centre ----
      GoRoute(
        path: '/centres',
        builder: (context, state) => const CentresScreen(),
      ),

      // ---- Classe (Google Classroom) d'une formation ----
      GoRoute(
        path: '/classe/:id',
        builder: (context, state) =>
            ClasseScreen(formationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/classe/:formationId/message/:messageId',
        builder: (context, state) => ClasseMessageDetailScreen(
          formationId: state.pathParameters['formationId']!,
          messageId: state.pathParameters['messageId']!,
        ),
      ),

      // ---- Paiements ----
      GoRoute(
        path: '/paiements',
        builder: (context, state) => const PaiementsScreen(),
      ),
      GoRoute(
        path: '/paiements/:id',
        builder: (context, state) =>
            PaiementDetailScreen(formationId: state.pathParameters['id']!),
      ),

      // ---- Notifications ----
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),

      // ---- Mes documents ----
      GoRoute(
        path: '/documents',
        builder: (context, state) => const MesDocumentsScreen(),
      ),

      // ---- Paramètres ----
      GoRoute(
        path: '/parametres',
        builder: (context, state) => const ParametresScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const ParametresScreen(),
      ),

      // ---- Apprenants d'une classe (espace formateur) ----
      GoRoute(
        path: '/formateur/classe/:id/apprenants',
        builder: (context, state) =>
            ApprenantsClasseScreen(formationId: state.pathParameters['id']!),
      ),

      // ---- Chat support ----
      GoRoute(
        path: '/support',
        builder: (context, state) => const SupportScreen(),
      ),

      // ---- Espace formateur (barre du bas dédiée, swipable) ----
      StatefulShellRoute(
        builder: (context, state, navigationShell) => MainShell(
          navigationShell: navigationShell,
          onglets: ongletsFormateur,
        ),
        navigatorContainerBuilder: (context, navigationShell, children) =>
            SwipeBranchContainer(
              navigationShell: navigationShell,
              children: children,
            ),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: _accueilFormateur,
                builder: (context, state) => const AccueilFormateurScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/formateur/classes',
                builder: (context, state) => const ClassesFormateurScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/formateur/actualite',
                builder: (context, state) => const ActualiteScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/formateur/revenus',
                builder: (context, state) => const RevenusFormateurScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/formateur/profil',
                builder: (context, state) => const ProfilScreen(),
              ),
            ],
          ),
        ],
      ),

      // ---- Application principale (barre du bas à 5 onglets, swipable) ----
      StatefulShellRoute(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        navigatorContainerBuilder: (context, navigationShell, children) =>
            SwipeBranchContainer(
              navigationShell: navigationShell,
              children: children,
            ),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/actualite',
                builder: (context, state) => const ActualiteScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/formations',
                builder: (context, state) => const FormationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/mes-formations',
                builder: (context, state) => const MesFormationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/bourses',
                builder: (context, state) => const BoursesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profil',
                builder: (context, state) => const ProfilScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

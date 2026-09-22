import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/actualite_repository.dart';
import 'data/repositories/admission_repository.dart';
import 'data/repositories/espace_formateur_repository.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/bourse_repository.dart';
import 'data/repositories/centre_repository.dart';
import 'data/repositories/classe_repository.dart';
import 'data/repositories/formation_repository.dart';
import 'data/repositories/notification_repository.dart';
import 'data/repositories/paiement_repository.dart';
import 'data/repositories/support_repository.dart';

import 'core/services/fcm_service.dart';

/// L'application Sahel Academy.
///
/// Les repositories (dont l'authentification) sont fournis ici via `Provider`.
/// Le jour où le backend NestJS existe, on ne change que l'intérieur des
/// repositories, pas cette configuration.
class SahelAcademyApp extends StatefulWidget {
  const SahelAcademyApp({super.key});

  @override
  State<SahelAcademyApp> createState() => _SahelAcademyAppState();
}

class _SahelAcademyAppState extends State<SahelAcademyApp> {
  final AuthRepository _auth = AuthRepository();
  late final GoRouter _router = createRouter(_auth);

  /// Permet d'afficher un message sans dépendre d'un écran précis.
  final GlobalKey<ScaffoldMessengerState> _messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  @override
  void initState() {
    super.initState();
    FcmService.instance.attachRouter(_router);
    _auth.addListener(_afficherErreurGoogle);
  }

  /// Une connexion Google web échoue *pendant* le retour de redirection :
  /// l'app redémarre, et le routeur envoie un visiteur non connecté sur
  /// l'écran de bienvenue. Le message doit donc s'afficher là où
  /// l'utilisateur atterrit, quel que soit l'écran.
  void _afficherErreurGoogle() {
    final erreur = _auth.erreurGoogle;
    if (erreur == null) return;
    _auth.effacerErreurGoogle();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final messenger = _messengerKey.currentState;
      if (messenger == null) return;
      messenger
        ..clearSnackBars()
        ..showSnackBar(
          SnackBar(
            content: Text(erreur),
            backgroundColor: AppTheme.light.colorScheme.error,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
          ),
        );
    });
  }

  @override
  void dispose() {
    _auth.removeListener(_afficherErreurGoogle);
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        Provider(
          // `lazy: false` : on précharge le catalogue depuis l'API dès le
          // démarrage pour que les écrans qui le consultent aient les données
          // prêtes (les erreurs réseau sont gérées écran par écran).
          lazy: false,
          create: (_) => FormationRepository()..charger().catchError((_) {}),
        ),
        ChangeNotifierProvider(create: (_) => ActualiteRepository()),
        Provider(create: (_) => PaiementRepository()),
        Provider(create: (_) => AdmissionRepository()),
        Provider(create: (_) => CentreRepository()),
        Provider(
          create: (_) => BourseRepository()..charger().catchError((_) {}),
        ),
        ChangeNotifierProvider(create: (_) => ClasseRepository()),
        ChangeNotifierProvider(create: (_) => NotificationRepository()),
        ChangeNotifierProvider(create: (_) => SupportRepository()),
        ChangeNotifierProvider(create: (_) => EspaceFormateurRepository()),
      ],
      child: MaterialApp.router(
        title: 'Sahel Academy',
        debugShowCheckedModeBanner: false,
        scaffoldMessengerKey: _messengerKey,
        theme: AppTheme.light,
        routerConfig: _router,
      ),
    );
  }
}

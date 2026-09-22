import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app.dart';
import 'core/services/google_auth_service.dart';
import 'core/utils/url_strategy.dart';
import 'firebase_options.dart';

Future<void> main() async {
  // Nécessaire avant tout appel asynchrone au démarrage.
  WidgetsFlutterBinding.ensureInitialized();

  // Web : URLs propres sans # (no-op sur mobile/desktop).
  configurerUrlStrategy();

  // Initialisation de Firebase Cloud Messaging / Core
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('Erreur lors de l\'initialisation de Firebase: $e');
  }

  // Google Sign-In : doit être initialisé avant la création d'AuthRepository,
  // qui s'abonne aux événements du SDK (parcours web).
  await GoogleAuthService.instance.initialiser();

  // Active le formatage des dates en français (ex: "12 août").
  await initializeDateFormatting('fr_FR', null);
  Intl.defaultLocale = 'fr_FR';

  runApp(const SahelAcademyApp());
}


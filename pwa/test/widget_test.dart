import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:sahel_academy/core/theme/app_theme.dart';
import 'package:sahel_academy/features/auth/welcome_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  testWidgets('L\'écran de bienvenue affiche les boutons d\'action',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const WelcomeScreen(),
      ),
    );
    await tester.pump();

    expect(find.text('Créer un compte'), findsOneWidget);
    expect(find.text('J\'ai déjà un compte'), findsOneWidget);
  });
}

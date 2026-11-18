import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'package:sahel_academy/data/repositories/centre_repository.dart';
import 'package:sahel_academy/data/repositories/rendez_vous_repository.dart';
import 'package:sahel_academy/features/centres/centres_screen.dart';
import 'package:sahel_academy/models/centre.dart';

/// Centres fournis en mémoire (pas d'appel réseau).
class _FauxCentres extends CentreRepository {
  final List<Centre> centres;
  _FauxCentres(this.centres);
  @override
  bool get estCharge => true;
  @override
  Future<void> charger({bool forcer = false}) async {}
  @override
  List<Centre> getCentres() => centres;
}

String _iso(DateTime d) => d.toUtc().toIso8601String();

void main() {
  setUpAll(() => initializeDateFormatting('fr_FR', null));

  testWidgets('créneaux hebdomadaires regroupés par jour + confirmation', (
    tester,
  ) async {
    final demain = DateTime.now().add(const Duration(days: 1));
    final j1 = DateTime(demain.year, demain.month, demain.day, 9);
    final j8 = j1.add(const Duration(days: 7));
    // JSON tel que renvoyé par GET /centres (créneaux hebdo dépliés).
    final centre = Centre.fromJson({
      'id': 'c1',
      'nom': 'Centre de Bamako',
      'ville': 'Bamako',
      'adresse': 'ACI 2000',
      'telephone': '',
      'creneaux': [
        {'id': 'cr1@x', 'dateHeure': _iso(j1)},
        {
          'id': 'cr2@x',
          'dateHeure': _iso(j1.add(const Duration(hours: 5, minutes: 30))),
        },
        {'id': 'cr1@y', 'dateHeure': _iso(j8)},
        {
          'id': 'passe',
          'dateHeure': _iso(DateTime.now().subtract(const Duration(days: 1))),
        },
      ],
    });

    await tester.binding.setSurfaceSize(const Size(400, 900));
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<CentreRepository>.value(value: _FauxCentres([centre])),
          Provider<RendezVousRepository>.value(value: RendezVousRepository()),
        ],
        child: const MaterialApp(home: CentresScreen()),
      ),
    );
    await tester.pumpAndSettle();

    // Carte compacte : prochain créneau affiché, pas la liste complète.
    expect(find.textContaining('Prochain :'), findsOneWidget);
    expect(find.byType(ChoiceChip), findsNothing);

    await tester.tap(find.text('Choisir un créneau'));
    await tester.pumpAndSettle();

    // 2 jours distincts (le créneau passé est masqué) ; jour 1 = 2 heures.
    expect(find.text('${j1.day}'), findsOneWidget);
    expect(find.text('${j8.day}'), findsOneWidget);
    expect(find.byType(ChoiceChip), findsNWidgets(2));
    expect(find.text('09:00'), findsOneWidget);
    expect(find.text('14:30'), findsOneWidget);
    expect(find.text('Choisis une heure'), findsOneWidget);

    await tester.tap(find.text('14:30'));
    await tester.pumpAndSettle();
    expect(find.textContaining('à 14h30'), findsOneWidget);

    // Changer de jour : une seule heure, sélection remise à zéro.
    await tester.tap(find.text('${j8.day}'));
    await tester.pumpAndSettle();
    expect(find.byType(ChoiceChip), findsOneWidget);
    expect(find.text('Choisis une heure'), findsOneWidget);
  });
}

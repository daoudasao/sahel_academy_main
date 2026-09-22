import 'package:flutter/material.dart';

import 'widgets/carte_classe_formateur.dart';
import 'widgets/espace_chargement.dart';

/// Toutes les classes enseignées par le formateur connecté.
class ClassesFormateurScreen extends StatefulWidget {
  const ClassesFormateurScreen({super.key});

  @override
  State<ClassesFormateurScreen> createState() => _ClassesFormateurScreenState();
}

class _ClassesFormateurScreenState extends State<ClassesFormateurScreen> {
  String _recherche = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes classes')),
      body: EspaceFormateurChargement(
        builder: (context, espace) {
          final terme = _recherche.trim().toLowerCase();
          final classes = terme.isEmpty
              ? espace.classes
              : espace.classes
                  .where((c) => c.titre.toLowerCase().contains(terme))
                  .toList();

          return RefreshIndicator(
            onRefresh: () => EspaceFormateurChargement.recharger(context),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
              children: [
                if (espace.classes.length > 3) ...[
                  TextField(
                    onChanged: (v) => setState(() => _recherche = v),
                    decoration: const InputDecoration(
                      hintText: 'Rechercher une classe',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],
                if (classes.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 60),
                    child: Text(
                      espace.classes.isEmpty
                          ? "Aucune classe ne vous est encore attribuée.\nL'administration vous affectera à vos formations."
                          : 'Aucune classe ne correspond à la recherche.',
                      textAlign: TextAlign.center,
                    ),
                  )
                else
                  ...classes.map((c) => CarteClasseFormateur(classe: c)),
              ],
            ),
          );
        },
      ),
    );
  }
}

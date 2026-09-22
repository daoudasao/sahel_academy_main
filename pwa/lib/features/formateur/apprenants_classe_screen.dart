import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/avatar.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/espace_formateur_repository.dart';
import '../../models/espace_formateur.dart';
import '../../widgets/erreur_chargement.dart';

/// Liste des apprenants d'une classe du formateur.
class ApprenantsClasseScreen extends StatefulWidget {
  final String formationId;

  const ApprenantsClasseScreen({super.key, required this.formationId});

  @override
  State<ApprenantsClasseScreen> createState() => _ApprenantsClasseScreenState();
}

class _ApprenantsClasseScreenState extends State<ApprenantsClasseScreen> {
  late Future<List<ApprenantClasse>> _future = _charger();
  String _recherche = '';

  Future<List<ApprenantClasse>> _charger() => context
      .read<EspaceFormateurRepository>()
      .apprenants(widget.formationId);

  @override
  Widget build(BuildContext context) {
    ClasseFormateur? classe;
    for (final c in context.watch<EspaceFormateurRepository>().espace?.classes ??
        const <ClasseFormateur>[]) {
      if (c.id == widget.formationId) classe = c;
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Apprenants'),
            if (classe != null)
              Text(
                classe.titre,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
              ),
          ],
        ),
      ),
      body: FutureBuilder<List<ApprenantClasse>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErreurChargement(
              message: snap.error.toString(),
              onRetry: () => setState(() => _future = _charger()),
            );
          }
          final tous = snap.data ?? const [];
          final terme = _recherche.trim().toLowerCase();
          final liste = terme.isEmpty
              ? tous
              : tous.where((a) => a.nom.toLowerCase().contains(terme)).toList();
          final actifs = tous.where((a) => _estActif(a.statut)).length;

          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _future = _charger());
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Text(
                  '${tous.length} inscrit${tous.length > 1 ? 's' : ''} · $actifs actif${actifs > 1 ? 's' : ''}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                if (tous.length > 6) ...[
                  TextField(
                    onChanged: (v) => setState(() => _recherche = v),
                    decoration: const InputDecoration(
                      hintText: 'Rechercher un apprenant',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                if (liste.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 48),
                    child: Text(
                      'Aucun apprenant pour le moment.',
                      textAlign: TextAlign.center,
                    ),
                  )
                else
                  ...liste.map(_ligne),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _ligne(ApprenantClasse a) {
    final (libelle, couleur) = _statut(a.statut);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: UserAvatar(nom: a.nom, avatarUrl: a.image),
        title: Text(a.nom, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: a.dateInscription != null
            ? Text('Inscrit le ${formatDate(a.dateInscription!)}')
            : null,
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: couleur.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            libelle,
            style: TextStyle(
              color: couleur,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  static bool _estActif(String statut) =>
      statut.isEmpty || statut == 'en_cours' || statut == 'actif';

  static (String, Color) _statut(String statut) {
    if (_estActif(statut)) return ('Actif', const Color(0xFF15803D));
    return switch (statut) {
      'suspendu' => ('Suspendu', const Color(0xFFCA8A04)),
      'termine' => ('Terminé', const Color(0xFF2563EB)),
      _ => ('Abandon', const Color(0xFFDC2626)),
    };
  }
}

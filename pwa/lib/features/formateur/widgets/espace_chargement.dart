import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/classe_repository.dart';
import '../../../data/repositories/espace_formateur_repository.dart';
import '../../../data/repositories/formation_repository.dart';
import '../../../models/espace_formateur.dart';
import '../../../widgets/erreur_chargement.dart';

/// Charge l'espace formateur (et ce dont les écrans de classe ont besoin),
/// puis construit [builder] avec les données. Gère attente et erreur.
class EspaceFormateurChargement extends StatefulWidget {
  final Widget Function(BuildContext context, EspaceFormateur espace) builder;

  const EspaceFormateurChargement({super.key, required this.builder});

  /// Recharge toutes les données de l'espace.
  static Future<void> recharger(BuildContext context) {
    final uid = context.read<AuthRepository>().utilisateur?.id;
    if (uid == null) return Future.value();
    return Future.wait([
      context.read<EspaceFormateurRepository>().charger(uid, forcer: true),
      context.read<ClasseRepository>().charger(uid, forcer: true),
      context.read<FormationRepository>().charger(forcer: true),
    ]);
  }

  @override
  State<EspaceFormateurChargement> createState() =>
      _EspaceFormateurChargementState();
}

class _EspaceFormateurChargementState extends State<EspaceFormateurChargement> {
  @override
  void initState() {
    super.initState();
    final uid = context.read<AuthRepository>().utilisateur?.id;
    if (uid != null) {
      context.read<EspaceFormateurRepository>().charger(uid);
      context.read<ClasseRepository>().charger(uid);
      context.read<FormationRepository>().charger().catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = context.watch<EspaceFormateurRepository>();
    final espace = repo.espace;
    if (espace != null) return widget.builder(context, espace);
    if (repo.enChargement || repo.erreur == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return ErreurChargement(
      message: repo.erreur,
      onRetry: () => EspaceFormateurChargement.recharger(context),
    );
  }
}

/// Petite carte de statistique.
class CarteStat extends StatelessWidget {
  final IconData icone;
  final String libelle;
  final String valeur;
  final Color couleur;

  const CarteStat({
    super.key,
    required this.icone,
    required this.libelle,
    required this.valeur,
    required this.couleur,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: couleur.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icone, color: couleur, size: 20),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              valeur,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            libelle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

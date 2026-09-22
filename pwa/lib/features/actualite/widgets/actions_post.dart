import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../models/action_post.dart';

/// Affiche les boutons d'action d'un post (redirection vers une page de l'app).
class ActionsPost extends StatelessWidget {
  final List<ActionPost> actions;

  const ActionsPost({super.key, required this.actions});

  /// Onglets de la barre du bas : on y accède avec `go` (pas `push`).
  static const _onglets = {
    '/actualite',
    '/formations',
    '/mes-formations',
    '/bourses',
    '/profil',
  };

  void _naviguer(BuildContext context, String route) {
    if (_onglets.contains(route)) {
      context.go(route);
    } else {
      context.push(route);
    }
  }

  IconData _icone(String? cle) {
    switch (cle) {
      case 'verifier':
        return Icons.fact_check_outlined;
      case 'paiement':
        return Icons.payments_outlined;
      case 'document':
        return Icons.description_outlined;
      case 'formation':
        return Icons.school_outlined;
      case 'bourse':
        return Icons.volunteer_activism_outlined;
      default:
        return Icons.arrow_forward;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        for (final a in actions)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _naviguer(context, a.route),
                icon: Icon(_icone(a.icone), size: 20),
                label: Text(a.label),
              ),
            ),
          ),
      ],
    );
  }
}

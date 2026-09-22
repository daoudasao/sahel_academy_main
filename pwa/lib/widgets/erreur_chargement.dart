import 'package:flutter/material.dart';

/// Affiche un message d'erreur réseau avec un bouton « Réessayer ».
/// Utilisé pendant qu'un écran charge ses données depuis l'API.
class ErreurChargement extends StatelessWidget {
  final VoidCallback onRetry;
  final String? message;
  const ErreurChargement({super.key, required this.onRetry, this.message});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 48, color: scheme.outline),
            const SizedBox(height: 12),
            Text(
              message ??
                  'Impossible de charger les données.\nVérifiez votre connexion.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

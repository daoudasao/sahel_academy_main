import 'package:flutter/material.dart';

/// Écran / bloc temporaire pour les fonctionnalités pas encore développées.
class ComingSoon extends StatelessWidget {
  final IconData icon;
  final String titre;
  final String message;

  const ComingSoon({
    super.key,
    required this.icon,
    required this.titre,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: scheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: scheme.onPrimaryContainer),
            ),
            const SizedBox(height: 20),
            Text(
              titre,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.outline, height: 1.4),
            ),
            const SizedBox(height: 18),
            Chip(
              avatar: const Icon(Icons.hourglass_top, size: 18),
              label: const Text('Bientôt disponible'),
            ),
          ],
        ),
      ),
    );
  }
}

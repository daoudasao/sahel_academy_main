import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

/// Affiche une modale explicative élégante lorsque l'élève clique sur l'icône "i".
void afficherInfoPage({
  required BuildContext context,
  required String titre,
  required String description,
  required List<(IconData, String, String)> points,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) {
      final scheme = Theme.of(context).colorScheme;
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.emerald.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.info_outline_rounded,
                    color: AppColors.emeraldDark,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    titre,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              description,
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                height: 1.45,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 18),
            for (final item in points) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(item.$1, size: 20, color: AppColors.emerald),
                    const SizedBox(width: 12),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(
                            color: scheme.onSurface,
                            fontSize: 13.5,
                            height: 1.4,
                          ),
                          children: [
                            TextSpan(
                              text: '${item.$2} : ',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextSpan(text: item.$3),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Compris !'),
              ),
            ),
          ],
        ),
      );
    },
  );
}

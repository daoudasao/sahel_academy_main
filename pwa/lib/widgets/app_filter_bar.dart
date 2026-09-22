import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

/// Élément individuel du filtre.
class AppFilterItem<T> {
  final String label;
  final T value;
  final int? count;
  final IconData? icon;

  const AppFilterItem({
    required this.label,
    required this.value,
    this.count,
    this.icon,
  });
}

/// Rangée de filtres unifiée et réutilisable pour toute l'application.
/// Assure une cohérence visuelle parfaite entre Mes Formations, Bourses, Mes Documents, etc.
class AppFilterBar<T> extends StatelessWidget {
  final List<AppFilterItem<T>> items;
  final T selectedValue;
  final ValueChanged<T> onSelected;
  final EdgeInsetsGeometry padding;

  const AppFilterBar({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onSelected,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: padding,
      child: Row(
        children: items.map((item) {
          final isSelected = item.value == selectedValue;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              selected: isSelected,
              onSelected: (val) {
                if (val) onSelected(item.value);
              },
              avatar: item.icon != null
                  ? Icon(
                      item.icon,
                      size: 16,
                      color: isSelected
                          ? AppColors.emeraldDark
                          : scheme.onSurfaceVariant,
                    )
                  : null,
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.label,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      fontSize: 13,
                      color: isSelected
                          ? AppColors.emeraldDark
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                  if (item.count != null) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.emerald.withValues(alpha: 0.25)
                            : scheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${item.count}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? AppColors.emeraldDark
                              : scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              selectedColor: AppColors.emeraldContainer,
              backgroundColor: scheme.surface,
              side: BorderSide(
                color: isSelected
                    ? AppColors.emerald.withValues(alpha: 0.5)
                    : scheme.outlineVariant,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

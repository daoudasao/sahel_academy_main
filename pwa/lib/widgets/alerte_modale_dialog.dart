import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../models/alerte_urgente.dart';

/// Boîte de dialogue modale prioritaire affichée dès l'ouverture de l'application
/// lorsqu'un message critique nécessite l'attention immédiate de l'utilisateur.
class AlerteModaleDialog extends StatefulWidget {
  final List<AlerteUrgente> alertes;
  final VoidCallback? onFermer;

  const AlerteModaleDialog({
    super.key,
    required this.alertes,
    this.onFermer,
  });

  /// Méthode d'aide pour afficher la modale avec animation fluide.
  static Future<void> afficher(
    BuildContext context,
    List<AlerteUrgente> alertes, {
    VoidCallback? onFermer,
  }) {
    if (alertes.isEmpty) return Future.value();

    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Fermer',
      barrierColor: Colors.black.withValues(alpha: 0.65),
      transitionDuration: const Duration(milliseconds: 320),
      pageBuilder: (ctx, anim1, anim2) {
        return AlerteModaleDialog(
          alertes: alertes,
          onFermer: onFermer,
        );
      },
      transitionBuilder: (ctx, anim1, anim2, child) {
        final curved = CurvedAnimation(parent: anim1, curve: Curves.easeOutBack);
        return ScaleTransition(
          scale: curved,
          child: FadeTransition(
            opacity: anim1,
            child: child,
          ),
        );
      },
    );
  }

  @override
  State<AlerteModaleDialog> createState() => _AlerteModaleDialogState();
}

class _AlerteModaleDialogState extends State<AlerteModaleDialog> {
  int _currentIndex = 0;

  AlerteUrgente get _current => widget.alertes[_currentIndex];

  ({List<Color> gradient, Color accentColor, Color bgBadge, IconData icone}) _getStyle(
    AlerteUrgente alerte,
  ) {
    switch (alerte.type) {
      case TypeAlerteUrgente.retardPaiement:
        return (
          gradient: [const Color(0xFFEF4444), const Color(0xFFB91C1C)],
          accentColor: const Color(0xFFDC2626),
          bgBadge: const Color(0xFFFEE2E2),
          icone: Icons.warning_amber_rounded,
        );
      case TypeAlerteUrgente.bourseAdmission:
        return (
          gradient: [AppColors.emerald, const Color(0xFF047857)],
          accentColor: AppColors.emerald,
          bgBadge: AppColors.emeraldContainer,
          icone: Icons.school_rounded,
        );
      case TypeAlerteUrgente.notificationUrgente:
      case TypeAlerteUrgente.autre:
        return (
          gradient: [const Color(0xFF3B82F6), const Color(0xFF1D4ED8)],
          accentColor: const Color(0xFF2563EB),
          bgBadge: const Color(0xFFDBEAFE),
          icone: Icons.campaign_rounded,
        );
    }
  }

  void _actionPrincipale() {
    final route = _current.actionRoute;
    Navigator.of(context, rootNavigator: true).pop();
    widget.onFermer?.call();
    if (route.isNotEmpty) {
      context.push(route);
    }
  }

  void _fermer() {
    Navigator.of(context, rootNavigator: true).pop();
    widget.onFermer?.call();
  }

  @override
  Widget build(BuildContext context) {
    final alerte = _current;
    final style = _getStyle(alerte);
    final total = widget.alertes.length;

    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: MediaQuery.of(context).size.width.clamp(320.0, 480.0),
          margin: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.22),
                blurRadius: 32,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── En-tête avec image d'arrière-plan éventuelle, dégradé et icône ──
              Stack(
                children: [
                  // Dégradé thématique plein : fond par défaut, et repli
                  // pendant le chargement ou en cas d'échec de l'image.
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: style.gradient,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                    ),
                  ),
                  // Image de couverture (ex: image de la bourse), bien visible,
                  // avec un voile qui se fonce vers le bas pour la lisibilité.
                  if (alerte.imageUrl != null && alerte.imageUrl!.isNotEmpty)
                    Positioned.fill(
                      child: Image.network(
                        alerte.imageUrl!,
                        fit: BoxFit.cover,
                        gaplessPlayback: true,
                        frameBuilder: (_, child, frame, synchrone) {
                          if (frame == null && !synchrone) {
                            return const SizedBox.shrink();
                          }
                          return Stack(
                            fit: StackFit.expand,
                            children: [
                              child,
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.black.withValues(alpha: 0.30),
                                      Colors.black.withValues(alpha: 0.20),
                                      style.gradient.last.withValues(alpha: 0.85),
                                    ],
                                    stops: const [0.0, 0.45, 1.0],
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  // Contenu interactif de l'en-tête (Badge, icône, titre)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Badge de type d'alerte
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.22),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const SizedBox(width: 2),
                                  Text(
                                    alerte.badge.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Bouton de fermeture discret (croix)
                            IconButton(
                              onPressed: _fermer,
                              icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 24),
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              tooltip: 'Fermer',
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Grande icône stylisée
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.35),
                              width: 2,
                            ),
                          ),
                          child: Icon(
                            style.icone,
                            color: Colors.white,
                            size: 38,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          alerte.titre,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 21,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // ── Corps de l'alerte ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                child: Column(
                  children: [
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.38,
                      ),
                      child: SingleChildScrollView(
                        child: Text(
                          alerte.message,
                          textAlign: alerte.message.contains('\n')
                              ? TextAlign.start
                              : TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey.shade800,
                            fontSize: 14.5,
                            height: 1.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                    if (total > 1) ...[
                      const SizedBox(height: 18),
                      // Indicateur multi-alertes avec boutons et points animés
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_ios_new_rounded),
                            onPressed: _currentIndex > 0
                                ? () => setState(() => _currentIndex--)
                                : null,
                            iconSize: 18,
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            tooltip: 'Précédent',
                          ),
                          Column(
                            children: [
                              Text(
                                'Message ${_currentIndex + 1} sur $total',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: List.generate(total, (idx) {
                                  final estActif = idx == _currentIndex;
                                  return AnimatedContainer(
                                    duration: const Duration(milliseconds: 240),
                                    margin: const EdgeInsets.symmetric(horizontal: 3),
                                    width: estActif ? 22 : 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: estActif ? style.accentColor : Colors.grey.shade300,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  );
                                }),
                              ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.arrow_forward_ios_rounded),
                            onPressed: _currentIndex < total - 1
                                ? () => setState(() => _currentIndex++)
                                : null,
                            iconSize: 18,
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            tooltip: 'Suivant',
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 24),

                    // ── Bouton d'action principal ──
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _actionPrincipale,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: style.accentColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Text(
                          alerte.actionLabel,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.1,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // ── Bouton secondaire 'Plus tard' ──
                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: _fermer,
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.grey.shade600,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Plus tard',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

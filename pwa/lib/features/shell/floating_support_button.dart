import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../data/repositories/support_repository.dart';

/// Bouton rond de chat support déplaçable avec UN SEUL Tooltip officiel Flutter.
class FloatingSupportButton extends StatefulWidget {
  const FloatingSupportButton({super.key});

  @override
  State<FloatingSupportButton> createState() => _FloatingSupportButtonState();
}

class _FloatingSupportButtonState extends State<FloatingSupportButton>
    with TickerProviderStateMixin {
  final GlobalKey<TooltipState> _tooltipKey = GlobalKey<TooltipState>();

  Offset? _position;
  bool _estInitialise = false;
  bool _estEnGlissement = false;

  Timer? _timerScintillement;

  late final AnimationController _animRespiration = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  )..repeat(reverse: true);

  late final AnimationController _animShimmer = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  late final Animation<double> _scaleRespiration = Tween<double>(
    begin: 1.0,
    end: 1.05,
  ).animate(
    CurvedAnimation(parent: _animRespiration, curve: Curves.easeInOut),
  );

  late final Animation<double> _shimmerGlow = TweenSequence<double>([
    TweenSequenceItem(tween: Tween<double>(begin: 0.0, end: 1.0), weight: 50),
    TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 0.0), weight: 50),
  ]).animate(
    CurvedAnimation(parent: _animShimmer, curve: Curves.easeInOut),
  );

  @override
  void initState() {
    super.initState();

    // Scintillement léger toutes les 10 secondes
    _timerScintillement = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted && !_estEnGlissement) {
        _animShimmer.forward(from: 0.0);
      }
    });

    // Affichage automatique de l'UNIQUE Tooltip 2 secondes après le lancement de l'application
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 2000), () {
        if (mounted && !_estEnGlissement) {
          _tooltipKey.currentState?.ensureTooltipVisible();
        }
      });
    });
  }

  @override
  void dispose() {
    _timerScintillement?.cancel();
    _animRespiration.dispose();
    _animShimmer.dispose();
    super.dispose();
  }

  void _initialiserPositionSiBesoin(Size size) {
    if (!_estInitialise) {
      // Position d'origine : En bas à droite, relevé plus haut
      const double margin = 16.0;
      const double btnSize = 58.0;
      _position = Offset(
        size.width - btnSize - margin,
        size.height - btnSize - margin - 110.0,
      );
      _estInitialise = true;
    }
  }

  /// Magnétisme automatique vers l'un des 4 coins
  void _aimanterVersCoin(Size size) {
    if (_position == null) return;
    const double margin = 16.0;
    const double btnSize = 58.0;

    final minX = margin;
    final maxX = size.width - btnSize - margin;
    final minY = margin + 50.0;
    final maxY = size.height - btnSize - margin - 110.0;

    final currentX = _position!.dx;
    final currentY = _position!.dy;

    final targetX = (currentX < size.width / 2) ? minX : maxX;
    final targetY = (currentY < size.height / 2) ? minY : maxY;

    setState(() {
      _estEnGlissement = false;
      _position = Offset(targetX, targetY);
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    _initialiserPositionSiBesoin(size);

    final estADroite = (_position?.dx ?? 0) > size.width / 2;

    return Consumer<SupportRepository>(
      builder: (context, repo, _) {
        final unreadFromSupport =
            repo.messages.where((m) => !m.estDeMoi && !m.lu).toList();
        final hasUnread = unreadFromSupport.isNotEmpty;

        return AnimatedPositioned(
          duration: _estEnGlissement
              ? Duration.zero
              : const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          left: estADroite ? null : _position?.dx,
          right: estADroite ? (size.width - (_position?.dx ?? 0) - 58) : null,
          top: _position?.dy,
          child: AnimatedBuilder(
            animation: _animShimmer,
            builder: (context, child) {
              final glowValue = _shimmerGlow.value;

              return GestureDetector(
                onPanStart: (_) {
                  setState(() => _estEnGlissement = true);
                },
                onPanUpdate: (details) {
                  setState(() {
                    final current = _position ?? Offset.zero;
                    final newX = (current.dx + details.delta.dx).clamp(
                      10.0,
                      size.width - 68.0,
                    );
                    final newY = (current.dy + details.delta.dy).clamp(
                      40.0,
                      size.height - 140.0,
                    );
                    _position = Offset(newX, newY);
                  });
                },
                onPanEnd: (_) => _aimanterVersCoin(size),
                child: Tooltip(
                  key: _tooltipKey,
                  message: 'Besoin d\'aide ? Contacter le support Sahel Academy 💬',
                  triggerMode: TooltipTriggerMode.tap,
                  preferBelow: false,
                  verticalOffset: 36,
                  showDuration: const Duration(seconds: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: AppColors.emeraldDark,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.jaune,
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  textStyle: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  child: ScaleTransition(
                    scale: _scaleRespiration,
                    child: Transform.scale(
                      scale: 1.0 + (glowValue * 0.12),
                      child: Material(
                        color: Colors.transparent,
                        elevation: 10 + (glowValue * 8),
                        shadowColor: Color.lerp(
                          const Color(0xFF22C55E).withValues(alpha: 0.45),
                          AppColors.jaune.withValues(alpha: 0.9),
                          glowValue,
                        ),
                        shape: const CircleBorder(),
                        child: InkWell(
                          onTap: () => context.push('/support'),
                          customBorder: const CircleBorder(),
                          child: Ink(
                            width: 58,
                            height: 58,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                colors: glowValue > 0.3
                                    ? [
                                        const Color(0xFF86EFAC),
                                        AppColors.jaune,
                                      ]
                                    : [
                                        const Color(0xFF4ADE80),
                                        const Color(0xFF16A34A),
                                      ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              border: Border.all(
                                color: Color.lerp(
                                  Colors.white,
                                  AppColors.jaune,
                                  glowValue,
                                )!,
                                width: 2 + (glowValue * 1.5),
                              ),
                            ),
                            child: Stack(
                              alignment: Alignment.center,
                              clipBehavior: Clip.none,
                              children: [
                                Icon(
                                  Icons.support_agent_rounded,
                                  color: AppColors.emeraldDark,
                                  size: 30 + (glowValue * 3),
                                ),
                                // Macaron vert/or « En ligne »
                                Positioned(
                                  top: 2,
                                  right: 2,
                                  child: Container(
                                    width: 13,
                                    height: 13,
                                    decoration: BoxDecoration(
                                      color: AppColors.jaune,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white,
                                        width: 2,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.jaune.withValues(
                                              alpha: 0.8),
                                          blurRadius: 5,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                // Badge du nombre de messages non lus
                                if (hasUnread)
                                  Positioned(
                                    top: -3,
                                    left: -3,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.redAccent,
                                        borderRadius:
                                            BorderRadius.circular(10),
                                        border: Border.all(
                                          color: Colors.white,
                                          width: 1.5,
                                        ),
                                      ),
                                      child: Text(
                                        '${unreadFromSupport.length}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

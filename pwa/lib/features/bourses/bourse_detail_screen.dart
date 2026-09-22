import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/admission_repository.dart';
import '../../data/repositories/bourse_repository.dart';
import '../../models/bourse.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/photo_banniere.dart';

/// Page de détail d'une bourse, avec l'image en fond de header et un bouton
/// pour candidater. Charge le détail (avec ses champs) via [BourseRepository].
class BourseDetailScreen extends StatefulWidget {
  final String bourseId;

  const BourseDetailScreen({super.key, required this.bourseId});

  @override
  State<BourseDetailScreen> createState() => _BourseDetailScreenState();
}

class _BourseDetailScreenState extends State<BourseDetailScreen> {
  late Future<Bourse> _bourse;

  @override
  void initState() {
    super.initState();
    _bourse = context.read<BourseRepository>().detail(
      widget.bourseId,
      forcer: true,
    );
  }

  void _reessayer() {
    setState(() {
      _bourse = context.read<BourseRepository>().detail(
        widget.bourseId,
        forcer: true,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Bourse>(
      future: _bourse,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snap.hasError) {
          return Scaffold(
            appBar: AppBar(),
            body: ErreurChargement(onRetry: _reessayer),
          );
        }
        return _contenu(context, snap.data!);
      },
    );
  }

  Widget _contenu(BuildContext context, Bourse bourse) {
    final scheme = Theme.of(context).colorScheme;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: PopScope(
        canPop: context.canPop(),
        onPopInvokedWithResult: (didPop, result) {
          if (!didPop) {
            context.go('/bourses');
          }
        },
        child: Scaffold(
          body: Column(
            children: [
              // ---- En-tête avec l'image en arrière-plan + Hero transition ----
              Stack(
                children: [
                  PhotoBanniere(
                    url: bourse.imageBanniere,
                    couleur: AppColors.emerald,
                    icone: Icons.volunteer_activism,
                    hauteur: 200,
                    heroTag: 'bourse-image-${bourse.id}',
                    overlays: const [
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.black54, Colors.black87],
                          ),
                        ),
                      ),
                    ],
                  ),
                  Positioned.fill(
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                                  onPressed: () {
                                    if (context.canPop()) {
                                      context.pop();
                                    } else {
                                      context.go('/bourses');
                                    }
                                  },
                                ),
                              const Text(
                                'Bourse',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  shadows: [
                                    Shadow(color: Colors.black87, blurRadius: 8),
                                  ],
                                ),
                              ),
                              const Spacer(),
                              _BourseTag(fermee: !bourse.estOuverte),
                              IconButton(
                                icon: const Icon(Icons.share_outlined, color: Colors.white),
                                tooltip: 'Partager cette bourse',
                                onPressed: () {
                                  final url = 'https://sahel-academy-verif.vercel.app/app/bourse/${bourse.id}';
                                  final text = 'Découvrez la bourse "${bourse.titre}" sur Sahel Academy :\n\n👉 $url';
                                  // ignore: deprecated_member_use
                                  Share.share(text, subject: bourse.titre);
                                },
                              ),
                            ],
                          ),
                          const Spacer(),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  bourse.estOuverte ? 'BOURSE' : 'BOURSE CLÔTURÉE',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    shadows: const [
                                      Shadow(
                                        color: Colors.black87,
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  bourse.titre,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    height: 1.2,
                                    shadows: [
                                      Shadow(
                                        color: Colors.black87,
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // ---- Corps défilant ----
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  _reessayer();
                  await _bourse;
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Bandeau statut
                    if (!bourse.estOuverte)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFCA5A5)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.lock_clock_rounded, color: Color(0xFFDC2626)),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Les candidatures pour cette bourse sont actuellement closes. Il n\'est plus possible de soumettre de dossier.',
                                style: TextStyle(
                                  color: Color(0xFF991B1B),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13.5,
                                  height: 1.3,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.emerald.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.volunteer_activism, color: AppColors.emerald),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Programme de bourse d\'études Sahel Academy.',
                                style: TextStyle(
                                  color: AppColors.emeraldDark,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 20),

                    // Dates importantes
                    if (bourse.dateLimite != null) ...[
                      Text(
                        'Date limite',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: scheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.event, color: AppColors.emerald, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            formatDate(bourse.dateLimite!),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Description
                    if (bourse.description.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        'À propos de cette bourse',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: scheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        bourse.description,
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: _BarreCandidature(bourse: bourse),
      ),
    ),
  );
  }
}


/// Barre fixe en bas avec le bouton de candidature.
class _BarreCandidature extends StatefulWidget {
  final Bourse bourse;
  const _BarreCandidature({required this.bourse});

  @override
  State<_BarreCandidature> createState() => _BarreCandidatureState();
}

class _BarreCandidatureState extends State<_BarreCandidature> {
  bool _dejaPostule = false;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _verifier();
  }

  Future<void> _verifier() async {
    try {
      final candidature = await context
          .read<AdmissionRepository>()
          .maCandidatureBourse(widget.bourse.id);
      if (mounted) {
        setState(() {
          _dejaPostule = candidature != null;
          _chargement = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _chargement = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ouverte = widget.bourse.estOuverte;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_chargement)
              const SizedBox(
                height: 48,
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              )
            else if (_dejaPostule)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () =>
                      context.push('/bourse/${widget.bourse.id}/resultat'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    backgroundColor: AppColors.jauneFonce,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: const Icon(Icons.assignment_turned_in),
                  label: const Text(
                    'Voir ma candidature',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: ouverte
                      ? () => context.push('/postuler/${widget.bourse.id}')
                      : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    disabledBackgroundColor: const Color(0xFFCBD5E1),
                    disabledForegroundColor: const Color(0xFF64748B),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: Icon(ouverte ? Icons.volunteer_activism : Icons.lock_clock_rounded),
                  label: Text(
                    ouverte ? 'Candidater à la bourse' : 'Candidatures fermées',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Étiquette "Bourse" ou "Bourse clôturée" affichée dans le header.
class _BourseTag extends StatelessWidget {
  final bool fermee;

  const _BourseTag({this.fermee = false});

  @override
  Widget build(BuildContext context) {
    if (fermee) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white30, width: 0.8),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_clock_outlined, size: 14, color: Colors.white),
            SizedBox(width: 4),
            Text(
              'Bourse clôturée',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFEAB308),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.volunteer_activism, size: 14, color: Color(0xFF3A2E00)),
          SizedBox(width: 4),
          Text(
            'Bourse',
            style: TextStyle(
              color: Color(0xFF3A2E00),
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

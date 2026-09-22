import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/departement_ui.dart';
import '../../../core/utils/format.dart';
import '../../../data/repositories/formation_repository.dart';
import '../../../models/bourse.dart';
import '../../../widgets/photo_banniere.dart';

/// Carte présentant une bourse dans la liste des bourses.
class BourseCard extends StatelessWidget {
  final Bourse bourse;

  const BourseCard({super.key, required this.bourse});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dateLimite = bourse.dateLimite;
    final formationRepo = context.read<FormationRepository>();
    final linkedFormation = bourse.formationId != null
        ? formationRepo.getFormationParId(bourse.formationId!)
        : null;
    final deptId = bourse.departementId ?? linkedFormation?.departementId ?? 'info';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: InkWell(
        onTap: () => context.push('/bourse/${bourse.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- Bannière image (repli sur fond coloré) ----
            PhotoBanniere(
              url: bourse.imageBanniere,
              couleur: couleurDepartement(deptId),
              icone: iconeDepartement(deptId),
              heroTag: 'bourse-image-${bourse.id}',
              overlays: [
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white24, width: 0.8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          iconeDepartement(deptId),
                          size: 13,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          nomDepartement(deptId),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: _BourseBadge(estOuverte: bourse.estOuverte),
                ),
              ],
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bourse.titre,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                      height: 1.2,
                    ),
                  ),
                  if (bourse.description.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      bourse.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: scheme.outline, fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 14),

                  // ---- Statut / Date limite ----
                  if (!bourse.estOuverte)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF64748B).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.event_busy_outlined,
                            size: 18,
                            color: Color(0xFF475569),
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Candidatures clôturées',
                            style: TextStyle(
                              color: Color(0xFF475569),
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (dateLimite != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEAB308).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.event_outlined,
                            size: 18,
                            color: Color(0xFF854D0E),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Candidature avant le ${formatDate(dateLimite)}',
                            style: const TextStyle(
                              color: Color(0xFF854D0E),
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 14),

                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          onPressed: () => context.push('/bourse/${bourse.id}'),
                          style: FilledButton.styleFrom(
                            backgroundColor: bourse.estOuverte
                                ? AppColors.emerald
                                : const Color(0xFF475569),
                          ),
                          child: Text(
                            bourse.estOuverte ? 'Voir la bourse' : 'Consulter',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => context.push('/bourse/${bourse.id}/resultat'),
                        icon: const Icon(Icons.fact_check_outlined, size: 18),
                        label: const Text('Résultat'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Étiquette "Bourse" ou "Fermée" affichée sur la bannière.
class _BourseBadge extends StatelessWidget {
  final bool estOuverte;

  const _BourseBadge({this.estOuverte = true});

  @override
  Widget build(BuildContext context) {
    if (!estOuverte) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white24, width: 0.8),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_clock_outlined, size: 14, color: Colors.white),
            SizedBox(width: 4),
            Text(
              'Fermée',
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

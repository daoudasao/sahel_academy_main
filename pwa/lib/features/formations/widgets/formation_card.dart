import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/departement_ui.dart';
import '../../../core/utils/format.dart';
import '../../../models/formation.dart';
import '../../../widgets/photo_banniere.dart';

/// Carte présentant une formation dans le catalogue.
class FormationCard extends StatelessWidget {
  final Formation formation;

  const FormationCard({super.key, required this.formation});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final couleur = couleurDepartement(formation.departementId);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: InkWell(
        onTap: () => context.push('/formation/${formation.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- Bannière image (repli sur fond coloré) ----
            PhotoBanniere(
              url: formation.imageBanniere,
              couleur: couleur,
              icone: iconeDepartement(formation.departementId),
              heroTag: 'formation-image-${formation.id}',
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
                          iconeDepartement(formation.departementId),
                          size: 13,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          formation.departementNom ??
                              nomDepartement(formation.departementId),
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
                if (formation.estBourse)
                  const Positioned(top: 12, right: 12, child: _BourseBadge()),
              ],
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    formation.titre,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Formateur + niveau
                  Row(
                    children: [
                      Icon(Icons.person_outline,
                          size: 16, color: scheme.outline),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          formation.formateurNom,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: scheme.outline, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Icon(Icons.bar_chart, size: 16, color: scheme.outline),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          formation.niveau,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: scheme.outline, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // ---- Prix (pastilles) ----
                  if (formation.estBourse)
                    _PillGratuit(couleur: couleur)
                  else
                    Row(
                      children: [
                        Expanded(
                          child: _PillPrix(
                            label: 'Inscription',
                            valeur: formatFcfa(formation.prixInscription),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _PillPrix(
                            label: 'Par mois',
                            valeur: formatFcfa(formation.prixMensualite),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 14),

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () =>
                          context.push('/formation/${formation.id}'),
                      style: FilledButton.styleFrom(backgroundColor: couleur),
                      child: const Text('Voir la formation'),
                    ),
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

/// Étiquette blanche "Bourse" affichée sur la bannière.
class _BourseBadge extends StatelessWidget {
  const _BourseBadge();

  @override
  Widget build(BuildContext context) {
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

/// Pastille "libellé + montant" pour l'affichage des prix.
class _PillPrix extends StatelessWidget {
  final String label;
  final String valeur;

  const _PillPrix({required this.label, required this.valeur});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: scheme.outline)),
          const SizedBox(height: 2),
          Text(
            valeur,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

/// Pastille verte "Gratuit" pour les bourses.
class _PillGratuit extends StatelessWidget {
  final Color couleur;
  const _PillGratuit({required this.couleur});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF059669).withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Row(
        children: [
          Icon(Icons.check_circle, size: 18, color: Color(0xFF059669)),
          SizedBox(width: 8),
          Text(
            'Formation avec bourse',
            style: TextStyle(
              color: Color(0xFF065F46),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

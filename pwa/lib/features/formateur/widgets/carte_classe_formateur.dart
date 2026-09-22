import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/departement_ui.dart';
import '../../../models/espace_formateur.dart';
import '../../../widgets/photo_banniere.dart';

/// Carte d'une classe enseignée : accès au flux et à la liste des apprenants.
class CarteClasseFormateur extends StatelessWidget {
  final ClasseFormateur classe;

  const CarteClasseFormateur({super.key, required this.classe});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final couleur = couleurDepartement(classe.departementId);

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/classe/${classe.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PhotoBanniere(
              url: classe.imageUrl ?? '',
              couleur: couleur,
              icone: iconeDepartement(classe.departementId),
              hauteur: 90,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (classe.departementNom != null)
                    Text(
                      classe.departementNom!.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        color: couleur,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    classe.titre,
                    style: const TextStyle(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 14,
                    runSpacing: 6,
                    children: [
                      _info(scheme, Icons.groups_outlined,
                          '${classe.apprenants} apprenant${classe.apprenants > 1 ? 's' : ''}'),
                      _info(scheme, Icons.forum_outlined,
                          '${classe.messages} publication${classe.messages > 1 ? 's' : ''}'),
                      _info(scheme, Icons.folder_outlined,
                          '${classe.documents} document${classe.documents > 1 ? 's' : ''}'),
                    ],
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
              child: Row(
                children: [
                  TextButton.icon(
                    onPressed: () => context
                        .push('/formateur/classe/${classe.id}/apprenants'),
                    icon: const Icon(Icons.groups_outlined, size: 18),
                    label: const Text('Apprenants'),
                  ),
                  const Spacer(),
                  FilledButton.tonalIcon(
                    onPressed: () => context.push('/classe/${classe.id}'),
                    icon: const Icon(Icons.campaign_outlined, size: 18),
                    label: const Text('Ouvrir la classe'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _info(ColorScheme scheme, IconData icone, String texte) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icone, size: 16, color: scheme.outline),
        const SizedBox(width: 4),
        Text(
          texte,
          style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
        ),
      ],
    );
  }
}

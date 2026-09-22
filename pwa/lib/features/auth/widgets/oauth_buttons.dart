import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/google_auth_service.dart';
import '../../../data/repositories/auth_repository.dart';

/// Séparateur « ou continuer avec » + connexion Google.
///
/// Toute la section disparaît si Google n'est pas disponible : sans elle, il
/// resterait un séparateur suivi du vide.
class OAuthSection extends StatelessWidget {
  final VoidCallback? onGoogle;

  const OAuthSection({super.key, this.onGoogle});

  @override
  Widget build(BuildContext context) {
    if (!GoogleAuthService.instance.disponible) {
      return const SizedBox.shrink();
    }

    final scheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'ou continuer avec',
                style: TextStyle(color: scheme.outline, fontSize: 13),
              ),
            ),
            const Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 18),
        GoogleAuthBouton(onPressed: onGoogle),
      ],
    );
  }
}

/// Bouton « Continuer avec Google ».
///
/// Le parcours diffère selon la plateforme (feuille native sur mobile,
/// redirection sur le web), mais l'apparence et l'état de chargement sont
/// communs. Les erreurs, elles, ne sont pas affichées ici : sur le web elles
/// surviennent pendant le retour de redirection, alors que l'utilisateur n'est
/// pas forcément sur cet écran. C'est `SahelAcademyApp` qui les présente.
class GoogleAuthBouton extends StatelessWidget {
  final VoidCallback? onPressed;

  const GoogleAuthBouton({super.key, this.onPressed});

  @override
  Widget build(BuildContext context) {
    if (!GoogleAuthService.instance.disponible) {
      return const SizedBox.shrink();
    }

    final auth = context.watch<AuthRepository>();

    return OutlinedButton.icon(
      onPressed: auth.googleEnCours ? null : onPressed,
      icon: auth.googleEnCours
          ? const SizedBox(
              width: 22,
              height: 22,
              child: Center(
                child: SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2.2),
                ),
              ),
            )
          : const _GoogleG(),
      label: const Text('Continuer avec Google'),
    );
  }
}

/// Petit "G" aux couleurs de Google.
class _GoogleG extends StatelessWidget {
  const _GoogleG();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 22,
      height: 22,
      child: Center(
        child: Text(
          'G',
          style: TextStyle(
            color: Color(0xFF4285F4),
            fontWeight: FontWeight.w800,
            fontSize: 19,
          ),
        ),
      ),
    );
  }
}

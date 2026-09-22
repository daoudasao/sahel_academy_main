import 'package:flutter/material.dart';

/// Bannière d'illustration (image) affichée en haut des cartes.
///
/// Si l'image ne charge pas (hors ligne, erreur réseau), on retombe
/// proprement sur un dégradé de la couleur fournie + une icône.
class PhotoBanniere extends StatelessWidget {
  final String url;
  final Color couleur;
  final IconData icone;
  final double hauteur;
  final Object? heroTag;

  /// Éléments superposés (badges, titre...).
  final List<Widget> overlays;

  const PhotoBanniere({
    super.key,
    required this.url,
    required this.couleur,
    required this.icone,
    this.hauteur = 96,
    this.heroTag,
    this.overlays = const [],
  });

  @override
  Widget build(BuildContext context) {
    Widget content = SizedBox(
      height: hauteur,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            url,
            fit: BoxFit.cover,
            gaplessPlayback: true,
            loadingBuilder: (context, child, progress) =>
                progress == null ? child : _repli(),
            errorBuilder: (context, error, stack) => _repli(),
          ),
          // Léger voile pour la lisibilité des éléments superposés.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black26],
              ),
            ),
          ),
          ...overlays,
        ],
      ),
    );

    if (heroTag != null) {
      return Hero(
        tag: heroTag!,
        child: Material(
          type: MaterialType.transparency,
          child: content,
        ),
      );
    }

    return content;
  }

  Widget _repli() {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [couleur, Color.lerp(couleur, Colors.black, 0.28) ?? couleur],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Icon(icone, size: 40, color: Colors.white.withValues(alpha: 0.9)),
      ),
    );
  }
}

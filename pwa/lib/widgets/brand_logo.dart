import 'package:flutter/material.dart';

/// Logo de la marque Sahel Academy.
///
/// - Standard (`assets/logo.png`) : logo compact utilisé pour l'auth et l'app après connexion.
/// - Large (`assets/logo_large.png`) : logo horizontal pour la page splash / bienvenue.
class BrandLogo extends StatelessWidget {
  final double? width;
  final double? height;
  final bool isLarge;
  final BoxFit fit;

  const BrandLogo({
    super.key,
    double? width,
    double? height,
    double? size,
    this.isLarge = false,
    this.fit = BoxFit.contain,
  })  : width = width ?? size,
        height = height ?? size ?? (width == null ? 40 : null);


  const BrandLogo.large({
    super.key,
    this.width,
    this.height = 80,
    this.fit = BoxFit.contain,
  })  : isLarge = true;

  @override
  Widget build(BuildContext context) {
    final assetPath = isLarge ? 'assets/logo_large.png' : 'assets/logo.png';
    return Image.asset(
      assetPath,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) => Icon(
        Icons.school,
        size: height ?? 40,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }
}


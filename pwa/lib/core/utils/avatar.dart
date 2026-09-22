import 'package:flutter/material.dart';

/// Palette utilisée pour colorer les avatars selon le nom.
const List<Color> _paletteAvatars = [
  Color(0xFF4F46E5), // indigo
  Color(0xFF0D9488), // teal
  Color(0xFF7C3AED), // violet
  Color(0xFFEA580C), // orange
  Color(0xFFDB2777), // rose
  Color(0xFF0891B2), // cyan
  Color(0xFF059669), // émeraude
  Color(0xFFCA8A04), // ambre
];

/// Renvoie une couleur stable pour un nom donné (toujours la même).
Color couleurAvatar(String texte) =>
    _paletteAvatars[texte.hashCode.abs() % _paletteAvatars.length];

/// Renvoie les initiales d'un nom (1 à 2 lettres).
String initiales(String nom) {
  final mots = nom.trim().split(RegExp(r'\s+'));
  if (mots.isEmpty || mots.first.isEmpty) return '?';
  if (mots.length == 1) return mots.first.substring(0, 1).toUpperCase();
  return (mots.first.substring(0, 1) + mots[1].substring(0, 1)).toUpperCase();
}

/// Avatar circulaire : photo si elle est disponible, initiales sinon.
///
/// Les initiales servent aussi de **repli en cas d'échec de chargement** —
/// URL expirée, photo Google supprimée, appareil hors-ligne. Sans cela,
/// `CircleAvatar` laisserait un rond vide, puisque son `child` n'est rendu que
/// quand aucune image n'est fournie.
class UserAvatar extends StatefulWidget {
  final String nom;
  final String? avatarUrl;
  final double radius;
  final Color? backgroundColor;
  final Color? textColor;
  final double? tailleTexte;

  /// Affiché à la place des initiales pendant un téléversement.
  final Widget? enfantSurcharge;

  const UserAvatar({
    super.key,
    required this.nom,
    this.avatarUrl,
    this.radius = 20,
    this.backgroundColor,
    this.textColor,
    this.tailleTexte,
    this.enfantSurcharge,
  });

  @override
  State<UserAvatar> createState() => _UserAvatarState();
}

class _UserAvatarState extends State<UserAvatar> {
  bool _echecChargement = false;

  @override
  void didUpdateWidget(UserAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Nouvelle URL : on redonne sa chance à l'image.
    if (oldWidget.avatarUrl != widget.avatarUrl) _echecChargement = false;
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.avatarUrl?.trim() ?? '';
    final afficheImage = url.isNotEmpty && !_echecChargement;

    return CircleAvatar(
      radius: widget.radius,
      backgroundColor: widget.backgroundColor ??
          couleurAvatar(widget.nom).withValues(alpha: 0.15),
      backgroundImage: afficheImage ? NetworkImage(url) : null,
      onBackgroundImageError: afficheImage
          ? (_, _) {
              // Déclenché depuis le flux d'image : on repasse par une frame
              // pour ne pas appeler setState pendant un build.
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) setState(() => _echecChargement = true);
              });
            }
          : null,
      child: widget.enfantSurcharge ??
          (afficheImage
              ? null
              : Text(
                  initiales(widget.nom),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: widget.tailleTexte ?? widget.radius * 0.7,
                    color: widget.textColor ?? couleurAvatar(widget.nom),
                  ),
                )),
    );
  }
}

/// Construit un CircleAvatar supportant l'URL d'image ou le fallback initiales.
Widget buildUserAvatar({
  required String nom,
  String? avatarUrl,
  double radius = 20,
  Color? backgroundColor,
  Color? textColor,
}) {
  return UserAvatar(
    nom: nom,
    avatarUrl: avatarUrl,
    radius: radius,
    backgroundColor: backgroundColor,
    textColor: textColor,
  );
}

// Règles de saisie partagées par les écrans d'authentification et l'écran de
// complétion de profil, pour qu'un numéro accepté ici le soit partout.

/// Valide un numéro de téléphone **obligatoire**.
///
/// Tolère les espaces, points, tirets, parenthèses et l'indicatif `+`, mais
/// exige au moins 8 chiffres — un numéro malien en compte 8.
String? validerTelephone(String? valeur) {
  final saisie = valeur?.trim() ?? '';
  if (saisie.isEmpty) return 'Entre ton numéro de téléphone';

  final chiffres = saisie.replaceAll(RegExp(r'[^0-9]'), '');
  if (chiffres.length < 8) return 'Numéro trop court (8 chiffres minimum)';
  if (chiffres.length > 15) return 'Numéro trop long';
  if (!RegExp(r'^\+?[0-9][0-9\s().-]*$').hasMatch(saisie)) {
    return 'Numéro invalide';
  }
  return null;
}

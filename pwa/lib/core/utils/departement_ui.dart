import 'package:flutter/material.dart';

/// Associe une icône à un département (utilisé dans l'interface).
IconData iconeDepartement(String departementId) {
  switch (departementId) {
    case 'info':
      return Icons.computer;
    case 'compta':
      return Icons.calculate;
    case 'langues':
      return Icons.translate;
    case 'marketing':
      return Icons.campaign;
    default:
      return Icons.school;
  }
}

/// Couleur d'accent de chaque département, dans la palette vert → jaune de la
/// marque (nuances assez foncées pour rester lisibles en texte blanc).
Color couleurDepartement(String departementId) {
  switch (departementId) {
    case 'info':
      return const Color(0xFF15803D); // vert
    case 'compta':
      return const Color(0xFF047857); // émeraude
    case 'langues':
      return const Color(0xFF4D7C0F); // vert olive
    case 'marketing':
      return const Color(0xFFA16207); // or / jaune foncé
    default:
      return const Color(0xFF16A34A); // vert
  }
}

/// Nom affichable du département selon son identifiant.
String nomDepartement(String? departementId) {
  if (departementId == null || departementId.isEmpty) return 'Général';
  // Si c'est un identifiant CUID brut de la base de données (ex: "Cmt48rqf700001sb905bg5cyx"),
  // on affiche un libellé propre au lieu du CUID technique brut.
  if (departementId.length > 15 || departementId.startsWith('Cmt')) {
    return 'Formation';
  }
  switch (departementId.toLowerCase()) {
    case 'info':
      return 'Informatique';
    case 'compta':
      return 'Comptabilité';
    case 'langues':
      return 'Langues';
    case 'marketing':
      return 'Marketing';
    default:
      return departementId[0].toUpperCase() + departementId.substring(1);
  }
}

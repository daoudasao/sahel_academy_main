import 'package:url_launcher/url_launcher.dart';

import '../../models/centre.dart';

/// Ouvre l'itinéraire vers [centre] dans l'appli de cartes du téléphone
/// (Google Maps s'il est installé, sinon le navigateur).
///
/// Priorité : coordonnées GPS, puis lien Google Maps saisi par l'équipe,
/// puis recherche de l'adresse. Renvoie false si rien n'a pu être ouvert.
Future<bool> ouvrirItineraire(Centre centre) async {
  final Uri uri;
  if (centre.latitude != null && centre.longitude != null) {
    uri = Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': '${centre.latitude},${centre.longitude}',
    });
  } else if (centre.lienMaps != null) {
    final lien = Uri.tryParse(centre.lienMaps!);
    if (lien == null) return false;
    uri = lien;
  } else if (centre.adresse.isNotEmpty) {
    uri = Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': [
        centre.nom,
        centre.adresse,
        centre.ville,
      ].where((e) => e.isNotEmpty).join(', '),
    });
  } else {
    return false;
  }
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}

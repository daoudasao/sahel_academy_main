/// Créneau de rendez-vous proposé par un centre.
class CreneauCentre {
  final String id;
  final DateTime dateHeure;

  const CreneauCentre({required this.id, required this.dateHeure});
}

/// Un centre où l'on peut prendre rendez-vous, avec ses créneaux disponibles
/// et sa localisation (adresse, coordonnées GPS, lien Google Maps).
class Centre {
  final String id;
  final String nom;
  final String ville;
  final String adresse;
  final String telephone;
  final double? latitude;
  final double? longitude;
  final String? lienMaps;
  final List<CreneauCentre> creneaux;

  const Centre({
    required this.id,
    required this.nom,
    required this.ville,
    required this.adresse,
    required this.telephone,
    this.latitude,
    this.longitude,
    this.lienMaps,
    this.creneaux = const [],
  });

  /// Vrai si l'app peut proposer un itinéraire vers ce centre.
  bool get localisable =>
      (latitude != null && longitude != null) ||
      (lienMaps?.isNotEmpty ?? false) ||
      adresse.isNotEmpty;

  /// Créneaux encore à venir, du plus proche au plus lointain.
  List<CreneauCentre> get creneauxAVenir {
    final maintenant = DateTime.now();
    return creneaux.where((c) => c.dateHeure.isAfter(maintenant)).toList()
      ..sort((a, b) => a.dateHeure.compareTo(b.dateHeure));
  }

  /// Construit un Centre depuis le JSON de l'API (créneaux `{id, dateHeure}`).
  factory Centre.fromJson(Map<String, dynamic> j) {
    final cr = j['creneaux'];
    final creneaux = <CreneauCentre>[];
    if (cr is List) {
      for (final e in cr) {
        if (e is! Map) continue;
        final d = DateTime.tryParse('${e['dateHeure'] ?? ''}');
        final id = e['id']?.toString();
        if (d != null && id != null) {
          creneaux.add(CreneauCentre(id: id, dateHeure: d.toLocal()));
        }
      }
    }
    final lien = j['lienMaps']?.toString().trim();
    return Centre(
      id: (j['id'] ?? '').toString(),
      nom: (j['nom'] ?? '').toString(),
      ville: (j['ville'] ?? '').toString(),
      adresse: (j['adresse'] ?? '').toString(),
      telephone: (j['telephone'] ?? '').toString(),
      latitude: _nombre(j['latitude']),
      longitude: _nombre(j['longitude']),
      lienMaps: (lien == null || lien.isEmpty) ? null : lien,
      creneaux: creneaux,
    );
  }

  static double? _nombre(Object? v) =>
      v is num ? v.toDouble() : double.tryParse('${v ?? ''}');
}

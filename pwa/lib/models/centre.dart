/// Un centre où l'on peut prendre rendez-vous, avec ses créneaux disponibles.
class Centre {
  final String id;
  final String nom;
  final String ville;
  final String adresse;
  final String telephone;
  final List<DateTime> creneaux;

  const Centre({
    required this.id,
    required this.nom,
    required this.ville,
    required this.adresse,
    required this.telephone,
    required this.creneaux,
  });

  /// Construit un Centre depuis le JSON de l'API. Les créneaux backend sont des
  /// objets `{id, dateHeure}` → on ne garde que la date/heure pour l'affichage.
  factory Centre.fromJson(Map<String, dynamic> j) {
    final cr = j['creneaux'];
    final creneaux = <DateTime>[];
    if (cr is List) {
      for (final e in cr) {
        final dh = e is Map ? e['dateHeure'] : e;
        final d = DateTime.tryParse('${dh ?? ''}');
        if (d != null) creneaux.add(d);
      }
    }
    return Centre(
      id: (j['id'] ?? '').toString(),
      nom: (j['nom'] ?? '').toString(),
      ville: (j['ville'] ?? '').toString(),
      adresse: (j['adresse'] ?? '').toString(),
      telephone: (j['telephone'] ?? '').toString(),
      creneaux: creneaux,
    );
  }
}

/// Un média joint à un post d'actualité (photo, vidéo, audio).
class MediaPost {
  final String id;
  final String type; // "photo" | "video" | "audio"
  final String url;
  final String? nom;
  final int? taille;

  const MediaPost({
    required this.id,
    required this.type,
    required this.url,
    this.nom,
    this.taille,
  });

  bool get estPhoto => type == 'photo';
  bool get estVideo => type == 'video';
  bool get estAudio => type == 'audio';

  factory MediaPost.fromJson(Map<String, dynamic> j) {
    return MediaPost(
      id: (j['id'] ?? '').toString(),
      type: (j['type'] ?? 'photo').toString(),
      url: (j['url'] ?? '').toString(),
      nom: j['nom']?.toString(),
      taille: j['taille'] is num ? (j['taille'] as num).toInt() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'url': url,
      if (nom != null) 'nom': nom,
      if (taille != null) 'taille': taille,
    };
  }
}

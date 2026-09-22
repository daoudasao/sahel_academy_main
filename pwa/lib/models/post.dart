import 'action_post.dart';
import 'classe_message.dart';
import 'media_post.dart';

/// Un post du fil d'actualité (une info publiée par l'administration
/// ou un formateur, visible par tous).
class Post {
  final String id;
  final String auteurNom;
  final String auteurRole; // Admin, Formateur...
  final String contenu;
  final DateTime date;
  final int likes;
  final bool aime; // l'utilisateur courant a-t-il déjà aimé ce post ?
  final String? documentNom; // nom d'un document joint (optionnel)
  final List<MediaPost> medias; // photos, vidéos, audios joints
  final List<Commentaire> commentaires;
  final List<ActionPost> actions; // boutons de redirection (optionnels)

  Post({
    required this.id,
    required this.auteurNom,
    required this.auteurRole,
    required this.contenu,
    required this.date,
    this.likes = 0,
    this.aime = false,
    this.documentNom,
    this.medias = const [],
    List<Commentaire>? commentaires,
    this.actions = const [],
  }) : commentaires = commentaires ?? [];

  /// Construit un Post depuis le JSON de l'API backend.
  ///
  /// Le backend n'a pas de suivi du « j'aime » par utilisateur → [aime] reste
  /// `false` (le compteur [likes], lui, est réel). Les commentaires renvoyés
  /// sont les racines (parentId null) avec leurs [reponses] imbriquées.
  factory Post.fromJson(Map<String, dynamic> j) {
    int toI(dynamic v) =>
        v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
    final doc = j['documentNom'];
    final medList = j['medias'];
    final coms = j['commentaires'];
    final acts = j['actions'];
    return Post(
      id: (j['id'] ?? '').toString(),
      auteurNom: (j['auteurNom'] ?? '').toString(),
      auteurRole: (j['role'] ?? j['auteurRole'] ?? '').toString(),
      contenu: (j['contenu'] ?? '').toString(),
      date:
          DateTime.tryParse('${j['createdAt'] ?? j['date'] ?? ''}') ??
          DateTime.now(),
      likes: toI(j['likes']),
      aime: false,
      documentNom: (doc is String && doc.isNotEmpty) ? doc : null,
      medias: medList is List
          ? medList
                .map((e) => MediaPost.fromJson(Map<String, dynamic>.from(e)))
                .toList()
          : const [],
      commentaires: coms is List
          ? coms
                .map((e) => Commentaire.fromJson(Map<String, dynamic>.from(e)))
                .toList()
          : null,
      actions: acts is List
          ? acts
                .map((e) => ActionPost.fromJson(Map<String, dynamic>.from(e)))
                .toList()
          : const [],
    );
  }

  /// Nombre total de commentaires (y compris les réponses).
  int get nbCommentaires =>
      commentaires.fold(0, (total, c) => total + 1 + c.reponses.length);

  Post copyWith({
    String? id,
    String? auteurNom,
    String? auteurRole,
    String? contenu,
    DateTime? date,
    int? likes,
    bool? aime,
    String? documentNom,
    List<MediaPost>? medias,
    List<Commentaire>? commentaires,
    List<ActionPost>? actions,
  }) {
    return Post(
      id: id ?? this.id,
      auteurNom: auteurNom ?? this.auteurNom,
      auteurRole: auteurRole ?? this.auteurRole,
      contenu: contenu ?? this.contenu,
      date: date ?? this.date,
      likes: likes ?? this.likes,
      aime: aime ?? this.aime,
      documentNom: documentNom ?? this.documentNom,
      medias: medias ?? this.medias,
      commentaires: commentaires ?? this.commentaires,
      actions: actions ?? this.actions,
    );
  }
}

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import '../../core/api/api_client.dart';
import '../../core/api/api_config.dart';
import '../../core/utils/safe_change_notifier.dart';
import '../../models/classe_message.dart';
import '../../models/post.dart';

/// Point d'accès au fil d'actualité, branché sur l'API NestJS + WebSocket.
class ActualiteRepository extends ChangeNotifier with SafeChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  List<Post> _posts = [];
  bool _enChargement = false;
  bool _charge = false;
  String? _erreur;
  socket_io.Socket? _socket;
  bool _socketInitialise = false;

  List<Post> getPosts() => List.unmodifiable(_posts);
  bool get enChargement => _enChargement;
  bool get estCharge => _charge;
  String? get erreur => _erreur;

  ActualiteRepository() {
    charger();
  }

  /// Initialise la connexion WebSocket au fil d'actualités.
  Future<void> initialiserSocket() async {
    if (_socketInitialise && _socket != null && _socket!.connected) return;

    final token = await _api.getToken();
    final socketUrl = ApiConfig.baseUrl.replaceAll(RegExp(r'/api/v1/?$'), '');

    _socket?.dispose();
    _socket = socket_io.io(
      '$socketUrl/actualites',
      socket_io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token ?? ''})
          .build(),
    );

    _socket?.onConnect((_) {
      _socketInitialise = true;
      notifyListeners();
    });

    _socket?.on('new_post', (data) {
      if (data is Map) {
        final post = Post.fromJson(Map<String, dynamic>.from(data));
        if (!_posts.any((p) => p.id == post.id)) {
          _posts.insert(0, post);
          notifyListeners();
        }
      }
    });

    _socket?.on('post_updated', (data) {
      if (data is Map) {
        final post = Post.fromJson(Map<String, dynamic>.from(data));
        final index = _posts.indexWhere((p) => p.id == post.id);
        if (index != -1) {
          _posts[index] = post;
          notifyListeners();
        }
      }
    });

    _socket?.on('post_deleted', (data) {
      if (data is Map) {
        final id = data['id']?.toString();
        if (id != null) {
          _posts.removeWhere((p) => p.id == id);
          notifyListeners();
        }
      }
    });

    _socket?.on('post_liked', (data) {
      if (data is Map) {
        final postId = data['postId']?.toString();
        final likes =
            data['likes'] is num ? (data['likes'] as num).toInt() : null;
        if (postId != null && likes != null) {
          final index = _posts.indexWhere((p) => p.id == postId);
          if (index != -1) {
            _posts[index] = _posts[index].copyWith(likes: likes);
            notifyListeners();
          }
        }
      }
    });

    _socket?.on('new_commentaire', (data) {
      if (data is Map) {
        final postId = data['postId']?.toString();
        final commData = data['commentaire'];
        if (postId != null && commData is Map) {
          final comm = Commentaire.fromJson(
            Map<String, dynamic>.from(commData),
          );
          final post = getPost(postId);
          if (post != null) {
            if (commData['parentId'] == null) {
              final existe = post.commentaires.any((c) => c.id == comm.id);
              if (!existe) {
                post.commentaires.add(comm);
                notifyListeners();
              }
            } else {
              final parentId = commData['parentId'].toString();
              for (final c in post.commentaires) {
                if (c.id == parentId) {
                  final existe = c.reponses.any((r) => r.id == comm.id);
                  if (!existe) {
                    c.reponses.add(comm);
                    notifyListeners();
                  }
                  break;
                }
              }
            }
          }
        }
      }
    });

    _socket?.on('commentaire_deleted', (data) {
      if (data is Map) {
        final postId = data['postId']?.toString();
        final commId = data['commentaireId']?.toString();
        if (postId != null && commId != null) {
          final post = getPost(postId);
          if (post != null) {
            post.commentaires.removeWhere((c) => c.id == commId);
            for (final c in post.commentaires) {
              c.reponses.removeWhere((r) => r.id == commId);
            }
            notifyListeners();
          }
        }
      }
    });

    _socket?.connect();
  }

  void deconnecterSocket() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _socketInitialise = false;
  }

  Post? getPost(String id) {
    for (final p in _posts) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// Récupère un post individuel par son ID pour les deep links.
  ///
  /// Si le post est déjà en mémoire et que [forcer] est false, le retourne
  /// directement sans appel réseau. Sinon, appelle `GET /actualites/:id`,
  /// insère ou met à jour le post dans la liste locale et initialise le
  /// socket si ce n'est pas déjà fait.
  Future<Post> detail(String id, {bool forcer = false}) async {
    // Retour direct depuis le cache
    if (!forcer) {
      final cached = getPost(id);
      if (cached != null) return cached;
    }

    final data = await _api.get('/actualites/$id');
    final post = Post.fromJson(Map<String, dynamic>.from(data as Map));

    final index = _posts.indexWhere((p) => p.id == id);
    if (index != -1) {
      _posts[index] = post;
    } else {
      _posts.insert(0, post);
    }

    // Assure que le socket est actif pour les mises à jour temps réel
    await initialiserSocket();
    notifyListeners();
    return post;
  }

  /// Charge (ou recharge) le fil depuis l'API REST.
  Future<void> charger({bool forcer = false}) async {
    if (_enChargement) return;
    if (_charge && !forcer) return;
    _enChargement = true;
    _erreur = null;
    notifyListeners();
    try {
      final data = await _api.get('/actualites');
      _posts = _versListe(
        data,
      ).map((e) => Post.fromJson(Map<String, dynamic>.from(e))).toList();
      _charge = true;
      await initialiserSocket();
    } catch (e) {
      _erreur = e.toString();
    } finally {
      _enChargement = false;
      notifyListeners();
    }
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }

  /// Ajoute une mention "J'aime" sur un post.
  Future<void> likerPost(String postId) async {
    try {
      final data = await _api.post('/actualites/$postId/like');
      if (data is Map && data['likes'] != null) {
        final likes = (data['likes'] as num).toInt();
        final index = _posts.indexWhere((p) => p.id == postId);
        if (index != -1) {
          _posts[index] = _posts[index].copyWith(likes: likes, aime: true);
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  /// Retire une mention "J'aime" sur un post.
  Future<void> unlikerPost(String postId) async {
    try {
      final data = await _api.post('/actualites/$postId/unlike');
      if (data is Map && data['likes'] != null) {
        final likes = (data['likes'] as num).toInt();
        final index = _posts.indexWhere((p) => p.id == postId);
        if (index != -1) {
          _posts[index] = _posts[index].copyWith(likes: likes, aime: false);
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  /// Ajoute un commentaire sous un post.
  Future<void> ajouterCommentaire({
    required String postId,
    required String auteurNom,
    required String contenu,
  }) async {
    final data = await _api.post('/actualites/$postId/commentaires', {
      'auteur': auteurNom,
      'contenu': contenu,
      'role': 'Élève',
    });
    final post = getPost(postId);
    if (post != null && data is Map) {
      final comm = Commentaire.fromJson(Map<String, dynamic>.from(data));
      final existe = post.commentaires.any((c) => c.id == comm.id);
      if (!existe) {
        post.commentaires.add(comm);
        notifyListeners();
      }
    }
  }

  /// Ajoute une réponse à un commentaire existant.
  Future<void> ajouterReponse({
    required String postId,
    required String commentaireId,
    required String auteurNom,
    required String contenu,
  }) async {
    final data = await _api.post('/actualites/$postId/commentaires', {
      'auteur': auteurNom,
      'contenu': contenu,
      'role': 'Élève',
      'parentId': commentaireId,
    });
    final post = getPost(postId);
    if (post == null) return;
    for (final c in post.commentaires) {
      if (c.id == commentaireId) {
        if (data is Map) {
          final rep = Commentaire.fromJson(Map<String, dynamic>.from(data));
          final existe = c.reponses.any((r) => r.id == rep.id);
          if (!existe) {
            c.reponses.add(rep);
            notifyListeners();
          }
        }
        return;
      }
    }
  }

  @override
  void dispose() {
    deconnecterSocket();
    super.dispose();
  }
}

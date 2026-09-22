import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Erreur renvoyée par l'API (statut HTTP non 2xx) ou réseau.
class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

/// Client HTTP unique de l'application.
///
/// - Ajoute automatiquement l'en-tête `Authorization: Bearer <token>`.
/// - Capture le token de session renvoyé par better-auth (`set-auth-token`)
///   et le persiste de façon sécurisée (`flutter_secure_storage`).
/// - Décode le JSON et lève [ApiException] en cas d'erreur.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const _tokenKey = 'sa_session_token';
  static const _userKey = 'sa_user_data';

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  String? _token;
  bool _tokenLoaded = false;

  /// Callback appelé lorsqu'une réponse HTTP 401 (non authentifié) est reçue.
  void Function()? onUnauthenticated;

  Future<void> _ensureToken() async {
    if (_tokenLoaded) return;
    try {
      _token = await _storage.read(key: _tokenKey);
    } catch (_) {
      _token = null;
    }
    _tokenLoaded = true;
  }

  Future<void> _setToken(String? token) async {
    _token = token;
    _tokenLoaded = true;
    if (token == null || token.isEmpty) {
      await _storage.delete(key: _tokenKey);
      await clearCachedUserJson();
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
  }

  Future<bool> hasToken() async {
    await _ensureToken();
    return _token != null && _token!.isNotEmpty;
  }

  Future<String?> getToken() async {
    await _ensureToken();
    return _token;
  }

  Future<void> clearToken() async {
    await _setToken(null);
    onUnauthenticated?.call();
  }

  Future<String?> getCachedUserJson() async {
    try {
      return await _storage.read(key: _userKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> setCachedUserJson(String? jsonStr) async {
    if (jsonStr == null || jsonStr.isEmpty) {
      await _storage.delete(key: _userKey);
    } else {
      await _storage.write(key: _userKey, value: jsonStr);
    }
  }

  Future<void> clearCachedUserJson() async {
    try {
      await _storage.delete(key: _userKey);
    } catch (_) {
      /* ignorer */
    }
  }

  Map<String, String> _headers() => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_token != null && _token!.isNotEmpty)
          'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body);
  Future<dynamic> patch(String path, [Object? body]) =>
      _send('PATCH', path, body);
  Future<dynamic> delete(String path) => _send('DELETE', path);

  /// Notifie si l'application fonctionne actuellement en mode hors ligne (données servies depuis le cache).
  final ValueNotifier<bool> isOffline = ValueNotifier<bool>(false);

  /// Préfixe pour le stockage des réponses en cache.
  static const _cachePrefix = 'sa_cache_';

  /// Détermine si un chemin GET fait partie des données essentielles mises en cache hors ligne.
  bool _isCacheable(String path) {
    if (path.startsWith('/users/me') ||
        path.startsWith('/formations') ||
        path.startsWith('/departements') ||
        path.startsWith('/classes') ||
        path.startsWith('/actualites') ||
        path.startsWith('/bourses') ||
        path.startsWith('/centres') ||
        path.startsWith('/admissions/mes-candidatures')) {
      return true;
    }
    return false;
  }

  Future<dynamic> _readCache(String path) async {
    try {
      final key = '$_cachePrefix$path';
      final cachedStr = await _storage.read(key: key);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        return jsonDecode(cachedStr);
      }
    } catch (_) {
      // Ignorer l'erreur de lecture du cache
    }
    return null;
  }

  Future<void> _writeCache(String path, String responseBody) async {
    try {
      final key = '$_cachePrefix$path';
      await _storage.write(key: key, value: responseBody);
    } catch (_) {
      // Ignorer l'erreur d'écriture du cache
    }
  }

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    await _ensureToken();
    final uri = _uri(path);
    final headers = _headers();
    final encoded = body == null ? null : jsonEncode(body);

    http.Response res;
    try {
      switch (method) {
        case 'POST':
          res = await http.post(uri, headers: headers, body: encoded);
          break;
        case 'PATCH':
          res = await http.patch(uri, headers: headers, body: encoded);
          break;
        case 'DELETE':
          res = await http.delete(uri, headers: headers);
          break;
        case 'GET':
        default:
          res = await http.get(uri, headers: headers);
          break;
      }
      // Si la requête a abouti en réseau, nous ne sommes pas hors ligne
      if (isOffline.value) {
        isOffline.value = false;
      }
    } catch (e) {
      // En cas de panne réseau ou hors ligne, tenter de charger depuis le cache si c'est une requête GET essentielle
      if (method == 'GET' && _isCacheable(path)) {
        final cached = await _readCache(path);
        if (cached != null) {
          if (!isOffline.value) {
            isOffline.value = true;
          }
          return cached;
        }
      }
      throw ApiException(0, 'Impossible de joindre le serveur. Vérifiez votre connexion.');
    }

    // better-auth renvoie le token de session dans cet en-tête (plugin bearer).
    final authToken = res.headers['set-auth-token'];
    if (authToken != null && authToken.isNotEmpty) {
      await _setToken(authToken);
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;

      // Mettre en cache les requêtes GET essentielles réussies
      if (method == 'GET' && _isCacheable(path)) {
        await _writeCache(path, res.body);
      }

      try {
        return jsonDecode(res.body);
      } catch (_) {
        return res.body;
      }
    }

    if (res.statusCode == 401) {
      // session expirée / invalide
      await clearToken();
    }

    String message = 'Erreur ${res.statusCode}';
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map) {
        final m = decoded['message'] ?? decoded['error'];
        if (m is List) {
          message = m.join(', ');
        } else if (m != null) {
          message = m.toString();
        }
      }
    } catch (_) {
      /* corps non JSON */
    }
    throw ApiException(res.statusCode, message);
  }

  Future<String> uploadMultipart(List<int> bytes, String filename, {String folder = 'support'}) async {
    await _ensureToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}/upload?type=$folder');
    final req = http.MultipartRequest('POST', uri);
    if (_token != null && _token!.isNotEmpty) {
      req.headers['Authorization'] = 'Bearer $_token';
    }
    req.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['url'] != null) {
        return decoded['url'].toString();
      }
    }
    if (res.statusCode == 401) {
      await clearToken();
    }
    throw ApiException(res.statusCode, 'Erreur lors du téléversement du fichier audio.');
  }
}

import '../../core/api/api_client.dart';
import '../../models/admission.dart';

/// Gère les candidatures aux bourses et leur suivi, branché sur l'API NestJS.
///
/// - Soumission : `POST /bourses/:bourseId/candidatures` (authentifié).
/// - Suivi : `GET /bourses/candidatures/me` (scopé à l'utilisateur connecté).
class AdmissionRepository {
  final ApiClient _api = ApiClient.instance;

  /// Les candidatures de l'utilisateur connecté (plus récentes d'abord).
  Future<List<Admission>> mesCandidatures() async {
    try {
      final data = await _api.get('/bourses/candidatures/me');
      return _versListe(
        data,
      ).map((e) => Admission.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Récupère la candidature spécifique pour une bourse ou formation donnée.
  Future<Admission?> maCandidatureBourse(String bourseOrFormationId) async {
    try {
      final candidatures = await mesCandidatures();
      for (final c in candidatures) {
        if (c.bourseId == bourseOrFormationId || c.formationId == bourseOrFormationId) {
          return c;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Soumet une candidature à une bourse et renvoie la candidature créée.
  Future<Admission> soumettre({
    required String bourseId,
    required String userId,
    required String nom,
    required String email,
    required Map<String, dynamic> reponses,
  }) async {
    final data = await _api.post('/bourses/$bourseId/candidatures', {
      'userId': userId,
      'nom': nom,
      'email': email,
      'reponses': reponses,
    });
    return Admission.fromJson(Map<String, dynamic>.from(data as Map));
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }
}

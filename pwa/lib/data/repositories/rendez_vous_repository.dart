import '../../core/api/api_client.dart';
import '../../models/rendez_vous.dart';

/// Rendez-vous de l'utilisateur connecté (`/rendez-vous`).
class RendezVousRepository {
  final ApiClient _api = ApiClient.instance;

  /// Mes rendez-vous, du plus récent au plus ancien.
  Future<List<RendezVous>> mesRendezVous() async {
    final data = await _api.get('/rendez-vous/mes');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => RendezVous.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Réserve [creneauId] ; l'équipe confirme ensuite depuis le dashboard.
  Future<RendezVous> prendre(String creneauId, {String? motif}) async {
    final data = await _api.post('/rendez-vous', {
      'creneauId': creneauId,
      if (motif != null && motif.trim().isNotEmpty) 'motif': motif.trim(),
    });
    return RendezVous.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> annuler(String id) => _api.patch('/rendez-vous/mes/$id/annuler');
}

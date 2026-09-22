import '../../core/api/api_client.dart';
import '../../models/centre.dart';

/// Fournit la liste des centres et leurs créneaux de rendez-vous.
///
/// Branché sur l'API NestJS (`GET /centres`, route authentifiée). Les centres
/// sont chargés une fois puis mis en cache ; [getCentres] reste synchrone.
class CentreRepository {
  final ApiClient _api = ApiClient.instance;

  List<Centre> _centres = const [];
  Future<void>? _chargement;
  bool _charge = false;

  bool get estCharge => _charge;

  Future<void> charger({bool forcer = false}) {
    if (forcer) {
      _charge = false;
      _chargement = null;
    }
    if (_charge) return Future.value();
    return _chargement ??= _chargerImpl();
  }

  Future<void> _chargerImpl() async {
    try {
      final data = await _api.get('/centres');
      _centres = _versListe(
        data,
      ).map((e) => Centre.fromJson(Map<String, dynamic>.from(e))).toList();
      _charge = true;
    } catch (_) {
      _chargement = null; // permet de réessayer au prochain appel
      rethrow;
    }
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }

  List<Centre> getCentres() => _centres;
}

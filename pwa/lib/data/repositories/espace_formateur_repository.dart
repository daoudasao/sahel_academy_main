import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/safe_change_notifier.dart';
import '../../models/espace_formateur.dart';

/// Espace du formateur connecté, branché sur `/espace-formateur`.
///
/// Les données sont rattachées à l'utilisateur qui les a chargées : un
/// changement de compte force un nouveau chargement.
class EspaceFormateurRepository extends ChangeNotifier with SafeChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  String? _userId;
  EspaceFormateur? _espace;
  bool _enChargement = false;
  String? _erreur;

  EspaceFormateur? get espace => _espace;
  bool get enChargement => _enChargement;
  String? get erreur => _erreur;

  Future<void> charger(String userId, {bool forcer = false}) async {
    if (_enChargement) return;
    if (!forcer && _userId == userId && _espace != null) return;
    if (_userId != userId) _espace = null;
    _userId = userId;
    _enChargement = true;
    _erreur = null;
    notifyListeners();
    try {
      final data = await _api.get('/espace-formateur/tableau-de-bord');
      _espace = EspaceFormateur.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      _erreur = e.toString();
    } finally {
      _enChargement = false;
      notifyListeners();
    }
  }

  Future<List<ApprenantClasse>> apprenants(String formationId) async {
    final data =
        await _api.get('/espace-formateur/classes/$formationId/apprenants');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => ApprenantClasse.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

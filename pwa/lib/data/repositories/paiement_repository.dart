import '../../core/api/api_client.dart';
import '../../models/paiement.dart';

/// Fournit les échéanciers de paiement de l'utilisateur et calcule les résumés.
///
/// Suivi **manuel** : c'est l'administration qui enregistre les paiements ;
/// l'utilisateur ne fait que consulter. Branché sur l'API NestJS
/// (`GET /paiements?userId=…`, route authentifiée). Les échéances de
/// l'utilisateur sont chargées une fois puis mises en cache ; les méthodes de
/// lecture restent synchrones (les écrans lisent le cache).
class PaiementRepository {
  final ApiClient _api = ApiClient.instance;

  List<Echeance> _echeances = const [];
  String? _userId;
  Future<void>? _chargement;
  bool _charge = false;

  bool get estCharge => _charge;

  /// Charge les échéances de [userId] depuis l'API (une seule fois par
  /// utilisateur). Rechargement possible avec [forcer] ou si l'utilisateur
  /// change.
  Future<void> charger(String userId, {bool forcer = false}) {
    if (forcer || _userId != userId) {
      _charge = false;
      _chargement = null;
      _userId = userId;
    }
    if (_charge) return Future.value();
    return _chargement ??= _chargerImpl(userId);
  }

  Future<void> _chargerImpl(String userId) async {
    try {
      final data = await _api.get('/paiements?userId=$userId');
      final liste = _versListe(data);
      _echeances = liste
          .map((e) => Echeance.fromJson(Map<String, dynamic>.from(e)))
          .toList();
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

  /// Identifiants de formation distincts présents dans les échéances,
  /// dans l'ordre de première apparition (pour lister « mes paiements »).
  List<String> get formationIds {
    final vus = <String>{};
    final ordre = <String>[];
    for (final e in _echeances) {
      if (vus.add(e.formationId)) ordre.add(e.formationId);
    }
    return ordre;
  }

  /// Échéances d'une formation, triées par date d'échéance.
  List<Echeance> echeances(String formationId) =>
      _echeances.where((e) => e.formationId == formationId).toList()
        ..sort((a, b) => a.dateEcheance.compareTo(b.dateEcheance));

  /// Résumé pour une seule formation.
  ResumePaiement resume(String formationId) =>
      _resumeDe(echeances(formationId));

  /// Résumé cumulé sur plusieurs formations.
  ResumePaiement resumeGlobal(List<String> formationIds) =>
      _resumeDe(formationIds.expand(echeances).toList());

  ResumePaiement _resumeDe(List<Echeance> liste) {
    double total = 0;
    double paye = 0;
    for (final e in liste) {
      total += e.montantDu;
      paye += e.montantPaye;
    }
    final nonSoldees = liste.where((e) => !e.soldee).toList()
      ..sort((a, b) => a.dateEcheance.compareTo(b.dateEcheance));
    return ResumePaiement(
      total: total,
      paye: paye,
      prochaine: nonSoldees.isEmpty ? null : nonSoldees.first,
    );
  }
}

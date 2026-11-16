import '../../core/api/api_client.dart';

/// Paramètres globaux modifiables depuis le dashboard (`GET /parametres`,
/// public) : numéro WhatsApp du service client…
///
/// Relus à chaque ouverture d'écran qui en a besoin (cache mémoire de
/// 5 minutes) ; en cas d'échec, dernière valeur connue ou valeur par défaut.
class ParametresRepository {
  final ApiClient _api = ApiClient.instance;

  /// Valeur de secours (même défaut que le backend).
  static const _whatsappDefaut = 'https://wa.me/22371493177';

  String _whatsappLien = _whatsappDefaut;
  DateTime? _chargeLe;

  /// Lien wa.me du service client (sans message).
  Future<String> lienWhatsapp() async {
    final frais =
        _chargeLe != null &&
        DateTime.now().difference(_chargeLe!) < const Duration(minutes: 5);
    if (!frais) {
      try {
        final data = await _api.get('/parametres');
        final lien = data is Map ? data['whatsappLien']?.toString() : null;
        if (lien != null && lien.startsWith('https://wa.me/')) {
          _whatsappLien = lien;
        }
        _chargeLe = DateTime.now();
      } catch (_) {
        // Hors ligne : on garde la dernière valeur connue.
      }
    }
    return _whatsappLien;
  }
}

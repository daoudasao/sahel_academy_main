/// Catégorie d'une notification (détermine icône et couleur).
enum TypeNotification { actualite, paiement, classe, commentaire, systeme }

/// Une notification affichée dans le centre de notifications.
///
/// `route` = destination au tap (null = simplement informative).
/// `lu` est modifiable pour marquer la notification comme lue.
class NotificationItem {
  final String id;
  final TypeNotification type;
  final String titre;
  final String message;
  final DateTime date;
  final String? route;
  final String? cible;
  final String? cibleId;
  final String? documentUrl;
  final String? documentNom;
  bool lu;

  NotificationItem({
    required this.id,
    required this.type,
    required this.titre,
    required this.message,
    required this.date,
    this.route,
    this.cible,
    this.cibleId,
    this.documentUrl,
    this.documentNom,
    this.lu = false,
  });

  /// Construit une NotificationItem depuis le JSON de l'API.
  factory NotificationItem.fromJson(Map<String, dynamic> j) {
    final typeStr = (j['type'] ?? '').toString();
    final type = TypeNotification.values.firstWhere(
      (t) => t.name == typeStr,
      orElse: () => TypeNotification.systeme,
    );

    final cible = j['cible']?.toString();
    final cibleId = j['cibleId']?.toString();
    final titre = (j['titre'] ?? '').toString();
    final message = (j['message'] ?? '').toString();
    final documentUrl = j['documentUrl']?.toString();
    final documentNom = j['documentNom']?.toString();

    return NotificationItem(
      id: (j['id'] ?? '').toString(),
      type: type,
      titre: titre,
      message: message,
      date:
          DateTime.tryParse('${j['createdAt'] ?? j['date'] ?? ''}') ??
          DateTime.now(),
      cible: cible,
      cibleId: cibleId,
      documentUrl: documentUrl,
      documentNom: documentNom,
      route: determinerRoute(
        type: type,
        cible: cible,
        cibleId: cibleId,
        titre: titre,
        message: message,
      ),
      lu: j['lu'] == true,
    );
  }

  /// Détermine la route de navigation appropriée pour n'importe quelle notification.
  static String? determinerRoute({
    required TypeNotification type,
    String? cible,
    String? cibleId,
    required String titre,
    required String message,
  }) {
    final titreLower = titre.toLowerCase();
    final messageLower = message.toLowerCase();

    // 1. Paiements
    if (type == TypeNotification.paiement || cible == 'paiement') {
      return '/paiements';
    }

    // 2. Classe / Cours / Inscription
    if (type == TypeNotification.classe ||
        cible == 'classe' ||
        cible == 'formation') {
      if (cibleId != null && cibleId.isNotEmpty) {
        return '/classe/$cibleId';
      }
      return '/mes-formations';
    }

    // 3. Annonces / Actualités / Discussion
    if (type == TypeNotification.actualite ||
        type == TypeNotification.commentaire ||
        cible == 'actualite') {
      if (cibleId != null && cibleId.isNotEmpty) {
        return '/post/$cibleId';
      }
      return '/actualite';
    }

    // 4. Bourses & Candidatures
    if (cible == 'bourse' ||
        titreLower.contains('bourse') ||
        messageLower.contains('bourse') ||
        titreLower.contains('candidature') ||
        messageLower.contains('candidature')) {
      if (cibleId != null && cibleId.isNotEmpty) {
        return '/bourse/$cibleId';
      }
      return '/resultats';
    }

    // 5. Support technique / Messages admin
    if (titreLower.contains('support') ||
        messageLower.contains('support') ||
        titreLower.contains('message')) {
      return '/support';
    }

    // 6. Autres notifications système
    if (type == TypeNotification.systeme) {
      if (cibleId != null && cibleId.isNotEmpty) {
        return '/formation/$cibleId';
      }
    }

    return null;
  }
}

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
      route:
          routeServeur(j['route']) ??
          determinerRoute(
            type: type,
            cible: cible,
            cibleId: cibleId,
            titre: titre,
            message: message,
          ),
      lu: j['lu'] == true,
    );
  }

  /// Route fournie par le serveur (champ `route` de la notification ou du
  /// push). Seuls les chemins internes sont acceptés.
  static String? routeServeur(Object? valeur) {
    final route = valeur?.toString().trim() ?? '';
    return RegExp(r'^/[A-Za-z0-9/_-]*$').hasMatch(route) ? route : null;
  }

  /// Destination déduite pour les notifications sans route fournie par le
  /// serveur (anciennes notifications). La cible prime sur le type : une
  /// notification de résultat de bourse est par exemple de type « classe ».
  static String? determinerRoute({
    required TypeNotification type,
    String? cible,
    String? cibleId,
    required String titre,
    required String message,
  }) {
    final titreLower = titre.toLowerCase();
    final messageLower = message.toLowerCase();
    final aId = cibleId != null && cibleId.isNotEmpty;

    // 1. Messages du support
    if (cible == 'support') return '/support';

    // 2. Résultat d'une candidature à une bourse
    if (cible == 'bourse') {
      return aId ? '/bourse/$cibleId/resultat' : '/resultats';
    }

    // 3. Paiements
    if (type == TypeNotification.paiement ||
        cible == 'paiement' ||
        cible == 'retard') {
      return '/paiements';
    }

    // 4. Classe / Cours / Inscription
    if (cible == 'classe' || cible == 'formation') {
      return aId ? '/classe/$cibleId' : '/mes-formations';
    }
    if (type == TypeNotification.classe) return '/mes-formations';

    // 5. Actualités. Les anciennes notifications d'actualité n'avaient pas
    //    d'identifiant ; une notification « actualité » globale qui en porte un
    //    annonçait l'ouverture d'une bourse.
    if (type == TypeNotification.actualite ||
        type == TypeNotification.commentaire ||
        cible == 'actualite') {
      if (cible == 'actualite' && aId) return '/post/$cibleId';
      if (cible == 'global' && aId) return '/bourse/$cibleId';
      return '/actualite';
    }

    // 6. Repères dans le texte (notifications manuelles)
    if (titreLower.contains('bourse') ||
        messageLower.contains('bourse') ||
        titreLower.contains('candidature') ||
        messageLower.contains('candidature')) {
      return '/resultats';
    }
    if (titreLower.contains('support') || messageLower.contains('support')) {
      return '/support';
    }

    return null;
  }
}

/// Type d'alerte urgente reçue du backend.
enum TypeAlerteUrgente {
  retardPaiement,
  bourseAdmission,
  notificationUrgente,
  autre,
}

/// Modèle pour une alerte prioritaire à afficher en modale à l'ouverture.
class AlerteUrgente {
  final String id;
  final TypeAlerteUrgente type;
  final String titre;
  final String message;
  final String actionRoute;
  final String actionLabel;
  final String badge;
  final String couleur; // 'danger', 'succes', 'info'
  final String icone;
  final int priorite;
  final DateTime? date;
  final String? imageUrl;

  const AlerteUrgente({
    required this.id,
    required this.type,
    required this.titre,
    required this.message,
    required this.actionRoute,
    required this.actionLabel,
    required this.badge,
    required this.couleur,
    required this.icone,
    required this.priorite,
    this.date,
    this.imageUrl,
  });

  factory AlerteUrgente.fromJson(Map<String, dynamic> json) {
    final typeStr = (json['type'] ?? '').toString();
    TypeAlerteUrgente type;
    switch (typeStr) {
      case 'retard_paiement':
        type = TypeAlerteUrgente.retardPaiement;
        break;
      case 'bourse_admission':
        type = TypeAlerteUrgente.bourseAdmission;
        break;
      case 'notification_urgente':
        type = TypeAlerteUrgente.notificationUrgente;
        break;
      default:
        type = TypeAlerteUrgente.autre;
    }

    final img = json['imageUrl']?.toString();

    return AlerteUrgente(
      id: (json['id'] ?? '').toString(),
      type: type,
      titre: (json['titre'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      actionRoute: (json['actionRoute'] ?? '').toString(),
      actionLabel: (json['actionLabel'] ?? 'Consulter').toString(),
      badge: (json['badge'] ?? 'Alerte').toString(),
      couleur: (json['couleur'] ?? 'info').toString(),
      icone: (json['icone'] ?? 'notifications').toString(),
      priorite: (json['priorite'] as num?)?.toInt() ?? 99,
      date: DateTime.tryParse('${json['date'] ?? ''}'),
      imageUrl: (img != null && img.isNotEmpty) ? img : null,
    );
  }
}

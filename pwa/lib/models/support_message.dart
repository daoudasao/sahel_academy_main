/// Qui a envoyé un message du chat support.
enum ExpediteurSupport { client, support }

/// Un message dans le fil de discussion avec le support.
class SupportMessage {
  final String id;
  final ExpediteurSupport expediteur;
  final String contenu;
  final String type; // "texte" | "audio" | "document"
  final String? audioUrl;
  final String? documentUrl;
  final String? documentNom;
  final int? dureeSeconds;
  final DateTime date;
  final bool lu;

  const SupportMessage({
    required this.id,
    required this.expediteur,
    required this.contenu,
    this.type = 'texte',
    this.audioUrl,
    this.documentUrl,
    this.documentNom,
    this.dureeSeconds,
    required this.date,
    this.lu = false,
  });

  /// Vrai si c'est un message envoyé par l'utilisateur courant (le client).
  bool get estDeMoi => expediteur == ExpediteurSupport.client;

  /// Vrai si c'est un message vocal.
  bool get estAudio =>
      type == 'audio' ||
      (audioUrl != null && audioUrl!.isNotEmpty) ||
      contenu.startsWith('http') && (contenu.endsWith('.m4a') || contenu.endsWith('.mp3') || contenu.endsWith('.aac') || contenu.contains('/support/'));

  /// Vrai si un document est joint.
  bool get aDocument => documentUrl != null && documentUrl!.isNotEmpty;

  /// Vrai si c'est un message de type document.
  bool get estDocument =>
      type == 'document' ||
      aDocument ||
      (contenu.startsWith('http') &&
          (contenu.endsWith('.pdf') ||
              contenu.endsWith('.docx') ||
              contenu.endsWith('.doc') ||
              contenu.contains('/documents/')));

  /// URL du document joint.
  String get urlDocument =>
      documentUrl ?? (contenu.startsWith('http') ? contenu : '');

  /// Nom d'affichage du document joint.
  String get nomDocument {
    if (documentNom != null && documentNom!.isNotEmpty) return documentNom!;
    if (contenu.isNotEmpty && !contenu.startsWith('http')) return contenu;
    return 'Document_Admission.pdf';
  }

  factory SupportMessage.fromJson(Map<String, dynamic> j) {
    final exp = (j['expediteur'] ?? 'client').toString();
    final audioUrl = j['audioUrl']?.toString();
    final documentUrl = j['documentUrl']?.toString();
    final documentNom = j['documentNom']?.toString();
    final type = (j['type'] ?? (audioUrl != null ? 'audio' : (documentUrl != null ? 'document' : 'texte'))).toString();
    final duree = j['dureeSeconds'] is num ? (j['dureeSeconds'] as num).toInt() : null;

    return SupportMessage(
      id: (j['id'] ?? '').toString(),
      expediteur: exp == 'support'
          ? ExpediteurSupport.support
          : ExpediteurSupport.client,
      contenu: (j['contenu'] ?? '').toString(),
      type: type,
      audioUrl: audioUrl ?? (type == 'audio' ? j['contenu']?.toString() : null),
      documentUrl: documentUrl,
      documentNom: documentNom,
      dureeSeconds: duree,
      date:
          DateTime.tryParse('${j['createdAt'] ?? j['date'] ?? ''}') ??
          DateTime.now(),
      lu: j['lu'] == true,
    );
  }
}

import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/safe_change_notifier.dart';
import '../../models/classe_message.dart';
import '../../models/document_cours.dart';

/// Gère les « classes » de l'utilisateur : une formation où il est inscrit
/// devient une classe (façon Google Classroom).
///
/// - Liste des classes = inscriptions réelles (`GET /users/:id/inscriptions`).
/// - Contenu d'une classe = messages du formateur + documents
///   (`GET /classes/:formationId/messages` et `/documents`).
/// - Commentaire sous un message (`POST /classes/messages/:messageId/commentaires`).
class ClasseRepository extends ChangeNotifier with SafeChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  // ── Inscriptions & Formations enseignées (mes classes) ──
  List<String> _mesFormationIds = const [];
  Set<String> _formationsEnseigneesIds = const {};
  bool _enChargement = false;
  bool _charge = false;
  String? _erreur;

  // ── Contenu par formation (chargé à la demande) ──
  final Map<String, List<ClasseMessage>> _messages = {};
  final Map<String, List<DocumentCours>> _documents = {};
  final Set<String> _contenuCharge = {};
  final Set<String> _contenuEnCours = {};
  final Map<String, String> _contenuErreur = {};

  /// Identifiants des formations où l'utilisateur a accès (= ses classes).
  List<String> get mesFormationIds => _mesFormationIds;
  bool get enChargement => _enChargement;
  bool get estCharge => _charge;
  String? get erreur => _erreur;

  /// Indique si l'utilisateur connecté est le formateur de cette formation.
  bool estFormateurDe(String formationId) =>
      _formationsEnseigneesIds.contains(formationId);

  /// Charge les classes de l'utilisateur [userId] (formations inscrites + enseignées).
  Future<void> charger(String userId, {bool forcer = false}) async {
    if (_enChargement) return;
    if (_charge && !forcer) return;
    _enChargement = true;
    _erreur = null;
    notifyListeners();
    try {
      dynamic data;
      try {
        data = await _api.get('/classes/mes-classes');
      } catch (_) {
        // Fallback si la route spécifique échoue
        data = await _api.get('/users/$userId/inscriptions');
      }

      final ids = <String>[];
      final enseignees = <String>{};

      for (final e in _versListe(data)) {
        final m = Map<String, dynamic>.from(e);
        final statut = m['statut']?.toString() ?? m['statutInscription']?.toString() ?? 'en_cours';
        if (statut == 'suspendu' || statut == 'abandonne') continue;

        final formation = m['formation'];
        final fid = (m['id'] ?? m['formationId'] ?? (formation is Map ? formation['id'] : null))?.toString();
        if (fid != null && fid.isNotEmpty) {
          ids.add(fid);
          if (m['estFormateur'] == true) {
            enseignees.add(fid);
          }
        }
      }

      _mesFormationIds = ids;
      _formationsEnseigneesIds = enseignees;
      _charge = true;
    } catch (e) {
      _erreur = e.toString();
    } finally {
      _enChargement = false;
      notifyListeners();
    }
  }

  bool estInscrit(String formationId) => _mesFormationIds.contains(formationId);

  /// Inscrire l'utilisateur [userId] à la formation [formationId].
  Future<void> inscrire(String userId, String formationId) async {
    await _api.post('/users/$userId/inscriptions', {
      'formationId': formationId,
    });
    if (!_mesFormationIds.contains(formationId)) {
      _mesFormationIds = [..._mesFormationIds, formationId];
      notifyListeners();
    }
  }

  // ── Contenu d'une classe ──

  bool contenuCharge(String formationId) =>
      _contenuCharge.contains(formationId);
  bool contenuEnChargement(String formationId) =>
      _contenuEnCours.contains(formationId);
  String? contenuErreur(String formationId) => _contenuErreur[formationId];

  List<ClasseMessage> messages(String formationId) =>
      _messages[formationId] ?? const [];

  List<DocumentCours> documents(String formationId) =>
      _documents[formationId] ?? const [];

  /// Charge (messages + documents) d'une classe.
  Future<void> chargerContenu(String formationId, {bool forcer = false}) async {
    if (_contenuEnCours.contains(formationId)) return;
    if (_contenuCharge.contains(formationId) && !forcer) return;
    _contenuEnCours.add(formationId);
    _contenuErreur.remove(formationId);
    notifyListeners();
    try {
      final res = await Future.wait([
        _api.get('/classes/$formationId/messages'),
        _api.get('/classes/$formationId/documents'),
      ]);
      _messages[formationId] = _versListe(res[0])
          .map((e) => ClasseMessage.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      _documents[formationId] = _versListe(res[1])
          .map((e) => DocumentCours.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      _contenuCharge.add(formationId);
    } catch (e) {
      _contenuErreur[formationId] = e.toString();
    } finally {
      _contenuEnCours.remove(formationId);
      notifyListeners();
    }
  }

  /// Publie un message ou une annonce dans la classe (formateur ou équipe).
  Future<ClasseMessage> publierMessage({
    required String formationId,
    required String contenu,
    String? documentNom,
    String? auteurNom,
    String? auteurRole,
  }) async {
    final payload = {
      'contenu': contenu,
      if (documentNom != null && documentNom.isNotEmpty) 'documentNom': documentNom,
      if (auteurNom != null && auteurNom.isNotEmpty) 'auteurNom': auteurNom,
      if (auteurRole != null && auteurRole.isNotEmpty) 'auteurRole': auteurRole,
    };
    final res = await _api.post('/classes/$formationId/messages', payload);
    final msg = ClasseMessage.fromJson(Map<String, dynamic>.from(res));
    final liste = _messages[formationId];
    if (liste != null) {
      liste.insert(0, msg);
    } else {
      _messages[formationId] = [msg];
    }
    notifyListeners();
    return msg;
  }

  /// Supprime un message du flux de la classe.
  Future<void> supprimerMessage({
    required String formationId,
    required String messageId,
  }) async {
    await _api.delete('/classes/messages/$messageId');
    final liste = _messages[formationId];
    if (liste != null) {
      liste.removeWhere((m) => m.id == messageId);
      notifyListeners();
    }
  }

  /// Publie un document pédagogique pour le cours.
  Future<DocumentCours> publierDocument({
    required String formationId,
    required String titre,
    required String url,
    String type = 'PDF',
    String? taille,
  }) async {
    final payload = {
      'titre': titre,
      'url': url,
      'type': type,
      if (taille != null && taille.isNotEmpty) 'taille': taille,
    };
    final res = await _api.post('/classes/$formationId/documents', payload);
    final doc = DocumentCours.fromJson(Map<String, dynamic>.from(res));
    final liste = _documents[formationId];
    if (liste != null) {
      liste.insert(0, doc);
    } else {
      _documents[formationId] = [doc];
    }
    notifyListeners();
    return doc;
  }

  /// Supprime un document de cours.
  Future<void> supprimerDocument({
    required String formationId,
    required String documentId,
  }) async {
    await _api.delete('/classes/documents/$documentId');
    final liste = _documents[formationId];
    if (liste != null) {
      liste.removeWhere((d) => d.id == documentId);
      notifyListeners();
    }
  }

  /// Ajoute un commentaire sous un message de classe.
  Future<void> ajouterCommentaire({
    required String formationId,
    required String messageId,
    required String auteurNom,
    required String contenu,
  }) async {
    final data = await _api.post('/classes/messages/$messageId/commentaires', {
      'auteur': auteurNom,
      'contenu': contenu,
      'role': 'Élève',
    });
    final liste = _messages[formationId];
    if (liste != null && data is Map) {
      for (final m in liste) {
        if (m.id == messageId) {
          m.commentaires.add(
            Commentaire.fromJson(Map<String, dynamic>.from(data)),
          );
          notifyListeners();
          return;
        }
      }
    }
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }
}

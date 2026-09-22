import '../../core/api/api_client.dart';
import '../../models/departement.dart';
import '../../models/formation.dart';

/// Point d'accès unique aux données de formations et départements.
///
/// Branché sur l'API NestJS (`GET /formations`, `GET /departements`, routes
/// publiques). Les données sont chargées une seule fois puis mises en cache :
/// [charger] déclenche/attend le chargement, et les getters synchrones
/// (utilisés par de nombreux écrans) lisent ensuite le cache — les écrans
/// n'ont donc pas eu à changer de signature.
class FormationRepository {
  final ApiClient _api = ApiClient.instance;

  List<Formation> _formations = const [];
  List<Departement> _departements = const [];
  Future<void>? _chargement;
  bool _charge = false;

  bool get estCharge => _charge;

  /// Charge le catalogue depuis l'API (une seule fois, même si appelé
  /// plusieurs fois en parallèle). Relance possible avec [forcer] = true.
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
      // Les deux appels sont indépendants : un échec sur les départements
      // (route protégée, réseau) ne doit pas vider le catalogue.
      final resultats = await Future.wait([
        _api.get('/departements').catchError((_) => null),
        _api.get('/formations'),
      ]);
      final departements = _versListe(resultats[0]);
      if (departements.isNotEmpty) {
        _departements = departements
            .map((e) => Departement.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      _formations = _versListe(
        resultats[1],
      ).map((e) => Formation.fromJson(Map<String, dynamic>.from(e))).toList();
      _charge = true;
    } catch (_) {
      _chargement = null; // permet de réessayer au prochain appel
      rethrow;
    }
  }

  /// Retrouve une formation, en chargeant le catalogue si besoin, puis en
  /// interrogeant l'API pour cet identifiant précis s'il n'y figure pas.
  ///
  /// Sert aux écrans ouverts directement sur une formation (classe, lien
  /// partagé, notification) : sans ça, ils s'affichent « introuvable » tant que
  /// le catalogue n'est pas arrivé.
  Future<Formation?> chargerFormationParId(String id) async {
    if (id.isEmpty) return null;

    final dejaLa = getFormationParId(id);
    if (dejaLa != null) return dejaLa;

    try {
      await charger();
    } catch (_) {
      // Catalogue indisponible : on tente quand même la formation demandée.
    }

    final apresCatalogue = getFormationParId(id);
    if (apresCatalogue != null) return apresCatalogue;

    final data = await _api.get('/formations/$id');
    if (data is! Map) return null;
    final formation = Formation.fromJson(Map<String, dynamic>.from(data));
    _formations = [..._formations, formation];
    return formation;
  }

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }

  List<Departement> getDepartements() => _departements;

  List<Formation> getFormations() => _formations;

  List<Formation> getFormationsParDepartement(String departementId) =>
      _formations.where((f) => f.departementId == departementId).toList();

  /// Toutes les formations marquées comme bourse.
  List<Formation> getBourses() =>
      _formations.where((f) => f.estBourse).toList();

  /// Retrouve une formation par son identifiant (null si introuvable).
  Formation? getFormationParId(String id) {
    for (final f in _formations) {
      if (f.id == id) return f;
    }
    return null;
  }

  /// Retrouve un département par son identifiant (null si introuvable).
  Departement? getDepartementParId(String id) {
    for (final d in _departements) {
      if (d.id == id) return d;
    }
    return null;
  }

  /// Recherche filtrée et triée dans le catalogue.
  ///
  /// - [texte] : recherche dans le titre, le formateur, la description et le
  ///   département (insensible à la casse et aux accents).
  /// - [departementId] : limite à un département (null = tous).
  /// - [niveau] : "Tous" ou un niveau précis.
  /// - [type] : "Toutes", "Payantes" ou "Bourses".
  /// - [tri] : "Défaut", "Prix croissant", "Prix décroissant" ou "Durée".
  List<Formation> rechercher({
    String texte = '',
    String? departementId,
    String niveau = 'Tous',
    String type = 'Toutes',
    String tri = 'Défaut',
  }) {
    final q = _normaliser(texte);

    final liste = _formations.where((f) {
      if (departementId != null && f.departementId != departementId) {
        return false;
      }
      if (niveau != 'Tous' && f.niveau != niveau) return false;
      if (type == 'Payantes' && f.estBourse) return false;
      if (type == 'Bourses' && !f.estBourse) return false;
      if (q.isNotEmpty) {
        final base =
            '${f.titre} ${f.formateurNom} ${f.description} ${_nomDept(f.departementId)}';
        if (!_normaliser(base).contains(q)) return false;
      }
      return true;
    }).toList();

    switch (tri) {
      case 'Prix croissant':
        liste.sort((a, b) => _coutTotal(a).compareTo(_coutTotal(b)));
      case 'Prix décroissant':
        liste.sort((a, b) => _coutTotal(b).compareTo(_coutTotal(a)));
      case 'Durée':
        liste.sort((a, b) => a.dureeMois.compareTo(b.dureeMois));
    }
    return liste;
  }

  double _coutTotal(Formation f) =>
      f.prixInscription + f.prixMensualite * f.dureeMois;

  String _nomDept(String id) => getDepartementParId(id)?.nom ?? '';

  /// Soumet une demande d'inscription à une formation.
  Future<dynamic> demanderInscription(String formationId) async {
    return await _api.post('/formations/$formationId/demande');
  }

  /// Les demandes d'inscription de l'utilisateur connecté.
  Future<List<Map<String, dynamic>>> mesDemandes() async {
    try {
      final data = await _api.get('/formations/demandes/me');
      return _versListe(data)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Indique si l'utilisateur a une demande d'inscription en attente pour cette formation.
  Future<bool> aDemandeEnAttente(String formationId) async {
    final demandes = await mesDemandes();
    for (final d in demandes) {
      final fId = d['formationId'] ?? d['formation']?['id'];
      final statut = d['statut'];
      if (fId == formationId && (statut == 'en_attente' || statut == 'enAttente')) {
        return true;
      }
    }
    return false;
  }

  /// Minuscules + suppression des accents (pour une recherche tolérante).
  String _normaliser(String s) {
    var r = s.toLowerCase();
    const accents = 'àâäáãçéèêëíìîïñóòôöõúùûüÿ';
    const sans = 'aaaaaceeeeiiiinooooouuuuy';
    for (var i = 0; i < accents.length; i++) {
      r = r.replaceAll(accents[i], sans[i]);
    }
    return r;
  }
}

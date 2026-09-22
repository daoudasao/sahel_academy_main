import '../../core/api/api_client.dart';
import '../../models/bourse.dart';
import '../../models/champ_formulaire.dart';

/// Point d'accès unique aux bourses, **séparé** des formations.
///
/// Branché sur l'API NestJS :
///   `GET /bourses`      → la liste (sans les champs du formulaire)
///   `GET /bourses/:id`  → le détail d'une bourse (avec ses `champs` ordonnés)
///
/// La liste est mise en cache (comme [FormationRepository]) ; le détail d'une
/// bourse (avec ses champs) est mis en cache séparément, car il n'est chargé
/// qu'au moment de postuler.
class BourseRepository {
  final ApiClient _api = ApiClient.instance;

  List<Bourse> _bourses = const [];
  final Map<String, Bourse> _details = {};
  Future<void>? _chargement;
  bool _charge = false;
  DateTime? _dernierChargement;

  bool get estCharge => _charge;

  /// Charge la liste des bourses depuis l'API.
  /// Si les données ont plus de 20 secondes ou si [forcer] est vrai, recharge depuis le serveur.
  Future<void> charger({bool forcer = false}) {
    final maintenant = DateTime.now();
    final expire = _dernierChargement == null ||
        maintenant.difference(_dernierChargement!).inSeconds > 20;
    if (forcer || expire) {
      _charge = false;
      _chargement = null;
      _details.clear();
    }
    if (_charge) return Future.value();
    return _chargement ??= _chargerImpl();
  }

  Future<void> _chargerImpl() async {
    try {
      final data = await _api.get('/bourses');
      _bourses = _versListe(
        data,
      ).map((e) => Bourse.fromJson(Map<String, dynamic>.from(e))).toList();
      _charge = true;
      _dernierChargement = DateTime.now();
    } catch (_) {
      _bourses = const [];
      _charge = true;
      _chargement = null;
    }
  }

  List<Bourse> getBourses({bool uniquementOuvertes = false}) => _bourses
      .where((b) {
        if (b.statut == 'en_attente') return false;
        if (uniquementOuvertes && !b.estOuverte) return false;
        return true;
      })
      .toList();

  List<Bourse> getBoursesOuvertes() => getBourses(uniquementOuvertes: true);

  List<Bourse> getBoursesFermees() =>
      _bourses.where((b) => b.statut == 'fermee').toList();

  /// Retrouve une bourse (issue de la liste) par son identifiant.
  Bourse? getBourseParId(String id) {
    for (final b in _bourses) {
      if (b.id == id) return b;
    }
    return null;
  }

  /// Détail complet d'une bourse, **avec ses champs de formulaire**.
  /// Utilisé par l'écran de candidature. Met le résultat en cache.
  Future<Bourse> detail(String id, {bool forcer = false}) async {
    if (!forcer && _details.containsKey(id)) return _details[id]!;
    final data = await _api.get('/bourses/$id');
    final bourse = Bourse.fromJson(Map<String, dynamic>.from(data as Map));
    _details[id] = bourse;
    return bourse;
  }

  /// Champs à afficher pour candidater : ceux définis par l'admin, sinon un
  /// formulaire minimal par défaut.
  List<ChampFormulaire> champsAvecDefaut(Bourse bourse) =>
      bourse.champs.isNotEmpty ? bourse.champs : _champsDefaut;

  List<dynamic> _versListe(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return const [];
  }

  /// Formulaire minimal utilisé quand aucune définition n'est disponible.
  static const List<ChampFormulaire> _champsDefaut = [
    ChampFormulaire(id: 'nom', label: 'Nom complet', cle: 'nom'),
    ChampFormulaire(
      id: 'tel',
      label: 'Téléphone',
      cle: 'telephone',
      type: TypeChamp.telephone,
    ),
    ChampFormulaire(
      id: 'email',
      label: 'Adresse e-mail',
      cle: 'email',
      type: TypeChamp.email,
      obligatoire: false,
    ),
    ChampFormulaire(id: 'ville', label: 'Ville'),
  ];
}

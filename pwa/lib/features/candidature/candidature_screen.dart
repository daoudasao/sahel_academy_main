import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/admission_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/bourse_repository.dart';
import '../../models/admission.dart';
import '../../models/bourse.dart';
import '../../models/champ_formulaire.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/photo_banniere.dart';

/// Formulaire de candidature à une bourse avec un design repensé,
/// moderne, fluide et structuré en cartes dynamiques.
class CandidatureScreen extends StatefulWidget {
  final String bourseId;

  const CandidatureScreen({super.key, required this.bourseId});

  @override
  State<CandidatureScreen> createState() => _CandidatureScreenState();
}

class _CandidatureScreenState extends State<CandidatureScreen> {
  final _formKey = GlobalKey<FormState>();

  List<ChampFormulaire>? _champs; // null = pas encore chargé
  String? _erreurChargement;
  Bourse? _bourse; // bourse visée (titre, image)
  Admission? _candidatureExistante;
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String> _choix = {};

  bool _envoye = false;
  bool _envoiEnCours = false;

  @override
  void initState() {
    super.initState();
    _chargerFormulaire();
  }

  Future<void> _chargerFormulaire() async {
    setState(() => _erreurChargement = null);
    try {
      final repo = context.read<BourseRepository>();
      final bourse = await repo.detail(widget.bourseId, forcer: true);
      if (!mounted) return;

      Admission? candidatureExistante;
      try {
        candidatureExistante = await context
            .read<AdmissionRepository>()
            .maCandidatureBourse(widget.bourseId);
      } catch (_) {}

      final champs = repo.champsAvecDefaut(bourse);
      for (final c in champs) {
        if (c.type != TypeChamp.choix) {
          final controller = TextEditingController();
          controller.addListener(() {
            if (mounted) setState(() {});
          });
          _controllers.putIfAbsent(c.id, () => controller);
        }
      }
      setState(() {
        _bourse = bourse;
        _champs = champs;
        _candidatureExistante = candidatureExistante;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _erreurChargement = e.toString());
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  /// Valeur saisie pour un champ (texte ou choix).
  String _valeurDe(ChampFormulaire c) => c.type == TypeChamp.choix
      ? (_choix[c.id] ?? '')
      : (_controllers[c.id]?.text.trim() ?? '');

  /// Calcul du nombre de champs obligatoires remplis
  int get _champsObligatoiresRemplis {
    if (_champs == null) return 0;
    int remplis = 0;
    for (final c in _champs!) {
      if (c.type != TypeChamp.lien && c.obligatoire && _valeurDe(c).isNotEmpty) {
        remplis++;
      }
    }
    return remplis;
  }

  int get _totalChampsObligatoires {
    if (_champs == null) return 0;
    return _champs!.where((c) => c.type != TypeChamp.lien && c.obligatoire).length;
  }

  Future<void> _envoyer() async {
    if (_envoiEnCours) return;
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Veuillez remplir correctement tous les champs obligatoires.',
          ),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final champs = _champs!;
    final messenger = ScaffoldMessenger.of(context);

    if (_bourse != null && !_bourse!.estOuverte) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Les candidatures pour cette bourse sont désormais closes.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final utilisateur = context.read<AuthRepository>().utilisateur;

    final userId = utilisateur?.id;
    if (userId == null || userId.isEmpty) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Connecte-toi pour envoyer ta candidature.',
          ),
        ),
      );
      return;
    }

    // Nom du candidat = champ marqué 'nom', sinon premier champ texte, sinon compte.
    final champNom = champs.firstWhere(
      (c) => c.cle == 'nom',
      orElse: () => champs.first,
    );
    final nomSaisi = _valeurDe(champNom);
    final nom = nomSaisi.isEmpty ? (utilisateur?.nom ?? 'Candidat') : nomSaisi;

    // E-mail : champ dédié (clé/type email) sinon e-mail du compte.
    final champsEmail = champs.where(
      (c) => c.cle == 'email' || c.type == TypeChamp.email,
    );
    var email = champsEmail.isEmpty ? '' : _valeurDe(champsEmail.first);
    if (email.isEmpty) email = utilisateur?.email ?? '';

    // Toutes les réponses, indexées par libellé du champ (lisible côté admin).
    final reponses = <String, dynamic>{
      for (final c in champs)
        if (c.type != TypeChamp.lien) c.label: _valeurDe(c),
    };

    FocusScope.of(context).unfocus();
    setState(() => _envoiEnCours = true);
    try {
      await context.read<AdmissionRepository>().soumettre(
        bourseId: widget.bourseId,
        userId: userId,
        nom: nom,
        email: email,
        reponses: reponses,
      );
      if (!mounted) return;
      setState(() {
        _envoye = true;
        _envoiEnCours = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _envoiEnCours = false);
      messenger.showSnackBar(SnackBar(content: Text('Échec de l\'envoi : $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final titreBourse = _bourse?.titre ?? 'Bourse';
    final dejaPostule = _candidatureExistante != null;
    final estFermee = _bourse != null && !_bourse!.estOuverte;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _envoye
              ? 'Confirmation'
              : (estFermee
                  ? 'Bourse clôturée'
                  : (dejaPostule
                      ? 'Statut de candidature'
                      : 'Dossier de candidature')),
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
        ),
        elevation: 0,
      ),
      body: _envoye
          ? _vueSucces(context)
          : (estFermee
              ? _vueBourseFermee(context, _bourse!)
              : (dejaPostule
                  ? _vueCandidatureEnAttente(context, _candidatureExistante!)
                  : _corps(context, titreBourse))),
      bottomNavigationBar:
          (!_envoye && !estFermee && !dejaPostule && _champs != null && _erreurChargement == null)
              ? _barreActionFixe(context)
              : null,
    );
  }

  Widget _vueBourseFermee(BuildContext context, Bourse bourse) {
    final scheme = Theme.of(context).colorScheme;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFCA5A5), width: 1.5),
              ),
              child: const Icon(
                Icons.lock_clock_rounded,
                size: 42,
                color: Color(0xFFDC2626),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Candidatures clôturées',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Les candidatures pour la bourse "${bourse.titre}" sont désormais closes. Le jury procède actuellement à l\'examen des dossiers.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: scheme.outline,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            if (bourse.dateLimite != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Date limite expirée : ${formatDate(bourse.dateLimite!)}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/bourses');
                  }
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.emerald,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text('Retour aux bourses'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _vueCandidatureEnAttente(
      BuildContext context, Admission candidature) {
    final scheme = Theme.of(context).colorScheme;
    final titre = _bourse?.titre ?? candidature.titreBourse;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 12),
        Center(
          child: Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: AppColors.jauneContainer,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.hourglass_top_rounded,
              size: 42,
              color: AppColors.jauneFonce,
            ),
          ),
        ),
        const SizedBox(height: 20),

        const Text(
          'Candidature déjà en attente',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),

        Text(
          'Vous avez déjà déposé un dossier pour "$titre". Votre candidature est actuellement en cours d\'examen par notre commission.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: scheme.onSurfaceVariant,
            fontSize: 14,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 24),

        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: scheme.outlineVariant.withValues(alpha: 0.6),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.jauneContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.schedule, size: 14, color: AppColors.jauneFonce),
                        SizedBox(width: 6),
                        Text(
                          'En attente',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.jauneFonce,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  if (candidature.dateDepot != null)
                    Text(
                      'Déposé le ${formatDate(candidature.dateDepot!)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.outline,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                titre,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TextButton.icon(
          onPressed: () =>
              context.push('/bourse/${widget.bourseId}/resultat'),
          icon: const Icon(Icons.assignment_turned_in_outlined),
          label: const Text('Vérifier mon statut complet'),
        ),
      ],
    );
  }

  Widget _corps(BuildContext context, String titreBourse) {
    if (_erreurChargement != null && _champs == null) {
      return ErreurChargement(onRetry: _chargerFormulaire);
    }
    if (_champs == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return _vueFormulaire(context, titreBourse);
  }

  Widget _vueFormulaire(BuildContext context, String titreBourse) {
    final scheme = Theme.of(context).colorScheme;
    final bourse = _bourse;
    final totalReq = _totalChampsObligatoires;
    final remplisReq = _champsObligatoiresRemplis;
    final ratio = totalReq > 0 ? (remplisReq / totalReq).clamp(0.0, 1.0) : 1.0;
    final user = context.watch<AuthRepository>().utilisateur;

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          // Header Card
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: scheme.outlineVariant.withValues(alpha: 0.6),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (bourse != null) ...[
                  ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(24)),
                    child: PhotoBanniere(
                      url: bourse.imageBanniere,
                      couleur: AppColors.emerald,
                      icone: Icons.volunteer_activism,
                      hauteur: 130,
                      heroTag: 'bourse-image-${bourse.id}',
                    ),
                  ),
                ],
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.emeraldContainer,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(
                                  Icons.verified,
                                  size: 14,
                                  color: AppColors.emerald,
                                ),
                                SizedBox(width: 5),
                                Text(
                                  'Formulaire Officiel',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.emeraldDark,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${_champs?.length ?? 0} champ(s)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: scheme.outline,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        titreBourse,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          height: 1.25,
                        ),
                      ),
                      if (user != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color:
                                scheme.primaryContainer.withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: scheme.primary.withValues(alpha: 0.15),
                            ),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: AppColors.emerald
                                    .withValues(alpha: 0.15),
                                child: const Icon(Icons.person,
                                    color: AppColors.emerald, size: 20),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Candidat : ${user.prenom} ${user.nom}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      user.email,
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: scheme.onSurfaceVariant,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.check_circle,
                                  size: 16, color: AppColors.emerald),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Progression
          if (totalReq > 0) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Progression de la saisie',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: scheme.primary,
                  ),
                ),
                Text(
                  '$remplisReq / $totalReq requis',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: scheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: ratio,
                minHeight: 6,
                backgroundColor: scheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation<Color>(scheme.primary),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Section Title
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 12),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 18,
                  decoration: BoxDecoration(
                    color: scheme.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Formulaire de candidature',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ),
          ),

          // Dynamic field cards with clear title and Requis/Optionnel badge
          for (int i = 0; i < (_champs?.length ?? 0); i++) ...[
            _blocChampFormulaire(_champs![i]),
            const SizedBox(height: 14),
          ],
        ],
      ),
    );
  }

  Widget _blocChampFormulaire(ChampFormulaire champ) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: champ.obligatoire
              ? scheme.outlineVariant.withValues(alpha: 0.6)
              : scheme.outlineVariant.withValues(alpha: 0.3),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête : Nom du champ + Icône + Badge Requis / Optionnel
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: scheme.primaryContainer.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _icone(champ),
                  size: 18,
                  color: scheme.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  // Pour un lien, on n'affiche pas de titre personnalisé :
                  // l'URL elle-même est montrée telle quelle juste en dessous.
                  champ.type == TypeChamp.lien ? 'Lien utile' : champ.label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.1,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (champ.type == TypeChamp.lien)
                _badgeInfo()
              else
                _badgeObligatoire(champ.obligatoire),
            ],
          ),

          const SizedBox(height: 14),

          // Saisie du champ
          _construireInputBox(champ),

          // Texte d'aide si disponible
          if (champ.aide != null && champ.aide!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.info_outline,
                  size: 14,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    champ.aide!,
                    style: TextStyle(
                      fontSize: 12,
                      color: scheme.onSurfaceVariant,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _badgeInfo() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        'Information',
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: Colors.blue,
        ),
      ),
    );
  }

  Widget _badgeObligatoire(bool obligatoire) {
    if (obligatoire) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.emeraldContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          '* Requis',
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
            color: AppColors.emeraldDark,
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        'Optionnel',
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: Colors.grey,
        ),
      ),
    );
  }

  Widget _construireInputBox(ChampFormulaire champ) {
    final scheme = Theme.of(context).colorScheme;

    switch (champ.type) {
      case TypeChamp.lien:
        // Un champ « lien » n'est pas à remplir : c'est une URL affichée telle
        // quelle, cliquable (appui) et copiable (appui long).
        final rawUrl = champ.options.isNotEmpty
            ? champ.options.first
            : (champ.aide?.startsWith('http') == true ? champ.aide! : '');
        if (rawUrl.isEmpty) {
          return Text(
            'Aucun lien configuré',
            style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
          );
        }
        final urlComplet =
            rawUrl.startsWith('http') ? rawUrl : 'https://$rawUrl';
        return InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () async {
            final uri = Uri.tryParse(urlComplet);
            if (uri != null) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          },
          onLongPress: () async {
            await Clipboard.setData(ClipboardData(text: rawUrl));
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Lien copié'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.link_rounded, size: 18, color: scheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    rawUrl,
                    style: TextStyle(
                      fontSize: 14,
                      color: scheme.primary,
                      fontWeight: FontWeight.w600,
                      decoration: TextDecoration.underline,
                      decorationColor: scheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      case TypeChamp.choix:
        return _ChampChoix(
          champ: champ,
          valeur: _choix[champ.id],
          onChange: (v) {
            setState(() {
              _choix[champ.id] = v;
            });
          },
        );

      case TypeChamp.paragraphe:
        return TextFormField(
          controller: _controllers[champ.id],
          minLines: 3,
          maxLines: 6,
          decoration: InputDecoration(
            hintText: 'Rédigez votre réponse ici...',
            hintStyle: TextStyle(
              color: scheme.onSurfaceVariant.withValues(alpha: 0.5),
              fontSize: 13.5,
            ),
            filled: true,
            fillColor: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: scheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: scheme.outlineVariant.withValues(alpha: 0.4),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: scheme.primary,
                width: 1.5,
              ),
            ),
            contentPadding: const EdgeInsets.all(14),
          ),
          validator: (v) =>
              (champ.obligatoire && (v == null || v.trim().isEmpty))
                  ? 'Ce champ est requis'
                  : null,
        );

      default:
        return TextFormField(
          controller: _controllers[champ.id],
          keyboardType: _clavier(champ.type),
          decoration: InputDecoration(
            hintText: 'Saisissez ${champ.label.toLowerCase()}...',
            hintStyle: TextStyle(
              color: scheme.onSurfaceVariant.withValues(alpha: 0.5),
              fontSize: 13.5,
            ),
            filled: true,
            fillColor: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: scheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: scheme.outlineVariant.withValues(alpha: 0.4),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: scheme.primary,
                width: 1.5,
              ),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          validator: (v) => _valider(champ, v),
        );
    }
  }

  String? _valider(ChampFormulaire c, String? v) {
    final val = v?.trim() ?? '';
    if (val.isEmpty) return c.obligatoire ? 'Ce champ est requis' : null;
    if (c.type == TypeChamp.email) {
      final regex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
      if (!regex.hasMatch(val)) return 'Adresse email invalide';
    }
    if (c.type == TypeChamp.telephone && val.length < 8) {
      return 'Numéro de téléphone trop court';
    }
    return null;
  }

  IconData _icone(ChampFormulaire c) {
    switch (c.cle) {
      case 'nom':
        return Icons.person_outline;
      case 'telephone':
        return Icons.phone_outlined;
      case 'email':
        return Icons.mail_outline;
      case 'ville':
        return Icons.location_city_outlined;
    }
    switch (c.type) {
      case TypeChamp.email:
        return Icons.mail_outline;
      case TypeChamp.telephone:
        return Icons.phone_outlined;
      case TypeChamp.nombre:
        return Icons.numbers_outlined;
      case TypeChamp.choix:
        return Icons.list_alt_outlined;
      case TypeChamp.paragraphe:
        return Icons.notes_outlined;
      case TypeChamp.lien:
        return Icons.link_rounded;
      default:
        return Icons.edit_note_outlined;
    }
  }

  TextInputType _clavier(TypeChamp type) {
    switch (type) {
      case TypeChamp.email:
        return TextInputType.emailAddress;
      case TypeChamp.telephone:
        return TextInputType.phone;
      case TypeChamp.nombre:
        return TextInputType.number;
      default:
        return TextInputType.text;
    }
  }

  Widget _barreActionFixe(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.07),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: FilledButton.icon(
          onPressed: _envoiEnCours ? null : _envoyer,
          style: FilledButton.styleFrom(
            backgroundColor: scheme.primary,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(54),
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          icon: _envoiEnCours
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.send_rounded, size: 20),
          label: Text(
            _envoiEnCours ? 'Transmission en cours...' : 'Envoyer ma candidature',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }

  /// URL d'un champ « lien » (vide si non configuré).
  String _urlDuLien(ChampFormulaire c) => c.options.isNotEmpty
      ? c.options.first
      : (c.aide?.startsWith('http') == true ? c.aide! : '');

  /// Section « Découvrez aussi… » sur l'écran de confirmation : reprend les
  /// champs « lien » de la bourse (réseaux sociaux, documentation…) sous forme
  /// de liens cliquables et copiables (appui long).
  Widget? _liensSupplementaires(BuildContext context) {
    final champs = _champs;
    if (champs == null) return null;
    final liens = champs
        .where((c) => c.type == TypeChamp.lien && _urlDuLien(c).isNotEmpty)
        .toList();
    if (liens.isEmpty) return null;

    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(top: 24),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.public_rounded, size: 20, color: scheme.primary),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Découvrez aussi nos réseaux sociaux',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Restez connecté à Sahel Academy en attendant le résultat.',
            style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          for (final c in liens) _tuileLien(_urlDuLien(c)),
        ],
      ),
    );
  }

  /// Un lien : appui pour ouvrir, appui long pour copier.
  Widget _tuileLien(String rawUrl) {
    final scheme = Theme.of(context).colorScheme;
    final urlComplet = rawUrl.startsWith('http') ? rawUrl : 'https://$rawUrl';
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final uri = Uri.tryParse(urlComplet);
          if (uri != null) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
        onLongPress: () async {
          await Clipboard.setData(ClipboardData(text: rawUrl));
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Lien copié'),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Icon(Icons.link_rounded, size: 18, color: scheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  rawUrl,
                  style: TextStyle(
                    fontSize: 14,
                    color: scheme.primary,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.underline,
                    decorationColor: scheme.primary,
                  ),
                ),
              ),
              Icon(Icons.open_in_new_rounded,
                  size: 15, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  Widget _vueSucces(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final titreBourse = _bourse?.titre ?? 'Bourse';

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      children: [
        const SizedBox(height: 16),
        Center(
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: AppColors.emeraldContainer.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
              ),
              Container(
                width: 78,
                height: 78,
                decoration: const BoxDecoration(
                  color: AppColors.emeraldContainer,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.emerald,
                  size: 54,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Center(
          child: Text(
            'Candidature transmise ! 🎉',
            style: TextStyle(
              fontSize: 23,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Center(
          child: Text(
            'Votre dossier a bien été enregistré avec succès par le système Sahel Academy.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ),
        const SizedBox(height: 28),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: scheme.outlineVariant.withValues(alpha: 0.6),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.task_alt,
                    color: AppColors.emerald,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Récapitulatif',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Bourse',
                    style: TextStyle(color: scheme.outline, fontSize: 13),
                  ),
                  Expanded(
                    child: Text(
                      titreBourse,
                      textAlign: TextAlign.end,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Statut initial',
                    style: TextStyle(color: scheme.outline, fontSize: 13),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.jauneContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'En cours d\'examen',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.jauneFonce,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: scheme.primaryContainer.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Icon(Icons.notifications_active_outlined,
                  size: 22, color: scheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Une notification vous sera envoyée directement dès le traitement de votre demande.',
                  style: TextStyle(
                    color: scheme.onPrimaryContainer,
                    fontSize: 13,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
        ),
        ?_liensSupplementaires(context),
        const SizedBox(height: 32),
        FilledButton.icon(
          onPressed: () => context.push('/resultats'),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          icon: const Icon(Icons.fact_check_outlined),
          label: const Text(
            'Suivre mes candidatures',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => context.go('/actualite'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: const Text(
            'Retour à l\'accueil',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

class _ChampChoix extends StatelessWidget {
  final ChampFormulaire champ;
  final String? valeur;
  final ValueChanged<String> onChange;

  const _ChampChoix({
    required this.champ,
    required this.valeur,
    required this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FormField<String>(
      initialValue: valeur,
      validator: (v) => (champ.obligatoire && (v == null || v.isEmpty))
          ? 'Veuillez sélectionner une option'
          : null,
      builder: (state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final o in champ.options)
                  ChoiceChip(
                    label: Text(o),
                    selected: state.value == o,
                    avatar: state.value == o
                        ? const Icon(
                            Icons.check_circle_rounded,
                            size: 16,
                            color: Colors.white,
                          )
                        : null,
                    selectedColor: scheme.primary,
                    backgroundColor: scheme.surfaceContainerHighest.withValues(alpha: 0.6),
                    labelStyle: TextStyle(
                      color: state.value == o ? Colors.white : scheme.onSurface,
                      fontWeight: state.value == o ? FontWeight.w700 : FontWeight.w500,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: state.value == o
                            ? scheme.primary
                            : scheme.outlineVariant.withValues(alpha: 0.5),
                      ),
                    ),
                    onSelected: (_) {
                      state.didChange(o);
                      onChange(o);
                    },
                  ),
              ],
            ),
            if (state.hasError)
              Padding(
                padding: const EdgeInsets.only(top: 8, left: 4),
                child: Text(
                  state.errorText!,
                  style: TextStyle(
                    color: scheme.error,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

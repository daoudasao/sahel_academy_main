import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:sahel_academy/core/theme/app_theme.dart';

import '../../core/utils/departement_ui.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/admission_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/classe_repository.dart';
import '../../data/repositories/formation_repository.dart';
import '../../data/repositories/support_repository.dart';
import '../../models/admission.dart';
import '../../models/formation.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/photo_banniere.dart';

/// Page de détail d'une formation / bourse, avec l'image en fond de header.
class FormationDetailScreen extends StatefulWidget {
  final String formationId;

  const FormationDetailScreen({super.key, required this.formationId});

  @override
  State<FormationDetailScreen> createState() => _FormationDetailScreenState();
}

class _FormationDetailScreenState extends State<FormationDetailScreen> {
  late Future<void> _catalogue;

  @override
  void initState() {
    super.initState();
    _catalogue = context.read<FormationRepository>().charger();
  }

  void _reessayerCatalogue() {
    setState(() {
      _catalogue = context.read<FormationRepository>().charger(forcer: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final repo = context.read<FormationRepository>();
    return FutureBuilder<void>(
      future: _catalogue,
      builder: (context, snap) {
        if (!repo.estCharge && snap.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (!repo.estCharge && snap.hasError) {
          return Scaffold(
            appBar: AppBar(),
            body: ErreurChargement(onRetry: _reessayerCatalogue),
          );
        }
        return _contenu(context, repo);
      },
    );
  }

  Widget _contenu(BuildContext context, FormationRepository repo) {
    final formation = repo.getFormationParId(widget.formationId);

    // Cas défensif : formation introuvable.
    if (formation == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Formation introuvable.')),
      );
    }

    final departement = repo.getDepartementParId(formation.departementId);
    final scheme = Theme.of(context).colorScheme;
    final couleur = couleurDepartement(formation.departementId);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: PopScope(
        canPop: context.canPop(),
        onPopInvokedWithResult: (didPop, result) {
          if (!didPop) {
            context.go('/formations');
          }
        },
        child: Scaffold(
          body: Column(
          children: [
            // ---- En-tête avec l'image en arrière-plan + Hero transition ----
            Stack(
              children: [
                PhotoBanniere(
                  url: formation.imageBanniere,
                  couleur: couleur,
                  icone: iconeDepartement(formation.departementId),
                  hauteur: 200,
                  heroTag: 'formation-image-${formation.id}',
                  overlays: const [
                    // Voile sombre progressif pour garantir la lisibilité des textes
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.black54, Colors.black87],
                        ),
                      ),
                    ),
                  ],
                ),

                // Contenu superposé dans le header (Retour, Badge Bourse, Titre)
                Positioned.fill(
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.arrow_back, color: Colors.white),
                                onPressed: () {
                                  if (context.canPop()) {
                                    context.pop();
                                  } else {
                                    context.go('/formations');
                                  }
                                },
                              ),
                              Text(
                                formation.estBourse
                                    ? 'Bourse de formation'
                                    : 'Formation',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  shadows: [
                                    Shadow(
                                      color: Colors.black87,
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                              ),
                              const Spacer(),
                              if (formation.estBourse) const _BourseTag(),
                              IconButton(
                                icon: const Icon(Icons.share_outlined, color: Colors.white),
                                tooltip: 'Partager cette formation',
                                onPressed: () {
                                  final url = 'https://sahel-academy-verif.vercel.app/app/formation/${formation.id}';
                                  final text = 'Découvrez la formation "${formation.titre}" sur Sahel Academy :\n\n👉 $url';
                                  // ignore: deprecated_member_use
                                  Share.share(text, subject: formation.titre);
                                },
                              ),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  formation.estBourse
                                      ? 'BOURSE DE FORMATION'
                                      : 'FORMATION',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    shadows: const [
                                      Shadow(
                                        color: Colors.black87,
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  formation.titre,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    height: 1.2,
                                    shadows: [
                                      Shadow(
                                        color: Colors.black87,
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // ---- Corps principal défilant ----
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  _reessayerCatalogue();
                  await _catalogue;
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Informations rapides (département, niveau, durée)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (departement != null)
                          _InfoChip(
                            icon: iconeDepartement(departement.id),
                            label: departement.nom,
                          ),
                        _InfoChip(
                          icon: Icons.bar_chart,
                          label: formation.niveau,
                        ),
                        _InfoChip(
                          icon: Icons.schedule,
                          label: '${formation.dureeMois} mois',
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Formateur
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: scheme.secondaryContainer,
                          child: Icon(
                            Icons.person,
                            color: scheme.onSecondaryContainer,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              formation.formateurNom,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Formateur',
                              style: TextStyle(color: scheme.outline),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // À propos
                    Text('À propos', style: _titreSection(context)),
                    const SizedBox(height: 8),
                    Text(
                      formation.description,
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Dates (surtout pour les bourses)
                    if (formation.dateLimite != null) ...[
                      Text('Dates', style: _titreSection(context)),
                      const SizedBox(height: 8),
                      _CarteDates(formation: formation),
                      const SizedBox(height: 24),
                    ],

                    // Tarifs
                    Text('Tarifs', style: _titreSection(context)),
                    const SizedBox(height: 8),
                    _CarteTarifs(formation: formation),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
        ),

        // ---- Barre d'inscription fixe en bas ----
        bottomNavigationBar: _BarreInscription(formation: formation),
      ),
    ),
  );
  }

  TextStyle _titreSection(BuildContext context) =>
      const TextStyle(fontSize: 18, fontWeight: FontWeight.bold);
}

/// Carte récapitulant les frais et le coût total estimé.
/// Carte des dates : publication et date limite de candidature.
class _CarteDates extends StatelessWidget {
  final Formation formation;
  const _CarteDates({required this.formation});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final pub = formation.datePublication;
    final limite = formation.dateLimite;
    if (limite == null) return const SizedBox.shrink();
    final jours = limite.difference(DateTime.now()).inDays;
    final expiree = jours < 0;
    final couleur = expiree
        ? const Color(0xFFDC2626)
        : (jours <= 5 ? const Color(0xFFD97706) : const Color(0xFF059669));
    final texteJours = expiree
        ? 'Expirée'
        : (jours == 0
              ? 'Dernier jour'
              : 'Dans $jours jour${jours > 1 ? 's' : ''}');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          if (pub != null) ...[
            _ligne(
              context,
              icon: Icons.campaign_outlined,
              label: 'Publiée le',
              valeur: formatDate(pub),
            ),
            Divider(
              height: 18,
              color: scheme.outlineVariant.withValues(alpha: 0.6),
            ),
          ],
          _ligne(
            context,
            icon: Icons.event_busy_outlined,
            label: 'Date limite de candidature',
            valeur: formatDate(limite),
            badgeTexte: texteJours,
            badgeCouleur: couleur,
          ),
        ],
      ),
    );
  }

  Widget _ligne(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String valeur,
    String? badgeTexte,
    Color? badgeCouleur,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, size: 20, color: scheme.outline),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 12, color: scheme.outline),
              ),
              const SizedBox(height: 2),
              Text(valeur, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
        ),
        if (badgeTexte != null && badgeCouleur != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: badgeCouleur.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              badgeTexte,
              style: TextStyle(
                color: badgeCouleur,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

class _CarteTarifs extends StatelessWidget {
  final Formation formation;
  const _CarteTarifs({required this.formation});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (formation.estBourse) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.emerald.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            const Icon(Icons.volunteer_activism, color: AppColors.emerald),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Formation avec programme de bourse d\'études.',
                style: TextStyle(
                  color: AppColors.emeraldDark,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Coût total estimé = inscription + (mensualité × durée).
    final total =
        formation.prixInscription +
        formation.prixMensualite * formation.dureeMois;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          _ligne('Frais d\'inscription', formatFcfa(formation.prixInscription)),
          const Divider(height: 20),
          _ligne(
            'Mensualité',
            '${formatFcfa(formation.prixMensualite)}  ×  ${formation.dureeMois} mois',
          ),
          const Divider(height: 20),
          _ligne('Coût total estimé', formatFcfa(total), enGras: true),
        ],
      ),
    );
  }

  Widget _ligne(String label, String valeur, {bool enGras = false}) {
    final style = TextStyle(
      fontWeight: enGras ? FontWeight.bold : FontWeight.normal,
      fontSize: enGras ? 16 : 14,
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Flexible(
          child: Text(
            valeur,
            textAlign: TextAlign.right,
            style: style.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

/// Barre fixe en bas avec le prix et le bouton d'inscription ou statut en attente.
class _BarreInscription extends StatefulWidget {
  final Formation formation;
  const _BarreInscription({required this.formation});

  @override
  State<_BarreInscription> createState() => _BarreInscriptionState();
}

class _BarreInscriptionState extends State<_BarreInscription> {
  bool _enAttente = false;
  bool _chargementStatut = true;
  bool _erreurStatut = false;
  bool _relanceEnCours = false;
  bool _relanceEnvoyee = false;

  @override
  void initState() {
    super.initState();
    _verifierStatut();
  }

  Future<void> _verifierStatut() async {
    if (mounted) {
      setState(() {
        _chargementStatut = true;
        _erreurStatut = false;
      });
    }

    try {
      final user = context.read<AuthRepository>().utilisateur;
      final classeRepo = context.read<ClasseRepository>();
      final admissionRepo = context.read<AdmissionRepository>();
      final formationRepo = context.read<FormationRepository>();

      if (user != null && user.id.isNotEmpty && !classeRepo.estCharge) {
        await classeRepo.charger(user.id);
      }

      final candidature = await admissionRepo.maCandidatureBourse(
        widget.formation.id,
      );
      final meDemandeEnAttente = await formationRepo.aDemandeEnAttente(
        widget.formation.id,
      );

      if (mounted) {
        setState(() {
          _enAttente =
              (candidature?.statut == StatutAdmission.enAttente) ||
              meDemandeEnAttente;
          _chargementStatut = false;
          _erreurStatut = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _chargementStatut = false;
          _erreurStatut = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final formation = widget.formation;
    final scheme = Theme.of(context).colorScheme;
    final estInscrit = context.watch<ClasseRepository>().estInscrit(
      formation.id,
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            if (_chargementStatut) ...[
              const Expanded(
                child: SizedBox(
                  height: 48,
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              ),
            ] else if (_erreurStatut) ...[
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: scheme.errorContainer.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.wifi_off, color: scheme.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Erreur de connexion',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: scheme.error,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: _verifierStatut,
                        style: TextButton.styleFrom(
                          foregroundColor: scheme.error,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text(
                          'Réessayer',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else if (_enAttente && !estInscrit) ...[
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.jauneContainer,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.info_outline,
                            color: AppColors.jauneFonce,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Votre dossier est actuellement en cours d\'examen par la commission. Vous serez notifié dès qu\'une décision sera rendue.',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.jauneFonce,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _relanceEnCours
                            ? null
                            : () async {
                                final messenger = ScaffoldMessenger.of(context);
                                final router = GoRouter.of(context);
                                setState(() => _relanceEnCours = true);
                                final msg = formation.estBourse
                                    ? 'Bonjour, je souhaite relancer ma candidature de bourse pour "${formation.titre}".'
                                    : 'Bonjour, je souhaite relancer ma demande d\'inscription pour la formation "${formation.titre}".';
                                try {
                                  await context
                                      .read<SupportRepository>()
                                      .envoyer(msg);
                                  if (mounted) {
                                    setState(() {
                                      _relanceEnCours = false;
                                      _relanceEnvoyee = true;
                                    });
                                    messenger.showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Votre relance a bien été transmise au support !',
                                        ),
                                        backgroundColor: AppColors.emeraldDark,
                                      ),
                                    );
                                    router.push('/support');
                                  }
                                } catch (_) {
                                  if (mounted) {
                                    setState(() => _relanceEnCours = false);
                                    router.push('/support');
                                  }
                                }
                              },
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(52),
                          backgroundColor: _relanceEnvoyee
                              ? AppColors.emerald
                              : AppColors.jauneFonce,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        icon: _relanceEnCours
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Icon(
                                _relanceEnvoyee
                                    ? Icons.check_circle_outline
                                    : Icons.support_agent,
                              ),
                        label: Text(
                          _relanceEnvoyee
                              ? 'Relance transmise au support'
                              : 'Faire une relance au support',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              if (!formation.estBourse && !estInscrit) ...[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Inscription',
                      style: TextStyle(fontSize: 12, color: scheme.outline),
                    ),
                    Text(
                      formatFcfa(formation.prixInscription),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
              ],
              Expanded(
                child: FilledButton.icon(
                  onPressed: () {
                    if (estInscrit) {
                      context.push('/classe/${formation.id}');
                    } else if (formation.estBourse) {
                      context.push('/postuler/${formation.id}');
                    } else {
                      _ouvrirConfirmation(context, formation);
                    }
                  },
                  icon: Icon(
                    estInscrit
                        ? Icons.class_
                        : (formation.estBourse
                              ? Icons.volunteer_activism
                              : Icons.how_to_reg),
                  ),
                  label: Text(
                    estInscrit
                        ? 'Accéder à la classe'
                        : (formation.estBourse
                              ? 'Candidater à la bourse'
                              : 'M\'inscrire'),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Ouvre la fenêtre (bottom sheet) de confirmation d'inscription.
void _ouvrirConfirmation(BuildContext context, Formation formation) {
  final parentContext = context;
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => _ConfirmationInscription(
      formation: formation,
      parentContext: parentContext,
    ),
  );
}

class _ConfirmationInscription extends StatefulWidget {
  final Formation formation;
  final BuildContext parentContext;
  const _ConfirmationInscription({
    required this.formation,
    required this.parentContext,
  });

  @override
  State<_ConfirmationInscription> createState() =>
      _ConfirmationInscriptionState();
}

class _ConfirmationInscriptionState extends State<_ConfirmationInscription> {
  bool _enCours = false;

  Future<void> _confirmer() async {
    final utilisateur = context.read<AuthRepository>().utilisateur;
    if (utilisateur == null || utilisateur.id.isEmpty) {
      if (mounted) Navigator.of(context).pop();
      if (widget.parentContext.mounted) {
        ScaffoldMessenger.of(widget.parentContext).showSnackBar(
          const SnackBar(
            content: Text(
              'Veuillez vous connecter pour effectuer une demande d\'inscription.',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.parentContext.push('/connexion');
      }
      return;
    }

    setState(() => _enCours = true);

    try {
      await context.read<FormationRepository>().demanderInscription(
        widget.formation.id,
      );

      if (mounted) Navigator.of(context).pop(); // ferme le modal bottom sheet

      if (widget.parentContext.mounted) {
        showDialog(
          context: widget.parentContext,
          builder: (dialogCtx) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            title: Row(
              children: const [
                Icon(
                  Icons.mark_email_read_rounded,
                  color: AppColors.emerald,
                  size: 28,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Demande transmise ! 🎉',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Votre intention de rejoindre la formation "${widget.formation.titre}" a été enregistrée par l\'administration.',
                  style: const TextStyle(fontSize: 14, height: 1.35),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.emeraldContainer.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: const [
                      Icon(
                        Icons.chat_outlined,
                        size: 20,
                        color: AppColors.emeraldDark,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Un message automatique a été généré dans le chat Support. Échangez en direct avec un conseiller !',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.emeraldDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogCtx).pop(),
                child: const Text('Fermer'),
              ),
              FilledButton.icon(
                onPressed: () {
                  Navigator.of(dialogCtx).pop();
                  widget.parentContext.push('/support');
                },
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Ouvrir le Support'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _enCours = false);
        Navigator.of(context).pop();
      }
      if (widget.parentContext.mounted) {
        ScaffoldMessenger.of(widget.parentContext).showSnackBar(
          SnackBar(
            content: Text('Échec de la demande d\'inscription : $e'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final estBourse = widget.formation.estBourse;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            estBourse ? 'Confirmer la candidature' : 'Confirmer l\'inscription',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(widget.formation.titre, style: TextStyle(color: scheme.outline)),
          const SizedBox(height: 20),

          if (!estBourse) ...[
            _ligne(
              'Frais d\'inscription',
              formatFcfa(widget.formation.prixInscription),
            ),
            const SizedBox(height: 8),
            _ligne(
              'Puis mensualité',
              '${formatFcfa(widget.formation.prixMensualite)}/mois',
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 20, color: scheme.primary),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Le paiement se fera après validation (sur place ou '
                      'mobile money — bientôt disponible).',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ] else
            const Text(
              'Ta candidature sera transmise à l\'équipe. Tu seras recontacté '
              'si elle est retenue.',
              style: TextStyle(height: 1.4),
            ),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _enCours ? null : _confirmer,
              child: _enCours
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      estBourse
                          ? 'Envoyer ma candidature'
                          : 'Confirmer ma demande',
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _ligne(String label, String valeur) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Text(valeur, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

/// Petite étiquette d'information (icône + texte).
class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

/// Étiquette "Bourse" affichée sur la bannière.
class _BourseTag extends StatelessWidget {
  const _BourseTag();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFEAB308),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Text(
        'Bourse',
        style: TextStyle(color: Color(0xFF3A2E00), fontWeight: FontWeight.bold),
      ),
    );
  }
}

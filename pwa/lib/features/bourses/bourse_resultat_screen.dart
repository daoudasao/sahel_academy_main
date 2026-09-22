import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/admission_repository.dart';
import '../../data/repositories/bourse_repository.dart';
import '../../models/admission.dart';
import '../../models/bourse.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/photo_banniere.dart';

/// Écran dédié au résultat de candidature d'une bourse spécifique (`/bourse/:id/resultat`).
class BourseResultatScreen extends StatefulWidget {
  final String bourseId;

  const BourseResultatScreen({super.key, required this.bourseId});

  @override
  State<BourseResultatScreen> createState() => _BourseResultatScreenState();
}

class _BourseResultatScreenState extends State<BourseResultatScreen> {
  late Future<({Bourse bourse, Admission? candidature})> _future;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  void _charger() {
    setState(() {
      _future = _recupererDonnees();
    });
  }

  Future<({Bourse bourse, Admission? candidature})> _recupererDonnees() async {
    final bourseRepo = context.read<BourseRepository>();
    final admissionRepo = context.read<AdmissionRepository>();

    final bourseFuture = bourseRepo.detail(widget.bourseId);
    final candidatureFuture = admissionRepo.maCandidatureBourse(widget.bourseId);

    final bourse = await bourseFuture;
    final candidature = await candidatureFuture;

    return (bourse: bourse, candidature: candidature);
  }

  Future<void> _ouvrirWhatsApp(String nomCandidat, String titreBourse) async {
    final message = Uri.encodeComponent(
      'Bonjour Sahel Academy, je suis $nomCandidat. Je vous contacte suite à mon admission à la bourse $titreBourse.',
    );
    final url = Uri.parse('https://wa.me/22371493177?text=$message');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir WhatsApp.')),
      );
    }
  }

  Future<void> _ouvrirDocument(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir le document.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Résultat de candidature',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 19),
        ),
      ),
      body: FutureBuilder<({Bourse bourse, Admission? candidature})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErreurChargement(onRetry: _charger);
          }
          final data = snap.data!;
          return RefreshIndicator(
            onRefresh: () async => _charger(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Bannière Bourse ──
                _CarteEnTeteBourse(bourse: data.bourse),
                const SizedBox(height: 20),

                // ── Vue résultat si postulé, sinon invitation ──
                if (data.candidature != null)
                  _vueCandidatureTrouvee(context, data.bourse, data.candidature!)
                else
                  _vueNonPostule(context, data.bourse),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _vueCandidatureTrouvee(
    BuildContext context,
    Bourse bourse,
    Admission candidature,
  ) {
    final scheme = Theme.of(context).colorScheme;
    final statutStyle = _styleStatut(candidature.statut);
    final docUrl = candidature.documentAdmissionUrl ?? bourse.documentAdmissionUrl;
    final docNom = candidature.documentAdmissionNom ?? bourse.documentAdmissionNom ?? 'Document_Admission.pdf';
    String? rawMsgAdm = (candidature.messageAdmission != null && candidature.messageAdmission!.isNotEmpty)
        ? candidature.messageAdmission
        : bourse.messageAdmission;

    String? msgAdm;
    if (rawMsgAdm != null && rawMsgAdm.isNotEmpty) {
      final nomCandidat = candidature.nom.trim().isNotEmpty ? candidature.nom.trim() : 'Étudiant';
      final prenomCandidat = nomCandidat.split(' ').first;
      final titreBourse = bourse.titre.isNotEmpty ? bourse.titre : candidature.titreBourse;
      final emailCandidat = candidature.email ?? '';
      final dateStr = candidature.dateDepot != null ? formatDate(candidature.dateDepot!) : formatDate(DateTime.now());

      msgAdm = rawMsgAdm
          .replaceAll(RegExp(r'\{nom\}', caseSensitive: false), nomCandidat)
          .replaceAll(RegExp(r'\{prenom\}', caseSensitive: false), prenomCandidat)
          .replaceAll(RegExp(r'\{email\}', caseSensitive: false), emailCandidat)
          .replaceAll(RegExp(r'\{bourse\}', caseSensitive: false), titreBourse)
          .replaceAll(RegExp(r'\{date\}', caseSensitive: false), dateStr);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Carte de Statut HAUT DE GAMME ──
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [statutStyle.couleur1, statutStyle.couleur2],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: statutStyle.couleur1.withValues(alpha: 0.3),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  statutStyle.icone,
                  color: statutStyle.couleur1,
                  size: 46,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                statutStyle.titre,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 25,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                statutStyle.description,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.92),
                  fontSize: 14,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── Bloc Message & Document d'admission (pour les admis) ──
        if (candidature.admis && ((msgAdm != null && msgAdm.isNotEmpty) || (docUrl != null && docUrl.isNotEmpty))) ...[
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.emeraldContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: AppColors.emerald.withValues(alpha: 0.3),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.mark_email_read_outlined, size: 22, color: AppColors.emerald),
                    const SizedBox(width: 10),
                    Text(
                      'Message officiel d\'admission',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.emerald,
                      ),
                    ),
                  ],
                ),
                if (msgAdm != null && msgAdm.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    msgAdm,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                ],
                if (docUrl != null && docUrl.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _ouvrirDocument(docUrl),
                      icon: const Icon(Icons.picture_as_pdf, size: 20),
                      label: Text(docNom),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.emerald,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // ── Fiche récapitulative du dossier ──
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: scheme.outlineVariant.withValues(alpha: 0.6),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.badge_outlined, size: 20, color: scheme.primary),
                  const SizedBox(width: 8),
                  const Text(
                    'Détails de la postulation',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              _ligneDetail(context, 'Candidat', candidature.nom),
              _sep(context),
              _ligneDetail(context, 'Bourse visée', bourse.titre),
              _sep(context),
              _ligneDetail(
                context,
                'N° de dossier',
                candidature.numeroForm.isNotEmpty
                    ? candidature.numeroForm
                    : 'REG-${bourse.id}',
              ),
              if (candidature.dateDepot != null) ...[
                _sep(context),
                _ligneDetail(
                  context,
                  'Déposé le',
                  formatDate(candidature.dateDepot!),
                ),
              ],
            ],
          ),
        ),

        // ── Réponses fournies si disponibles ──
        if (candidature.reponses != null && candidature.reponses!.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: scheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.quiz_outlined, size: 20, color: scheme.primary),
                    const SizedBox(width: 8),
                    const Text(
                      'Réponses du formulaire',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                for (final entry in candidature.reponses!.entries) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          entry.key,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: scheme.outline,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${entry.value}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // ── Actions contextuelles ──
        if (candidature.admis) ...[
          // Bouton WhatsApp Vert Officiel
          FilledButton.icon(
            onPressed: () => _ouvrirWhatsApp(candidature.nom, bourse.titre),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF25D366),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 2,
            ),
            icon: const Icon(Icons.chat_bubble_outline_rounded),
            label: const Text(
              'Contacter sur WhatsApp',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.push('/centres'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            icon: const Icon(Icons.event_available),
            label: const Text(
              'Prendre rendez-vous avec un centre',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ] else if (candidature.statut == StatutAdmission.enAttente) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.jauneContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: AppColors.jauneFonce),
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
        ] else ...[
          FilledButton.icon(
            onPressed: () => context.go('/bourses'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            icon: const Icon(Icons.volunteer_activism),
            label: const Text(
              'Découvrir d\'autres bourses',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ],
    );
  }

  Widget _vueNonPostule(BuildContext context, Bourse bourse) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: scheme.outlineVariant.withValues(alpha: 0.6),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: scheme.primaryContainer.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.assignment_late_outlined,
              size: 38,
              color: scheme.primary,
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Pas encore postulé',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'Vous n\'avez pas encore déposé de candidature pour la bourse "${bourse.titre}".',
            textAlign: TextAlign.center,
            style: TextStyle(color: scheme.onSurfaceVariant, height: 1.4),
          ),
          const SizedBox(height: 24),
          if (bourse.estOuverte) ...[
            FilledButton.icon(
              onPressed: () => context.push('/postuler/${bourse.id}'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              icon: const Icon(Icons.send_rounded),
              label: const Text(
                'Postuler maintenant',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Candidatures fermées pour cette bourse',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Colors.grey,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _ligneDetail(BuildContext context, String label, String valeur) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: scheme.outline, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              valeur.isEmpty ? '—' : valeur,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sep(BuildContext context) => Divider(
        height: 16,
        color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.5),
      );
}

class _CarteEnTeteBourse extends StatelessWidget {
  final Bourse bourse;
  const _CarteEnTeteBourse({required this.bourse});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: PhotoBanniere(
              url: bourse.imageBanniere,
              couleur: AppColors.emerald,
              icone: Icons.volunteer_activism,
              hauteur: 120,
              heroTag: 'bourse-image-${bourse.id}',
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  bourse.titre,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (bourse.description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    bourse.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.outline),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

({Color couleur1, Color couleur2, IconData icone, String titre, String description})
_styleStatut(StatutAdmission statut) {
  switch (statut) {
    case StatutAdmission.admis:
      return (
        couleur1: AppColors.emerald,
        couleur2: const Color(0xFF047857),
        icone: Icons.verified_rounded,
        titre: 'Admis(e) 🎉',
        description: 'Félicitations ! Votre candidature a été retenue par la commission.',
      );
    case StatutAdmission.enAttente:
      return (
        couleur1: const Color(0xFFD97706),
        couleur2: const Color(0xFFB45309),
        icone: Icons.hourglass_top_rounded,
        titre: 'En cours d\'examen',
        description: 'Votre dossier a bien été enregistré et est actuellement en cours d\'évaluation.',
      );
    case StatutAdmission.refuse:
      return (
        couleur1: const Color(0xFF64748B),
        couleur2: const Color(0xFF475569),
        icone: Icons.info_outline_rounded,
        titre: 'Non retenu(e)',
        description: 'Votre dossier n\'a malheureusement pas été retenu pour cette session.',
      );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/admission_repository.dart';
import '../../models/admission.dart';
import '../../widgets/erreur_chargement.dart';
import '../../widgets/info_page_sheet.dart';

/// Page de suivi de l'ensemble des candidatures de l'utilisateur connecté (`/resultats`).
class ResultatScreen extends StatefulWidget {
  const ResultatScreen({super.key});

  @override
  State<ResultatScreen> createState() => _ResultatScreenState();
}

class _ResultatScreenState extends State<ResultatScreen> {
  late Future<List<Admission>> _future;
  String _filtreStatut = 'tous'; // 'tous', 'admis', 'enAttente', 'refuse'

  @override
  void initState() {
    super.initState();
    _recharger();
  }

  Future<void> _recharger() async {
    final f = context.read<AdmissionRepository>().mesCandidatures();
    setState(() => _future = f);
    await f;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Suivi de mes candidatures',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
        ),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Comment fonctionne le suivi ?',
            onPressed: () => afficherInfoPage(
              context: context,
              titre: 'Suivi des Candidatures',
              description:
                  'Consultez en temps réel le statut d\'avancement de vos demandes d\'inscription et bourses.',
              points: [
                (
                  Icons.hourglass_top,
                  'En attente',
                  'Votre dossier a bien été reçu et est actuellement examiné par notre commission.',
                ),
                (
                  Icons.check_circle,
                  'Admis',
                  'Félicitations ! Votre demande est validée. Vous avez accès au cours.',
                ),
                (
                  Icons.support_agent,
                  'Relance Support',
                  'Utilisez le bouton de relance au bas de votre candidature pour contacter un conseiller.',
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: FutureBuilder<List<Admission>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErreurChargement(onRetry: _recharger);
          }
          final candidatures = snap.data ?? const <Admission>[];
          return RefreshIndicator(
            onRefresh: _recharger,
            child: candidatures.isEmpty
                ? _vueVide(context)
                : _vueDashboard(context, candidatures),
          );
        },
      ),
    );
  }

  Widget _vueDashboard(BuildContext context, List<Admission> candidatures) {
    final scheme = Theme.of(context).colorScheme;

    // Métriques de synthèse
    final total = candidatures.length;
    final nbAdmis = candidatures.where((a) => a.admis).length;
    final nbEnAttente = candidatures
        .where((a) => a.statut == StatutAdmission.enAttente)
        .length;
    final nbRefuses = candidatures
        .where((a) => a.statut == StatutAdmission.refuse)
        .length;

    // Filtrage
    final filtrates = candidatures.where((a) {
      if (_filtreStatut == 'admis') return a.admis;
      if (_filtreStatut == 'enAttente') {
        return a.statut == StatutAdmission.enAttente;
      }
      if (_filtreStatut == 'refuse') return a.statut == StatutAdmission.refuse;
      return true;
    }).toList();

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
          // ── Carte Résumé du Dashboard ──
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.emerald, AppColors.emeraldDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppColors.emerald.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: const [
                          Icon(
                            Icons.fact_check_outlined,
                            size: 14,
                            color: Colors.white,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Tableau de bord',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '$total dossier(s)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text(
                  'Ensemble de vos candidatures',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Suivez l\'avancement et les décisions de l\'académie en temps réel.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 18),

                // Cartouches de statistiques rapides
                Row(
                  children: [
                    _badgeStat('Admis(es)', '$nbAdmis', AppColors.emeraldContainer, AppColors.emeraldDark),
                    const SizedBox(width: 8),
                    _badgeStat('En attente', '$nbEnAttente', AppColors.jauneContainer, AppColors.jauneFonce),
                    const SizedBox(width: 8),
                    _badgeStat('Non retenus', '$nbRefuses', const Color(0xFFF1F5F9), const Color(0xFF334155)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Filtres sous forme de Chips ──
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _chipFiltre('tous', 'Toutes ($total)'),
                const SizedBox(width: 8),
                _chipFiltre('admis', 'Admis ($nbAdmis)'),
                const SizedBox(width: 8),
                _chipFiltre('enAttente', 'En attente ($nbEnAttente)'),
                const SizedBox(width: 8),
                _chipFiltre('refuse', 'Non retenu ($nbRefuses)'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Titre de section ──
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
                Text(
                  'Dossiers (${filtrates.length})',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),

          // ── Liste des cartes de candidature ──
          if (filtrates.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 30),
              child: Center(
                child: Text(
                  'Aucun dossier ne correspond à ce filtre.',
                  style: TextStyle(color: scheme.outline),
                ),
              ),
            )
          else ...[
            for (final a in filtrates) ...[
              _CarteCandidatureDashboard(admission: a),
              const SizedBox(height: 14),
            ],
          ],

          // ── Action globale si au moins 1 admis ──
          if (nbAdmis > 0) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => context.push('/centres'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              icon: const Icon(Icons.event_available),
              label: const Text(
                'Prendre rendez-vous dans un centre',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ],
      );
  }

  Widget _badgeStat(String label, String count, Color bg, Color textColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(
              count,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: textColor,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: textColor.withValues(alpha: 0.95),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chipFiltre(String val, String label) {
    final selected = _filtreStatut == val;
    final scheme = Theme.of(context).colorScheme;

    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: scheme.primary,
      backgroundColor: scheme.surface,
      labelStyle: TextStyle(
        color: selected ? Colors.white : scheme.onSurface,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
        fontSize: 13,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: selected
              ? scheme.primary
              : scheme.outlineVariant.withValues(alpha: 0.6),
        ),
      ),
      onSelected: (_) {
        setState(() => _filtreStatut = val);
      },
    );
  }

  Widget _vueVide(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
      children: [
        Center(
          child: Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: scheme.primaryContainer.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.fact_check_outlined,
              size: 48,
              color: scheme.primary,
            ),
          ),
        ),
        const SizedBox(height: 22),
        const Center(
          child: Text(
            'Aucune candidature enregistrée',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            'Vous n\'avez pas encore déposé de candidature aux bourses. '
            'Consultez les bourses disponibles et postulez directement.',
            textAlign: TextAlign.center,
            style: TextStyle(color: scheme.onSurfaceVariant, height: 1.4),
          ),
        ),
        const SizedBox(height: 28),
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
            'Découvrir les bourses',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }
}

/// Carte de candidature synthétique et cliquable dans le Dashboard
class _CarteCandidatureDashboard extends StatelessWidget {
  final Admission admission;
  const _CarteCandidatureDashboard({required this.admission});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final style = _styleStatut(admission.statut);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: scheme.outlineVariant.withValues(alpha: 0.6),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          if (admission.bourseId.isNotEmpty) {
            context.push('/bourse/${admission.bourseId}/resultat');
          }
        },
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icône de statut
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: style.bgColor,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      style.icone,
                      color: style.textColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          admission.titreBourse.isNotEmpty
                              ? admission.titreBourse
                              : 'Bourse Sahel Academy',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Candidat : ${admission.nom}',
                          style: TextStyle(
                            fontSize: 13,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Badge de Statut Pill
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: style.bgColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      style.label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: style.textColor,
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.event_note_outlined,
                        size: 16,
                        color: scheme.outline,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        admission.dateDepot != null
                            ? 'Déposé le ${formatDate(admission.dateDepot!)}'
                            : 'Formulaire soumis',
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.outline,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        'Voir le résultat',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: scheme.primary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        size: 12,
                        color: scheme.primary,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

({Color bgColor, Color textColor, IconData icone, String label})
_styleStatut(StatutAdmission statut) {
  switch (statut) {
    case StatutAdmission.admis:
      return (
        bgColor: AppColors.emeraldContainer,
        textColor: AppColors.emeraldDark,
        icone: Icons.check_circle_rounded,
        label: 'Admis 🎉',
      );
    case StatutAdmission.enAttente:
      return (
        bgColor: AppColors.jauneContainer,
        textColor: AppColors.jauneFonce,
        icone: Icons.hourglass_top_rounded,
        label: 'En attente',
      );
    case StatutAdmission.refuse:
      return (
        bgColor: const Color(0xFFF1F5F9),
        textColor: const Color(0xFF334155),
        icone: Icons.info_outline_rounded,
        label: 'Non retenu',
      );
  }
}

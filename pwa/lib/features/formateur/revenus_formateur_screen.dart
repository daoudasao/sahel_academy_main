import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../models/espace_formateur.dart';
import 'widgets/espace_chargement.dart';

/// Revenus du formateur : gains par classe et fiches de salaire.
class RevenusFormateurScreen extends StatelessWidget {
  const RevenusFormateurScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes revenus')),
      body: EspaceFormateurChargement(
        builder: (context, espace) => RefreshIndicator(
          onRefresh: () => EspaceFormateurChargement.recharger(context),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              _Resume(resume: espace.resume),
              const SizedBox(height: 24),
              const _Titre(
                'Salaires',
                'Fiches mensuelles établies par la comptabilité',
              ),
              const SizedBox(height: 10),
              if (espace.salaires.isEmpty)
                const _Vide('Aucune fiche de salaire pour le moment.')
              else
                ...espace.salaires.map((f) => _CarteFiche(fiche: f)),
              const SizedBox(height: 24),
              const _Titre(
                'Gains par classe',
                'Votre part sur les paiements encaissés',
              ),
              const SizedBox(height: 10),
              if (espace.classes.isEmpty)
                const _Vide('Aucune classe attribuée.')
              else
                ...espace.classes.map((c) => _LigneGain(classe: c)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Resume extends StatelessWidget {
  final ResumeFormateur resume;

  const _Resume({required this.resume});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.emerald, Color(0xFF047857)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Salaire restant à percevoir',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
          ),
          const SizedBox(height: 4),
          Text(
            formatFcfa(resume.resteSalaire),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _chiffre('Salaire versé', formatFcfa(resume.totalSalaireVerse)),
              _chiffre('Gains cumulés', formatFcfa(resume.totalGains)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chiffre(String libelle, String valeur) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            libelle,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.75),
              fontSize: 12.5,
            ),
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              valeur,
              style: const TextStyle(
                color: AppColors.jaune,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Titre extends StatelessWidget {
  final String titre;
  final String sousTitre;

  const _Titre(this.titre, this.sousTitre);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          titre,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        Text(
          sousTitre,
          style: TextStyle(
            fontSize: 13,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _Vide extends StatelessWidget {
  final String texte;

  const _Vide(this.texte);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(
        texte,
        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
      ),
    );
  }
}

class _CarteFiche extends StatelessWidget {
  final FicheSalaireFormateur fiche;

  const _CarteFiche({required this.fiche});

  @override
  Widget build(BuildContext context) {
    final (libelle, couleur) = switch (fiche.statut) {
      StatutSalaire.paye => ('Payé', const Color(0xFF15803D)),
      StatutSalaire.partiel => ('Partiel', AppColors.jauneFonce),
      StatutSalaire.impaye => ('En attente', const Color(0xFFDC2626)),
    };
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          leading: CircleAvatar(
            backgroundColor: couleur.withValues(alpha: 0.12),
            child: Icon(Icons.receipt_long_outlined, color: couleur),
          ),
          title: Text(
            fiche.mois,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Text(
            '${formatFcfa(fiche.montantVerse)} / ${formatFcfa(fiche.montantDu)}',
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: couleur.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              libelle,
              style: TextStyle(
                color: couleur,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          children: [
            if (fiche.reste > 0)
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Reste à verser : ${formatFcfa(fiche.reste)}',
                    style: TextStyle(
                      color: couleur,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            if (fiche.versements.isEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Aucun versement enregistré.',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              )
            else
              for (final v in fiche.versements)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.check_circle_outline,
                      color: Color(0xFF15803D)),
                  title: Text(
                    formatFcfa(v.montant),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    [
                      if (v.date != null) formatDate(v.date!),
                      if (v.note != null) v.note!,
                    ].join(' · '),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _LigneGain extends StatelessWidget {
  final ClasseFormateur classe;

  const _LigneGain({required this.classe});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final pourcentage = classe.pourcentage % 1 == 0
        ? classe.pourcentage.toStringAsFixed(0)
        : classe.pourcentage.toStringAsFixed(1);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    classe.titre,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Encaissé : ${formatFcfa(classe.encaissements)} · Part $pourcentage %',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              formatFcfa(classe.gain),
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: Color(0xFF15803D),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

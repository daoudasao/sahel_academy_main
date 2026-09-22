import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/avatar.dart';
import '../../core/utils/format.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/notification_repository.dart';
import '../../models/espace_formateur.dart';
import '../../widgets/brand_logo.dart';
import 'widgets/carte_classe_formateur.dart';
import 'widgets/espace_chargement.dart';

/// Accueil de l'espace formateur : chiffres clés, classes et raccourcis.
class AccueilFormateurScreen extends StatelessWidget {
  const AccueilFormateurScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthRepository>().utilisateur;
    final nonLues = context.watch<NotificationRepository>().nonLues;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const Row(
          children: [
            BrandLogo(height: 30),
            SizedBox(width: 10),
            Text('Espace formateur'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => context.push('/notifications'),
            icon: Badge(
              isLabelVisible: nonLues > 0,
              label: Text('$nonLues'),
              child: const Icon(Icons.notifications_outlined),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: EspaceFormateurChargement(
        builder: (context, espace) => RefreshIndicator(
          onRefresh: () => EspaceFormateurChargement.recharger(context),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              _EnTete(
                nom: user?.nom ?? espace.formateur.nom,
                avatarUrl: user?.avatarUrl,
                specialite: espace.formateur.specialite,
              ),
              const SizedBox(height: 16),
              _Statistiques(resume: espace.resume),
              const SizedBox(height: 20),
              _Raccourcis(),
              const SizedBox(height: 20),
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Mes classes',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                  ),
                  if (espace.classes.length > 2)
                    TextButton(
                      onPressed: () => context.go('/formateur/classes'),
                      child: const Text('Tout voir'),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (espace.classes.isEmpty)
                const _AucuneClasse()
              else
                ...espace.classes
                    .take(2)
                    .map((c) => CarteClasseFormateur(classe: c)),
            ],
          ),
        ),
      ),
    );
  }
}

class _EnTete extends StatelessWidget {
  final String nom;
  final String? avatarUrl;
  final String? specialite;

  const _EnTete({required this.nom, this.avatarUrl, this.specialite});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.emerald, Color(0xFF047857)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        children: [
          UserAvatar(
            nom: nom,
            avatarUrl: avatarUrl,
            radius: 28,
            backgroundColor: Colors.white,
            textColor: AppColors.emerald,
            tailleTexte: 20,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bonjour ${nom.trim().split(RegExp(r'\s+')).first} 👋',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  specialite ?? 'Formateur Sahel Academy',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Statistiques extends StatelessWidget {
  final ResumeFormateur resume;

  const _Statistiques({required this.resume});

  @override
  Widget build(BuildContext context) {
    final cartes = [
      CarteStat(
        icone: Icons.co_present_outlined,
        libelle: 'Classes',
        valeur: '${resume.classes}',
        couleur: const Color(0xFF15803D),
      ),
      CarteStat(
        icone: Icons.groups_outlined,
        libelle: 'Apprenants',
        valeur: '${resume.apprenants}',
        couleur: const Color(0xFF2563EB),
      ),
      CarteStat(
        icone: Icons.trending_up_rounded,
        libelle: 'Mes gains',
        valeur: formatFcfa(resume.totalGains),
        couleur: AppColors.jauneFonce,
      ),
      CarteStat(
        icone: Icons.hourglass_bottom_rounded,
        libelle: 'Salaire restant dû',
        valeur: formatFcfa(resume.resteSalaire),
        couleur: const Color(0xFFDC2626),
      ),
    ];
    return LayoutBuilder(
      builder: (context, contraintes) {
        final colonnes = contraintes.maxWidth > 600 ? 4 : 2;
        final largeur =
            (contraintes.maxWidth - 12 * (colonnes - 1)) / colonnes;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final c in cartes) SizedBox(width: largeur, child: c),
          ],
        );
      },
    );
  }
}

class _Raccourcis extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final raccourcis = [
      (Icons.account_balance_wallet_outlined, 'Revenus', '/formateur/revenus', true),
      (Icons.dynamic_feed_outlined, 'Actualité', '/formateur/actualite', true),
      (Icons.support_agent_outlined, 'Support', '/support', false),
      (Icons.settings_outlined, 'Paramètres', '/parametres', false),
    ];
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        for (final r in raccourcis)
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => r.$4 ? context.go(r.$3) : context.push(r.$3),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: scheme.primaryContainer,
                      child: Icon(r.$1, color: scheme.onPrimaryContainer),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      r.$2,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _AucuneClasse extends StatelessWidget {
  const _AucuneClasse();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          Icon(Icons.co_present_outlined, size: 40, color: scheme.outline),
          const SizedBox(height: 10),
          const Text(
            "Aucune classe ne vous est encore attribuée.",
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            "L'administration vous affectera à vos formations.",
            textAlign: TextAlign.center,
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

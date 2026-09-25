import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/config/app_version.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';

/// Écran des paramètres de l'application :
/// - Sécurité & Changement de mot de passe
/// - Stockage & Cache
/// - Informations légales (CGU, Politique de confidentialité) et version
class ParametresScreen extends StatefulWidget {
  const ParametresScreen({super.key});

  @override
  State<ParametresScreen> createState() => _ParametresScreenState();
}

class _ParametresScreenState extends State<ParametresScreen> {
  void _afficherModalChangerMotDePasse() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const _ChangerMotDePasseModal(),
    );
  }

  void _viderCache() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Vider le cache local'),
        content: const Text(
          'Cette action va libérer l\'espace occupé par les fichiers temporaires et les images en cache. Vos données de connexion seront conservées.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              
              // Nettoyage effectif du cache d'images et des fichiers temporaires
              PaintingBinding.instance.imageCache.clear();
              PaintingBinding.instance.imageCache.clearLiveImages();
              
              int ficherSupprimes = 0;
              // Sur le web, pas de dossier temporaire de fichiers : on se
              // contente de vider le cache d'images (déjà fait ci-dessus).
              if (!kIsWeb) {
                try {
                  final tempDir = await getTemporaryDirectory();
                  if (await tempDir.exists()) {
                    final entities = tempDir.listSync(recursive: true);
                    for (final entity in entities) {
                      try {
                        if (entity is File) {
                          await entity.delete();
                          ficherSupprimes++;
                        }
                      } catch (_) {}
                    }
                  }
                } catch (_) {}
              }

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      ficherSupprimes > 0
                          ? 'Cache libéré avec succès ($ficherSupprimes fichiers temporaires effacés).'
                          : 'Le cache de l\'application a été vidé avec succès.',
                    ),
                    backgroundColor: AppColors.emerald,
                  ),
                );
              }
            },
            child: const Text('Vider le cache'),
          ),
        ],
      ),
    );
  }

  void _confirmerSuppressionCompte() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded, color: Colors.red),
        title: const Text('Supprimer votre compte ?'),
        content: const Text(
          'Cette action est définitive. Votre profil, vos candidatures, vos '
          'messages au support et vos notifications seront effacés, et vous ne '
          'pourrez plus vous connecter avec ce compte.\n\n'
          'Les inscriptions et paiements déjà enregistrés sont conservés de '
          'façon anonyme pour la comptabilité du centre.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(dialogContext);
              final messenger = ScaffoldMessenger.of(context);
              try {
                // La déconnexion qui suit ramène l'utilisateur à l'accueil.
                await context.read<AuthRepository>().supprimerCompte();
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text('Votre compte a été supprimé.'),
                    backgroundColor: AppColors.emerald,
                  ),
                );
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(
                      e is ApiException ? e.message : 'Suppression impossible : $e',
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Supprimer définitivement'),
          ),
        ],
      ),
    );
  }

  void _afficherModalLegal(BuildContext context, {required String titre, required String contentText}) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Icon(
                    titre.contains('Politique') ? Icons.privacy_tip_outlined : Icons.gavel_outlined,
                    color: AppColors.emerald,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      titre,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const Divider(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(
                    contentText,
                    style: const TextStyle(fontSize: 14, height: 1.5, color: AppColors.ink),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Paramètres'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // ---- Section Sécurité ----
          _enTeteSection(context, 'Sécurité du compte'),
          ListTile(
            leading: _iconContainer(Icons.lock_outline, scheme.primary),
            title: const Text('Changer le mot de passe', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: const Text('Mettre à jour votre mot de passe de connexion'),
            trailing: const Icon(Icons.chevron_right),
            onTap: _afficherModalChangerMotDePasse,
          ),

          const Divider(height: 24),

          // ---- Section Stockage & Maintenance ----
          _enTeteSection(context, 'Stockage & Données'),
          ListTile(
            leading: _iconContainer(Icons.cleaning_services_outlined, Colors.orange),
            title: const Text('Vider le cache', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: const Text('Effacer les données temporaires'),
            onTap: _viderCache,
          ),

          const Divider(height: 24),

          // ---- Section À propos ----
          _enTeteSection(context, 'Mon compte'),
          ListTile(
            leading: _iconContainer(Icons.delete_forever_outlined, Colors.red),
            title: const Text(
              'Supprimer mon compte',
              style: TextStyle(fontWeight: FontWeight.w700, color: Colors.red),
            ),
            subtitle: const Text('Effacer définitivement votre compte et vos données'),
            onTap: _confirmerSuppressionCompte,
          ),

          const Divider(height: 24),

          _enTeteSection(context, 'À propos'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Version de l\'application', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(AppVersion.label),
          ),
          ListTile(
            leading: const Icon(Icons.gavel_outlined),
            title: const Text('Conditions Générales d\'Utilisation', style: TextStyle(fontWeight: FontWeight.w700)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _afficherModalLegal(
                context,
                titre: 'Conditions Générales d\'Utilisation',
                contentText: '''
1. ACCEPTATION DES CONDITIONS
En accédant et en utilisant l'application Sahel Academy, vous acceptez sans réserve les présentes Conditions Générales d'Utilisation.

2. ACCÈS AUX SERVICES ET FORMATIONS
Sahel Academy offre un accès à des formations et ressources pédagogiques. L'accès à certaines fonctionnalités peut nécessiter la création d'un compte étudiant vérifié et à jour de ses paiements.

3. PROPRIÉTÉ INTELLECTUELLE
Tous les contenus (vidéos, documents PDF, textes, logos) présentés sur la plateforme sont protégés par le droit d'auteur. Toute reproduction ou distribution non autorisée est strictly interdite.

4. COMPORTEMENT DE L'UTILISATEUR
L'utilisateur s'engage à fournir des informations exactes lors de son inscription et à préserver la confidentialité de ses identifiants.

5. MODIFICATIONS DES SERVICES
Sahel Academy se réserve le droit d'adapter ou modifier la présente plateforme pour des raisons techniques ou organisationnelles.
''',
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Politique de confidentialité', style: TextStyle(fontWeight: FontWeight.w700)),
            trailing: const Icon(Icons.chevron_right),
            subtitle: const Text('sahel-academy.com/confidentialite'),
            // Google Play exige un lien vers la politique publiée en ligne,
            // la même que celle déclarée sur la fiche du Store.
            onTap: () => launchUrl(
              Uri.parse('https://sahel-academy.com/confidentialite'),
              mode: LaunchMode.externalApplication,
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _enTeteSection(BuildContext context, String titre) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Text(
        titre,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.primary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _iconContainer(IconData icon, Color color) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}

/// Modale de changement de mot de passe
class _ChangerMotDePasseModal extends StatefulWidget {
  const _ChangerMotDePasseModal();

  @override
  State<_ChangerMotDePasseModal> createState() => _ChangerMotDePasseModalState();
}

class _ChangerMotDePasseModalState extends State<_ChangerMotDePasseModal> {
  final _formKey = GlobalKey<FormState>();
  final _ancienCtrl = TextEditingController();
  final _nouveauCtrl = TextEditingController();
  final _confirmerCtrl = TextEditingController();

  bool _masquerAncien = true;
  bool _masquerNouveau = true;
  bool _masquerConfirmer = true;
  bool _enChargement = false;

  @override
  void dispose() {
    _ancienCtrl.dispose();
    _nouveauCtrl.dispose();
    _confirmerCtrl.dispose();
    super.dispose();
  }

  Future<void> _soumettre() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _enChargement = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await context.read<AuthRepository>().changerMotDePasse(
            ancienMotDePasse: _ancienCtrl.text,
            nouveauMotDePasse: _nouveauCtrl.text,
          );

      if (!mounted) return;
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Mot de passe modifié avec succès !'),
          backgroundColor: AppColors.emerald,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _enChargement = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Erreur: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.lock_rounded, color: AppColors.emerald),
                const SizedBox(width: 10),
                const Text(
                  'Modifier le mot de passe',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _ancienCtrl,
              obscureText: _masquerAncien,
              decoration: InputDecoration(
                labelText: 'Mot de passe actuel',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_masquerAncien ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _masquerAncien = !_masquerAncien),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Requis' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nouveauCtrl,
              obscureText: _masquerNouveau,
              decoration: InputDecoration(
                labelText: 'Nouveau mot de passe',
                prefixIcon: const Icon(Icons.lock_reset),
                suffixIcon: IconButton(
                  icon: Icon(_masquerNouveau ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _masquerNouveau = !_masquerNouveau),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) {
                if (v == null || v.length < 6) {
                  return 'Au moins 6 caractères demandés';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirmerCtrl,
              obscureText: _masquerConfirmer,
              decoration: InputDecoration(
                labelText: 'Confirmer le nouveau mot de passe',
                prefixIcon: const Icon(Icons.check_circle_outline),
                suffixIcon: IconButton(
                  icon: Icon(_masquerConfirmer ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _masquerConfirmer = !_masquerConfirmer),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) {
                if (v != _nouveauCtrl.text) {
                  return 'Les mots de passe ne correspondent pas';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: _enChargement ? null : _soumettre,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.emerald,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _enChargement
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Enregistrer le mot de passe', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

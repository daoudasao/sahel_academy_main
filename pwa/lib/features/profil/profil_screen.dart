import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/config/app_version.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/avatar.dart';
import '../../data/repositories/auth_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/brand_logo.dart';

/// Profil de l'utilisateur connecté : ses informations, la modification de profil (Nom, Téléphone, Photo),
/// l'accès à ses paiements et la déconnexion.
class ProfilScreen extends StatelessWidget {
  const ProfilScreen({super.key});

  void _ouvrirModifierProfilModal(BuildContext context, AppUser? user) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _ModifierProfilModal(user: user),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthRepository>().utilisateur;
    final nom = user?.nom ?? 'Utilisateur';
    final tel = user?.telephone ?? '';
    final email = user?.email ?? '';
    final avatarUrl = user?.avatarUrl;
    final estFormateur = user?.estFormateur == true;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const BrandLogo(height: 28),
            const SizedBox(width: 10),
            const Text('Profil'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<AuthRepository>().rafraichirSession(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          children: [
            // ---- En-tête profil en dégradé ----
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.emerald, Color(0xFF047857)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
              ),
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      UserAvatar(
                        nom: nom,
                        avatarUrl: avatarUrl,
                        radius: 44,
                        backgroundColor: Colors.white,
                        textColor: AppColors.emerald,
                        tailleTexte: 30,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: () => _ouvrirModifierProfilModal(context, user),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.jaune,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                            child: const Icon(
                              Icons.camera_alt_rounded,
                              size: 16,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    nom,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  if (tel.isNotEmpty || email.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      tel.isNotEmpty ? '$tel • $email' : email,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            _tuile(
              context,
              icon: Icons.person_outline_rounded,
              titre: 'Modifier mon profil',
              sousTitre: 'Photo, nom complet et numéro de téléphone',
              onTap: () => _ouvrirModifierProfilModal(context, user),
            ),
            if (estFormateur) ...[
              _tuile(
                context,
                icon: Icons.co_present_outlined,
                titre: 'Mes classes',
                sousTitre: 'Publications, documents et apprenants',
                onTap: () => context.go('/formateur/classes'),
              ),
              _tuile(
                context,
                icon: Icons.account_balance_wallet_outlined,
                titre: 'Mes revenus',
                sousTitre: 'Salaires, versements et gains par classe',
                onTap: () => context.go('/formateur/revenus'),
              ),
            ] else ...[
              _tuile(
                context,
                icon: Icons.payments_outlined,
                titre: 'Mes paiements',
                sousTitre: 'Inscription, mensualités, prochaine échéance',
                onTap: () => context.push('/paiements'),
              ),
              _tuile(
                context,
                icon: Icons.fact_check_outlined,
                titre: 'Résultats des candidatures',
                sousTitre: 'Suivi et décisions des candidatures aux bourses',
                onTap: () => context.push('/resultats'),
              ),
              _tuile(
                context,
                icon: Icons.folder_outlined,
                titre: 'Mes documents',
                sousTitre: 'Documents reçus dans mes formations',
                onTap: () => context.push('/documents'),
              ),
            ],
            _tuile(
              context,
              icon: Icons.support_agent_outlined,
              titre: 'Contacter le support',
              sousTitre: 'Une question ? Discute avec notre équipe',
              onTap: () => context.push('/support'),
            ),
            _tuile(
              context,
              icon: Icons.settings_outlined,
              titre: 'Paramètres',
              sousTitre: 'Notifications, langue, compte',
              onTap: () => context.push('/parametres'),
            ),
            const Divider(height: 24),
            _tuile(
              context,
              icon: Icons.logout,
              titre: 'Se déconnecter',
              couleur: Colors.red,
              onTap: () => _confirmerDeconnexion(context),
            ),
            const SizedBox(height: 16),
            Center(
              child: Text(
                'Sahel Academy ${AppVersion.label}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _confirmerDeconnexion(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Se déconnecter'),
        content: const Text('Veux-tu vraiment te déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
              minimumSize: const Size(0, 44),
            ),
            onPressed: () {
              Navigator.of(dialogContext).pop();
              context.read<AuthRepository>().deconnexion();
            },
            child: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
  }

  Widget _tuile(
    BuildContext context, {
    required IconData icon,
    required String titre,
    String? sousTitre,
    Color? couleur,
    VoidCallback? onTap,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final c = couleur ?? scheme.primary;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: c, size: 22),
      ),
      title: Text(
        titre,
        style: TextStyle(fontWeight: FontWeight.w700, color: couleur),
      ),
      subtitle: sousTitre != null ? Text(sousTitre) : null,
      trailing: Icon(Icons.chevron_right, color: scheme.outline),
      onTap: onTap ?? () {},
    );
  }
}

/// Modale d'édition de profil.
class _ModifierProfilModal extends StatefulWidget {
  final AppUser? user;
  const _ModifierProfilModal({required this.user});

  @override
  State<_ModifierProfilModal> createState() => _ModifierProfilModalState();
}

class _ModifierProfilModalState extends State<_ModifierProfilModal> {
  late final TextEditingController _nomController;
  late final TextEditingController _telController;
  final _formKey = GlobalKey<FormState>();
  
  String? _newAvatarUrl;
  bool _uploadingPhoto = false;
  bool _chargement = false;

  @override
  void initState() {
    super.initState();
    _nomController = TextEditingController(text: widget.user?.nom ?? '');
    _telController = TextEditingController(text: widget.user?.telephone ?? '');
    _newAvatarUrl = widget.user?.avatarUrl;
  }

  @override
  void dispose() {
    _nomController.dispose();
    _telController.dispose();
    super.dispose();
  }

  Future<void> _choisirPhoto() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;

    setState(() => _uploadingPhoto = true);
    try {
      final bytes = await file.readAsBytes();
      final url = await ApiClient.instance.uploadMultipart(
        bytes,
        file.name,
        folder: 'avatars',
      );
      setState(() => _newAvatarUrl = url);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de l\'envoi de la photo : $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _enregistrer() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _chargement = true);

    try {
      await context.read<AuthRepository>().mettreAJourProfil(
            nom: _nomController.text.trim(),
            telephone: _telController.text.trim(),
            avatarUrl: _newAvatarUrl,
          );
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profil mis à jour avec succès !'),
            backgroundColor: Color(0xFF059669),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de la mise à jour : $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: scheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Modifier mon profil',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 18),

            // Selector Photo Avatar
            Center(
              child: Stack(
                children: [
                  UserAvatar(
                    nom: widget.user?.nom ?? 'U',
                    avatarUrl: _newAvatarUrl,
                    radius: 42,
                    backgroundColor: AppColors.emeraldContainer,
                    textColor: AppColors.emeraldDark,
                    tailleTexte: 26,
                    enfantSurcharge: _uploadingPhoto
                        ? const CircularProgressIndicator()
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: InkWell(
                      onTap: _uploadingPhoto ? null : _choisirPhoto,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: AppColors.emerald,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Center(
              child: TextButton.icon(
                onPressed: _uploadingPhoto ? null : _choisirPhoto,
                icon: const Icon(Icons.photo_library_outlined, size: 16),
                label: const Text('Changer la photo de profil'),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _nomController,
              decoration: const InputDecoration(
                labelText: 'Nom complet',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Veuillez saisir votre nom' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _telController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Numéro de téléphone',
                hintText: '+223 ... ou 76 00 00 00',
                prefixIcon: Icon(Icons.phone_android_outlined),
              ),
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Veuillez saisir votre numéro de téléphone'
                  : null,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: _chargement || _uploadingPhoto ? null : _enregistrer,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.emerald,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _chargement
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Enregistrer les modifications',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../data/repositories/auth_repository.dart';
import '../../widgets/brand_logo.dart';
import 'validateurs.dart';
import 'widgets/auth_text_field.dart';
import 'widgets/oauth_buttons.dart';

/// Écran de création de compte (nom, e-mail, téléphone, mot de passe + OAuth).
class InscriptionScreen extends StatefulWidget {
  const InscriptionScreen({super.key});

  @override
  State<InscriptionScreen> createState() => _InscriptionScreenState();
}

class _InscriptionScreenState extends State<InscriptionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nom = TextEditingController();
  final _email = TextEditingController();
  final _telephone = TextEditingController();
  final _motDePasse = TextEditingController();
  bool _enCours = false;

  @override
  void dispose() {
    _nom.dispose();
    _email.dispose();
    _telephone.dispose();
    _motDePasse.dispose();
    super.dispose();
  }

  Future<void> _inscription() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthRepository>();
    setState(() => _enCours = true);
    try {
      await auth.inscription(
        nom: _nom.text.trim(),
        email: _email.text.trim(),
        telephone: _telephone.text.trim(),
        motDePasse: _motDePasse.text,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _enCours = false);
    }
  }

  Future<void> _oauth(String fournisseur) async {
    final auth = context.read<AuthRepository>();
    setState(() => _enCours = true);
    try {
      await auth.connexionOAuth(fournisseur);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _enCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: AbsorbPointer(
          absorbing: _enCours,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.only(bottom: 20),
                      child: BrandLogo(height: 54),
                    ),
                  ),
                  const Text(
                    'Créer un compte',
                    style:
                        TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Rejoins Sahel Academy en quelques secondes.',
                    style: TextStyle(color: scheme.outline, fontSize: 15),
                  ),
                  const SizedBox(height: 30),

                  AuthTextField(
                    controller: _nom,
                    label: 'Nom complet',
                    icon: Icons.person_outline,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Entre ton nom'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _email,
                    label: 'Adresse e-mail',
                    icon: Icons.mail_outline,
                    keyboardType: TextInputType.emailAddress,
                    validator: _validerEmail,
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _telephone,
                    label: 'Téléphone',
                    icon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                    validator: validerTelephone,
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _motDePasse,
                    label: 'Mot de passe',
                    icon: Icons.lock_outline,
                    motDePasse: true,
                    validator: (v) => (v == null || v.length < 6)
                        ? 'Au moins 6 caractères'
                        : null,
                  ),
                  const SizedBox(height: 24),

                  FilledButton(
                    onPressed: _enCours ? null : _inscription,
                    child: _enCours
                        ? const _Chargement()
                        : const Text('Créer mon compte'),
                  ),
                  const SizedBox(height: 24),

                  OAuthSection(onGoogle: () => _oauth('google')),
                  const SizedBox(height: 26),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Déjà un compte ?',
                          style: TextStyle(color: scheme.outline)),
                      TextButton(
                        onPressed: () =>
                            context.pushReplacement('/connexion'),
                        child: const Text('Se connecter'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? _validerEmail(String? v) {
    if (v == null || v.trim().isEmpty) return 'Entre ton adresse e-mail';
    final regex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!regex.hasMatch(v.trim())) return 'Adresse e-mail invalide';
    return null;
  }
}

class _Chargement extends StatelessWidget {
  const _Chargement();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 22,
      width: 22,
      child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
    );
  }
}

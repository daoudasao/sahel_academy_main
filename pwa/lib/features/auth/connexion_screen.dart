import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../data/repositories/auth_repository.dart';
import '../../widgets/brand_logo.dart';
import 'widgets/auth_text_field.dart';
import 'widgets/oauth_buttons.dart';

/// Écran de connexion (e-mail / mot de passe + OAuth).
class ConnexionScreen extends StatefulWidget {
  const ConnexionScreen({super.key});

  @override
  State<ConnexionScreen> createState() => _ConnexionScreenState();
}

class _ConnexionScreenState extends State<ConnexionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _motDePasse = TextEditingController();
  bool _enCours = false;

  @override
  void dispose() {
    _email.dispose();
    _motDePasse.dispose();
    super.dispose();
  }

  Future<void> _connexion() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthRepository>();
    setState(() => _enCours = true);
    try {
      await auth.connexionEmail(
        email: _email.text.trim(),
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
                    'Bon retour 👋',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Connecte-toi pour continuer.',
                    style: TextStyle(color: scheme.outline, fontSize: 15),
                  ),
                  const SizedBox(height: 30),

                  AuthTextField(
                    controller: _email,
                    label: 'Adresse e-mail',
                    icon: Icons.mail_outline,
                    keyboardType: TextInputType.emailAddress,
                    validator: _validerEmail,
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

                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      child: const Text('Mot de passe oublié ?'),
                    ),
                  ),
                  const SizedBox(height: 8),

                  FilledButton(
                    onPressed: _enCours ? null : _connexion,
                    child: _enCours
                        ? const _Chargement()
                        : const Text('Se connecter'),
                  ),
                  const SizedBox(height: 24),

                  OAuthSection(onGoogle: () => _oauth('google')),
                  const SizedBox(height: 26),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Pas encore de compte ?',
                        style: TextStyle(color: scheme.outline),
                      ),
                      TextButton(
                        onPressed: () =>
                            context.pushReplacement('/inscription'),
                        child: const Text('Créer un compte'),
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

/// Indicateur de chargement affiché dans le bouton.
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

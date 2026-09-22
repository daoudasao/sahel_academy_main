import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/repositories/auth_repository.dart';
import '../../widgets/brand_logo.dart';
import 'validateurs.dart';
import 'widgets/auth_text_field.dart';

/// Écran de complétion du profil.
///
/// Imposé par le routeur à tout utilisateur connecté dont le téléphone manque :
/// comptes créés via Google (qui ne fournit pas de numéro) et comptes plus
/// anciens, créés avant que le champ ne devienne obligatoire. Impossible de le
/// contourner — seule la déconnexion en sort.
class CompleterProfilScreen extends StatefulWidget {
  const CompleterProfilScreen({super.key});

  @override
  State<CompleterProfilScreen> createState() => _CompleterProfilScreenState();
}

class _CompleterProfilScreenState extends State<CompleterProfilScreen> {
  final _formKey = GlobalKey<FormState>();
  final _telephone = TextEditingController();
  bool _enCours = false;

  @override
  void dispose() {
    _telephone.dispose();
    super.dispose();
  }

  Future<void> _enregistrer() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthRepository>();
    setState(() => _enCours = true);
    try {
      // Le routeur quitte cet écran de lui-même dès que le profil est complet.
      await auth.enregistrerTelephone(_telephone.text);
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
    final auth = context.watch<AuthRepository>();
    final prenom = auth.utilisateur?.prenom ?? '';

    // Pas de retour possible : le profil doit être complété.
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: AbsorbPointer(
            absorbing: _enCours,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
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
                    Text(
                      prenom.isEmpty
                          ? 'Encore une chose 📱'
                          : 'Encore une chose, $prenom 📱',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ton numéro de téléphone nous permet de te joindre pour '
                      'tes inscriptions, tes paiements et tes résultats.',
                      style: TextStyle(color: scheme.outline, fontSize: 15),
                    ),
                    const SizedBox(height: 28),

                    AuthTextField(
                      controller: _telephone,
                      label: 'Téléphone',
                      icon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                      validator: validerTelephone,
                    ),
                    const SizedBox(height: 24),

                    FilledButton(
                      onPressed: _enCours ? null : _enregistrer,
                      child: _enCours
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Continuer'),
                    ),
                    const SizedBox(height: 8),

                    Center(
                      child: TextButton(
                        onPressed: _enCours ? null : auth.deconnexion,
                        child: const Text('Se déconnecter'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api/api_client.dart';
import '../data/repositories/auth_repository.dart';

/// Contenus qu'un utilisateur peut signaler (valeurs identiques au backend).
enum TypeContenuSignale {
  messageClasse('message_classe'),
  commentaireClasse('commentaire_classe'),
  commentairePost('commentaire_post');

  final String api;
  const TypeContenuSignale(this.api);
}

/// Motifs proposés (valeurs identiques au backend).
enum MotifSignalement {
  spam('spam', 'Spam ou publicité'),
  harcelement('harcelement', 'Harcèlement ou intimidation'),
  contenuInapproprie('contenu_inapproprie', 'Contenu inapproprié ou choquant'),
  discoursHaineux('discours_haineux', 'Propos haineux ou discriminatoires'),
  fausseInformation('fausse_information', 'Fausse information'),
  autre('autre', 'Autre');

  final String api;
  final String libelle;
  const MotifSignalement(this.api, this.libelle);
}

/// Vrai si l'utilisateur connecté peut signaler ce contenu : pas le sien, et
/// pas un contenu de l'équipe (c'est elle qui modère).
bool peutSignaler(
  BuildContext context, {
  required String? auteurId,
  required String auteurNom,
  required String auteurRole,
}) {
  final moi = context.read<AuthRepository>().utilisateur;
  if (moi == null) return false;

  final role = auteurRole.trim().toLowerCase();
  if (role.contains('admin') ||
      role.contains('équipe') ||
      role.contains('equipe')) {
    return false;
  }

  // Anciens contenus sans compte d'auteur : comparaison par nom.
  final estLeMien = auteurId != null
      ? auteurId == moi.id
      : auteurNom.trim().toLowerCase() == moi.nom.trim().toLowerCase();
  return !estLeMien;
}

/// Ouvre la feuille de signalement puis envoie le signalement à la
/// modération. Affiche le résultat dans une SnackBar.
Future<void> signalerContenu(
  BuildContext context, {
  required TypeContenuSignale type,
  required String contenuId,
  required String auteurNom,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  final envoye = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _FeuilleSignalement(
      type: type,
      contenuId: contenuId,
      auteurNom: auteurNom,
    ),
  );
  if (envoye == true) {
    messenger.showSnackBar(
      const SnackBar(
        content: Text(
          'Merci. Notre équipe va examiner ce contenu dans les 24 heures.',
        ),
      ),
    );
  }
}

class _FeuilleSignalement extends StatefulWidget {
  final TypeContenuSignale type;
  final String contenuId;
  final String auteurNom;

  const _FeuilleSignalement({
    required this.type,
    required this.contenuId,
    required this.auteurNom,
  });

  @override
  State<_FeuilleSignalement> createState() => _FeuilleSignalementState();
}

class _FeuilleSignalementState extends State<_FeuilleSignalement> {
  final _details = TextEditingController();
  MotifSignalement? _motif;
  bool _enEnvoi = false;
  String? _erreur;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _envoyer() async {
    final motif = _motif;
    if (motif == null || _enEnvoi) return;
    setState(() {
      _enEnvoi = true;
      _erreur = null;
    });
    try {
      final details = _details.text.trim();
      await ApiClient.instance.post('/signalements', {
        'type': widget.type.api,
        'contenuId': widget.contenuId,
        'motif': motif.api,
        if (details.isNotEmpty) 'details': details,
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _enEnvoi = false;
          _erreur = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bas = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bas),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Icon(Icons.flag_outlined, color: scheme.error),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Signaler ce contenu',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Publié par ${widget.auteurNom}. Votre signalement est '
                'anonyme : l\'auteur ne saura pas qui l\'a fait.',
                style: TextStyle(color: scheme.onSurfaceVariant, height: 1.35),
              ),
              const SizedBox(height: 12),
              const Text(
                'Pourquoi signalez-vous ce contenu ?',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              RadioGroup<MotifSignalement>(
                groupValue: _motif,
                onChanged: (m) => setState(() => _motif = m),
                child: Column(
                  children: [
                    for (final m in MotifSignalement.values)
                      RadioListTile<MotifSignalement>(
                        value: m,
                        title: Text(m.libelle),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              TextField(
                controller: _details,
                maxLength: 1000,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Précisions (facultatif)',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_erreur != null) ...[
                Text(_erreur!, style: TextStyle(color: scheme.error)),
                const SizedBox(height: 8),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: scheme.error,
                    foregroundColor: scheme.onError,
                  ),
                  onPressed: _motif == null || _enEnvoi ? null : _envoyer,
                  icon: _enEnvoi
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send_rounded),
                  label: const Text('Envoyer le signalement'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

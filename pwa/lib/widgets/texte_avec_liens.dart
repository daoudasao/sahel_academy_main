import 'package:flutter/material.dart';
import 'package:flutter_linkify/flutter_linkify.dart';
import 'package:url_launcher/url_launcher.dart';

/// Affiche un texte en détectant automatiquement les liens (URL).
///
/// Les liens sont mis en **bleu** et soulignés, et s'ouvrent dans le
/// navigateur au tap. Utilisé dans les posts et les commentaires.
class TexteAvecLiens extends StatelessWidget {
  final String texte;
  final TextStyle? style;

  const TexteAvecLiens(this.texte, {super.key, this.style});

  @override
  Widget build(BuildContext context) {
    return Linkify(
      text: texte,
      style: style,
      linkStyle: const TextStyle(
        color: Color(0xFF2563EB), // bleu
        decoration: TextDecoration.underline,
        decorationColor: Color(0xFF2563EB),
      ),
      options: const LinkifyOptions(humanize: false, defaultToHttps: true),
      onOpen: (link) async {
        final uri = Uri.tryParse(link.url);
        if (uri == null) return;
        try {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (_) {
          // Lien invalide ou impossible à ouvrir : on ignore silencieusement.
        }
      },
    );
  }
}

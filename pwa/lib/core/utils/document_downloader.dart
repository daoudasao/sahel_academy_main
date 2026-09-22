import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_config.dart';

/// Service utilitaire pour analyser, télécharger, mettre en cache local et
/// ouvrir les documents joints (PDF, Word, Excel, etc.) dans l'application mobile.
class DocumentDownloader {
  /// Extrait (nom, url) à partir d'une chaîne [rawDocumentNom] qui peut être :
  /// - `NomDeFichier.pdf|http://.../file.pdf`
  /// - `http://.../file.pdf`
  /// - `NomDeFichier.pdf` (repli sur le dossier d'uploads du backend)
  static Map<String, String> analyserDocument(String rawDocumentNom) {
    if (rawDocumentNom.isEmpty) {
      return {'nom': 'Document.pdf', 'nomLocal': 'document.pdf', 'url': ''};
    }

    String nomAffiche = 'Document.pdf';
    String url = '';

    if (rawDocumentNom.contains('|')) {
      final parts = rawDocumentNom.split('|');
      final nom = parts[0].trim();
      final targetUrl = parts.sublist(1).join('|').trim();
      nomAffiche = nom.isNotEmpty ? nom : 'Document.pdf';
      url = _normaliserUrl(targetUrl.isNotEmpty ? targetUrl : nom);
    } else if (rawDocumentNom.startsWith('http://') ||
        rawDocumentNom.startsWith('https://')) {
      final uri = Uri.tryParse(rawDocumentNom);
      nomAffiche = uri?.pathSegments.isNotEmpty == true
          ? uri!.pathSegments.last
          : 'Document.pdf';
      url = rawDocumentNom;
    } else {
      nomAffiche = rawDocumentNom;
      url = _normaliserUrl('/uploads/$rawDocumentNom');
    }

    // Nom local unique pour éviter toute collision sur le disque (ex: "174044000-Exercice1.pdf")
    String nomLocal = nomAffiche;
    final uri = Uri.tryParse(url);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      nomLocal = uri.pathSegments.last;
    }

    return {
      'nom': nomAffiche,
      'nomLocal': nomLocal,
      'url': url,
    };
  }

  static String _normaliserUrl(String pathOrUrl) {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    final apiBase = ApiConfig.baseUrl;
    final uri = Uri.tryParse(apiBase);
    final origin = (uri != null && uri.hasAuthority)
        ? '${uri.scheme}://${uri.authority}'
        : apiBase.replaceAll('/api/v1', '');

    final path = pathOrUrl.startsWith('/') ? pathOrUrl : '/$pathOrUrl';
    return '$origin$path';
  }

  /// Indique si le fichier est actuellement disponible en cache local.
  static Future<bool> estEnCacheLocal(String rawDocumentNom) async {
    // Sur le web, pas de cache fichier local : le document s'ouvre dans un onglet.
    if (kIsWeb) return false;
    try {
      final info = analyserDocument(rawDocumentNom);
      final nomLocal = info['nomLocal']!;
      final docDir = await getApplicationDocumentsDirectory();
      final folder = Directory('${docDir.path}/documents');
      final file = File('${folder.path}/$nomLocal');
      return await file.exists();
    } catch (_) {
      return false;
    }
  }

  /// Télécharge le fichier s'il n'est pas déjà en local, puis l'ouvre.
  /// Par défaut ([afficherModale] = false), aucun dialogue bloquant n'est affiché.
  /// L'état du bouton s'actualise directement en ligne sur la carte.
  static Future<void> telechargerEtOuvrir(
    BuildContext context,
    String rawDocumentNom, {
    bool afficherModale = false,
    Function(bool enCours)? onLoadingStateChanged,
  }) async {
    final info = analyserDocument(rawDocumentNom);
    final nom = info['nom']!;
    final nomLocal = info['nomLocal']!;
    final url = info['url']!;

    if (url.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ Aucun fichier associé à cette annonce.'),
          ),
        );
      }
      return;
    }

    // Sur le web : pas de téléchargement/ouverture de fichier local.
    // On ouvre le document directement dans un nouvel onglet du navigateur.
    if (kIsWeb) {
      final uri = Uri.tryParse(url);
      if (uri != null) {
        await launchUrl(uri, webOnlyWindowName: '_blank');
      }
      return;
    }

    try {
      final docDir = await getApplicationDocumentsDirectory();
      final folder = Directory('${docDir.path}/documents');
      if (!await folder.exists()) {
        await folder.create(recursive: true);
      }
      final localFile = File('${folder.path}/$nomLocal');

      // 1. Si déjà en local -> pas de re-téléchargement ! Ouverture directe
      if (await localFile.exists()) {
        if (context.mounted) {
          await _ouvrirFichier(context, localFile);
        }
        return;
      }

      // 2. Sinon -> Téléchargement direct sans modale écran (état du bouton en ligne)
      if (!afficherModale) {
        onLoadingStateChanged?.call(true);
        try {
          final res = await http.get(Uri.parse(url));
          if (res.statusCode == 200) {
            await localFile.writeAsBytes(res.bodyBytes);
            onLoadingStateChanged?.call(false);
            if (context.mounted) {
              await _ouvrirFichier(context, localFile);
            }
          } else {
            onLoadingStateChanged?.call(false);
            if (context.mounted) {
              final is404 = res.statusCode == 404;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    is404
                        ? '⚠️ Le fichier "$nom" n\'existe pas encore sur le serveur.'
                        : 'Erreur lors du téléchargement de $nom.',
                  ),
                  backgroundColor: Colors.red.shade700,
                ),
              );
            }
          }
        } catch (e) {
          onLoadingStateChanged?.call(false);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Erreur réseau lors du téléchargement.'),
                backgroundColor: Colors.red.shade700,
              ),
            );
          }
        }
        return;
      }

      // 3. Modale si explicitement demandée
      if (!context.mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return _DialogueProgressionTelechargement(
            nomFichier: nom,
            urlFichier: url,
            fichierCible: localFile,
            onTermine: (file) async {
              Navigator.of(dialogContext).pop();
              if (context.mounted) {
                await _ouvrirFichier(context, file);
              }
            },
            onErreur: (err) async {
              Navigator.of(dialogContext).pop();
              if (context.mounted) {
                final is404 = err.contains('404');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      is404
                          ? '⚠️ Le fichier "$nom" n\'existe pas encore sur le serveur.'
                          : 'Erreur lors du téléchargement de $nom.',
                    ),
                    backgroundColor: Colors.red.shade700,
                  ),
                );
              }
            },
          );
        },
      );
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible d\'accéder au fichier.')),
        );
      }
    }
  }

  static Future<void> _ouvrirFichier(BuildContext context, File file) async {
    try {
      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done) {
        debugPrint('OpenFilex message: ${result.message}');
        if (context.mounted) {
          final ext = file.path.contains('.') ? file.path.split('.').last.toUpperCase() : 'PDF';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '⚠️ Aucune application compatible n\'est installée sur votre téléphone pour lire ce fichier ($ext).',
              ),
              backgroundColor: Colors.orange.shade800,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Erreur lors de l\'ouverture du fichier: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Impossible d\'ouvrir le fichier local.'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }
}

/// Modale affichant la progression en temps réel (pourcentage et Mo) du téléchargement.
class _DialogueProgressionTelechargement extends StatefulWidget {
  final String nomFichier;
  final String urlFichier;
  final File fichierCible;
  final Function(File) onTermine;
  final Function(String) onErreur;

  const _DialogueProgressionTelechargement({
    required this.nomFichier,
    required this.urlFichier,
    required this.fichierCible,
    required this.onTermine,
    required this.onErreur,
  });

  @override
  State<_DialogueProgressionTelechargement> createState() =>
      _DialogueProgressionTelechargementState();
}

class _DialogueProgressionTelechargementState
    extends State<_DialogueProgressionTelechargement> {
  double _progression = 0.0;
  String _tailleTexte = 'Connexion au serveur...';
  bool _estTermine = false;
  http.Client? _client;

  @override
  void initState() {
    super.initState();
    _demarrerTelechargement();
  }

  Future<void> _demarrerTelechargement() async {
    try {
      _client = http.Client();
      final request = http.Request('GET', Uri.parse(widget.urlFichier));
      final response = await _client!.send(request);

      if (response.statusCode != 200) {
        throw Exception('Code HTTP ${response.statusCode}');
      }

      final totalBytes = response.contentLength ?? 0;
      int receivedBytes = 0;
      final bytes = <int>[];

      response.stream.listen(
        (chunk) {
          bytes.addAll(chunk);
          receivedBytes += chunk.length;

          if (mounted) {
            setState(() {
              if (totalBytes > 0) {
                _progression = receivedBytes / totalBytes;
                final recMo = (receivedBytes / (1024 * 1024)).toStringAsFixed(1);
                final totMo = (totalBytes / (1024 * 1024)).toStringAsFixed(1);
                _tailleTexte = '${(_progression * 100).toInt()}% ($recMo / $totMo Mo)';
              } else {
                final recMo = (receivedBytes / (1024 * 1024)).toStringAsFixed(1);
                _tailleTexte = '$recMo Mo téléchargés';
              }
            });
          }
        },
        onDone: () async {
          await widget.fichierCible.writeAsBytes(bytes);
          if (mounted) {
            setState(() {
              _progression = 1.0;
              _estTermine = true;
              _tailleTexte = 'Téléchargement terminé !';
            });
          }
          await Future.delayed(const Duration(milliseconds: 500));
          widget.onTermine(widget.fichierCible);
        },
        onError: (err) {
          widget.onErreur(err.toString());
        },
        cancelOnError: true,
      );
    } catch (e) {
      widget.onErreur(e.toString());
    }
  }

  @override
  void dispose() {
    _client?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    const emeraldColor = Color(0xFF059669);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _estTermine
                    ? emeraldColor.withValues(alpha: 0.14)
                    : scheme.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _estTermine
                    ? Icons.check_circle_rounded
                    : Icons.file_download_rounded,
                size: 36,
                color: _estTermine ? emeraldColor : scheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _estTermine ? 'Document prêt !' : 'Téléchargement...',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
            ),
            const SizedBox(height: 4),
            Text(
              widget.nomFichier,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: scheme.outline, fontSize: 13),
            ),
            const SizedBox(height: 20),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: _progression > 0 ? _progression : null,
                minHeight: 8,
                backgroundColor: scheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation<Color>(
                  _estTermine ? emeraldColor : scheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _tailleTexte,
              style: TextStyle(
                color: _estTermine ? emeraldColor : scheme.primary,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

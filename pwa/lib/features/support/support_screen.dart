import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/document_downloader.dart';
import '../../data/repositories/support_repository.dart';
import '../../models/support_message.dart';
import '../../widgets/erreur_chargement.dart';

class SuggestionRapide {
  final String label;
  final String message;
  const SuggestionRapide({required this.label, required this.message});
}

/// Suggestions rapides proposées à l'élève.
const List<SuggestionRapide> _suggestionsRapides = [
  SuggestionRapide(
    label: '🎓 Inscription aux cours',
    message: "Bonjour Sahel Academy, j'aimerais m'inscrire à une de vos formations/cours. Pouvez-vous m'indiquer la démarche à suivre ?",
  ),
  SuggestionRapide(
    label: '💳 Problème de paiement',
    message: "Bonjour, j'ai une question ou une difficulté concernant le paiement de mes frais de formation. Merci de m me guider.",
  ),
  SuggestionRapide(
    label: '🎁 Demande de bourse',
    message: "Bonjour Sahel Academy, je souhaite obtenir des informations sur les modalités de candidature aux bourses d'études disponibles.",
  ),
  SuggestionRapide(
    label: '📍 Rendez-vous en centre',
    message: "Bonjour, j'aimerais prendre un rendez-vous dans vos locaux pour échanger de vive voix avec un conseiller.",
  ),
];

/// Chat entre le client et le support Sahel Academy avec header enrichi, statut en ligne et vocal.
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final AudioRecorder _recorder = AudioRecorder();

  bool _envoiEnCours = false;
  bool _estEnEnregistrement = false;
  int _dureeEnregistrementSeconds = 0;
  Timer? _timerEnregistrement;

  @override
  void initState() {
    super.initState();
    final repo = context.read<SupportRepository>();
    repo.charger().then((_) => _scrollEnBas());
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _timerEnregistrement?.cancel();
    _recorder.dispose();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollEnBas() {
    if (!_scroll.hasClients) return;
    _scroll.animateTo(
      _scroll.position.maxScrollExtent,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  Future<void> _demarrerEnregistrement() async {
    try {
      if (await _recorder.hasPermission()) {
        final tempDir = kIsWeb ? null : await getTemporaryDirectory();
        final path = kIsWeb
            ? ''
            : '${tempDir!.path}/vocal_${DateTime.now().millisecondsSinceEpoch}.m4a';

        await _recorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc),
          path: path,
        );

        setState(() {
          _estEnEnregistrement = true;
          _dureeEnregistrementSeconds = 0;
        });

        _timerEnregistrement?.cancel();
        _timerEnregistrement =
            Timer.periodic(const Duration(seconds: 1), (timer) {
          if (mounted) {
            setState(() => _dureeEnregistrementSeconds++);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur d\'accès au micro : $e')),
        );
      }
    }
  }

  Future<void> _arreterEtEnvoyerVocal() async {
    _timerEnregistrement?.cancel();
    final messenger = ScaffoldMessenger.of(context);
    final repo = context.read<SupportRepository>();
    final duree = _dureeEnregistrementSeconds;

    try {
      final path = await _recorder.stop();
      setState(() {
        _estEnEnregistrement = false;
        _envoiEnCours = true;
      });

      List<int>? bytes;
      if (kIsWeb) {
        // Sur le web, `record` renvoie un blob URL (blob:http://…).
        // On récupère les octets du blob via une requête HTTP locale.
        if (path != null && path.isNotEmpty) {
          try {
            final response = await http.get(Uri.parse(path));
            if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
              bytes = response.bodyBytes;
            }
          } catch (e) {
            debugPrint('Erreur lecture blob vocal web : $e');
          }
        }
      } else if (path != null && path.isNotEmpty) {
        final file = File(path);
        if (await file.exists()) {
          bytes = await file.readAsBytes();
        }
      }

      if (bytes != null && bytes.isNotEmpty) {
        await repo.envoyerAudio(bytes, duree > 0 ? duree : 1);
        _scrollEnBas();
      }
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('Erreur lors de l\'envoi du vocal : $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _estEnEnregistrement = false;
          _envoiEnCours = false;
          _dureeEnregistrementSeconds = 0;
        });
      }
    }
  }

  Future<void> _annulerEnregistrement() async {
    _timerEnregistrement?.cancel();
    await _recorder.stop();
    setState(() {
      _estEnEnregistrement = false;
      _dureeEnregistrementSeconds = 0;
    });
  }

  Future<void> _envoyer([String? texteForce]) async {
    final texte = (texteForce ?? _controller.text).trim();
    if (texte.isEmpty || _envoiEnCours) return;
    final repo = context.read<SupportRepository>();
    final messenger = ScaffoldMessenger.of(context);
    _controller.clear();
    setState(() => _envoiEnCours = true);
    try {
      await repo.envoyer(texte);
      _scrollEnBas();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Échec de l\'envoi : $e')));
    } finally {
      if (mounted) setState(() => _envoiEnCours = false);
    }
  }

  String _formatChrono(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        elevation: 1,
        scrolledUnderElevation: 2,
        titleSpacing: 0,
        title: Row(
          children: [
            // Avatar de l'agent support avec badge de présence
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.emerald,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.emerald.withValues(alpha: 0.25),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.support_agent_rounded,
                    color: AppColors.jaune,
                    size: 24,
                  ),
                ),
                // Macaron Vert "En ligne"
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Support Client',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF22C55E),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          'En ligne • Réponse hab. < 15 min',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualiser le chat',
            onPressed: () {
              context.read<SupportRepository>().charger(silencieux: true);
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Consumer<SupportRepository>(
              builder: (context, repo, _) {
                if (repo.enChargement && repo.messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (repo.erreur != null && repo.messages.isEmpty) {
                  return ErreurChargement(onRetry: () => repo.charger());
                }
                if (repo.messages.isEmpty) {
                  return _vueVide(context);
                }
                WidgetsBinding.instance.addPostFrameCallback(
                  (_) => _scrollEnBas(),
                );
                return RefreshIndicator(
                  onRefresh: () => repo.charger(silencieux: true),
                  child: ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                    itemCount: repo.messages.length,
                    itemBuilder: (context, i) =>
                        _Bulle(message: repo.messages[i]),
                  ),
                );
              },
            ),
          ),
          // Barre de suggestions rapides
          _barreSuggestions(context),
          // Zone de composition du message
          _composer(context),
        ],
      ),
    );
  }

  /// Barre de puces pour poser une question en 1 clic.
  Widget _barreSuggestions(BuildContext context) {
    return Container(
      height: 44,
      color: Theme.of(context).colorScheme.surface,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        itemCount: _suggestionsRapides.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final s = _suggestionsRapides[index];
          return ActionChip(
            label: Text(
              s.label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.emeraldDark,
              ),
            ),
            backgroundColor: AppColors.emeraldContainer,
            side: BorderSide(
              color: AppColors.emerald.withValues(alpha: 0.3),
            ),
            onPressed: () => _envoyer(s.message),
          );
        },
      ),
    );
  }

  Widget _vueVide(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(28, 48, 28, 28),
      children: [
        Center(
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.emerald, AppColors.emeraldDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.emerald.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(
              Icons.support_agent_rounded,
              size: 44,
              color: AppColors.jaune,
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Bienvenue sur le Support Sahel Academy ! 👋',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        Text(
          'Une question sur une formation, votre candidature de bourse ou un paiement ? Posez votre question par texte ou message vocal.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: scheme.onSurfaceVariant,
            height: 1.45,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Suggestions de sujets populaires :',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.emeraldDark,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _suggestionsRapides.map((s) {
            return ActionChip(
              avatar: const Icon(Icons.flash_on_rounded, size: 16, color: AppColors.emerald),
              label: Text(
                s.label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.emeraldDark,
                ),
              ),
              backgroundColor: AppColors.emeraldContainer,
              side: BorderSide(
                color: AppColors.emerald.withValues(alpha: 0.3),
              ),
              onPressed: () => _envoyer(s.message),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _composer(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final aDuTexte = _controller.text.trim().isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
          child: Row(
            children: [
              if (_estEnEnregistrement) ...[
                IconButton(
                  onPressed: _annulerEnregistrement,
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  tooltip: 'Annuler le vocal',
                ),
                const SizedBox(width: 6),
                const Icon(Icons.fiber_manual_record, color: Colors.red, size: 16),
                const SizedBox(width: 6),
                Text(
                  _formatChrono(_dureeEnregistrementSeconds),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                    fontSize: 15,
                  ),
                ),
                const Spacer(),
                IconButton.filled(
                  onPressed: _arreterEtEnvoyerVocal,
                  style: IconButton.styleFrom(backgroundColor: AppColors.emerald),
                  icon: const Icon(Icons.send_rounded, color: Colors.white),
                  tooltip: 'Envoyer le vocal',
                ),
              ] else ...[
                Expanded(
                  child: TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _envoyer(),
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: 'Écris ton message support…',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: scheme.outlineVariant),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: scheme.outlineVariant),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                if (aDuTexte)
                  IconButton.filled(
                    onPressed: _envoiEnCours ? null : () => _envoyer(),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.emerald,
                      foregroundColor: Colors.white,
                    ),
                    icon: _envoiEnCours
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded),
                    tooltip: 'Envoyer',
                  )
                else
                  IconButton.filled(
                    onPressed: _envoiEnCours ? null : _demarrerEnregistrement,
                    style: IconButton.styleFrom(
                      backgroundColor: scheme.primaryContainer,
                      foregroundColor: scheme.onPrimaryContainer,
                    ),
                    icon: _envoiEnCours
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.mic_rounded),
                    tooltip: 'Enregistrer un vocal',
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Une bulle de message (texte ou vocal).
class _Bulle extends StatelessWidget {
  final SupportMessage message;
  const _Bulle({required this.message});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final moi = message.estDeMoi;
    final heure = DateFormat('HH:mm', 'fr_FR').format(message.date);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: moi
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!moi) ...[
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 8, bottom: 2),
              decoration: const BoxDecoration(
                color: AppColors.jauneContainer,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.headset_mic_rounded,
                size: 18,
                color: AppColors.jauneFonce,
              ),
            ),
          ],
          Flexible(
            child: GestureDetector(
              onLongPress: () => _afficherMenuOptions(context, message),
              child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.78,
              ),
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
              decoration: BoxDecoration(
                gradient: moi
                    ? const LinearGradient(
                        colors: [AppColors.emerald, AppColors.emeraldDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                color: moi ? null : scheme.surface,
                border: moi
                    ? null
                    : Border.all(
                        color: scheme.outlineVariant.withValues(alpha: 0.8),
                      ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(moi ? 18 : 4),
                  bottomRight: Radius.circular(moi ? 4 : 18),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!moi)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Support Sahel Academy',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.emerald,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.verified_rounded,
                            size: 14,
                            color: AppColors.emerald,
                          ),
                        ],
                      ),
                    ),
                  if (message.estAudio)
                    _LecteurAudioBulle(
                      url: message.audioUrl ?? message.contenu,
                      dureeSeconds: message.dureeSeconds,
                      estDeMoi: moi,
                    )
                  else if (message.estDocument)
                    _DocumentBulle(
                      message: message,
                      estDeMoi: moi,
                    )
                  else ...[
                    Text(
                      message.contenu,
                      style: TextStyle(
                        color: moi ? Colors.white : scheme.onSurface,
                        height: 1.35,
                        fontSize: 14,
                      ),
                    ),
                    if (message.aDocument) ...[
                      const SizedBox(height: 10),
                      _DocumentBulle(
                        message: message,
                        estDeMoi: moi,
                      ),
                    ],
                  ],
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        heure,
                        style: TextStyle(
                          fontSize: 10.5,
                          color: moi
                              ? Colors.white.withValues(alpha: 0.8)
                              : scheme.outline,
                        ),
                      ),
                      if (moi) ...[
                        const SizedBox(width: 4),
                        Icon(
                          Icons.done_all_rounded,
                          size: 14,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        ],
      ),
    );
  }

  void _afficherMenuOptions(BuildContext context, SupportMessage message) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: const Text(
                  'Supprimer le message (des deux côtés)',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  final repo = context.read<SupportRepository>();
                  await repo.supprimerMessage(message.id);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Message supprimé des deux côtés.'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

/// Widget de lecture audio interactif dans la bulle de chat.
class _LecteurAudioBulle extends StatefulWidget {
  final String url;
  final int? dureeSeconds;
  final bool estDeMoi;

  const _LecteurAudioBulle({
    required this.url,
    this.dureeSeconds,
    required this.estDeMoi,
  });

  @override
  State<_LecteurAudioBulle> createState() => _LecteurAudioBulleState();
}

class _LecteurAudioBulleState extends State<_LecteurAudioBulle> {
  late AudioPlayer _player;
  bool _enLecture = false;
  Duration _position = Duration.zero;
  Duration _dureeTotal = Duration.zero;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    if (widget.dureeSeconds != null) {
      _dureeTotal = Duration(seconds: widget.dureeSeconds!);
    }

    _player.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _enLecture = state == PlayerState.playing;
        });
      }
    });

    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });

    _player.onDurationChanged.listen((d) {
      if (mounted) setState(() => _dureeTotal = d);
    });

    _player.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _enLecture = false;
          _position = Duration.zero;
        });
      }
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _basculerLecture() async {
    if (_enLecture) {
      await _player.pause();
    } else {
      await _player.play(UrlSource(widget.url));
    }
  }

  String _formatDuration(Duration duration) {
    final mins = duration.inMinutes.remainder(60).toString().padLeft(1, '0');
    final secs = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    final couleurInactif = widget.estDeMoi
        ? Colors.white.withValues(alpha: 0.7)
        : Colors.black45;
    final couleurActif = widget.estDeMoi ? Colors.white : Colors.black87;

    final dureeMax = _dureeTotal.inMilliseconds > 0
        ? _dureeTotal.inMilliseconds.toDouble()
        : 1.0;
    final positionActuelle =
        _position.inMilliseconds.toDouble().clamp(0.0, dureeMax);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: _basculerLecture,
          icon: Icon(
            _enLecture ? Icons.pause_circle_filled : Icons.play_circle_filled,
            color: couleurActif,
            size: 36,
          ),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SliderTheme(
                data: SliderThemeData(
                  trackHeight: 3,
                  thumbShape:
                      const RoundSliderThumbShape(enabledThumbRadius: 6),
                  overlayShape:
                      const RoundSliderOverlayShape(overlayRadius: 12),
                  activeTrackColor: couleurActif,
                  inactiveTrackColor: couleurInactif,
                  thumbColor: couleurActif,
                ),
                child: Slider(
                  value: positionActuelle,
                  max: dureeMax,
                  onChanged: (val) {
                    _player.seek(Duration(milliseconds: val.toInt()));
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _formatDuration(_position),
                      style: TextStyle(fontSize: 10, color: couleurInactif),
                    ),
                    Text(
                      _formatDuration(_dureeTotal),
                      style: TextStyle(fontSize: 10, color: couleurInactif),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Bulle d'affichage d'un document joint dans le chat support.
class _DocumentBulle extends StatelessWidget {
  final SupportMessage message;
  final bool estDeMoi;

  const _DocumentBulle({
    required this.message,
    required this.estDeMoi,
  });

  @override
  Widget build(BuildContext context) {
    final url = message.urlDocument;
    final nom = message.nomDocument;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (message.contenu.isNotEmpty && !message.contenu.startsWith('http') && message.type != 'document') ...[
          Text(
            message.contenu,
            style: TextStyle(
              color: estDeMoi ? Colors.white : Theme.of(context).colorScheme.onSurface,
              height: 1.35,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 10),
        ],
        InkWell(
          onTap: () {
            final target = message.documentUrl ?? url;
            final nom = message.documentNom ?? message.nomDocument;
            final rawDoc = (nom.isNotEmpty && target.isNotEmpty)
                ? '$nom|$target'
                : (target.isNotEmpty ? target : nom);
            if (rawDoc.isNotEmpty) {
              DocumentDownloader.telechargerEtOuvrir(context, rawDoc);
            }
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: estDeMoi
                  ? Colors.white.withValues(alpha: 0.2)
                  : AppColors.emeraldContainer,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: estDeMoi
                    ? Colors.white.withValues(alpha: 0.3)
                    : AppColors.emerald.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: estDeMoi
                        ? Colors.white.withValues(alpha: 0.25)
                        : AppColors.emerald.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.picture_as_pdf,
                    size: 24,
                    color: estDeMoi ? Colors.white : AppColors.emerald,
                  ),
                ),
                const SizedBox(width: 10),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        nom,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: estDeMoi ? Colors.white : AppColors.emerald,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Cliquer pour ouvrir le document',
                        style: TextStyle(
                          fontSize: 11,
                          color: estDeMoi
                              ? Colors.white.withValues(alpha: 0.8)
                              : AppColors.emerald.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

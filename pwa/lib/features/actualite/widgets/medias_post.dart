import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/media_post.dart';

/// Affichage des médias (photos, vidéos, audios) rattachés à un post d'actualité.
class MediasPostWidget extends StatelessWidget {
  final List<MediaPost> medias;

  const MediasPostWidget({super.key, required this.medias});

  @override
  Widget build(BuildContext context) {
    if (medias.isEmpty) return const SizedBox.shrink();

    final photos = medias.where((m) => m.estPhoto).toList();
    final autresMedias = medias.where((m) => !m.estPhoto).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (photos.isNotEmpty) _grillePhotos(context, photos),
        if (photos.isNotEmpty && autresMedias.isNotEmpty)
          const SizedBox(height: 8),
        for (final m in autresMedias) ...[
          _mediaTile(context, m),
          const SizedBox(height: 6),
        ],
      ],
    );
  }

  Widget _grillePhotos(BuildContext context, List<MediaPost> photos) {
    if (photos.length == 1) {
      return _photoCard(context, photos.first, height: 220);
    }
    if (photos.length == 2) {
      return Row(
        children: [
          Expanded(child: _photoCard(context, photos[0], height: 160)),
          const SizedBox(width: 8),
          Expanded(child: _photoCard(context, photos[1], height: 160)),
        ],
      );
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1.3,
      ),
      itemCount: photos.length > 4 ? 4 : photos.length,
      itemBuilder: (context, index) {
        final photo = photos[index];
        final reste = photos.length - 4;
        final estDernierEtEnPlus = index == 3 && reste > 0;

        return Stack(
          fit: StackFit.expand,
          children: [
            _photoCard(context, photo),
            if (estDernierEtEnPlus)
              Container(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  '+$reste',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _photoCard(BuildContext context, MediaPost media, {double? height}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: GestureDetector(
        onTap: () => _afficherPleinEcran(context, media.url),
        child: Image.network(
          media.url,
          height: height,
          width: double.infinity,
          fit: BoxFit.cover,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              height: height ?? 160,
              color: Colors.grey.shade200,
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            );
          },
          errorBuilder: (context, error, stackTrace) {
            return Container(
              height: height ?? 160,
              color: Colors.grey.shade200,
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.broken_image, color: Colors.grey, size: 36),
                  const SizedBox(height: 4),
                  Text(
                    media.nom ?? 'Image indisponible',
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _mediaTile(BuildContext context, MediaPost media) {
    final scheme = Theme.of(context).colorScheme;
    final estVideo = media.estVideo;

    return InkWell(
      onTap: () async {
        final uri = Uri.tryParse(media.url);
        if (uri != null) {
          try {
            final launched = await launchUrl(
              uri,
              mode: LaunchMode.externalApplication,
            );
            if (!launched) {
              await launchUrl(uri, mode: LaunchMode.platformDefault);
            }
          } catch (_) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Impossible d\'ouvrir la vidéo.')),
              );
            }
          }
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: estVideo ? Colors.red.shade100 : const Color(0xFFD1FAE5),
              radius: 18,
              child: Icon(
                estVideo ? Icons.play_arrow_rounded : Icons.audiotrack_rounded,
                color: estVideo ? Colors.red.shade700 : const Color(0xFF059669),
                size: 22,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                media.nom ?? (estVideo ? 'Regarder la vidéo' : 'Fichier audio joint'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
            Icon(Icons.play_circle_fill, size: 20, color: estVideo ? Colors.red.shade600 : scheme.primary),
          ],
        ),
      ),
    );
  }

  void _afficherPleinEcran(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            InteractiveViewer(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(url, fit: BoxFit.contain),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 30),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}

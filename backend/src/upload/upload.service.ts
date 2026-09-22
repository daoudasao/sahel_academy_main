import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { estEquipe } from '../auth/roles.util';

/** Taille maximale acceptée par le serveur (vidéos de l'équipe comprises). */
export const TAILLE_MAX_UPLOAD = 50 * 1024 * 1024;
/** Taille maximale pour un élève (photo de profil, message vocal). */
const TAILLE_MAX_UTILISATEUR = 10 * 1024 * 1024;

const EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'],
  audio: ['m4a', 'aac', 'mp3', 'wav', 'ogg', 'oga', 'opus', 'weba', 'webm'],
  video: ['mp4', 'mov', 'm4v', 'webm'],
  document: [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'odt', 'ods', 'odp', 'txt', 'csv', 'zip', 'rar',
  ],
};

// Le CDN sert chaque fichier selon son extension : on n'accepte que des
// extensions inoffensives (jamais html, svg, js…).
const EXTENSIONS_PRIVILEGIEES = new Set(Object.values(EXTENSIONS).flat());
/** Élèves : photo de profil et messages vocaux du support. */
const EXTENSIONS_UTILISATEUR = new Set([
  ...EXTENSIONS.image,
  ...EXTENSIONS.audio,
]);
const DOSSIERS_UTILISATEUR = new Set(['avatars', 'support']);

type Utilisateur = { role?: string | null } | null | undefined;

/** Extension d'un nom de fichier (en minuscules), ou `null`. */
function extensionDuNom(nom: string): string | null {
  const m = /\.([a-z0-9]{1,5})$/i.exec(nom.trim());
  return m ? m[1].toLowerCase() : null;
}

/**
 * Extension déduite des premiers octets, pour les fichiers envoyés sans
 * extension (certaines apps). Couvre les formats courants seulement.
 */
function extensionDuContenu(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  const debut = buf.subarray(0, 4).toString('hex');
  const ascii = (a: number, b: number) => buf.subarray(a, b).toString('latin1');

  if (debut.startsWith('ffd8ff')) return 'jpg';
  if (debut === '89504e47') return 'png';
  if (debut === '47494638') return 'gif';
  if (debut === '25504446') return 'pdf';
  if (debut === '1a45dfa3') return 'webm';
  if (debut === '4f676753') return 'ogg';
  if (ascii(0, 3) === 'ID3') return 'mp3';
  if (ascii(0, 4) === 'RIFF') {
    if (ascii(8, 12) === 'WEBP') return 'webp';
    if (ascii(8, 12) === 'WAVE') return 'wav';
  }
  if (ascii(4, 8) === 'ftyp') {
    const marque = ascii(8, 12);
    if (marque.startsWith('M4A')) return 'm4a';
    if (['heic', 'heix', 'mif1'].includes(marque)) return 'heic';
    return 'mp4';
  }
  return null;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {}

  private sanitizeFolder(folder?: string): string {
    if (!folder) return 'general';
    const clean = folder.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    return clean.length > 0 ? clean : 'general';
  }

  /**
   * Vérifie qu'un fichier est acceptable pour cet utilisateur et renvoie
   * l'extension sous laquelle il sera stocké.
   */
  private validerFichier(
    file: Express.Multer.File,
    dossier: string,
    user: Utilisateur,
  ): string {
    const privilegie = estEquipe(user) || user?.role === Role.FORMATEUR;

    const extension =
      extensionDuNom(file.originalname) ?? extensionDuContenu(file.buffer);
    if (!extension) {
      throw new BadRequestException('Type de fichier non reconnu.');
    }

    const autorisees = privilegie
      ? EXTENSIONS_PRIVILEGIEES
      : EXTENSIONS_UTILISATEUR;
    if (!autorisees.has(extension)) {
      throw new BadRequestException(
        `Type de fichier non autorisé (.${extension}).`,
      );
    }

    if (!privilegie) {
      if (!DOSSIERS_UTILISATEUR.has(dossier)) {
        throw new ForbiddenException('Dossier de destination non autorisé.');
      }
      if (file.size > TAILLE_MAX_UTILISATEUR) {
        throw new PayloadTooLargeException(
          'Fichier trop volumineux (10 Mo maximum).',
        );
      }
    }

    return extension;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string | undefined,
    user: Utilisateur,
  ): Promise<{ url: string }> {
    const targetFolder = this.sanitizeFolder(folder);
    const extension = this.validerFichier(file, targetFolder, user);

    const storageZone = this.configService.get<string>('BUNNY_STORAGE_ZONE');
    const accessKey = this.configService.get<string>('BUNNY_ACCESS_KEY');
    const cdnDomain = this.configService.get<string>('BUNNY_CDN_DOMAIN');
    // Default to storage.bunnycdn.com if endpoint is not provided
    const endpoint =
      this.configService.get<string>('BUNNY_STORAGE_ENDPOINT') ||
      'storage.bunnycdn.com';

    if (!storageZone || !accessKey || !cdnDomain) {
      throw new InternalServerErrorException(
        'Bunny.net configuration is missing',
      );
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const nomSansExtension = file.originalname
      .replace(/\.[a-z0-9]{1,5}$/i, '')
      .replace(/[^a-zA-Z0-9-]/g, '_')
      .slice(0, 60);
    const fileName = `${uniqueSuffix}-${nomSansExtension || 'fichier'}.${extension}`;
    const bunnyUrl = `https://${endpoint}/${storageZone}/${targetFolder}/${fileName}`;

    let response: Response;
    try {
      response = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          AccessKey: accessKey,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(file.buffer),
      });
    } catch (error) {
      this.logger.error(`Envoi vers Bunny.net impossible : ${String(error)}`);
      throw new InternalServerErrorException(
        'Error uploading file to Bunny.net',
      );
    }

    if (!response.ok) {
      this.logger.error(`Bunny.net a refusé l'envoi (HTTP ${response.status})`);
      throw new InternalServerErrorException(
        'Failed to upload file to Bunny.net',
      );
    }

    return {
      url: `https://${cdnDomain}/${targetFolder}/${fileName}`,
    };
  }
}

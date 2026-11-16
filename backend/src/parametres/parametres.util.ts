/**
 * Paramètres globaux modifiables depuis le dashboard, avec leur valeur par
 * défaut (utilisée tant qu'aucun admin ne l'a changée en base).
 * Ils sont tous publics : lus sans connexion par le site et l'app.
 */
export const PARAMETRES_DEFAUT = {
  /** Numéro WhatsApp / téléphone du service client (affiché tel quel). */
  whatsappSupport: '+223 71 49 31 77',
  /** E-mail du service client. */
  emailSupport: 'contact@sahelacademy.org',
} as const;

export type CleParametre = keyof typeof PARAMETRES_DEFAUT;
export type Parametres = Record<CleParametre, string>;

export const CLES_PARAMETRES = Object.keys(PARAMETRES_DEFAUT) as CleParametre[];

/** Lien wa.me à partir d'un numéro saisi librement (« +223 71 49 31 77 »). */
export function lienWhatsapp(numero: string): string | null {
  const chiffres = numero.replace(/\D/g, '');
  return chiffres.length >= 8 ? `https://wa.me/${chiffres}` : null;
}

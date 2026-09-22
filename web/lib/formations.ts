// Config des bourses : le slug de l'URL <-> le libellé stocké en base.
export const FORMATIONS = {
  anglais: {
    formation: "Anglais",
    titre: "Formation en Anglais",
    sousTitre: "Vérifiez le statut de votre candidature à la bourse d'Anglais",
  },
  reseau: {
    formation: "Réseau informatique",
    titre: "Formation en Réseau informatique",
    sousTitre:
      "Vérifiez le statut de votre candidature à la bourse de Réseau informatique",
  },
} as const;

export type Slug = keyof typeof FORMATIONS;

export function estSlugValide(s: string): s is Slug {
  return s in FORMATIONS;
}

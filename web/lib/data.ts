// Recherche en mémoire à partir de l'instantané généré au build (aucun appel base au runtime).
import fiches from "@/data/candidats.generated.json";

type Fiche = { telephone: string; formation: string; nom: string; statut: string };

// Index construit une seule fois au démarrage : clé "telephone|formation".
const index = new Map<string, Fiche>();
for (const f of fiches as Fiche[]) {
  index.set(`${f.telephone}|${f.formation}`, f);
}

export function chercher(telephone: string, formation: string): Fiche | null {
  return index.get(`${telephone}|${formation}`) ?? null;
}

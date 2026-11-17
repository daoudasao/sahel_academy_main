"use client";

/**
 * Niveaux de difficulté d'une formation. Une formation peut en avoir plusieurs :
 * ils sont enregistrés dans le même champ texte `niveau`, séparés par des virgules
 * (« Débutant, Intermédiaire »), ce qui reste lisible tel quel partout ailleurs.
 */
export const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé"] as const;

const SEPARATEUR = ", ";

/** « Débutant, Intermédiaire » → ["Débutant", "Intermédiaire"] (ordre du catalogue). */
export function lireNiveaux(valeur?: string | null): string[] {
  const choisis = (valeur ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const connus = NIVEAUX.filter((n) => choisis.includes(n));
  const autres = choisis.filter((n) => !(NIVEAUX as readonly string[]).includes(n));
  return [...connus, ...autres];
}

export function ecrireNiveaux(niveaux: string[]): string {
  return lireNiveaux(niveaux.join(",")).join(SEPARATEUR);
}

const COULEURS: Record<string, string> = {
  Débutant: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermédiaire: "bg-amber-50 text-amber-700 border-amber-200",
  Avancé: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Un badge par niveau (ou « Standard » si aucun). */
export function BadgesNiveau({ valeur, className = "" }: { valeur?: string | null; className?: string }) {
  const niveaux = lireNiveaux(valeur);
  if (niveaux.length === 0) niveaux.push("Standard");
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {niveaux.map((n) => (
        <span
          key={n}
          className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
            COULEURS[n] ?? "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          {n}
        </span>
      ))}
    </span>
  );
}

/** Choix multiple des niveaux (au moins un). */
export function ChoixNiveaux({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  const choisis = lireNiveaux(valeur);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Niveaux">
      {NIVEAUX.map((n) => {
        const actif = choisis.includes(n);
        return (
          <button
            key={n}
            type="button"
            aria-pressed={actif}
            onClick={() => {
              const suivants = actif ? choisis.filter((x) => x !== n) : [...choisis, n];
              // Toujours au moins un niveau
              if (suivants.length > 0) onChange(ecrireNiveaux(suivants));
            }}
            className={`h-12 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer ${
              actif
                ? "bg-[#0a2d26] border-[#0a2d26] text-white"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

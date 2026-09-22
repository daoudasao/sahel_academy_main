"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Resultat = {
  trouve: boolean;
  nom?: string;
  titre?: string;
  message?: string;
  ton?: string;
  erreur?: string;
};

const TON: Record<
  string,
  {
    carte: string;
    titreTexte: string;
    badge: string;
    icone: string;
    halo: string;
    pastille: string;
    msgBg: string;
  }
> = {
  success: {
    carte: "bg-white border-2 border-emerald-500/30 shadow-xl shadow-emerald-950/10 ring-1 ring-slate-900/5",
    titreTexte: "text-emerald-700",
    badge: "bg-emerald-100/80 text-emerald-800 border border-emerald-300/50",
    icone: "check",
    halo: "rgba(16,185,129,0.30)",
    pastille: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
    msgBg: "bg-emerald-50/70 border-emerald-100 text-slate-700",
  },
  pending: {
    carte: "bg-white border-2 border-amber-400/40 shadow-xl shadow-amber-950/10 ring-1 ring-slate-900/5",
    titreTexte: "text-amber-700",
    badge: "bg-amber-100/80 text-amber-800 border border-amber-300/50",
    icone: "clock",
    halo: "rgba(245,158,11,0.30)",
    pastille: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
    msgBg: "bg-amber-50/70 border-amber-100 text-slate-700",
  },
  rejected: {
    carte: "bg-white border-2 border-rose-400/40 shadow-xl shadow-rose-950/10 ring-1 ring-slate-900/5",
    titreTexte: "text-rose-700",
    badge: "bg-rose-100/80 text-rose-800 border border-rose-300/50",
    icone: "cross",
    halo: "rgba(244,63,94,0.30)",
    pastille: "bg-rose-600 text-white shadow-lg shadow-rose-600/30",
    msgBg: "bg-rose-50/70 border-rose-100 text-slate-700",
  },
};

function Icone({ type }: { type: string }) {
  const commun = "h-8 w-8 stroke-white";
  if (type === "check")
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={commun}>
        <path d="M4 12.5l5 5L20 6.5" className="anim-trace" />
      </svg>
    );
  if (type === "clock")
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={commun}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" className="anim-trace" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={commun}>
      <path d="M6 6l12 12M18 6L6 18" className="anim-trace" />
    </svg>
  );
}

function Confettis() {
  const pieces = [
    { left: "12%", dx: "-24px", color: "#0a2d26", delay: "0s" },
    { left: "28%", dx: "-8px", color: "#eab308", delay: "0.06s" },
    { left: "44%", dx: "10px", color: "#12463a", delay: "0.12s" },
    { left: "60%", dx: "-14px", color: "#eab308", delay: "0.02s" },
    { left: "74%", dx: "18px", color: "#0a2d26", delay: "0.1s" },
    { left: "88%", dx: "6px", color: "#facc15", delay: "0.16s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="anim-confetti absolute top-2 h-2 w-2 rounded-[2px]"
          style={{ left: p.left, background: p.color, ["--dx" as string]: p.dx, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}

export default function VerifForm({
  formation,
  titre,
  sousTitre,
}: {
  formation: string;
  titre: string;
  sousTitre: string;
}) {
  const [telephone, setTelephone] = useState("");
  const [chargement, setChargement] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  async function verifier(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setResultat(null);
    try {
      const res = await fetch("/api/verifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telephone, formation }),
      });
      setResultat(await res.json());
    } catch {
      setResultat({ trouve: false, erreur: "Connexion impossible. Réessayez." });
    } finally {
      setChargement(false);
    }
  }

  const t = resultat?.ton ? TON[resultat.ton] ?? TON.pending : TON.pending;

  return (
    <main className="portal-bg min-h-screen flex flex-col items-center justify-center px-4 py-10 relative z-10">
      <div className="w-full max-w-md">
        {/* Bouton retour */}
        <div className="mb-5 flex justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-brand shadow-md backdrop-blur-md transition hover:-translate-x-1 hover:bg-white"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 stroke-current">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-emerald-900/5 ring-1 ring-slate-100">
          {/* En-tête vert */}
          <div className="bg-gradient-to-br from-brand-2 to-brand px-6 pt-8 pb-9 text-center">
            <Image
              src="/logo_large.png"
              alt="Sahel Academy"
              width={230}
              height={65}
              priority
              className="mx-auto mb-1 h-auto w-[230px]"
            />
            <div className="mx-auto mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-50">
              Bourse — {titre}
            </div>
            <p className="mt-3 text-sm text-emerald-50/90">{sousTitre}</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={verifier} className="space-y-4 px-6 py-6">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Votre numéro utilisé lors de l&apos;inscription</span>
              <input
                type="tel"
                inputMode="numeric"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex. 90 12 34 56"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                required
              />
              <span className="mt-1 block text-xs text-slate-400">
                Le même numéro que celui utilisé lors de l&apos;inscription.
              </span>
            </label>

            <button
              type="submit"
              disabled={chargement}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-white shadow-sm transition hover:bg-brand-2 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
            >
              {chargement && (
                <span className="anim-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
              )}
              {chargement ? "Vérification…" : "Vérifier mon statut"}
            </button>
          </form>
        </div>

        {/* Résultat */}
        {resultat && (
          <div className="mt-5">
            {resultat.erreur && (
              <div className="anim-carte rounded-3xl border border-rose-200 bg-white p-5 text-rose-700 shadow-xl font-medium text-center">
                {resultat.erreur}
              </div>
            )}

            {!resultat.erreur && !resultat.trouve && (
              <div className="anim-carte rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl ring-1 ring-slate-900/5">
                <div className="anim-icone mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.6} strokeLinecap="round" className="h-8 w-8 stroke-slate-500">
                    <path d="M12 8v5M12 16.5h.01" className="anim-trace" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-slate-900">Numéro introuvable</p>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Aucune candidature à la bourse <span className="font-semibold text-slate-900">{titre}</span> n&apos;est associée à ce numéro.
                  Vérifiez la saisie ou le numéro exact de l&apos;inscription.
                </p>
              </div>
            )}

            {resultat.trouve && (
              <div className={`anim-carte relative overflow-hidden rounded-3xl border p-6 md:p-8 text-center ${t.carte}`}>
                {resultat.ton === "success" && <Confettis />}

                {/* Pastille d'icône animée */}
                <div
                  className={`anim-icone anim-halo mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${t.pastille}`}
                  style={{ ["--halo-color" as string]: t.halo }}
                >
                  <Icone type={t.icone} />
                </div>

                {resultat.nom && (
                  <p className="anim-ligne text-sm md:text-base text-slate-600" style={{ animationDelay: "0.15s" }}>
                    Bonjour <span className="font-extrabold text-slate-900">{resultat.nom}</span>
                  </p>
                )}

                <p
                  className={`anim-ligne mt-1 text-2xl md:text-3xl font-black ${t.titreTexte}`}
                  style={{ animationDelay: "0.25s" }}
                >
                  {resultat.titre}
                </p>

                <div className="mt-2.5">
                  <span
                    className={`anim-ligne inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wide ${t.badge}`}
                    style={{ animationDelay: "0.32s" }}
                  >
                    Bourse {titre}
                  </span>
                </div>

                <div
                  className={`anim-ligne mt-4 rounded-2xl border p-4 text-sm font-medium leading-relaxed ${t.msgBg}`}
                  style={{ animationDelay: "0.4s" }}
                >
                  {resultat.message}
                </div>

                {resultat.ton === "success" && (
                  <div className="anim-ligne mt-5" style={{ animationDelay: "0.48s" }}>
                    <a
                      href={`https://wa.me/22371493177?text=${encodeURIComponent(
                        `Bonjour Sahel Academy, je suis ${resultat.nom ?? ""}. Je vous contacte suite à mon admission à la formation en ${formation.toLowerCase()}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-[#20bd5a] active:scale-[0.99]"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.932 9.932 0 001.356 5.03L2 22l5.133-1.347a9.907 9.907 0 004.877 1.28h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.038-5.174-2.925-7.06A9.914 9.914 0 0012.012 2zm0 18.271h-.004a8.21 8.21 0 01-4.186-1.147l-.3.178-3.111.816.83-3.032-.196-.312a8.204 8.204 0 01-1.258-4.398c.001-4.544 3.7-8.243 8.247-8.243 2.202 0 4.272.858 5.828 2.417a8.196 8.196 0 012.415 5.829c0 4.544-3.7 8.243-8.247 8.243zm4.52-6.173c-.248-.124-1.464-.723-1.691-.806-.228-.082-.394-.124-.559.124-.165.248-.641.806-.786.971-.144.165-.289.186-.537.062-.248-.124-1.047-.386-1.995-1.231-.738-.658-1.236-1.47-1.38-1.718-.145-.248-.016-.382.108-.505.112-.11.248-.289.372-.434.124-.145.165-.248.248-.413.083-.165.042-.31-.02-.434-.062-.124-.559-1.348-.765-1.844-.2-.483-.404-.418-.559-.426-.144-.008-.31-.008-.475-.008s-.434.062-.661.31c-.227.248-.868.848-.868 2.068 0 1.22.888 2.399 1.012 2.564.124.165 1.748 2.668 4.234 3.743.592.256 1.054.409 1.414.523.594.189 1.135.162 1.562.098.476-.071 1.464-.598 1.67-.1.176.207-.598.578-.763.578-.928.02-.165-.083-.248-.331-.372z" />
                      </svg>
                      Contacter sur WhatsApp
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} Sahel Academy</p>
      </div>
    </main>
  );
}

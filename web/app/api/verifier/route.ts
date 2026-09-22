import { NextResponse } from "next/server";
import { chercher } from "@/lib/data";

function normaliser(brut: string): string | null {
  if (!brut) return null;
  let n = brut.replace(/\D/g, "");
  if (n.startsWith("00228")) n = n.slice(5);
  else if (n.startsWith("228") && n.length > 8) n = n.slice(3);
  if (n.length < 8 || n.length > 12) return null;
  return n;
}

const MESSAGES: Record<string, { titre: string; message: string; ton: string }> = {
  admis: {
    titre: "Admis(e) 🎉",
    message: "Votre candidature a été retenue. Consultez régulièrement vos e-mails et WhatsApp pour la suite.",
    ton: "success",
  },
  en_attente: {
    titre: "En cours d'examen",
    message: "Votre candidature a bien été reçue et est en cours d'examen. Merci de patienter.",
    ton: "pending",
  },
  non_retenu: {
    titre: "Non retenue",
    message: "Merci pour votre intérêt. Votre candidature n'a pas été retenue cette fois-ci.",
    ton: "rejected",
  },
};

export async function POST(req: Request) {
  try {
    const { telephone, formation } = await req.json();
    const tel = normaliser(String(telephone ?? ""));
    if (!tel) {
      return NextResponse.json(
        { trouve: false, erreur: "Numéro invalide. Entrez au moins 8 chiffres." },
        { status: 400 }
      );
    }
    if (!formation) {
      return NextResponse.json(
        { trouve: false, erreur: "Bourse non précisée." },
        { status: 400 }
      );
    }

    const fiche = chercher(tel, String(formation));
    if (!fiche) {
      return NextResponse.json({ trouve: false });
    }

    const info = MESSAGES[fiche.statut] ?? MESSAGES.en_attente;
    return NextResponse.json({ trouve: true, nom: fiche.nom, statut: fiche.statut, ...info });
  } catch {
    return NextResponse.json(
      { trouve: false, erreur: "Erreur serveur. Réessayez." },
      { status: 500 }
    );
  }
}

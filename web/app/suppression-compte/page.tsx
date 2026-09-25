import type { Metadata } from "next";
import Link from "next/link";
import PageLegale, { CONTACT_WHATSAPP } from "@/components/PageLegale";

export const metadata: Metadata = {
  title: "Supprimer mon compte",
  description:
    "Comment supprimer votre compte Sahel Academy et quelles données sont effacées.",
  alternates: { canonical: "/suppression-compte" },
};

export default function SuppressionComptePage() {
  return (
    <PageLegale titre="Supprimer mon compte Sahel Academy" miseAJour="25 septembre 2026">
      <section>
        <h2>Depuis l&apos;application</h2>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Ouvrez l&apos;application Sahel Academy et connectez-vous.</li>
          <li>Allez dans <strong>Profil → Paramètres</strong>.</li>
          <li>
            Touchez <strong>Supprimer mon compte</strong>, puis confirmez.
          </li>
        </ol>
        <p className="mt-2">La suppression est immédiate.</p>
      </section>

      <section>
        <h2>Sans l&apos;application</h2>
        <p>
          Écrivez-nous sur WhatsApp au{" "}
          <a href={CONTACT_WHATSAPP.lien}>{CONTACT_WHATSAPP.affichage}</a> en
          indiquant l&apos;adresse e-mail de votre compte. Nous supprimons le
          compte sous 30 jours après avoir vérifié qu&apos;il vous appartient.
        </p>
      </section>

      <section>
        <h2>Données supprimées</h2>
        <ul>
          <li>Nom, e-mail, téléphone et photo de profil ;</li>
          <li>mot de passe et connexion Google ;</li>
          <li>candidatures aux bourses et leurs réponses ;</li>
          <li>messages au support et notifications ;</li>
          <li>votre nom sur les messages de classe (remplacé par « Compte supprimé »).</li>
        </ul>
      </section>

      <section>
        <h2>Données conservées</h2>
        <p>
          Les inscriptions, échéances et paiements déjà enregistrés sont
          conservés de façon anonyme, sans lien avec votre identité, pour les
          obligations comptables du centre.
        </p>
      </section>

      <p>
        Voir aussi notre{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </PageLegale>
  );
}

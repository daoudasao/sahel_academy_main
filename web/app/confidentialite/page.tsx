import type { Metadata } from "next";
import Link from "next/link";
import PageLegale, { CONTACT_WHATSAPP } from "@/components/PageLegale";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Sahel Academy collecte, pourquoi, avec qui elles sont partagées et comment les supprimer.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <PageLegale titre="Politique de confidentialité" miseAJour="25 septembre 2026">
      <p>
        Cette politique s&apos;applique à l&apos;application mobile Sahel Academy
        et au site sahel-academy.com. Elle explique quelles données nous
        collectons, pourquoi, et comment vous pouvez les faire supprimer.
      </p>

      <section>
        <h2>1. Données collectées</h2>
        <ul>
          <li>
            <strong>Compte</strong> : nom, adresse e-mail, numéro de téléphone,
            mot de passe (stocké sous forme chiffrée) et, si vous vous connectez
            avec Google, votre photo de profil Google.
          </li>
          <li>
            <strong>Candidatures aux bourses</strong> : les réponses et documents
            que vous envoyez dans les formulaires de candidature.
          </li>
          <li>
            <strong>Formation</strong> : vos inscriptions, votre suivi de cours,
            vos échéances et paiements enregistrés par le centre.
          </li>
          <li>
            <strong>Messages</strong> : vos messages au support et dans les
            classes, et vos commentaires sur le fil d&apos;actualité.
          </li>
          <li>
            <strong>Notifications</strong> : un identifiant technique de
            l&apos;appareil (jeton Firebase Cloud Messaging) pour vous envoyer
            des notifications.
          </li>
        </ul>
        <p className="mt-2">
          Nous n&apos;utilisons ni publicité, ni outil de suivi publicitaire, et
          nous n&apos;accédons pas à votre position.
        </p>
      </section>

      <section>
        <h2>2. Utilisation des données</h2>
        <ul>
          <li>Créer et sécuriser votre compte.</li>
          <li>Traiter vos candidatures et vous informer des résultats.</li>
          <li>Gérer vos inscriptions, vos cours et vos paiements.</li>
          <li>Vous envoyer des notifications (cours, résultats, messages).</li>
          <li>Répondre à vos demandes au support.</li>
        </ul>
      </section>

      <section>
        <h2>3. Partage</h2>
        <p>
          Vos données ne sont jamais vendues. Elles sont accessibles à
          l&apos;équipe de Sahel Academy et traitées par nos prestataires
          techniques, uniquement pour faire fonctionner le service :
        </p>
        <ul>
          <li>Google Firebase, pour l&apos;envoi des notifications ;</li>
          <li>Google, si vous choisissez la connexion avec Google ;</li>
          <li>notre hébergeur et notre service de stockage de fichiers.</li>
        </ul>
      </section>

      <section>
        <h2>4. Sécurité</h2>
        <p>
          Les échanges entre l&apos;application et nos serveurs sont chiffrés
          (HTTPS). Sur votre téléphone, votre jeton de connexion est conservé
          dans le stockage sécurisé de l&apos;appareil.
        </p>
      </section>

      <section>
        <h2>5. Conservation et suppression</h2>
        <p>
          Vos données sont conservées tant que votre compte existe. Vous pouvez
          supprimer votre compte à tout moment depuis l&apos;application, ou en
          suivant la procédure décrite sur la page{" "}
          <Link href="/suppression-compte">Supprimer mon compte</Link>. Les
          inscriptions et paiements déjà enregistrés sont conservés de façon
          anonyme pour la comptabilité du centre.
        </p>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>
          Vous pouvez consulter et corriger vos informations depuis votre profil,
          et demander l&apos;accès à vos données ou leur suppression en nous
          contactant.
        </p>
      </section>

      <section>
        <h2>7. Enfants</h2>
        <p>
          Le service s&apos;adresse aux étudiants et apprenants. Il n&apos;est
          pas destiné aux enfants de moins de 13 ans.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Pour toute question sur vos données : WhatsApp{" "}
          <a href={CONTACT_WHATSAPP.lien}>{CONTACT_WHATSAPP.affichage}</a>, ou
          la rubrique Support de l&apos;application.
        </p>
      </section>
    </PageLegale>
  );
}

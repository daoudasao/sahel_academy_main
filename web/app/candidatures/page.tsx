import { Metadata } from "next";
import CandidaturesClient from "./CandidaturesClient";

export const metadata: Metadata = {
  title: "Suivi de mes candidatures",
  description:
    "Consultez en temps réel l'avancement et les décisions de vos candidatures aux bourses Sahel Academy.",
  // Espace personnel : rien à indexer.
  robots: { index: false, follow: true },
};

export default function CandidaturesPage() {
  return <CandidaturesClient />;
}

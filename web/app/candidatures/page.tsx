import { Metadata } from "next";
import CandidaturesClient from "./CandidaturesClient";

export const metadata: Metadata = {
  title: "Suivi de mes candidatures | Sahel Academy",
  description:
    "Consultez en temps réel l'avancement et les décisions de vos candidatures aux bourses Sahel Academy.",
};

export default function CandidaturesPage() {
  return <CandidaturesClient />;
}

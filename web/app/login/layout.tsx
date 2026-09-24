import type { Metadata } from "next";

// La page de connexion est un composant client : son titre et la consigne
// « ne pas indexer » sont posés ici.
export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

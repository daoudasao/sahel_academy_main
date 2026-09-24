import type { Metadata } from "next";
import Link from "next/link";

// Simple passerelle vers l'application : rien à indexer.
export const metadata: Metadata = {
  title: "Publication",
  robots: { index: false, follow: true },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostAppPage({ params }: PageProps) {
  const { id } = await params;
  const appDeepLink = `sahelacademy://post/${id}`;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
          📰
        </div>
        <h1 className="text-2xl font-bold">Sahel Academy — Publication</h1>
        <p className="text-slate-300 text-sm">
          Vous consultez une publication sur Sahel Academy.
        </p>

        <div className="space-y-3 pt-2">
          <a
            href={appDeepLink}
            className="block w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
          >
            Ouvrir dans l'application
          </a>
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-all"
          >
            Continuer sur le site web
          </Link>
        </div>
      </div>
    </main>
  );
}

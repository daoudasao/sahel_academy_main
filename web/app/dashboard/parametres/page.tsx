"use client";

import { useState, useEffect } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import { useSession } from "@/app/lib/auth-client";
import {
  Settings,
  User,
  Lock,
  Phone,
  Mail,
  ShieldCheck,
  Save,
  MessageCircle,
  Building,
  CheckCircle2,
} from "lucide-react";

export default function ParametresPage() {
  const { data: session } = useSession();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");

  // Paramètres globaux de l'Académie
  const [whatsappOfficiel, setWhatsappOfficiel] = useState("+22790000000");
  const [emailSupport, setEmailSupport] = useState("contact@sahelacademy.org");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setNom(session.user.name || "Administrateur");
      setEmail(session.user.email || "admin@sahelacademy.org");
    }
  }, [session]);

  const enregistrerProfil = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      setMessageSucces("Modifications de votre profil enregistrées avec succès !");
      setTimeout(() => setMessageSucces(null), 4000);
    }, 600);
  };

  const enregistrerConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setTimeout(() => {
      setSavingConfig(false);
      setMessageSucces("Paramètres globaux de l'académie mis à jour !");
      setTimeout(() => setMessageSucces(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0a2d26]/10 text-[#0a2d26] rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Paramètres & Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gérez votre profil administrateur, votre mot de passe et les numéros officiels de contact de l&apos;Académie.
            </p>
          </div>
        </div>
      </div>

      {messageSucces && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{messageSucces}</span>
          </div>
          <button onClick={() => setMessageSucces(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Profil & Sécurité */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-[#0a2d26]" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Profil Administrateur & Sécurité
            </h2>
          </div>

          <form onSubmit={enregistrerProfil} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nouveau mot de passe (optionnel)
              </label>
              <input
                type="password"
                placeholder="Laisser vide pour conserver le mot de passe actuel"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 bg-[#0a2d26] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0a2d26]/90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "Enregistrement..." : "Mettre à jour mon profil"}
            </button>
          </form>
        </div>

        {/* Section Coordonnées Officieuses Académie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-[#0a2d26]" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Coordonnées Officielles Sahel Academy
            </h2>
          </div>

          <InfoBanner variant="info" title="Numéro WhatsApp Admissions">
            Ce numéro WhatsApp est utilisé dans l&apos;application mobile pour permettre aux élèves retenus aux bourses de contacter directement l&apos;équipe.
          </InfoBanner>

          <form onSubmit={enregistrerConfig} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                Numéro WhatsApp Officiel (avec indicatif)
              </label>
              <input
                type="text"
                value={whatsappOfficiel}
                onChange={(e) => setWhatsappOfficiel(e.target.value)}
                placeholder="+22790000000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                E-mail Officiel du Support Client
              </label>
              <input
                type="email"
                value={emailSupport}
                onChange={(e) => setEmailSupport(e.target.value)}
                placeholder="contact@sahelacademy.org"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="w-full py-2.5 bg-[#0a2d26] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0a2d26]/90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? "Enregistrement..." : "Enregistrer la configuration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import InfoBanner from "@/app/components/InfoBanner";
import { authClient, useSession } from "@/app/lib/auth-client";
import { parametresApi, usersApi } from "@/app/lib/api";
import {
  Settings,
  User,
  Lock,
  Phone,
  Mail,
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
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  // Paramètres globaux de l'Académie (lus et enregistrés via l'API)
  const [whatsappOfficiel, setWhatsappOfficiel] = useState("");
  const [emailSupport, setEmailSupport] = useState("");
  const [configChargee, setConfigChargee] = useState(false);
  const [erreurConfig, setErreurConfig] = useState<string | null>(null);
  // Doit rester aligné sur ParametresController.modifier (backend)
  const role = (session?.user as { role?: string } | undefined)?.role?.toUpperCase();
  const peutModifierConfig = role === "CHEF_CENTRE" || role === "SUPER_ADMIN";
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);

  // Profil réel du compte connecté (nom, e-mail, téléphone).
  useEffect(() => {
    usersApi
      .me()
      .then((u) => {
        setNom(u.nom ?? "");
        setEmail(u.email ?? "");
        setTelephone(u.telephone ?? "");
      })
      .catch((err) =>
        setErreurProfil(err instanceof Error ? err.message : "Chargement du profil impossible")
      );
  }, []);

  useEffect(() => {
    parametresApi
      .get()
      .then((p) => {
        setWhatsappOfficiel(p.whatsappSupport);
        setEmailSupport(p.emailSupport);
        setConfigChargee(true);
      })
      .catch((err) =>
        setErreurConfig(err instanceof Error ? err.message : "Chargement impossible")
      );
  }, []);

  const enregistrerProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nom.trim().length < 2) {
      setErreurProfil("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (nouveauMotDePasse && !motDePasseActuel) {
      setErreurProfil("Saisissez votre mot de passe actuel pour en choisir un nouveau.");
      return;
    }
    if (nouveauMotDePasse && nouveauMotDePasse.length < 8) {
      setErreurProfil("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setSavingProfile(true);
    setErreurProfil(null);
    try {
      const u = await usersApi.updateMe({
        nom: nom.trim(),
        ...(telephone.trim() ? { telephone: telephone.trim() } : {}),
      });
      setNom(u.nom);
      setTelephone(u.telephone ?? "");

      let message = "Votre profil a été mis à jour.";
      if (nouveauMotDePasse) {
        const { error } = await authClient.changePassword({
          currentPassword: motDePasseActuel,
          newPassword: nouveauMotDePasse,
          revokeOtherSessions: false,
        });
        if (error) {
          setErreurProfil(
            `Profil enregistré, mais le mot de passe n'a pas été changé : ${
              error.message || "mot de passe actuel incorrect."
            }`
          );
          return;
        }
        setMotDePasseActuel("");
        setNouveauMotDePasse("");
        message = "Votre profil et votre mot de passe ont été mis à jour.";
      }
      setMessageSucces(message);
      setTimeout(() => setMessageSucces(null), 4000);
    } catch (err) {
      setErreurProfil(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSavingProfile(false);
    }
  };

  const enregistrerConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peutModifierConfig) return;
    setSavingConfig(true);
    setErreurConfig(null);
    try {
      const p = await parametresApi.update({
        whatsappSupport: whatsappOfficiel.trim(),
        emailSupport: emailSupport.trim(),
      });
      setWhatsappOfficiel(p.whatsappSupport);
      setEmailSupport(p.emailSupport);
      setMessageSucces("Coordonnées du service client mises à jour : le site et l'application utilisent désormais ce numéro.");
      setTimeout(() => setMessageSucces(null), 5000);
    } catch (err) {
      setErreurConfig(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSavingConfig(false);
    }
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

          {erreurProfil && (
            <div className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
              {erreurProfil}
            </div>
          )}

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
                readOnly
                title="L'adresse de connexion ne se change pas ici : contactez un super administrateur."
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 outline-none cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Adresse de connexion : pour la changer, contactez un super administrateur.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Téléphone
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+223 70 00 11 22"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Mot de passe actuel
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Requis uniquement pour changer de mot de passe"
                value={motDePasseActuel}
                onChange={(e) => setMotDePasseActuel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nouveau mot de passe (optionnel)
              </label>
              <input
                type="password"
                autoComplete="new-password"
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

          <InfoBanner variant="info" title="Numéro WhatsApp du service client">
            Ce numéro est utilisé par le site et l&apos;application mobile (bouton « Contacter sur WhatsApp » après une admission, pages légales…). Toute modification s&apos;applique immédiatement, sans mise à jour de l&apos;application.
          </InfoBanner>

          {erreurConfig && (
            <div className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
              {erreurConfig}
            </div>
          )}
          {!peutModifierConfig && (
            <p className="text-[11px] font-medium text-slate-500">
              Seuls le chef de centre et le super admin peuvent modifier ces coordonnées.
            </p>
          )}

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
                placeholder="+223 71 49 31 77"
                disabled={!peutModifierConfig || !configChargee}
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
                disabled={!peutModifierConfig || !configChargee}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0a2d26] focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig || !peutModifierConfig || !configChargee}
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

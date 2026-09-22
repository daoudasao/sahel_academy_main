// Types & mock data aligned with Flutter models

// ─── Types ───

export type TypeChamp = "texte" | "paragraphe" | "email" | "telephone" | "nombre" | "choix" | "lien";
export type StatutPaiement = "paye" | "partiel" | "aVenir" | "enRetard";
export type StatutAdmission = "enAttente" | "admis" | "refuse";
export type TypeNotification = "actualite" | "paiement" | "classe" | "commentaire" | "systeme";

export interface AppUser {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  formationIds: string[];
  actif: boolean;
  dateInscription: string;
}

export interface Departement {
  id: string;
  nom: string;
  description: string;
  nombreFormations: number;
}

export interface Formation {
  id: string;
  titre: string;
  description: string;
  departementId: string;
  formateurNom: string;
  prixInscription: number;
  prixMensualite: number;
  dureeMois: number;
  niveau: string;
  estBourse: boolean;
  datePublication?: string;
  dateLimite?: string;
  imageUrl?: string;
  inscrits: number;
  statut?: "active" | "inactive" | "archive"; // ouverte / fermée aux inscriptions / terminée
}

export interface ChampFormulaire {
  id: string;
  label: string;
  type: TypeChamp;
  obligatoire: boolean;
  options: string[];
  aide?: string;
  cle?: string;
}

export interface Bourse {
  id: string;
  formationId?: string;
  titre: string;
  description: string;
  datePublication: string;
  dateLimite: string;
  champs: ChampFormulaire[];
  statut: "ouverte" | "fermee" | "en_attente";
  nombreCandidatures: number;
}

export interface Candidature {
  id: string;
  bourseId: string;
  userId: string;
  nom: string;
  email: string;
  statut: StatutAdmission;
  dateDepot: string;
  reponses: Record<string, string>;
}

export interface Echeance {
  id: string;
  userId: string;
  formationId: string;
  libelle: string;
  montantDu: number;
  montantPaye: number;
  dateEcheance: string;
  datePaiement?: string;
}

export interface PaiementHistorique {
  id: string;
  echeanceId: string;
  montant: number;
  date: string;
}

export interface NotificationItem {
  id: string;
  type: TypeNotification;
  titre: string;
  message: string;
  date: string;
  cible: "global" | "formation" | "classe" | "individuel";
  cibleId?: string;
  cibleNom?: string;
  envoyePar: string;
}

// ─── Mock Data ───

export const departements: Departement[] = [
  { id: "info", nom: "Informatique", description: "Développement, réseaux, bureautique", nombreFormations: 4 },
  { id: "compta", nom: "Comptabilité", description: "Gestion, finance, fiscalité", nombreFormations: 2 },
  { id: "langues", nom: "Langues", description: "Anglais, arabe, français", nombreFormations: 2 },
  { id: "marketing", nom: "Marketing", description: "Marketing digital, community management", nombreFormations: 2 },
];

export const formations: Formation[] = [
  {
    id: "f1", titre: "Développement Web (HTML, CSS, JS)", description: "Apprenez à créer des sites web modernes de A à Z.",
    departementId: "info", formateurNom: "M. Diallo", prixInscription: 10000, prixMensualite: 15000, dureeMois: 4, niveau: "Débutant", estBourse: false, inscrits: 24,
  },
  {
    id: "f2", titre: "Bureautique (Word, Excel, PowerPoint)", description: "Maîtrisez les outils bureautiques indispensables.",
    departementId: "info", formateurNom: "Mme Bâ", prixInscription: 5000, prixMensualite: 10000, dureeMois: 2, niveau: "Débutant", estBourse: false, inscrits: 18,
  },
  {
    id: "f3", titre: "Réseaux & Maintenance informatique", description: "Installation, configuration et dépannage de réseaux.",
    departementId: "info", formateurNom: "M. Traoré", prixInscription: 10000, prixMensualite: 20000, dureeMois: 5, niveau: "Intermédiaire", estBourse: false, inscrits: 12,
  },
  {
    id: "f4", titre: "Python & Data (Bourse)", description: "Programmation Python et introduction à l'analyse de données.",
    departementId: "info", formateurNom: "M. Diallo", prixInscription: 0, prixMensualite: 0, dureeMois: 3, niveau: "Intermédiaire", estBourse: true,
    datePublication: "2026-08-10", dateLimite: "2026-08-30", inscrits: 0,
  },
  {
    id: "f5", titre: "Comptabilité générale", description: "Les bases de la comptabilité et de la tenue des comptes.",
    departementId: "compta", formateurNom: "M. Sow", prixInscription: 8000, prixMensualite: 12000, dureeMois: 4, niveau: "Débutant", estBourse: false, inscrits: 15,
  },
  {
    id: "f6", titre: "Gestion & Fiscalité", description: "Gestion d'entreprise, déclarations et fiscalité.",
    departementId: "compta", formateurNom: "Mme Camara", prixInscription: 10000, prixMensualite: 15000, dureeMois: 3, niveau: "Avancé", estBourse: false, inscrits: 8,
  },
  {
    id: "f7", titre: "Anglais professionnel", description: "Communiquer avec aisance en anglais dans un cadre pro.",
    departementId: "langues", formateurNom: "Mr. Johnson", prixInscription: 5000, prixMensualite: 8000, dureeMois: 6, niveau: "Débutant", estBourse: false, inscrits: 22,
  },
  {
    id: "f8", titre: "Arabe", description: "Lecture, écriture et expression en langue arabe.",
    departementId: "langues", formateurNom: "M. Haidara", prixInscription: 5000, prixMensualite: 8000, dureeMois: 6, niveau: "Débutant", estBourse: false, inscrits: 10,
  },
  {
    id: "f9", titre: "Marketing digital (Bourse)", description: "Publicité en ligne, réseaux sociaux et stratégie digitale.",
    departementId: "marketing", formateurNom: "Mme Ndiaye", prixInscription: 0, prixMensualite: 0, dureeMois: 2, niveau: "Débutant", estBourse: true,
    datePublication: "2026-08-10", dateLimite: "2026-08-30", inscrits: 0,
  },
  {
    id: "f10", titre: "Community Management", description: "Animer et développer une communauté sur les réseaux.",
    departementId: "marketing", formateurNom: "M. Fall", prixInscription: 5000, prixMensualite: 10000, dureeMois: 2, niveau: "Débutant", estBourse: false, inscrits: 14,
  },
];

export const users: AppUser[] = [
  { id: "u1", nom: "Fatou Sow", email: "fatou.sow@gmail.com", telephone: "+223 70 12 34 56", formationIds: ["f1", "f7"], actif: true, dateInscription: "2026-06-15" },
  { id: "u2", nom: "Amadou Traoré", email: "amadou.traore@gmail.com", telephone: "+223 76 45 67 89", formationIds: ["f1"], actif: true, dateInscription: "2026-06-20" },
  { id: "u3", nom: "Aïcha Diop", email: "aicha.diop@gmail.com", telephone: "+223 65 78 90 12", formationIds: ["f2", "f5"], actif: true, dateInscription: "2026-07-01" },
  { id: "u4", nom: "Moussa Koné", email: "moussa.kone@gmail.com", telephone: "+223 79 23 45 67", formationIds: ["f3"], actif: true, dateInscription: "2026-07-05" },
  { id: "u5", nom: "Mariam Bâ", email: "mariam.ba@yahoo.fr", telephone: "+223 66 11 22 33", formationIds: ["f7", "f8"], actif: true, dateInscription: "2026-07-10" },
  { id: "u6", nom: "Ibrahim Haidara", email: "ibrahim.h@gmail.com", telephone: "+223 74 55 66 77", formationIds: ["f5", "f6"], actif: false, dateInscription: "2026-07-12" },
  { id: "u7", nom: "Oumou Camara", email: "oumou.camara@outlook.com", telephone: "+223 69 88 99 00", formationIds: ["f10"], actif: true, dateInscription: "2026-07-18" },
  { id: "u8", nom: "Seydou Diallo", email: "seydou.diallo@gmail.com", telephone: "+223 78 33 44 55", formationIds: ["f1", "f3"], actif: true, dateInscription: "2026-07-22" },
  { id: "u9", nom: "Kady Ndiaye", email: "kady.ndiaye@gmail.com", telephone: "+223 67 77 88 99", formationIds: ["f2"], actif: true, dateInscription: "2026-07-28" },
  { id: "u10", nom: "Boubacar Fall", email: "boubacar.fall@gmail.com", telephone: "+223 71 44 55 66", formationIds: ["f10", "f7"], actif: true, dateInscription: "2026-08-01" },
  { id: "u11", nom: "Awa Sidibé", email: "awa.sidibe@gmail.com", telephone: "+223 75 22 33 44", formationIds: ["f1"], actif: true, dateInscription: "2026-08-05" },
  { id: "u12", nom: "Drissa Sangaré", email: "drissa.sangare@yahoo.fr", telephone: "+223 68 99 11 22", formationIds: ["f3", "f5"], actif: false, dateInscription: "2026-08-08" },
];

export const echeances: Echeance[] = [
  { id: "e1", userId: "u1", formationId: "f1", libelle: "Inscription — Dév Web", montantDu: 10000, montantPaye: 10000, dateEcheance: "2026-06-15", datePaiement: "2026-06-15" },
  { id: "e2", userId: "u1", formationId: "f1", libelle: "Mensualité Juillet", montantDu: 15000, montantPaye: 15000, dateEcheance: "2026-07-01", datePaiement: "2026-07-02" },
  { id: "e3", userId: "u1", formationId: "f1", libelle: "Mensualité Août", montantDu: 15000, montantPaye: 7500, dateEcheance: "2026-08-01" },
  { id: "e4", userId: "u2", formationId: "f1", libelle: "Inscription — Dév Web", montantDu: 10000, montantPaye: 10000, dateEcheance: "2026-06-20", datePaiement: "2026-06-20" },
  { id: "e5", userId: "u2", formationId: "f1", libelle: "Mensualité Juillet", montantDu: 15000, montantPaye: 15000, dateEcheance: "2026-07-01", datePaiement: "2026-07-01" },
  { id: "e6", userId: "u2", formationId: "f1", libelle: "Mensualité Août", montantDu: 15000, montantPaye: 0, dateEcheance: "2026-08-01" },
  { id: "e7", userId: "u3", formationId: "f2", libelle: "Inscription — Bureautique", montantDu: 5000, montantPaye: 5000, dateEcheance: "2026-07-01", datePaiement: "2026-07-01" },
  { id: "e8", userId: "u3", formationId: "f2", libelle: "Mensualité Août", montantDu: 10000, montantPaye: 10000, dateEcheance: "2026-08-01", datePaiement: "2026-08-03" },
  { id: "e9", userId: "u4", formationId: "f3", libelle: "Inscription — Réseaux", montantDu: 10000, montantPaye: 10000, dateEcheance: "2026-07-05", datePaiement: "2026-07-05" },
  { id: "e10", userId: "u4", formationId: "f3", libelle: "Mensualité Août", montantDu: 20000, montantPaye: 0, dateEcheance: "2026-08-05" },
  { id: "e11", userId: "u5", formationId: "f7", libelle: "Inscription — Anglais", montantDu: 5000, montantPaye: 5000, dateEcheance: "2026-07-10", datePaiement: "2026-07-10" },
  { id: "e12", userId: "u5", formationId: "f7", libelle: "Mensualité Août", montantDu: 8000, montantPaye: 8000, dateEcheance: "2026-08-10", datePaiement: "2026-08-10" },
  { id: "e13", userId: "u7", formationId: "f10", libelle: "Inscription — Community Mgmt", montantDu: 5000, montantPaye: 5000, dateEcheance: "2026-07-18", datePaiement: "2026-07-18" },
  { id: "e14", userId: "u7", formationId: "f10", libelle: "Mensualité Août", montantDu: 10000, montantPaye: 3000, dateEcheance: "2026-08-18" },
  { id: "e15", userId: "u8", formationId: "f1", libelle: "Inscription — Dév Web", montantDu: 10000, montantPaye: 10000, dateEcheance: "2026-07-22", datePaiement: "2026-07-22" },
  { id: "e16", userId: "u8", formationId: "f1", libelle: "Mensualité Août", montantDu: 15000, montantPaye: 15000, dateEcheance: "2026-08-22", datePaiement: "2026-08-19" },
  { id: "e17", userId: "u9", formationId: "f2", libelle: "Inscription — Bureautique", montantDu: 5000, montantPaye: 5000, dateEcheance: "2026-07-28", datePaiement: "2026-07-28" },
  { id: "e18", userId: "u10", formationId: "f10", libelle: "Inscription — Community Mgmt", montantDu: 5000, montantPaye: 0, dateEcheance: "2026-08-01" },
];

export const paiementsHistorique: PaiementHistorique[] = [
  { id: "p1", echeanceId: "e1", montant: 10000, date: "2026-06-15" },
  { id: "p2", echeanceId: "e2", montant: 15000, date: "2026-07-02" },
  { id: "p3", echeanceId: "e3", montant: 7500, date: "2026-08-01" },
  { id: "p4", echeanceId: "e4", montant: 10000, date: "2026-06-20" },
  { id: "p5", echeanceId: "e5", montant: 15000, date: "2026-07-01" },
  { id: "p7", echeanceId: "e7", montant: 5000, date: "2026-07-01" },
  { id: "p8", echeanceId: "e8", montant: 10000, date: "2026-08-03" },
  { id: "p9", echeanceId: "e9", montant: 10000, date: "2026-07-05" },
  { id: "p11", echeanceId: "e11", montant: 5000, date: "2026-07-10" },
  { id: "p12", echeanceId: "e12", montant: 8000, date: "2026-08-10" },
  { id: "p13", echeanceId: "e13", montant: 5000, date: "2026-07-18" },
  { id: "p14", echeanceId: "e14", montant: 3000, date: "2026-08-18" },
  { id: "p15", echeanceId: "e15", montant: 10000, date: "2026-07-22" },
  { id: "p16", echeanceId: "e16", montant: 15000, date: "2026-08-19" },
  { id: "p17", echeanceId: "e17", montant: 5000, date: "2026-07-28" },
];

export const bourses: Bourse[] = [
  {
    id: "b1", formationId: "f4", titre: "Bourse Python & Data",
    description: "Formation en programmation Python et analyse de données.",
    datePublication: "2026-08-10", dateLimite: "2026-08-30",
    statut: "ouverte", nombreCandidatures: 15,
    champs: [
      { id: "c1", label: "Nom complet", type: "texte", obligatoire: true, options: [], cle: "nom" },
      { id: "c2", label: "Email", type: "email", obligatoire: true, options: [], cle: "email" },
      { id: "c3", label: "Téléphone", type: "telephone", obligatoire: true, options: [] },
      { id: "c4", label: "Motivation", type: "paragraphe", obligatoire: true, options: [], aide: "Expliquez pourquoi vous souhaitez suivre cette formation." },
      { id: "c5", label: "Niveau d'études", type: "choix", obligatoire: true, options: ["Bac", "Bac+2", "Bac+3", "Bac+5 ou plus"] },
      { id: "c6", label: "Expérience en programmation", type: "choix", obligatoire: false, options: ["Aucune", "Débutant", "Intermédiaire", "Avancé"] },
    ],
  },
  {
    id: "b2", formationId: "f9", titre: "Bourse Marketing Digital",
    description: "Formation en marketing digital et réseaux sociaux.",
    datePublication: "2026-08-10", dateLimite: "2026-08-30",
    statut: "ouverte", nombreCandidatures: 22,
    champs: [
      { id: "c7", label: "Nom complet", type: "texte", obligatoire: true, options: [], cle: "nom" },
      { id: "c8", label: "Email", type: "email", obligatoire: true, options: [], cle: "email" },
      { id: "c9", label: "Téléphone", type: "telephone", obligatoire: true, options: [] },
      { id: "c10", label: "Motivation", type: "paragraphe", obligatoire: true, options: [] },
    ],
  },
  {
    id: "b3", titre: "Bourse d'Excellence Leadership & Entrepreneuriat",
    description: "Programme de bourse d'études autonome pour former les futurs leaders et entrepreneurs du Sahel sans prérequis de cours en ligne.",
    datePublication: "2026-08-12", dateLimite: "2026-09-15",
    statut: "ouverte", nombreCandidatures: 28,
    champs: [
      { id: "c11", label: "Nom complet", type: "texte", obligatoire: true, options: [], cle: "nom" },
      { id: "c12", label: "Email", type: "email", obligatoire: true, options: [], cle: "email" },
      { id: "c13", label: "Téléphone", type: "telephone", obligatoire: true, options: [] },
      { id: "c14", label: "Projet d'entreprise", type: "paragraphe", obligatoire: true, options: [], aide: "Décrivez votre vision." },
    ],
  },
  {
    id: "b4", titre: "Bourse Technologie & IA (En attente)",
    description: "Programme de bourse sur l'intelligence artificielle et l'innovation technologique, actuellement en attente de validation finale.",
    datePublication: "2026-08-18", dateLimite: "2026-10-01",
    statut: "en_attente", nombreCandidatures: 0,
    champs: [
      { id: "c15", label: "Nom complet", type: "texte", obligatoire: true, options: [], cle: "nom" },
      { id: "c16", label: "Email", type: "email", obligatoire: true, options: [], cle: "email" },
    ],
  },
];

export const candidatures: Candidature[] = [
  { id: "ca1", bourseId: "b1", userId: "u1", nom: "Fatou Sow", email: "fatou.sow@gmail.com", statut: "admis", dateDepot: "2026-08-12", reponses: { c1: "Fatou Sow", c2: "fatou.sow@gmail.com", c3: "+223 70 12 34 56", c4: "Je souhaite développer mes compétences en data science.", c5: "Bac+2", c6: "Débutant" } },
  { id: "ca2", bourseId: "b1", userId: "u2", nom: "Amadou Traoré", email: "amadou.traore@gmail.com", statut: "enAttente", dateDepot: "2026-08-13", reponses: { c1: "Amadou Traoré", c2: "amadou.traore@gmail.com", c3: "+223 76 45 67 89", c4: "Passionné de tech et souhaite me former en Python.", c5: "Bac", c6: "Aucune" } },
  { id: "ca3", bourseId: "b1", userId: "u4", nom: "Moussa Koné", email: "moussa.kone@gmail.com", statut: "enAttente", dateDepot: "2026-08-14", reponses: { c1: "Moussa Koné", c2: "moussa.kone@gmail.com", c3: "+223 79 23 45 67", c4: "J'ai des bases en réseau et souhaite ajouter Python à mes compétences.", c5: "Bac+3", c6: "Débutant" } },
  { id: "ca4", bourseId: "b1", userId: "u8", nom: "Seydou Diallo", email: "seydou.diallo@gmail.com", statut: "refuse", dateDepot: "2026-08-15", reponses: { c1: "Seydou Diallo", c2: "seydou.diallo@gmail.com", c3: "+223 78 33 44 55", c4: "Je veux apprendre le machine learning.", c5: "Bac", c6: "Aucune" } },
  { id: "ca5", bourseId: "b2", userId: "u7", nom: "Oumou Camara", email: "oumou.camara@outlook.com", statut: "admis", dateDepot: "2026-08-11", reponses: { c7: "Oumou Camara", c8: "oumou.camara@outlook.com", c9: "+223 69 88 99 00", c10: "Je gère déjà des pages sur les réseaux et souhaite professionnaliser." } },
  { id: "ca6", bourseId: "b2", userId: "u10", nom: "Boubacar Fall", email: "boubacar.fall@gmail.com", statut: "enAttente", dateDepot: "2026-08-16", reponses: { c7: "Boubacar Fall", c8: "boubacar.fall@gmail.com", c9: "+223 71 44 55 66", c10: "Le marketing digital est l'avenir, je veux en faire mon métier." } },
];

export const notifications: NotificationItem[] = [
  { id: "n1", type: "systeme", titre: "Bienvenue sur Sahel Academy", message: "L'application est maintenant disponible pour tous.", date: "2026-08-10T10:00:00", cible: "global", envoyePar: "Admin" },
  { id: "n2", type: "actualite", titre: "Bourses disponibles", message: "2 nouvelles bourses en Python et Marketing digital. Candidatez avant le 30 août !", date: "2026-08-10T14:00:00", cible: "global", envoyePar: "Admin" },
  { id: "n3", type: "classe", titre: "Cours annulé demain", message: "Le cours de demain matin (9h) est reporté à jeudi.", date: "2026-08-15T16:00:00", cible: "formation", cibleId: "f1", cibleNom: "Dév Web", envoyePar: "M. Diallo" },
  { id: "n4", type: "paiement", titre: "Rappel de paiement", message: "Votre mensualité d'août est en retard. Merci de régulariser.", date: "2026-08-18T09:00:00", cible: "individuel", cibleId: "u4", cibleNom: "Moussa Koné", envoyePar: "Admin" },
];

// ─── Helpers ───

export function getStatutPaiement(e: Echeance): StatutPaiement {
  if (e.montantPaye >= e.montantDu) return "paye";
  if (e.montantPaye > 0) return "partiel";
  const now = new Date().toISOString().split("T")[0];
  if (e.dateEcheance < now) return "enRetard";
  return "aVenir";
}

export function getStatutLabel(s: StatutPaiement): string {
  const map: Record<StatutPaiement, string> = { paye: "Payé", partiel: "Partiel", aVenir: "À venir", enRetard: "En retard" };
  return map[s];
}

export function getStatutBadgeClass(s: StatutPaiement): string {
  const map: Record<StatutPaiement, string> = { paye: "badge-success", partiel: "badge-warning", aVenir: "badge-info", enRetard: "badge-danger" };
  return map[s];
}

export function getAdmissionLabel(s: StatutAdmission): string {
  const map: Record<StatutAdmission, string> = { enAttente: "En attente", admis: "Admis", refuse: "Refusé" };
  return map[s];
}

export function getAdmissionBadgeClass(s: StatutAdmission): string {
  const map: Record<StatutAdmission, string> = { enAttente: "badge-warning", admis: "badge-success", refuse: "badge-danger" };
  return map[s];
}

export function formatFCFA(n: number): string {
  return n.toLocaleString("fr-FR") + " FCFA";
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) + 
    " à " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function getUserName(userId: string): string {
  return users.find((u) => u.id === userId)?.nom ?? "Inconnu";
}

export function getFormationTitre(formationId: string): string {
  return formations.find((f) => f.id === formationId)?.titre ?? "Inconnue";
}

// ─── Actualité (fil affiché dans l'app mobile) ───

export type CiblePost = "resultats" | "bourses" | "paiements" | "formations";

export interface ActionPost {
  label: string;
  cible: CiblePost;
}

export interface Commentaire {
  id: string;
  auteur: string;
  role: "Élève" | "Formateur" | "Admin";
  contenu: string;
  date: string;
  reponses: Commentaire[];
}

export type TypeMedia = "photo" | "video" | "audio";

export interface Media {
  type: TypeMedia;
  url: string;
  nom?: string;
}

export interface Post {
  id: string;
  auteur: string;
  role: "Admin" | "Formateur";
  contenu: string;
  date: string;
  documentNom?: string;
  medias?: Media[];
  actions: ActionPost[];
  likes: number;
  commentaires: Commentaire[];
}

// Destinations possibles d'un bouton d'action (alignées sur les écrans de l'app).
export const CIBLES_ACTION: { value: CiblePost; label: string; route: string }[] = [
  { value: "resultats", label: "Vérifier mon statut (résultats)", route: "/resultats/:id" },
  { value: "bourses", label: "Voir les bourses", route: "/bourses" },
  { value: "paiements", label: "Mes paiements", route: "/paiements" },
  { value: "formations", label: "Voir les formations", route: "/formations" },
];

export function cibleLabel(c: CiblePost): string {
  return CIBLES_ACTION.find((x) => x.value === c)?.label ?? c;
}

// Nombre total de commentaires (réponses incluses).
export function compterCommentaires(cs: Commentaire[]): number {
  return cs.reduce((t, c) => t + 1 + c.reponses.length, 0);
}

export const posts: Post[] = [
  {
    id: "po1", auteur: "Sahel Academy", role: "Admin",
    contenu: "📊 Les résultats de la session de septembre sont disponibles ! Cliquez sur le bouton ci-dessous pour vérifier votre statut.",
    date: "2026-08-19", actions: [{ label: "Vérifier mon statut", cible: "resultats" }], likes: 12,
    commentaires: [
      { id: "cm1", auteur: "Fatou Sow", role: "Élève", contenu: "Merci ! J'ai vérifié, je suis admise 🎉", date: "2026-08-19", reponses: [
        { id: "cm1r", auteur: "Sahel Academy", role: "Admin", contenu: "Félicitations Fatou 👏", date: "2026-08-19", reponses: [] },
      ] },
      { id: "cm2", auteur: "Amadou Traoré", role: "Élève", contenu: "Où se trouve le bouton exactement ? Je ne le vois pas.", date: "2026-08-19", reponses: [] },
      { id: "cm3", auteur: "Compte inconnu", role: "Élève", contenu: "⚠️ Achetez des abonnés pas chers ici : spam-link.example", date: "2026-08-19", reponses: [] },
    ],
  },
  {
    id: "po2", auteur: "Sahel Academy", role: "Admin",
    contenu: "📢 Les inscriptions pour la session de septembre sont ouvertes ! Places limitées pour la formation Développement Web.",
    date: "2026-08-18", documentNom: "Calendrier_septembre.pdf",
    actions: [{ label: "Voir les formations", cible: "formations" }], likes: 42,
    commentaires: [
      { id: "cm4", auteur: "Aïcha Diop", role: "Élève", contenu: "Je me suis inscrite, hâte de commencer !", date: "2026-08-18", reponses: [] },
      { id: "cm5", auteur: "Moussa Koné", role: "Élève", contenu: "Les places sont-elles encore disponibles ?", date: "2026-08-18", reponses: [
        { id: "cm5r", auteur: "Sahel Academy", role: "Admin", contenu: "Oui, jusqu'à vendredi.", date: "2026-08-18", reponses: [] },
      ] },
    ],
  },
  {
    id: "po3", auteur: "M. Diallo", role: "Formateur",
    contenu: "Support du cours d'introduction à HTML disponible ci-dessous. Bonne révision à tous 📚",
    date: "2026-08-16", documentNom: "Cours_HTML_intro.pdf", actions: [], likes: 18,
    medias: [{ type: "photo", url: "https://picsum.photos/seed/sahel-cours/640/360", nom: "photo_cours.jpg" }],
    commentaires: [
      { id: "cm6", auteur: "Fatou Sow", role: "Élève", contenu: "Merci monsieur 🙏", date: "2026-08-16", reponses: [] },
    ],
  },
  {
    id: "po4", auteur: "Sahel Academy", role: "Admin",
    contenu: "🎓 2 nouvelles bourses de formation disponibles en Python et Marketing digital. Candidatez avant le 30 août !",
    date: "2026-08-14", actions: [{ label: "Voir les bourses", cible: "bourses" }], likes: 56,
    commentaires: [
      { id: "cm7", auteur: "Kady Ndiaye", role: "Élève", contenu: "Super, je vais candidater !", date: "2026-08-14", reponses: [] },
      { id: "cm8", auteur: "Boubacar Fall", role: "Élève", contenu: "C'est ouvert à tous les niveaux ?", date: "2026-08-14", reponses: [] },
    ],
  },
];

// ─── Centres de rendez-vous (écran « Prendre RDV » de l'app) ───

export interface Centre {
  id: string;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string;
  creneaux: string[]; // créneaux au format "2026-09-08T09:00"
}

export const centres: Centre[] = [
  {
    id: "ce1", nom: "Centre de Bamako", ville: "Bamako",
    adresse: "ACI 2000, Rue 300, près du rond-point", telephone: "+223 20 00 00 01",
    creneaux: ["2026-09-08T09:00", "2026-09-08T11:00", "2026-09-09T10:00", "2026-09-09T15:00"],
  },
  {
    id: "ce2", nom: "Centre de Kati", ville: "Kati",
    adresse: "Avenue de l'Indépendance, face au marché", telephone: "+223 20 00 00 02",
    creneaux: ["2026-09-08T14:00", "2026-09-10T09:00", "2026-09-10T11:30"],
  },
  {
    id: "ce3", nom: "Centre de Ségou", ville: "Ségou",
    adresse: "Quartier Sébougou, non loin de la gare", telephone: "+223 20 00 00 03",
    creneaux: ["2026-09-11T10:00", "2026-09-11T15:00"],
  },
];

// Formate un créneau : "lun. 8 sept. · 09:00".
export function formatCreneau(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${heure}`;
}

// ─── Formateurs & salaires ───

export interface Formateur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  specialite?: string;
  salaireMensuel: number; // salaire de base mensuel (FCFA)
  actif: boolean;
  dateAjout: string;
  userId?: string; // si le formateur est aussi un utilisateur de l'app
}

export interface VersementSalaire {
  id: string;
  montant: number;
  date: string;
  note?: string;
}

// Une fiche de salaire = un formateur, un mois, un montant dû, et 0..n versements
export interface Salaire {
  id: string;
  formateurId: string;
  mois: string;
  montantDu: number;
  versements: VersementSalaire[];
}

export type StatutSalaire = "paye" | "partiel" | "enAttente";

export const formateurs: Formateur[] = [
  { id: "fo1", nom: "M. Diallo", email: "diallo@sahel-academy.org", telephone: "+223 70 00 11 22", specialite: "Développement Web", salaireMensuel: 150000, actif: true, dateAjout: "2026-01-10" },
  { id: "fo2", nom: "Mme Bâ", email: "ba@sahel-academy.org", telephone: "+223 76 00 22 33", specialite: "Bureautique", salaireMensuel: 120000, actif: true, dateAjout: "2026-01-10" },
  { id: "fo3", nom: "M. Traoré", email: "traore@sahel-academy.org", telephone: "+223 65 00 33 44", specialite: "Réseaux & Maintenance", salaireMensuel: 130000, actif: true, dateAjout: "2026-01-15" },
  { id: "fo4", nom: "M. Sow", email: "sow@sahel-academy.org", telephone: "+223 79 00 44 55", specialite: "Comptabilité", salaireMensuel: 110000, actif: true, dateAjout: "2026-02-01" },
  { id: "fo5", nom: "Mme Camara", email: "camara@sahel-academy.org", telephone: "+223 66 00 55 66", specialite: "Gestion & Fiscalité", salaireMensuel: 125000, actif: true, dateAjout: "2026-02-01" },
  { id: "fo6", nom: "Mr. Johnson", email: "johnson@sahel-academy.org", telephone: "+223 74 00 66 77", specialite: "Anglais professionnel", salaireMensuel: 140000, actif: true, dateAjout: "2026-02-10" },
  { id: "fo7", nom: "M. Haidara", email: "haidara@sahel-academy.org", telephone: "+223 69 00 77 88", specialite: "Arabe", salaireMensuel: 100000, actif: true, dateAjout: "2026-03-01" },
  { id: "fo8", nom: "Mme Ndiaye", email: "ndiaye@sahel-academy.org", telephone: "+223 67 00 88 99", specialite: "Marketing digital", salaireMensuel: 135000, actif: true, dateAjout: "2026-03-05" },
  { id: "fo9", nom: "M. Fall", email: "fall@sahel-academy.org", telephone: "+223 78 00 99 00", specialite: "Community Management", salaireMensuel: 115000, actif: false, dateAjout: "2026-03-10" },
];

export const salaires: Salaire[] = [
  { id: "sa1", formateurId: "fo1", mois: "Août 2026", montantDu: 150000, versements: [{ id: "v1", montant: 150000, date: "2026-08-05", note: "Virement bancaire" }] },
  { id: "sa2", formateurId: "fo2", mois: "Août 2026", montantDu: 120000, versements: [] },
  { id: "sa3", formateurId: "fo3", mois: "Août 2026", montantDu: 130000, versements: [] },
  { id: "sa4", formateurId: "fo4", mois: "Août 2026", montantDu: 110000, versements: [{ id: "v2", montant: 110000, date: "2026-08-06" }] },
  { id: "sa5", formateurId: "fo5", mois: "Août 2026", montantDu: 125000, versements: [{ id: "v3", montant: 60000, date: "2026-08-08", note: "Avance" }] },
  { id: "sa6", formateurId: "fo6", mois: "Août 2026", montantDu: 140000, versements: [] },
  { id: "sa7", formateurId: "fo8", mois: "Août 2026", montantDu: 135000, versements: [] },
  { id: "sa8", formateurId: "fo9", mois: "Août 2026", montantDu: 115000, versements: [{ id: "v4", montant: 115000, date: "2026-08-04" }] },
  { id: "sa9", formateurId: "fo1", mois: "Juillet 2026", montantDu: 150000, versements: [{ id: "v5", montant: 100000, date: "2026-07-10", note: "1er versement" }, { id: "v6", montant: 50000, date: "2026-07-28", note: "Solde" }] },
];

export function salaireTotalVerse(s: Salaire): number {
  return s.versements.reduce((sum, v) => sum + v.montant, 0);
}

export function salaireStatut(s: Salaire): StatutSalaire {
  const verse = salaireTotalVerse(s);
  if (s.montantDu > 0 && verse >= s.montantDu) return "paye";
  if (verse > 0) return "partiel";
  return "enAttente";
}

export const salaireStatutLabel: Record<StatutSalaire, string> = {
  paye: "Payé",
  partiel: "Partiel",
  enAttente: "En attente",
};

export const salaireStatutBadge: Record<StatutSalaire, string> = {
  paye: "badge-success",
  partiel: "badge-warning",
  enAttente: "badge-neutral",
};

export function getFormateurNom(id: string): string {
  return formateurs.find((f) => f.id === id)?.nom ?? "—";
}

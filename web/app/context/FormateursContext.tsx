"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Formateur, Salaire } from "@/app/lib/mock-data";
import { formateursApi } from "@/app/lib/api";

// ─── Mapping backend → types front ───
function mapFormateur(f: any): Formateur {
  return {
    id: f.id,
    nom: f.nom,
    email: f.email ?? undefined,
    telephone: f.telephone ?? undefined,
    specialite: f.specialite ?? undefined,
    salaireMensuel: f.salaireMensuel ?? 0,
    actif: f.actif ?? true,
    userId: f.userId ?? undefined,
    dateAjout: (f.dateAjout ?? f.createdAt ?? new Date().toISOString()).slice(0, 10),
  };
}

function mapFiche(s: any): Salaire {
  return {
    id: s.id,
    formateurId: s.formateurId,
    mois: s.mois,
    montantDu: s.montantDu,
    versements: (s.versements ?? []).map((v: any) => ({
      id: v.id,
      montant: v.montant,
      date: typeof v.date === "string" ? v.date.slice(0, 10) : v.date,
      note: v.note ?? undefined,
    })),
  };
}

interface FormateursContextValue {
  formateurs: Formateur[];
  salaires: Salaire[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addFormateur: (data: Omit<Formateur, "id" | "dateAjout">) => Promise<void>;
  updateFormateur: (id: string, patch: Partial<Formateur>) => Promise<void>;
  deleteFormateur: (id: string) => Promise<void>;
  addFiche: (data: Omit<Salaire, "id" | "versements">) => Promise<void>;
  updateFiche: (id: string, patch: Partial<Salaire>) => Promise<void>;
  deleteFiche: (id: string) => Promise<void>;
  addVersement: (ficheId: string, v: { montant: number; date: string; note?: string }) => Promise<void>;
  removeVersement: (ficheId: string, versId: string) => Promise<void>;
}

const FormateursContext = createContext<FormateursContextValue | null>(null);

export function FormateursProvider({ children }: { children: ReactNode }) {
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [salaires, setSalaires] = useState<Salaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await formateursApi.list();
      const mapped = list.map(mapFormateur);
      setFormateurs(mapped);
      // Charge les fiches de salaire de chaque formateur
      const allFiches = await Promise.all(
        mapped.map((f) => formateursApi.salaires(f.id).catch(() => [] as any[])),
      );
      setSalaires(allFiches.flat().map(mapFiche));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addFormateur: FormateursContextValue["addFormateur"] = async (data) => {
    const created = await formateursApi.create({
      nom: data.nom,
      email: data.email,
      telephone: data.telephone,
      specialite: data.specialite,
      salaireMensuel: data.salaireMensuel,
      actif: data.actif,
      userId: data.userId,
    });
    setFormateurs((prev) => [...prev, mapFormateur(created)]);
  };

  const updateFormateur: FormateursContextValue["updateFormateur"] = async (id, patch) => {
    const updated = await formateursApi.update(id, {
      nom: patch.nom,
      email: patch.email,
      telephone: patch.telephone,
      specialite: patch.specialite,
      salaireMensuel: patch.salaireMensuel,
      actif: patch.actif,
      userId: patch.userId,
    });
    setFormateurs((prev) => prev.map((f) => (f.id === id ? mapFormateur({ ...f, ...updated }) : f)));
  };

  const deleteFormateur: FormateursContextValue["deleteFormateur"] = async (id) => {
    await formateursApi.remove(id);
    setFormateurs((prev) => prev.filter((f) => f.id !== id));
    setSalaires((prev) => prev.filter((s) => s.formateurId !== id));
  };

  const addFiche: FormateursContextValue["addFiche"] = async (data) => {
    const created = await formateursApi.createFiche(data.formateurId, { mois: data.mois, montantDu: data.montantDu });
    setSalaires((prev) => [mapFiche(created), ...prev]);
  };

  const updateFiche: FormateursContextValue["updateFiche"] = async (id, patch) => {
    const updated = await formateursApi.updateFiche(id, { mois: patch.mois, montantDu: patch.montantDu });
    setSalaires((prev) => prev.map((s) => (s.id === id ? mapFiche(updated) : s)));
  };

  const deleteFiche: FormateursContextValue["deleteFiche"] = async (id) => {
    await formateursApi.removeFiche(id);
    setSalaires((prev) => prev.filter((s) => s.id !== id));
  };

  const addVersement: FormateursContextValue["addVersement"] = async (ficheId, v) => {
    const created = await formateursApi.addVersement(ficheId, v);
    setSalaires((prev) =>
      prev.map((s) =>
        s.id === ficheId
          ? { ...s, versements: [...s.versements, { id: created.id, montant: created.montant, date: typeof created.date === "string" ? created.date.slice(0, 10) : created.date, note: created.note ?? undefined }] }
          : s,
      ),
    );
  };

  const removeVersement: FormateursContextValue["removeVersement"] = async (ficheId, versId) => {
    await formateursApi.removeVersement(ficheId, versId);
    setSalaires((prev) => prev.map((s) => (s.id === ficheId ? { ...s, versements: s.versements.filter((x) => x.id !== versId) } : s)));
  };

  return (
    <FormateursContext.Provider value={{ formateurs, salaires, loading, error, reload, addFormateur, updateFormateur, deleteFormateur, addFiche, updateFiche, deleteFiche, addVersement, removeVersement }}>
      {children}
    </FormateursContext.Provider>
  );
}

export function useFormateurs() {
  const ctx = useContext(FormateursContext);
  if (!ctx) throw new Error("useFormateurs doit être utilisé dans <FormateursProvider>");
  return ctx;
}

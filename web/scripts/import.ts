/**
 * Import des CSV (Anglais + Réseau informatique) vers Postgres.
 * Usage: npx tsx scripts/import.ts
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Config par fichier : les colonnes ne sont pas au même index d'un CSV à l'autre.
const SOURCES = [
  {
    fichier: "candidats_anglais.csv",
    formation: "Anglais",
    cols: { nom: 1, tel: 4, email: 3, niveauEtude: 7, situation: 8, niveau: 9, horodateur: 0 },
  },
  {
    fichier: "candidats_reseau.csv",
    formation: "Réseau informatique",
    cols: { nom: 1, tel: 4, email: 3, niveauEtude: 8, situation: 9, niveau: 10, horodateur: 0 },
  },
];

function normaliser(brut: string): string | null {
  if (!brut) return null;
  let n = brut.replace(/\D/g, "");
  if (n.startsWith("00228")) n = n.slice(5);
  else if (n.startsWith("228") && n.length > 8) n = n.slice(3);
  if (n.length < 8 || n.length > 12) return null;
  return n;
}

async function importer(src: (typeof SOURCES)[number]) {
  const csvPath = path.join(process.cwd(), src.fichier);
  const contenu = fs.readFileSync(csvPath, "utf-8");
  const lignes: string[][] = parse(contenu, {
    skip_empty_lines: true,
    relax_column_count: true,
  });
  lignes.shift(); // en-tête

  let inseres = 0;
  let ignores = 0;
  const vus = new Set<string>();
  const c = src.cols;

  for (const row of lignes) {
    const tel = normaliser(row[c.tel] ?? "");
    if (!tel || vus.has(tel)) { ignores++; continue; }
    vus.add(tel);

    await prisma.candidat.upsert({
      where: { telephone_formation: { telephone: tel, formation: src.formation } },
      update: {},
      create: {
        nom: (row[c.nom] ?? "").trim() || "—",
        telephone: tel,
        telephoneBrut: (row[c.tel] ?? "").trim(),
        formation: src.formation,
        email: (row[c.email] ?? "").trim() || null,
        niveauEtude: (row[c.niveauEtude] ?? "").trim() || null,
        situation: (row[c.situation] ?? "").trim() || null,
        niveau: (row[c.niveau] ?? "").trim() || null,
        statut: "admis",
        horodateur: (row[c.horodateur] ?? "").trim() || null,
      },
    });
    inseres++;
  }
  console.log(`  ${src.formation} : ${inseres} insérés, ${ignores} ignorés`);
}

async function main() {
  for (const src of SOURCES) {
    console.log(`→ ${src.fichier}`);
    await importer(src);
  }
  const total = await prisma.candidat.count();
  console.log(`✅ Total en base : ${total} fiches`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

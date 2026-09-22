/**
 * Génère un instantané des candidats depuis Neon vers un JSON côté serveur.
 * Lancé automatiquement au build (voir package.json). Le fichier n'est PAS commité.
 * Usage manuel : npx tsx scripts/export.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fiches = await prisma.candidat.findMany({
    select: { telephone: true, formation: true, nom: true, statut: true },
  });

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "candidats.generated.json");
  fs.writeFileSync(dest, JSON.stringify(fiches));

  console.log(`✅ Instantané : ${fiches.length} fiches → data/candidats.generated.json`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

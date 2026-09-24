import 'dotenv/config';
import { PrismaClient, Role, StatutFormation } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🌱 Seed en cours...');

  // Nettoyage (ordre = respect des FK)
  await prisma.versementSalaire.deleteMany();
  await prisma.ficheSalaire.deleteMany();
  await prisma.candidature.deleteMany();
  await prisma.champFormulaire.deleteMany();
  await prisma.bourse.deleteMany();
  await prisma.echeance.deleteMany();
  await prisma.inscription.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.formateur.deleteMany();
  await prisma.departement.deleteMany();
  await prisma.commentaire.deleteMany();
  await prisma.actionPost.deleteMany();
  await prisma.media.deleteMany();
  await prisma.post.deleteMany();

  // ── Départements ──
  const info = await prisma.departement.create({ data: { nom: 'Informatique', description: 'Développement, réseaux, bureautique' } });
  const compta = await prisma.departement.create({ data: { nom: 'Comptabilité', description: 'Gestion, finance, fiscalité' } });
  const langues = await prisma.departement.create({ data: { nom: 'Langues', description: 'Anglais, arabe, français' } });
  const marketing = await prisma.departement.create({ data: { nom: 'Marketing', description: 'Marketing digital, community management' } });

  // ── Formateurs ──
  const diallo = await prisma.formateur.create({ data: { nom: 'M. Diallo', email: 'diallo@sahel-academy.org', telephone: '+223 70 00 11 22', specialite: 'Développement Web', salaireMensuel: 150000 } });
  const ba = await prisma.formateur.create({ data: { nom: 'Mme Bâ', email: 'ba@sahel-academy.org', specialite: 'Bureautique', salaireMensuel: 120000 } });
  const sow = await prisma.formateur.create({ data: { nom: 'M. Sow', email: 'sow@sahel-academy.org', specialite: 'Comptabilité', salaireMensuel: 110000 } });
  const johnson = await prisma.formateur.create({ data: { nom: 'Mr. Johnson', email: 'johnson@sahel-academy.org', specialite: 'Anglais professionnel', salaireMensuel: 140000 } });

  // ── Formations ──
  await prisma.formation.create({ data: { titre: 'Développement Web (HTML, CSS, JS)', description: 'Créer des sites web modernes.', departementId: info.id, formateurId: diallo.id, prixInscription: 10000, prixMensualite: 15000, dureeMois: 4, niveau: 'Débutant', statut: StatutFormation.active } });
  await prisma.formation.create({ data: { titre: 'Bureautique (Word, Excel, PowerPoint)', departementId: info.id, formateurId: ba.id, prixInscription: 5000, prixMensualite: 10000, dureeMois: 2, niveau: 'Débutant', statut: StatutFormation.active } });
  await prisma.formation.create({ data: { titre: 'Comptabilité générale', departementId: compta.id, formateurId: sow.id, prixInscription: 8000, prixMensualite: 12000, dureeMois: 4, niveau: 'Débutant', statut: StatutFormation.active } });
  await prisma.formation.create({ data: { titre: 'Anglais professionnel', departementId: langues.id, formateurId: johnson.id, prixInscription: 5000, prixMensualite: 8000, dureeMois: 6, niveau: 'Débutant', statut: StatutFormation.active } });

  // ── Fiches de salaire + versements ──
  const ficheDiallo = await prisma.ficheSalaire.create({ data: { formateurId: diallo.id, mois: 'Août 2026', montantDu: 150000 } });
  await prisma.versementSalaire.create({ data: { ficheId: ficheDiallo.id, montant: 150000, date: new Date('2026-08-05'), note: 'Virement' } });
  const ficheBa = await prisma.ficheSalaire.create({ data: { formateurId: ba.id, mois: 'Août 2026', montantDu: 120000 } });
  await prisma.versementSalaire.create({ data: { ficheId: ficheBa.id, montant: 60000, date: new Date('2026-08-08'), note: 'Avance' } });

  // ── Bourse + champs ──
  await prisma.bourse.create({
    data: {
      titre: 'Bourse Python & Data 2026',
      description: 'Programmation Python et analyse de données.',
      datePublication: new Date('2026-08-10'),
      dateLimite: new Date('2026-08-30'),
      champs: {
        create: [
          { label: 'Motivation', type: 'paragraphe', obligatoire: true, ordre: 0 },
          { label: 'Niveau en programmation', type: 'choix', options: ['Débutant', 'Intermédiaire', 'Avancé'], obligatoire: true, ordre: 1 },
        ],
      },
    },
  });

  // ── Utilisateurs de test ──
  await prisma.user.create({ data: { nom: 'Admin Sahel', email: 'admin@sahel-academy.org', role: Role.CHEF_CENTRE, emailVerified: true } });
  await prisma.user.create({ data: { nom: 'Fatou Sow', email: 'fatou.sow@example.com', role: Role.ETUDIANT, telephone: '+223 70 12 34 56' } });

  // ── Actualité ──
  await prisma.post.create({
    data: {
      auteurNom: 'Sahel Academy',
      role: 'Admin',
      contenu: 'Bienvenue sur la nouvelle plateforme Sahel Academy ! 🎉',
      actions: { create: [{ label: 'Voir les formations', cible: 'formations' }] },
    },
  });

  console.log('✅ Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

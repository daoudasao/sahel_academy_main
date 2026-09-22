import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Rattrapage des comptes crees avant le passage de `emailVerified` a `true`
 * par defaut.
 *
 * A executer une seule fois apres deploiement si la base est synchronisee par
 * `prisma db push` (qui applique le nouveau defaut mais ne touche pas aux
 * lignes existantes) plutot que par `prisma migrate deploy`.
 *
 *   npm run db:verifier-comptes
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const { count } = await prisma.user.updateMany({
    where: { emailVerified: false },
    data: { emailVerified: true },
  });
  console.log(`✅ ${count} compte(s) marque(s) comme verifie(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

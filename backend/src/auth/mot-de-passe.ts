import { createLocalAccountIssuer } from '@better-auth/core/db';
import { auth } from './auth';

/**
 * Définit (ou remplace) le mot de passe d'un compte, comme le fait le plugin
 * admin de better-auth (hachage + compte « credential »), mais sans son
 * contrôle de permissions : l'autorisation est assurée par les gardes Nest de
 * l'appelant (et l'action est donc tracée dans le journal d'audit).
 */
export async function definirMotDePasse(
  userId: string,
  motDePasse: string,
): Promise<void> {
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(motDePasse);
  const compteExistant = await ctx.internalAdapter.findCredentialAccount(userId);
  if (compteExistant) {
    await ctx.internalAdapter.updatePassword(userId, hashed);
  } else {
    await ctx.internalAdapter.createAccount({
      userId,
      providerId: 'credential',
      issuer: createLocalAccountIssuer('credential'),
      accountId: userId,
      password: hashed,
    });
  }
}

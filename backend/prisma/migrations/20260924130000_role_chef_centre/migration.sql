-- Le rôle ADMIN devient CHEF_CENTRE (mêmes droits).
-- RENAME VALUE met à jour tous les comptes existants d'un coup : rien à migrer
-- dans la table users. Le journal d'audit (colonne texte "userRole") garde
-- volontairement la valeur d'origine « ADMIN » de ses anciennes entrées.
ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'CHEF_CENTRE';

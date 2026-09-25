// ─── Gestionnaire Central de Permissions & Rôles Admin ───

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "COMPTABLE",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/utilisateurs": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/roles": ["CHEF_CENTRE", "SUPER_ADMIN"],
  "/dashboard/formations": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/demandes": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/bourses": ["CHEF_CENTRE", "SUPER_ADMIN", "SUPPORT", "STAFF"],
  "/dashboard/paiements": ["CHEF_CENTRE", "SUPER_ADMIN", "COMPTABLE", "STAFF"],
  "/dashboard/centres": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/departements": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/formateurs": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMPTABLE",
    "STAFF",
  ],
  "/dashboard/actualite": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/notifications": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/support": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "SUPPORT",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  // Doit rester aligné sur ROLES_MODERATION (backend/src/signalements)
  "/dashboard/signalements": [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "STAFF",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMMUNITY_MANAGER",
    "SUPPORT",
  ],
  "/dashboard/parametres": ["CHEF_CENTRE", "SUPER_ADMIN", "STAFF"],
};

export function isStaffOrAdminRole(userRole?: string): boolean {
  if (!userRole) return false;
  const role = userRole.toUpperCase();
  return [
    "CHEF_CENTRE",
    "SUPER_ADMIN",
    "COMPTABLE",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMMUNITY_MANAGER",
    "STAFF",
  ].includes(role);
}

/** Pages réservées au SUPER_ADMIN (même un CHEF_CENTRE n'y a pas accès). */
export const SUPER_ADMIN_ROUTES = ["/dashboard/journal"];

export function isSuperAdminRole(userRole?: string): boolean {
  return userRole?.toUpperCase() === "SUPER_ADMIN";
}

export function canAccessRoute(userRole?: string, routePath?: string): boolean {
  if (!userRole || !routePath) return false;
  const role = userRole.toUpperCase();

  // Pages de supervision : SUPER_ADMIN uniquement
  const reserveSuperAdmin = SUPER_ADMIN_ROUTES.some(
    (prefix) => routePath === prefix || routePath.startsWith(prefix + "/")
  );
  if (reserveSuperAdmin) return role === "SUPER_ADMIN";

  // SUPER_ADMIN / CHEF_CENTRE : accès à tout le reste
  if (role === "CHEF_CENTRE" || role === "SUPER_ADMIN") return true;

  // Recherche de la correspondance exacte ou du préfixe de route
  const sortedKeys = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  const matchedRoute = sortedKeys.find(
    (prefix) =>
      routePath === prefix ||
      (prefix !== "/dashboard" && routePath.startsWith(prefix + "/"))
  );

  if (!matchedRoute) {
    return isStaffOrAdminRole(role);
  }

  const allowedRoles = ROUTE_PERMISSIONS[matchedRoute];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

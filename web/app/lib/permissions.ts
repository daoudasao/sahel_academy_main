// ─── Gestionnaire Central de Permissions & Rôles Admin ───

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": [
    "ADMIN",
    "SUPER_ADMIN",
    "COMPTABLE",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/utilisateurs": [
    "ADMIN",
    "SUPER_ADMIN",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/roles": ["ADMIN", "SUPER_ADMIN"],
  "/dashboard/formations": [
    "ADMIN",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/demandes": [
    "ADMIN",
    "SUPER_ADMIN",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/bourses": ["ADMIN", "SUPER_ADMIN", "SUPPORT", "STAFF"],
  "/dashboard/paiements": ["ADMIN", "SUPER_ADMIN", "COMPTABLE", "STAFF"],
  "/dashboard/centres": [
    "ADMIN",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/departements": [
    "ADMIN",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "STAFF",
  ],
  "/dashboard/formateurs": [
    "ADMIN",
    "SUPER_ADMIN",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMPTABLE",
    "STAFF",
  ],
  "/dashboard/actualite": [
    "ADMIN",
    "SUPER_ADMIN",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/notifications": [
    "ADMIN",
    "SUPER_ADMIN",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/support": [
    "ADMIN",
    "SUPER_ADMIN",
    "SUPPORT",
    "COMMUNITY_MANAGER",
    "STAFF",
  ],
  "/dashboard/parametres": ["ADMIN", "SUPER_ADMIN", "STAFF"],
};

export function isStaffOrAdminRole(userRole?: string): boolean {
  if (!userRole) return false;
  const role = userRole.toUpperCase();
  return [
    "ADMIN",
    "SUPER_ADMIN",
    "COMPTABLE",
    "SUPPORT",
    "RESPONSABLE_PEDAGOGIQUE",
    "COMMUNITY_MANAGER",
    "STAFF",
  ].includes(role);
}

/** Pages réservées au SUPER_ADMIN (même un ADMIN n'y a pas accès). */
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

  // SUPER_ADMIN / ADMIN : accès à tout le reste
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

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

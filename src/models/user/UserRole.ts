/** Le Super Admin (l'éditeur de la plateforme) n'est PAS une valeur de ce
 * type : c'est l'appartenance à la collection `platformAdmins` (indexée par
 * email) qui fait foi, jamais un champ sur le document utilisateur. Voir
 * Module 12 (BF-67) dans docs/02-besoins-fonctionnels.md et
 * src/models/platform/PlatformAdmin.ts. */
export type UserRole = "admin" | "seller" | "client";

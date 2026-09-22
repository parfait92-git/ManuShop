export interface IPlatformAdminRepository {
  /** Vérifie l'appartenance à la collection `platformAdmins` (Super Admin,
   * Module 12 BF-67) — jamais d'écriture depuis ce repository, les règles
   * Firestore l'interdisent de toute façon (`allow write: if false`). */
  exists(email: string): Promise<boolean>;
}

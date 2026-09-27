import type { CategoryTag } from "@/models/category/CategoryTag";

export interface ICategoryTagRepository {
  /** Lecture publique (BF-109) — un commerçant en a besoin pour choisir un
   * tag en créant une catégorie. Jamais d'écriture depuis ce repository :
   * les règles Firestore l'interdisent (`allow write: if false`), la
   * création/suppression passe par une Server Action Super Admin (voir
   * `platformAdminActions.ts`). */
  listAll(): Promise<CategoryTag[]>;
}

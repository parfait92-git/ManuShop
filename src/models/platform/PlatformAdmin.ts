import type { Timestamp } from "firebase/firestore";

/**
 * Collection `platformAdmins`, document ID = l'email du Super Admin (en
 * minuscules), ex. `platformAdmins/proprietaire@manushop.cm`.
 *
 * Ce n'est PAS un rôle sur `User` : l'existence d'un document ici, pour
 * l'email du compte connecté, est ce qui fait de quelqu'un un Super Admin
 * (Module 12, BF-67) — `role` ci-dessous est purement informatif (cohérence
 * avec `User.role`/`'admin'`/`'seller'` à la lecture du document dans la
 * console Firebase), l'autorisation ne le vérifie jamais : elle reste basée
 * sur l'appartenance à la collection, pas sur la valeur d'un champ. Aucun
 * chemin de l'application ne doit jamais écrire dans cette collection —
 * uniquement une modification manuelle depuis la console Firebase par
 * l'éditeur de la plateforme lui-même. `firestore.rules` doit donc n'y
 * autoriser aucune écriture, quel que soit l'appelant.
 */
export interface PlatformAdmin {
  email: string;
  role: "super-admin";
  addedAt: Timestamp;
}

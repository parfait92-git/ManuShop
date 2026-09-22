import type { Timestamp } from "firebase/firestore";

/**
 * Collection `platformAdmins`, document ID = l'email du Super Admin (en
 * minuscules), ex. `platformAdmins/proprietaire@manushop.cm`.
 *
 * Ce n'est PAS un rôle sur `User` : l'existence d'un document ici, pour
 * l'email du compte connecté, est ce qui fait de quelqu'un un Super Admin
 * (Module 12, BF-67). Aucun chemin de l'application ne doit jamais écrire
 * dans cette collection — uniquement une modification manuelle depuis la
 * console Firebase par l'éditeur de la plateforme lui-même. `firestore.rules`
 * doit donc n'y autoriser aucune écriture, quel que soit l'appelant.
 */
export interface PlatformAdmin {
  email: string;
  addedAt: Timestamp;
}

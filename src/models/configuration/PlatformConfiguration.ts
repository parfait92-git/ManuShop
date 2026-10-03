import type { LaunchPromoSettings } from "@/lib/launchPromo";

/**
 * Collection `configuration`, document unique `configuration/general`.
 * Réglages plateforme, jamais écrits depuis le client directement (règle
 * Firestore `allow write: if false`, même schéma que `platformAdmins`) —
 * uniquement via une Server Action Super Admin (`configurationActions.ts`).
 */
export interface PlatformConfiguration {
  /**
   * Interrupteur manuel prioritaire pour `/demo-catalogue` (BF-122,
   * demande utilisateur du 2026-09-26 ; interrupteur Super Admin ajouté le
   * 2026-09-27) : `false` la désactive complètement, quel que soit l'état
   * réel de la plateforme. Absent ou `true` laisse la détection automatique
   * décider (voir `useDemoCatalogueAvailable`) — désactivée dès qu'au moins
   * une boutique publiée a un produit visible réel, plus besoin de démo.
   */
  demoCatalogueEnabled?: boolean;
  /**
   * Valeur d'un dollar US en FCFA, saisie par le Super Admin (2026-10-02).
   * Sert à afficher les prix des boutiques dont la devise est le dollar
   * (voir `src/lib/currency.ts`) — l'euro a une parité fixe, il n'a pas
   * besoin de taux. Absent : ces boutiques affichent leurs prix en FCFA.
   */
  usdToXafRate?: number;
  /**
   * Promotion de la page d'accueil, réglée par le Super Admin (2026-10-02).
   * Absente : valeurs par défaut (`DEFAULT_LAUNCH_PROMO`), voir
   * `src/lib/launchPromo.ts`.
   */
  launchPromo?: LaunchPromoSettings;
}

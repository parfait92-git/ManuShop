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
}

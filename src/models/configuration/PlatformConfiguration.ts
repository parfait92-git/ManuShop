/**
 * Collection `configuration`, document unique `configuration/general`.
 * Réglages plateforme gérés à la main par le Super Admin (console Firebase,
 * même schéma que `platformAdmins` — aucune écriture depuis l'app).
 */
export interface PlatformConfiguration {
  /**
   * Interrupteur manuel prioritaire pour `/demo-catalogue` (BF-63bis,
   * demande utilisateur du 2026-09-26) : `false` la désactive
   * complètement, quel que soit l'état réel de la plateforme. Absent ou
   * `true` laisse la détection automatique décider (voir
   * `useDemoCatalogueAvailable`) — désactivée dès qu'au moins une boutique
   * publiée a un produit visible réel, plus besoin de démo.
   */
  demoCatalogueEnabled?: boolean;
}

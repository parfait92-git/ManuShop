/** BF-95 : remplace le vocabulaire posé initialement au Module 4
 * (`pending/confirmed/delivering/delivered/cancelled`, jamais livré en
 * production) par le vocabulaire métier révisé — directement avec ce
 * vocabulaire dès la construction du module, pas de migration après coup.
 *
 *   under_review      → En cours d'analyse (statut initial, commande client
 *                        ou manuelle)
 *   ready_for_delivery → Prêt pour la livraison
 *   delivering         → Livraison en cours
 *   delivered          → Livré
 *   returned           → Retourné (remboursé, BF-96)
 *   defective          → Défectueux (remboursé, motif défaut, BF-97)
 *   cancelled          → Annulée (BF-23 ; ajoutée ici après clarification
 *                        avec l'utilisateur — n'existait pas dans BF-95, qui
 *                        ne couvrait que l'issue après livraison). Accessible
 *                        uniquement depuis `under_review`, avant expédition.
 */
export type OrderStatus =
  | "under_review"
  | "ready_for_delivery"
  | "delivering"
  | "delivered"
  | "returned"
  | "defective"
  | "cancelled";

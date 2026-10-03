import type { Timestamp } from "firebase/firestore";

/** Réponse du commerçant à un avis (livraison ou article). */
export interface ReviewReply {
  text: string;
  /** Nom affiché du membre de l'équipe qui a répondu. */
  authorName: string;
  repliedAt: Timestamp;
}

/**
 * Avis du client sur la **livraison** d'une commande (2026-10-02) —
 * document `orderFeedback/{orderId}`, un par commande. **Privé** (choix de
 * l'utilisateur) : lisible seulement par le client et l'équipe de la
 * boutique (firestore.rules), contrairement aux avis sur les articles
 * (`Review`, publics sur la fiche produit). Écrit par le serveur.
 */
export interface OrderFeedback {
  /** Même id que la commande. */
  orderId: string;
  shopId: string;
  clientId: string;
  clientName: string;
  /** Note de 1 à 5, facultative. */
  rating?: number;
  comment: string;
  reply?: ReviewReply;
  createdAt: Timestamp;
}

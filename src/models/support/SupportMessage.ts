import type { Timestamp } from "firebase/firestore";

export interface SupportMessageReply {
  body: string;
  createdAt: Timestamp;
}

/**
 * BF-112→115 : un commerçant envoie un message (objet + corps) au Super
 * Admin, qui y répond une fois — pas un fil de discussion à plusieurs
 * échanges, un ticket simple. Réservé aux boutiques ayant le privilège
 * premium `contactForm` (`lib/premiumFeatures.ts`), revérifié côté serveur
 * à l'envoi (`supportMessageActions.ts`), pas seulement masqué côté UI.
 */
export interface SupportMessage {
  id: string;
  shopId: string;
  shopName: string;
  senderId: string;
  senderName: string;
  subject: string;
  body: string;
  status: "open" | "answered";
  createdAt: Timestamp;
  reply?: SupportMessageReply;
}

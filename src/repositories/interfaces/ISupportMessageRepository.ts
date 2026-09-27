import type { SupportMessage } from "@/models/support/SupportMessage";

/** Lecture seule, scopée à une boutique — l'envoi et la réponse passent par
 * des Server Actions (`supportMessageActions.ts`), jamais par ce
 * repository. */
export interface ISupportMessageRepository {
  listForShop(shopId: string): Promise<SupportMessage[]>;
}

import { Timestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";
import type { SupportMessage } from "@/models/support/SupportMessage";
import { supportMessageRepository } from "@/repositories/SupportMessageRepository";
import type { ISupportMessageRepository } from "@/repositories/interfaces/ISupportMessageRepository";
import {
  answerSupportMessageAction,
  listSupportMessagesAction,
  sendSupportMessageAction,
  type SupportMessageDto,
} from "@/server/actions/supportMessageActions";

function fromSupportMessageDto(dto: SupportMessageDto): SupportMessage {
  return {
    ...dto,
    createdAt: Timestamp.fromDate(new Date(dto.createdAt)),
    reply: dto.reply
      ? {
          body: dto.reply.body,
          createdAt: Timestamp.fromDate(new Date(dto.reply.createdAt)),
        }
      : undefined,
  };
}

export class SupportMessageService {
  constructor(
    private readonly supportMessages: ISupportMessageRepository = supportMessageRepository
  ) {}

  /** BF-115 : le commerçant lit les messages de sa propre boutique — et
   * leur réponse, une fois écrite, sur ce même document (voir
   * `firestore.rules`). Le plus récent en premier, trié en mémoire (pas de
   * `orderBy` côté requête, voir `SupportMessageRepository`). */
  async listForShop(shopId: string): Promise<SupportMessage[]> {
    const messages = await this.supportMessages.listForShop(shopId);
    return messages.sort(
      (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  }

  /** BF-112 : revalidé côté serveur (privilège premium `contactForm`
   * compris) — voir `supportMessageActions.ts`. */
  async sendMessage(subject: string, body: string): Promise<{ id: string }> {
    return sendSupportMessageAction(await this.getCallerIdToken(), subject, body);
  }

  /** BF-113 : Super Admin uniquement. */
  async listAllMessages(): Promise<SupportMessage[]> {
    const dtos = await listSupportMessagesAction(await this.getCallerIdToken());
    return dtos.map(fromSupportMessageDto);
  }

  /** BF-114 : Super Admin uniquement. */
  async replyToMessage(messageId: string, body: string): Promise<void> {
    await answerSupportMessageAction(await this.getCallerIdToken(), messageId, body);
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const supportMessageService = new SupportMessageService();

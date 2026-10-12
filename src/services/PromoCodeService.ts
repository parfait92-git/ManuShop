import { auth } from "@/lib/firebase";
import type { PromoCode } from "@/models/promotion/PromoCode";
import { promoCodeRepository, type PromoCodeRepository } from "@/repositories/PromoCodeRepository";
import {
  checkPromoCodeAction,
  deletePromoCodeAction,
  endPromoCodeAction,
  savePromoCodeAction,
} from "@/server/actions/client/promoCodeActions";
import type { CheckedPromoCode, PromoCodeInput } from "@/server/actions/promoCodeActions";

async function idToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Vous devez être connecté.");
  return token;
}

/** Codes promo d'une boutique (BF-32, 2026-10-12). */
export class PromoCodeService {
  constructor(private readonly codes: PromoCodeRepository = promoCodeRepository) {}

  watchByShop(shopId: string, onChange: (codes: PromoCode[]) => void, onError?: () => void) {
    return this.codes.watchByShop(shopId, onChange, onError);
  }

  async save(input: PromoCodeInput): Promise<string> {
    return (await savePromoCodeAction(await idToken(), input)).id;
  }

  async end(id: string): Promise<void> {
    await endPromoCodeAction(await idToken(), id);
  }

  async remove(id: string): Promise<void> {
    await deletePromoCodeAction(await idToken(), id);
  }

  /** Vérifie un code saisi au moment de commander (aperçu de la réduction). */
  async check(shopId: string, code: string, subtotal: number): Promise<CheckedPromoCode> {
    return checkPromoCodeAction(await idToken(), { shopId, code, subtotal });
  }
}

export const promoCodeService = new PromoCodeService();

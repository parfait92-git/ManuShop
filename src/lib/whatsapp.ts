import type { Shop } from "@/models/shop/Shop";
import { cartTotal, type CartItem } from "@/store/cartStore";

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Builds a WhatsApp click-to-chat link pre-filled with the cart contents —
 * the checkout step (BF-39: "Commander via WhatsApp"), since this project
 * has no online payment/order backend yet (Module 4).
 */
export function buildWhatsAppOrderLink(
  shop: Pick<Shop, "whatsapp" | "name">,
  items: CartItem[]
): string {
  const lines = items.map(
    (item) =>
      `• ${item.name} x${item.quantity} — ${(
        item.price * item.quantity
      ).toLocaleString("fr-FR")} FCFA`
  );

  const message = [
    `Bonjour ${shop.name}, je souhaite commander :`,
    "",
    ...lines,
    "",
    `Total : ${cartTotal(items).toLocaleString("fr-FR")} FCFA`,
  ].join("\n");

  return `https://wa.me/${sanitizePhone(shop.whatsapp)}?text=${encodeURIComponent(
    message
  )}`;
}

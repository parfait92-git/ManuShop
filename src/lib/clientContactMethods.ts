import { buildWhatsAppContactLink } from "@/lib/whatsapp";
import type { ClientContactMethod, Shop } from "@/models/shop/Shop";

export const CLIENT_CONTACT_METHOD_LABELS: Record<ClientContactMethod, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const CLIENT_CONTACT_METHODS: ClientContactMethod[] = [
  "email",
  "whatsapp",
  "facebook",
  "instagram",
];

type ContactableShop = Pick<
  Shop,
  "name" | "whatsapp" | "facebookUrl" | "instagramUrl" | "publicContactEmail"
>;

/**
 * BF-105 : lien à ouvrir pour ce canal, ou `undefined` si la boutique n'a
 * pas (ou plus) renseigné la coordonnée nécessaire — un commerçant peut
 * avoir coché un canal puis vidé le champ correspondant depuis ; ce
 * composant ne doit jamais afficher de lien cassé, donc la vérification se
 * refait ici plutôt que de faire confiance à `clientContactMethods` seul.
 */
export function buildClientContactLink(
  shop: ContactableShop,
  method: ClientContactMethod
): string | undefined {
  switch (method) {
    case "email":
      return shop.publicContactEmail
        ? `mailto:${shop.publicContactEmail}`
        : undefined;
    case "whatsapp":
      return shop.whatsapp ? buildWhatsAppContactLink(shop) : undefined;
    case "facebook":
      return shop.facebookUrl || undefined;
    case "instagram":
      return shop.instagramUrl || undefined;
  }
}

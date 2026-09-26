const GRAPH_API_VERSION = "v21.0";
const DEFAULT_TEMPLATE_NAME = "new_order_notification";
const TEMPLATE_LANGUAGE = "fr";

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export interface OrderNotificationInput {
  shopWhatsapp: string;
  orderId: string;
  clientName: string;
  total: number;
}

/**
 * Alerte WhatsApp au commerçant à la création d'une commande (préférence
 * `Shop.notifyOrdersBySocial`, BF-? — voir `orderActions.ts`). Envoie un
 * message "template" plutôt qu'un texte libre : Meta l'exige pour tout
 * message business-initiated hors fenêtre de conversation de 24h. Le
 * template (variables dans l'ordre {{1}} client, {{2}} n° commande, {{3}}
 * montant) doit être créé et approuvé au préalable dans Meta Business
 * Manager — nom configurable via `WHATSAPP_ORDER_TEMPLATE_NAME`, sinon
 * "new_order_notification".
 *
 * Ne lève jamais : une notification manquée ne doit jamais faire échouer la
 * création de la commande. Silencieuse (log seulement) si les identifiants
 * Meta ne sont pas configurés — cas normal tant que le compte WhatsApp
 * Business n'est pas mis en place.
 */
export async function sendOrderNotification(
  input: OrderNotificationInput
): Promise<void> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      "[whatsappBusiness] WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID absents — notification de commande ignorée."
    );
    return;
  }

  const recipient = sanitizePhone(input.shopWhatsapp);
  if (!recipient) {
    console.warn(
      "[whatsappBusiness] Boutique sans numéro WhatsApp valide — notification ignorée."
    );
    return;
  }

  const templateName =
    process.env.WHATSAPP_ORDER_TEMPLATE_NAME || DEFAULT_TEMPLATE_NAME;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: templateName,
            language: { code: TEMPLATE_LANGUAGE },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: input.clientName },
                  { type: "text", text: input.orderId },
                  {
                    type: "text",
                    text: `${input.total.toLocaleString("fr-FR")} FCFA`,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[whatsappBusiness] Échec envoi notification (${response.status}) : ${body}`
      );
    }
  } catch (error) {
    console.error(
      "[whatsappBusiness] Erreur réseau lors de l'envoi de la notification :",
      error
    );
  }
}

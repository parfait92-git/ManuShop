import type { Timestamp } from "firebase/firestore";

import type { CurrencyCode } from "@/lib/currency";
import type { InvoiceItemInput } from "@/lib/invoice";

/**
 * Facture d'une commande livrée (BF-24→29, 2026-10-03) — collection
 * `invoices`, id = id de la commande. Émise par le serveur seulement
 * (`src/server/invoices/issueInvoice.ts`), à la livraison.
 *
 * Tout y est **figé à l'émission** (vendeur, client, articles, TVA, devise
 * et taux, couleur) : une facture émise ne change plus, même si la boutique
 * modifie ensuite ses paramètres ou ses prix.
 */
export interface Invoice {
  orderId: string;
  shopId: string;
  /** Absent pour une commande saisie à la main (client sans compte). */
  clientId?: string;
  /** Rang dans la numérotation continue de la boutique (BF-28). */
  sequence: number;
  /** Numéro affiché, ex. « F-00012 ». */
  number: string;
  issuedAt: Timestamp;
  seller: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    logo?: string;
    /** NIU (numéro d'identifiant unique du contribuable). */
    taxId?: string;
    /** RCCM (registre du commerce). */
    tradeRegister?: string;
  };
  client: { name: string; phone: string; address: string };
  /** Prix unitaires TTC, en FCFA, tels qu'au moment de la commande. */
  items: InvoiceItemInput[];
  discount: number;
  /** Montant payé, TTC, en FCFA. */
  total: number;
  /** Taux de TVA en %, 0 si la boutique n'y est pas assujettie. */
  vatRate: number;
  /** Devise d'affichage de la boutique, et sa valeur en FCFA, à l'émission. */
  currency: CurrencyCode;
  rateToXaf: number;
  /** Couleur de la facture, « #RRGGBB » : celle choisie par le commerçant
   * (`Shop.themeColor`), sinon celle du thème de la boutique à l'émission. */
  color: string;
}

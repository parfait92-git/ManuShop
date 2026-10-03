import type { Order } from "@/models/order/Order";

/**
 * Fichier clients d'une boutique, reconstitué à partir de ses commandes —
 * la seule source dont dispose le commerçant : les comptes clients
 * (`users`) ne lui sont pas lisibles (firestore.rules), et une commande
 * manuelle n'a de toute façon pas de compte. Calcul pur, sans Firestore.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Premier achat il y a moins de 30 jours. */
export const NEW_CLIENT_DAYS = 30;
/** Aucune commande depuis 90 jours. */
export const INACTIVE_CLIENT_DAYS = 90;
/** Au moins 3 commandes livrées. */
export const LOYAL_CLIENT_ORDERS = 3;

export type ClientSegment = "new" | "loyal" | "inactive";

export const CLIENT_SEGMENT_LABEL: Record<ClientSegment, string> = {
  new: "Nouveau",
  loyal: "Fidèle",
  inactive: "Inactif",
};

export interface ClientSummary {
  key: string;
  /** Nom saisi sur la commande la plus récente. */
  name: string;
  phone: string;
  address: string;
  /** Commande passée en ligne, avec un compte client. */
  hasAccount: boolean;
  ordersCount: number;
  deliveredCount: number;
  /** Total des commandes livrées (argent réellement encaissé). */
  totalSpent: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
  segments: ClientSegment[];
  /** Plus récentes d'abord. */
  orders: Order[];
}

/** Chiffres seuls : "+237 6 90 00 00 00" et "237690000000" désignent le
 * même numéro. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Même client d'une commande à l'autre : par téléphone d'abord (identifiant
 * le plus fiable, et le seul commun à une commande en ligne et à une
 * commande saisie en boutique), sinon par compte, sinon par nom.
 */
export function clientKey(order: Pick<Order, "clientPhone" | "clientId" | "clientName">): string {
  const phone = normalizePhone(order.clientPhone ?? "");
  if (phone.length >= 6) return `tel:${phone}`;
  if (order.clientId) return `compte:${order.clientId}`;
  return `nom:${order.clientName.trim().toLowerCase()}`;
}

export function buildClientDirectory(orders: Order[], now: Date = new Date()): ClientSummary[] {
  const groups = new Map<string, Order[]>();
  for (const order of orders) {
    const key = clientKey(order);
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }

  return [...groups.entries()].map(([key, clientOrders]) => {
    const sorted = [...clientOrders].sort(
      (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
    );
    const latest = sorted[0];
    const delivered = sorted.filter((o) => o.status === "delivered");
    const firstOrderAt = sorted[sorted.length - 1].createdAt.toDate();
    const lastOrderAt = latest.createdAt.toDate();

    const segments: ClientSegment[] = [];
    if (now.getTime() - firstOrderAt.getTime() < NEW_CLIENT_DAYS * DAY_MS) segments.push("new");
    if (delivered.length >= LOYAL_CLIENT_ORDERS) segments.push("loyal");
    if (now.getTime() - lastOrderAt.getTime() >= INACTIVE_CLIENT_DAYS * DAY_MS) {
      segments.push("inactive");
    }

    return {
      key,
      name: latest.clientName,
      // Coordonnées les plus récentes non vides.
      phone: sorted.find((o) => o.clientPhone)?.clientPhone ?? "",
      address: sorted.find((o) => o.clientAddress)?.clientAddress ?? "",
      hasAccount: sorted.some((o) => !!o.clientId),
      ordersCount: sorted.length,
      deliveredCount: delivered.length,
      totalSpent: delivered.reduce((sum, o) => sum + o.total, 0),
      firstOrderAt,
      lastOrderAt,
      segments,
      orders: sorted,
    };
  });
}

export type ClientSort = "recent" | "spent" | "orders" | "name";

export function sortClients(clients: ClientSummary[], sort: ClientSort): ClientSummary[] {
  const sorted = [...clients];
  switch (sort) {
    case "spent":
      return sorted.sort((a, b) => b.totalSpent - a.totalSpent);
    case "orders":
      return sorted.sort((a, b) => b.ordersCount - a.ordersCount);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    default:
      return sorted.sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
  }
}

/** Recherche sur le nom ou le numéro (chiffres seuls). */
export function matchesClient(client: ClientSummary, term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  const digits = normalizePhone(query);
  return (
    client.name.toLowerCase().includes(query) ||
    (digits.length > 0 && normalizePhone(client.phone).includes(digits))
  );
}

/** Lien WhatsApp vers le client, ou `null` sans numéro exploitable. */
export function clientWhatsAppLink(phone: string): string | null {
  const digits = normalizePhone(phone);
  return digits.length >= 6 ? `https://wa.me/${digits}` : null;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Export CSV pour un tableur. Point-virgule comme séparateur et BOM UTF-8 :
 * c'est ce qu'Excel en français attend pour ouvrir le fichier directement,
 * accents compris.
 */
export function clientsToCsv(clients: ClientSummary[]): string {
  const date = (d: Date) => d.toISOString().slice(0, 10);
  const header = [
    "Nom",
    "Téléphone",
    "Adresse",
    "Commandes",
    "Commandes livrées",
    "Total dépensé (FCFA)",
    "Première commande",
    "Dernière commande",
    "Repères",
  ];
  const rows = clients.map((c) => [
    c.name,
    c.phone,
    c.address,
    c.ordersCount,
    c.deliveredCount,
    c.totalSpent,
    date(c.firstOrderAt),
    date(c.lastOrderAt),
    c.segments.map((s) => CLIENT_SEGMENT_LABEL[s]).join(", "),
  ]);
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

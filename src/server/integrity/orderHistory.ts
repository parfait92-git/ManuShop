import "server-only";

import type { Firestore, Transaction, WriteBatch } from "firebase-admin/firestore";

import type { OrderStatus } from "@/models/order/OrderStatus";
import {
  canonicalJson,
  checkSignature,
  sha256Hex,
  signText,
  type SignatureCheck,
} from "@/server/integrity/signing";

/** Sous-collection `orders/{orderId}/history`, écrite par le serveur seul
 * (aucune règle ne l'ouvre au navigateur). */
export const HISTORY_SUBCOLLECTION = "history";

/** Point de départ de la chaîne : la « précédente » du premier événement. */
export const GENESIS_HASH = "0".repeat(64);

/** Ce qu'enregistre un événement, et que couvrent son empreinte et sa
 * signature. */
export type HistoryFact =
  | { type: "status"; status: OrderStatus }
  | { type: "invoice"; number: string };

export interface HistoryEvent {
  seq: number;
  /** Heure du serveur, en millisecondes : un nombre exact, que l'empreinte
   * peut couvrir (un horodatage Firestore « serveur » n'est connu qu'après
   * l'écriture). */
  atMs: number;
  fact: HistoryFact;
  /** Empreinte de l'événement précédent (`GENESIS_HASH` pour le premier). */
  prevHash: string;
  /** SHA-256 de `{orderId, seq, atMs, fact, prevHash}` en JSON canonique. */
  hash: string;
  signature?: string;
  keyId?: string;
}

/** Tête de la chaîne, gardée sur la commande : sans elle, supprimer les
 * derniers événements passerait inaperçu. */
export interface HistoryHead {
  historySeq?: number;
  historyHash?: string;
}

function eventHash(orderId: string, event: Omit<HistoryEvent, "hash" | "signature" | "keyId">): string {
  return sha256Hex(
    canonicalJson({ orderId, seq: event.seq, atMs: event.atMs, fact: event.fact, prevHash: event.prevHash })
  );
}

/** Événement suivant de la chaîne, signé si la clé est configurée. */
export function nextHistoryEvent(
  orderId: string,
  head: HistoryHead,
  fact: HistoryFact,
  now: Date = new Date()
): HistoryEvent {
  const base = {
    seq: (head.historySeq ?? 0) + 1,
    atMs: now.getTime(),
    fact,
    prevHash: head.historyHash ?? GENESIS_HASH,
  };
  const hash = eventHash(orderId, base);
  const signed = signText(hash);
  return { ...base, hash, ...(signed ? { signature: signed.signature, keyId: signed.keyId } : {}) };
}

function historyDocId(seq: number): string {
  // Zéros à gauche : l'ordre alphabétique des documents suit l'ordre réel.
  return String(seq).padStart(6, "0");
}

/**
 * Ajoute l'événement à un lot ou une transaction, avec la nouvelle tête
 * sur la commande. `create` : si deux mises à jour partent de la même tête
 * en même temps, la seconde échoue entière au lieu de fourcher la chaîne.
 */
export function appendHistoryEvent(
  db: Firestore,
  writer: WriteBatch | Transaction,
  orderId: string,
  event: HistoryEvent
): Record<string, unknown> {
  const orderRef = db.collection("orders").doc(orderId);
  writer.create(orderRef.collection(HISTORY_SUBCOLLECTION).doc(historyDocId(event.seq)), event);
  // Champs de tête à fusionner dans la mise à jour de la commande.
  return { historySeq: event.seq, historyHash: event.hash };
}

export interface HistoryCheck {
  /** Chaîne complète, empreintes justes, tête de la commande atteinte. */
  intact: boolean;
  /** Pire état de signature rencontré (`valid` si toutes le sont). */
  signatures: SignatureCheck | "none";
  /** Événements lus, dans l'ordre. */
  events: HistoryEvent[];
}

const SIGNATURE_SEVERITY: SignatureCheck[] = ["valid", "other_key", "no_key", "unsigned", "invalid"];

/** Revérifie toute la chaîne d'une commande : numérotation continue,
 * chaque empreinte recalculée et reliée à la précédente, dernière égale à
 * la tête enregistrée sur la commande, et chaque signature. */
export function checkHistory(orderId: string, head: HistoryHead, events: HistoryEvent[]): HistoryCheck {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  let intact = (head.historySeq ?? 0) === sorted.length;
  let prevHash = GENESIS_HASH;
  let worst: SignatureCheck | "none" = sorted.length ? "valid" : "none";

  sorted.forEach((event, index) => {
    if (event.seq !== index + 1 || event.prevHash !== prevHash) intact = false;
    if (eventHash(orderId, event) !== event.hash) intact = false;
    prevHash = event.hash;
    const check = checkSignature(event.hash, event);
    if (worst !== "none" && SIGNATURE_SEVERITY.indexOf(check) > SIGNATURE_SEVERITY.indexOf(worst)) {
      worst = check;
    }
  });
  if (sorted.length && head.historyHash !== prevHash) intact = false;

  return { intact, signatures: worst, events: sorted };
}

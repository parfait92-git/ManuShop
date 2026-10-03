"use server";

import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { STOCK_MOVEMENTS_COLLECTION, queueStockMovement } from "@/server/stock/stockMovements";

/** Borne haute d'une saisie, contre une faute de frappe (un zéro de trop). */
const MAX_QUANTITY = 1_000_000;
const MAX_NOTE_LENGTH = 300;

interface TeamMember {
  uid: string;
  role: "admin" | "seller";
  shopId: string;
  name: string;
}

/** Gérant ou vendeur d'une boutique : ceux qui gèrent son stock. */
async function requireTeamMember(db: Firestore, idToken: string): Promise<TeamMember> {
  const caller = await requireCaller(idToken);
  const user = (await db.collection("users").doc(caller.uid).get()).data();
  if (!user || !["admin", "seller"].includes(user.role) || !user.shopId) {
    throw new ForbiddenError();
  }
  return {
    uid: caller.uid,
    role: user.role,
    shopId: user.shopId,
    name: (user.displayName as string | undefined) || (user.email as string | undefined) || "Équipe",
  };
}

/** Relit le produit dans la transaction : il doit être de la boutique de
 * l'appelant, et hors de la corbeille. */
async function readProduct(
  db: Firestore,
  transaction: Transaction,
  productId: string,
  member: TeamMember
): Promise<{ name: string; stock: number }> {
  const snapshot = await transaction.get(db.collection("products").doc(productId));
  const product = snapshot.data();
  if (!snapshot.exists || !product || product.shopId !== member.shopId) {
    throw new NotFoundError("Produit introuvable.");
  }
  if (product.deletedAt) {
    throw new ValidationError("Ce produit est dans la corbeille : restaurez-le d'abord.");
  }
  return {
    name: String(product.name ?? ""),
    stock: typeof product.stock === "number" ? product.stock : 0,
  };
}

function cleanNote(note: string | undefined): string | undefined {
  const text = note?.trim();
  if (text && text.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`La note ne doit pas dépasser ${MAX_NOTE_LENGTH} caractères.`);
  }
  return text || undefined;
}

function isWholeNumber(value: unknown, min: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= MAX_QUANTITY;
}

export interface RestockInput {
  productId: string;
  /** Unités reçues. */
  quantity: number;
  /** Fournisseur, numéro de bon de livraison… */
  note?: string;
  /** Nouveau prix d'achat unitaire (gérant seulement) ; remplace l'ancien
   * pour les prochaines ventes. */
  purchasePrice?: number;
}

/**
 * Réapprovisionnement (BF-16, 2026-10-03) : ajoute les unités reçues au
 * stock et l'inscrit dans l'historique, dans une seule transaction.
 */
export async function restockProductAction(
  idToken: string,
  input: RestockInput
): Promise<{ stockAfter: number }> {
  const db = getAdminDb();
  const member = await requireTeamMember(db, idToken);
  if (!isWholeNumber(input.quantity, 1)) {
    throw new ValidationError("Indiquez un nombre entier d'unités reçues (au moins 1).");
  }
  if (input.purchasePrice !== undefined) {
    // Les prix d'achat restent réservés au gérant (comme `productCosts`).
    if (member.role !== "admin") throw new ForbiddenError();
    if (typeof input.purchasePrice !== "number" || !Number.isFinite(input.purchasePrice) || input.purchasePrice < 0) {
      throw new ValidationError("Le prix d'achat doit être un montant positif.");
    }
  }
  const note = cleanNote(input.note);

  return db.runTransaction(async (transaction) => {
    const product = await readProduct(db, transaction, input.productId, member);
    const stockAfter = product.stock + input.quantity;

    transaction.update(db.collection("products").doc(input.productId), {
      stock: stockAfter,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (input.purchasePrice !== undefined) {
      transaction.set(db.collection("productCosts").doc(input.productId), {
        shopId: member.shopId,
        purchasePrice: input.purchasePrice,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    queueStockMovement(db, transaction, {
      shopId: member.shopId,
      productId: input.productId,
      productName: product.name,
      type: "restock",
      quantity: input.quantity,
      stockAfter,
      note,
      actorId: member.uid,
      actorName: member.name,
    });
    return { stockAfter };
  });
}

export interface AdjustStockInput {
  productId: string;
  /** Quantité réellement comptée en rayon ou en réserve. */
  countedStock: number;
  /** Motif obligatoire : casse, perte, erreur de saisie… */
  note: string;
}

/**
 * Correction d'inventaire (2026-10-03) : remet le stock au chiffre compté.
 * L'écart (positif ou négatif) et son motif restent dans l'historique.
 */
export async function adjustStockAction(
  idToken: string,
  input: AdjustStockInput
): Promise<{ stockAfter: number }> {
  const db = getAdminDb();
  const member = await requireTeamMember(db, idToken);
  if (!isWholeNumber(input.countedStock, 0)) {
    throw new ValidationError("Indiquez le nombre entier d'unités comptées (0 ou plus).");
  }
  const note = cleanNote(input.note);
  if (!note) throw new ValidationError("Le motif de la correction est obligatoire.");

  return db.runTransaction(async (transaction) => {
    const product = await readProduct(db, transaction, input.productId, member);
    const quantity = input.countedStock - product.stock;
    if (quantity === 0) {
      throw new ValidationError(`Le stock est déjà de ${product.stock} : rien à corriger.`);
    }

    transaction.update(db.collection("products").doc(input.productId), {
      stock: input.countedStock,
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueStockMovement(db, transaction, {
      shopId: member.shopId,
      productId: input.productId,
      productName: product.name,
      type: "adjustment",
      quantity,
      stockAfter: input.countedStock,
      note,
      actorId: member.uid,
      actorName: member.name,
    });
    return { stockAfter: input.countedStock };
  });
}

/**
 * Premier maillon de l'historique d'un produit qui vient d'être créé : son
 * stock de départ. Sans effet si le produit a déjà un historique.
 */
export async function recordInitialStockAction(idToken: string, productId: string): Promise<void> {
  const db = getAdminDb();
  const member = await requireTeamMember(db, idToken);

  await db.runTransaction(async (transaction) => {
    const product = await readProduct(db, transaction, productId, member);
    const existing = await transaction.get(
      db
        .collection(STOCK_MOVEMENTS_COLLECTION)
        .where("shopId", "==", member.shopId)
        .where("productId", "==", productId)
        .limit(1)
    );
    if (!existing.empty) return;

    queueStockMovement(db, transaction, {
      shopId: member.shopId,
      productId,
      productName: product.name,
      type: "initial",
      quantity: product.stock,
      stockAfter: product.stock,
      actorId: member.uid,
      actorName: member.name,
    });
  });
}

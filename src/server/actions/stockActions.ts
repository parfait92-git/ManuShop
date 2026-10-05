"use server";

import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { hasVariants, lineName, listVariants, totalVariantStock } from "@/lib/variants";
import type { ProductVariant } from "@/models/product/ProductVariant";
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
): Promise<{ name: string; stock: number; variants?: Record<string, ProductVariant> }> {
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
    variants: product.variants as Record<string, ProductVariant> | undefined,
  };
}

/**
 * Stock visé par un mouvement : celui d'une version (obligatoire pour un
 * produit qui en a), sinon celui du produit.
 */
function target(product: { name: string; stock: number; variants?: Record<string, ProductVariant> }, variantId?: string) {
  if (hasVariants(product)) {
    const variant = variantId ? product.variants![variantId] : undefined;
    if (!variant) throw new ValidationError("Choisissez la version concernée.");
    return { variantId, variant, stock: variant.stock, name: lineName(product.name, variant.label) };
  }
  if (variantId) throw new ValidationError("Ce produit n'existe pas en plusieurs versions.");
  return { variantId: undefined, variant: undefined, stock: product.stock, name: product.name };
}

/** Écriture du nouveau stock : total du produit, et version s'il y a lieu. */
function stockUpdate(productStock: number, delta: number, variantId: string | undefined) {
  return {
    stock: productStock + delta,
    ...(variantId ? { [`variants.${variantId}.stock`]: FieldValue.increment(delta) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
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
  /** Version réapprovisionnée (BF-17), pour un produit qui en a. */
  variantId?: string;
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
    const t = target(product, input.variantId);
    const stockAfter = t.stock + input.quantity;

    transaction.update(db.collection("products").doc(input.productId), stockUpdate(product.stock, input.quantity, t.variantId));
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
      productName: t.name,
      ...(t.variant ? { variantId: t.variantId, variantLabel: t.variant.label } : {}),
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
  /** Version recomptée (BF-17), pour un produit qui en a. */
  variantId?: string;
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
    const t = target(product, input.variantId);
    const quantity = input.countedStock - t.stock;
    if (quantity === 0) {
      throw new ValidationError(`Le stock est déjà de ${t.stock} : rien à corriger.`);
    }

    transaction.update(db.collection("products").doc(input.productId), stockUpdate(product.stock, quantity, t.variantId));
    queueStockMovement(db, transaction, {
      shopId: member.shopId,
      productId: input.productId,
      productName: t.name,
      ...(t.variant ? { variantId: t.variantId, variantLabel: t.variant.label } : {}),
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

    // Un mouvement par version, ou un seul pour le produit.
    const lines = hasVariants(product)
      ? listVariants(product).map((v) => ({ variantId: v.id, variantLabel: v.label, name: lineName(product.name, v.label), stock: v.stock }))
      : [{ variantId: undefined, variantLabel: undefined, name: product.name, stock: product.stock }];
    for (const line of lines) {
      queueStockMovement(db, transaction, {
        shopId: member.shopId,
        productId,
        productName: line.name,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        type: "initial",
        quantity: line.stock,
        stockAfter: line.stock,
        actorId: member.uid,
        actorName: member.name,
      });
    }
  });
}

export interface VariantDraft {
  /** Version existante ; absent : nouvelle version. */
  id?: string;
  label: string;
  /** Prix propre (FCFA) ; absent : prix du produit. */
  price?: number;
  /** Stock de départ d'une nouvelle version (ignoré pour une existante :
   * son stock se change par réapprovisionnement ou correction). */
  stock?: number;
}

const MAX_VARIANTS = 30;
const MAX_LABEL_LENGTH = 60;

/**
 * Versions d'un produit existant (BF-17, 2026-10-04) : ajout, libellé,
 * prix, ordre, retrait. Par le serveur seulement (les règles Firestore
 * interdisent de toucher `variants` depuis le navigateur), pour que le
 * stock reste juste et tracé :
 * - une version existante garde son stock ;
 * - une nouvelle version entre avec son stock de départ (« Stock initial ») ;
 * - une version ne peut être retirée qu'à stock nul ;
 * - passer d'un stock unique à des versions répartit le stock : l'ancien
 *   stock sort (« Correction d'inventaire »), chaque version entre avec le
 *   sien.
 */
export async function saveProductVariantsAction(
  idToken: string,
  input: { productId: string; variantName: string; variants: VariantDraft[] }
): Promise<void> {
  const db = getAdminDb();
  const member = await requireTeamMember(db, idToken);
  const variantName = input.variantName.trim();
  if (input.variants.length > MAX_VARIANTS) {
    throw new ValidationError(`${MAX_VARIANTS} versions au plus.`);
  }
  if (input.variants.length > 0 && !variantName) {
    throw new ValidationError("Indiquez ce qui distingue les versions (ex. Contenance, Taille).");
  }
  const labels = input.variants.map((v) => v.label.trim());
  if (labels.some((l) => !l || l.length > MAX_LABEL_LENGTH)) {
    throw new ValidationError(`Chaque version a un nom (${MAX_LABEL_LENGTH} caractères au plus).`);
  }
  if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) {
    throw new ValidationError("Deux versions portent le même nom.");
  }
  for (const v of input.variants) {
    if (v.price !== undefined && (typeof v.price !== "number" || !Number.isFinite(v.price) || v.price <= 0)) {
      throw new ValidationError(`Le prix de « ${v.label.trim()} » doit être un montant positif.`);
    }
    if (!v.id && v.stock !== undefined && !isWholeNumber(v.stock, 0)) {
      throw new ValidationError(`Le stock de départ de « ${v.label.trim()} » doit être un nombre entier.`);
    }
  }

  await db.runTransaction(async (transaction) => {
    const product = await readProduct(db, transaction, input.productId, member);
    const before = product.variants ?? {};
    const kept = new Set(input.variants.flatMap((v) => (v.id ? [v.id] : [])));
    for (const id of kept) {
      if (!before[id]) throw new ValidationError("Une version a été supprimée entre-temps : rechargez la page.");
    }
    for (const [id, variant] of Object.entries(before)) {
      if (!kept.has(id) && variant.stock !== 0) {
        throw new ValidationError(
          `« ${variant.label} » a encore ${variant.stock} en stock : corrigez son stock à 0 avant de la retirer.`
        );
      }
    }

    const next: Record<string, ProductVariant> = {};
    const added: { id: string; label: string; stock: number }[] = [];
    input.variants.forEach((draft, position) => {
      const id = draft.id ?? db.collection("products").doc().id;
      const stock = draft.id ? before[draft.id].stock : (draft.stock ?? 0);
      next[id] = {
        label: draft.label.trim(),
        stock,
        position,
        ...(draft.price !== undefined ? { price: draft.price } : {}),
      };
      if (!draft.id) added.push({ id, label: draft.label.trim(), stock });
    });

    const wasSingle = !hasVariants(product);
    const total = input.variants.length > 0 ? totalVariantStock(next) : wasSingle ? product.stock : 0;
    transaction.update(db.collection("products").doc(input.productId), {
      variants: input.variants.length > 0 ? next : FieldValue.delete(),
      variantName: input.variants.length > 0 ? variantName : FieldValue.delete(),
      stock: total,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const actor = { actorId: member.uid, actorName: member.name };
    if (wasSingle && input.variants.length > 0 && product.stock !== 0) {
      queueStockMovement(db, transaction, {
        shopId: member.shopId,
        productId: input.productId,
        productName: product.name,
        type: "adjustment",
        quantity: -product.stock,
        stockAfter: 0,
        note: "Stock réparti entre les versions",
        ...actor,
      });
    }
    for (const v of added) {
      queueStockMovement(db, transaction, {
        shopId: member.shopId,
        productId: input.productId,
        productName: lineName(product.name, v.label),
        variantId: v.id,
        variantLabel: v.label,
        type: "initial",
        quantity: v.stock,
        stockAfter: v.stock,
        ...actor,
      });
    }
  });
}

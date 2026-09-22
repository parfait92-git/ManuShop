import type { ProductFormValues } from "@/lib/validation/product";

const DRAFT_KEY = "manushop:product-draft";

export interface ProductDraft {
  values: ProductFormValues;
  images: string[];
}

/** Brouillon du formulaire "Nouveau produit", écrit uniquement quand
 * l'utilisateur choisit explicitement "Sauvegarder" en quittant la page —
 * pas un autosave continu. `localStorage` peut être indisponible (navigation
 * privée, quota plein) : on échoue silencieusement, ce n'est jamais bloquant. */
export function loadProductDraft(): ProductDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ProductDraft) : null;
  } catch {
    return null;
  }
}

export function saveProductDraft(draft: ProductDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignoré : le brouillon est un confort, pas une garantie.
  }
}

export function clearProductDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // idem
  }
}

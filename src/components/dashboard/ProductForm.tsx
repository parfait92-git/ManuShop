"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProductImageUploader } from "@/components/dashboard/ProductImageUploader";
import { StockDialog } from "@/components/dashboard/StockDialog";
import {
  VariantsEditor,
  toDrafts,
  toVariantMap,
  totalRowsStock,
  validateVariants,
  variantsStateFrom,
  type VariantsState,
} from "@/components/dashboard/VariantsEditor";
import { useAuth } from "@/components/providers/AuthProvider";
import { useNavigationBlocker } from "@/components/providers/NavigationBlockerProvider";
import {
  ProductSchema,
  type ProductFormValues,
  type ProductInput,
} from "@/lib/validation/product";
import {
  clearProductDraft,
  loadProductDraft,
  saveProductDraft,
} from "@/lib/productDraft";
import { isPromoExpired, promoEndsAt } from "@/lib/promo";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { costService } from "@/services/CostService";
import { productService } from "@/services/ProductService";
import { stockService } from "@/services/StockService";
import { useMoney } from "@/hooks/useMoney";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { useI18n } from "@/i18n/I18nProvider";
import { BASE_CURRENCY } from "@/lib/currency";
import { formatDateTime } from "@/lib/dateTime";

function toDateInputValue(timestamp?: Timestamp): string {
  if (!timestamp) return "";
  return timestamp.toDate().toISOString().slice(0, 10);
}

export function ProductForm({
  shopId,
  categories,
  product,
}: {
  shopId: string;
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const { guard } = useNavigationBlocker();
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  // Photo obligatoire à la création. En édition, seulement si le produit en
  // avait déjà une : un ancien produit sans photo (créé avant cette règle)
  // reste modifiable — il est signalé par `ProductList` jusqu'à correction —
  // mais on ne peut plus retirer la dernière photo d'un produit qui en a.
  const imagesRequired = !product || product.images.length > 0;
  const [imagesSubmitted, setImagesSubmitted] = useState(false);
  const showImagesError = imagesSubmitted && imagesRequired && images.length === 0;
  const photosRef = useRef<HTMLDivElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    resetField,
    setValue,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
          stockThreshold: product.stockThreshold,
          isPromo: product.isPromo,
          promoPrice: product.promoPrice,
          promoEndDate: toDateInputValue(product.promoEnd),
          // Chargé à part (`productCosts`), voir l'effet plus bas.
          purchasePrice: "",
        }
      : {
          isPromo: false,
        },
  });

  const isPromo = useWatch({ control, name: "isPromo" });
  const priceValue = useWatch({ control, name: "price" });
  // Prix saisis en FCFA ; aperçu de ce que voient les clients d'une
  // boutique dans une autre devise.
  const clientCurrency = useShopCurrency(shopId);
  const clientMoney = useMoney(clientCurrency);
  const { t } = useI18n();
  const purchasePriceValue = useWatch({ control, name: "purchasePrice" });

  // Prix d'achat et marge : réservés au gérant (choix de l'utilisateur,
  // 2026-10-02) — un vendeur crée toujours des produits, sans ce champ.
  const { profile } = useAuth();
  const isOwner = profile?.role === "admin";

  // Stock d'un produit existant : lecture seule ici, modifié par la fenêtre
  // Stock (réapprovisionnement, correction), qui le trace dans l'historique.
  const [currentStock, setCurrentStock] = useState(product?.stock ?? 0);
  const [stockOpen, setStockOpen] = useState(false);

  // Versions (BF-17), hors de react-hook-form comme les photos.
  const [variants, setVariants] = useState<VariantsState>(() => variantsStateFrom(product));
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const variantsTouched = useRef(false);
  const variantsRef = useRef<HTMLDivElement>(null);
  function handleVariantsChange(next: VariantsState) {
    variantsTouched.current = true;
    setVariants(next);
    setVariantsError(null);
    // À la création, le stock du produit est le total des versions.
    if (!product && next.enabled) setValue("stock", totalRowsStock(next), { shouldValidate: true });
  }

  // Le prix d'achat vit à part du produit (`productCosts`, privé) : chargé
  // séparément à l'ouverture d'un produit existant.
  useEffect(() => {
    if (!product || !isOwner) return;
    let active = true;
    costService
      .getPurchasePrice(product.id)
      .then((purchasePrice) => {
        // Valeur de référence, pas simple valeur : le champ ne devient
        // "modifié" (et n'est réenregistré) que si le gérant change ce prix.
        if (active && purchasePrice !== undefined) {
          resetField("purchasePrice", { defaultValue: String(purchasePrice) });
        }
      })
      // Échec de lecture : champ laissé vide. Sans danger, voir `onSubmit`
      // (un prix d'achat n'est réécrit que si le champ a été modifié).
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [product, isOwner, resetField]);

  const marginPreview = (() => {
    const sale = Number(priceValue);
    const cost = Number(purchasePriceValue);
    if (purchasePriceValue === undefined || purchasePriceValue === "" || !sale || Number.isNaN(cost)) {
      return null;
    }
    return { amount: sale - cost, rate: (sale - cost) / sale };
  })();

  // Brouillon local : uniquement pour la création (BF-06), jamais mélangé à
  // une édition de produit existant. Restauré au montage plutôt que via
  // `defaultValues` pour éviter tout aller-retour serveur/client sur
  // `window.localStorage`.
  useEffect(() => {
    if (product) return;
    const draft = loadProductDraft();
    if (!draft) return;
    queueMicrotask(() => {
      reset(draft.values);
      setImages(draft.images);
      setDraftRestored(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enregistre l'état "modifications non sauvegardées" auprès du garde de
  // navigation de la sidebar, avec ce qu'il faut faire si l'utilisateur
  // choisit de sauvegarder ou d'abandonner en quittant la page.
  useEffect(() => {
    if (product) return;
    guard(isDirty || images.length > 0, {
      onSave: () => saveProductDraft({ values: getValues(), images }),
      onDiscard: () => clearProductDraft(),
    });
  }, [product, isDirty, images, guard, getValues]);

  useEffect(() => {
    if (product) return;
    return () => guard(false, { onSave: () => {}, onDiscard: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    if (!draftSaved) return;
    const timeout = setTimeout(() => setDraftSaved(false), 4000);
    return () => clearTimeout(timeout);
  }, [draftSaved]);

  function handleSaveDraft() {
    saveProductDraft({ values: getValues(), images });
    setDraftSaved(true);
  }

  // Seules les catégories actives peuvent être choisies pour un nouveau
  // produit — sauf celle déjà assignée au produit en cours d'édition, pour
  // ne pas la faire disparaître silencieusement si elle a été masquée
  // depuis.
  const availableCategories = categories.filter(
    (cat) => (cat.isActive ?? true) || cat.name === product?.category
  );

  async function onSubmit(data: ProductInput) {
    setFormError(null);
    const variantsProblem = validateVariants(variants);
    if (variantsProblem) {
      setVariantsError(variantsProblem);
      variantsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      const promoFields = data.isPromo
        ? {
            isPromo: true as const,
            promoPrice: data.promoPrice,
            ...(data.promoEndDate
              ? { promoEnd: Timestamp.fromDate(new Date(data.promoEndDate)) }
              : {}),
          }
        : { isPromo: false as const };

      let savedId: string;
      if (product) {
        savedId = product.id;
        // Versions d'abord (par le serveur, qui garde le stock juste) : un
        // refus (« a encore 2 en stock ») laisse le formulaire ouvert.
        if (variantsTouched.current) {
          try {
            await stockService.saveVariants(product.id, variants.name, toDrafts(variants));
          } catch (err) {
            setVariantsError(err instanceof Error && err.message ? err.message : "Les versions n'ont pas pu être enregistrées.");
            variantsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            return;
          }
        }
        await productService.updateProduct(product.id, {
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          stockThreshold: data.stockThreshold,
          images,
          ...promoFields,
        });
      } else {
        const created = await productService.createProduct({
          shopId,
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          stock: variants.enabled ? totalRowsStock(variants) : data.stock,
          ...(variants.enabled
            ? {
                variants: toVariantMap(variants, () => Math.random().toString(36).slice(2, 10)),
                variantName: variants.name.trim(),
              }
            : {}),
          stockThreshold: data.stockThreshold,
          images,
          // Non publié par défaut : un nouveau produit part masqué le temps
          // que le commerçant vérifie ses photos/prix, plutôt que d'être
          // immédiatement visible aux clients (BF-90, `ProductList` permet
          // de le publier ensuite d'un clic).
          isPublished: false,
          ...promoFields,
        });
        savedId = created.id;
        clearProductDraft();
        // Premier maillon de l'historique du stock. Un échec n'empêche pas
        // la création : le produit est enregistré, seul ce point manque.
        await stockService.recordInitialStock(created.id).catch((err) => {
          console.error("ProductForm : stock initial non inscrit dans l'historique", err);
        });
      }

      // En modification, seulement si le champ a été touché : un prix
      // d'achat qui n'a pas pu être chargé (champ resté vide) serait sinon
      // effacé par n'importe quelle autre modification du produit.
      if (isOwner && (!product || dirtyFields.purchasePrice)) {
        // Produit déjà enregistré à ce stade : un échec ici ne doit pas
        // afficher l'erreur générique (un nouvel essai recréerait le
        // produit en double).
        try {
          await costService.savePurchasePrice(savedId, shopId, data.purchasePrice);
        } catch {
          toast.error(
            "Produit enregistré, mais pas son prix d'achat. Réessayez depuis la fiche du produit."
          );
        }
      }

      router.push("/dashboard/products");
    } catch {
      setFormError("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  // Les photos vivent hors de react-hook-form (`ProductImageUploader`) :
  // vérifiées ici, en même temps que la validation Zod des autres champs,
  // pour que toutes les erreurs s'affichent d'un coup.
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    const missingImages = imagesRequired && images.length === 0;
    setImagesSubmitted(true);
    return handleSubmit((data) => {
      if (missingImages) {
        photosRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
      return onSubmit(data);
    })(event);
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className="flex w-full max-w-lg flex-col gap-4"
      noValidate
    >
      {draftRestored && (
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
          Brouillon restauré — reprenez là où vous vous étiez arrêté(e).
        </p>
      )}

      <div data-tour="product-name" className="flex flex-col gap-1.5">
        <Label htmlFor="name" help="Le nom affiché à vos clients sur la boutique. Soyez précis (marque, modèle, taille) : c'est aussi ce qui permet de le retrouver par la recherche.">Nom du produit</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" help="Les détails utiles à l'achat : matière, dimensions, utilisation, contenu… Une bonne description évite bien des questions.">Description</Label>
        <textarea
          id="description"
          rows={3}
          aria-invalid={!!errors.description}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price" help="Le prix de vente en FCFA, tel qu'il sera affiché à vos clients.">Prix (FCFA)</Label>
          <Input
            id="price"
            type="number"
            step="1"
            min="0"
            aria-invalid={!!errors.price}
            {...register("price")}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
          {clientCurrency !== BASE_CURRENCY && Number(priceValue) > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("currency.clientPreview", { amount: clientMoney(Number(priceValue)) })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category" help="Le rayon de votre boutique où ranger ce produit. Les catégories se créent dans le menu Catégories.">Catégorie</Label>
          <Select
            id="category"
            aria-invalid={!!errors.category}
            {...register("category")}
          >
            <option value="">Sélectionner...</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      {isOwner && (
        <div data-tour="product-purchase-price" className="flex flex-col gap-1.5">
          <Label
            htmlFor="purchasePrice"
            help="Ce que vous a coûté une unité de ce produit (achat, transport…). Visible de vous seul, jamais des clients ni de vos vendeurs. Il sert à calculer vos gains dans Statistiques et la valeur de votre stock."
          >
            Prix d&apos;achat (FCFA)
          </Label>
          <Input
            id="purchasePrice"
            type="number"
            step="1"
            min="0"
            placeholder="Facultatif"
            aria-invalid={!!errors.purchasePrice}
            aria-describedby="purchasePrice-margin"
            {...register("purchasePrice")}
          />
          {errors.purchasePrice && (
            <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>
          )}
          {marginPreview && (
            <p
              id="purchasePrice-margin"
              className={`text-sm ${marginPreview.amount < 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {marginPreview.amount < 0
                ? `Attention : vente à perte de ${Math.abs(marginPreview.amount).toLocaleString("fr-FR")} FCFA par unité.`
                : `Marge par unité : ${marginPreview.amount.toLocaleString("fr-FR")} FCFA (${Math.round(marginPreview.rate * 100)} % du prix de vente).`}
            </p>
          )}
        </div>
      )}

      <div data-tour="product-stock" className="grid grid-cols-2 gap-4">
        {product ? (
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="stock"
              help="La quantité disponible à la vente. Elle diminue à chaque commande. Pour la changer, utilisez « Gérer le stock » : chaque réapprovisionnement ou correction est gardé dans l'historique."
            >
              Stock
            </Label>
            <Input id="stock" value={currentStock} readOnly aria-readonly className="bg-muted" />
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setStockOpen(true)}>
              Gérer le stock
            </Button>
            <StockDialog
              product={stockOpen ? { ...product, stock: currentStock } : null}
              onClose={() => setStockOpen(false)}
              onStockChange={(_, stock, variantStocks) => {
                setCurrentStock(stock);
                if (variantStocks)
                  setVariants((current) => ({
                    ...current,
                    rows: current.rows.map((row) =>
                      row.id && variantStocks[row.id] !== undefined ? { ...row, stock: String(variantStocks[row.id]) } : row
                    ),
                  }));
              }}
            />
          </div>
        ) : variants.enabled ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock" help="Avec des versions, le stock du produit est le total de leurs stocks, saisis ci-dessous.">
              Stock total
            </Label>
            <Input id="stock" value={totalRowsStock(variants)} readOnly aria-readonly className="bg-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock" help="La quantité disponible au départ. Elle diminue ensuite à chaque commande ; à 0, le produit apparaît en rupture.">Stock initial</Label>
            <Input
              id="stock"
              type="number"
              step="1"
              min="0"
              aria-invalid={!!errors.stock}
              {...register("stock")}
            />
            {errors.stock && (
              <p className="text-sm text-destructive">{errors.stock.message}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockThreshold" help="Quand le stock descend à ce nombre ou en dessous, le produit est signalé « Stock faible » pour vous rappeler de le réapprovisionner. Avec des versions, il s'applique à chacune.">Seuil d&apos;alerte</Label>
          <Input
            id="stockThreshold"
            type="number"
            step="1"
            min="0"
            aria-invalid={!!errors.stockThreshold}
            {...register("stockThreshold")}
          />
          {errors.stockThreshold && (
            <p className="text-sm text-destructive">
              {errors.stockThreshold.message}
            </p>
          )}
        </div>
      </div>

      <div ref={variantsRef}>
        <VariantsEditor
          value={variants}
          onChange={handleVariantsChange}
          basePrice={Number(priceValue) || undefined}
          editing={!!product}
          error={variantsError}
        />
      </div>

      <div data-tour="product-photos" ref={photosRef} className="flex flex-col gap-1.5">
        <Label help="Au moins une photo est obligatoire. Chaque photo est recadrée en carré puis compressée pour rester légère. La première est la photo principale.">Photos{imagesRequired && " (au moins une)"}</Label>
        {!imagesRequired && images.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ce produit n&apos;a pas encore de photo. Ajoutez-en une : les
            clients achètent rarement un article qu&apos;ils ne voient pas.
          </p>
        )}
        <ProductImageUploader images={images} onChange={setImages} />
        {showImagesError && (
          <p role="alert" className="text-sm text-destructive">
            Ajoutez au moins une photo du produit.
          </p>
        )}
      </div>

      <div data-tour="product-promo" className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <Label htmlFor="isPromo" help="Cochez pour vendre ce produit à un prix réduit : la boutique affiche le prix promo avec un badge de réduction (ex. -20 %), et c'est ce prix qui est facturé." className="items-center">
          <input
            id="isPromo"
            type="checkbox"
            className="size-4"
            {...register("isPromo")}
          />
          Produit en promotion
        </Label>

        {isPromo && product && isPromoExpired(product) && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Cette promotion est terminée depuis le{" "}
            {/* Dernière minute de la journée de fin, heure du Cameroun. */}
            {formatDateTime(new Date(promoEndsAt(product.promoEnd!).getTime() - 60_000), "long")}{" "}
            : vos clients voient de nouveau le prix normal. Choisissez une
            nouvelle date de fin pour la relancer, ou décochez la case.
          </p>
        )}

        {isPromo && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promoPrice" help="Le prix réduit affiché pendant la promotion. Il doit être inférieur au prix normal.">Prix promo (FCFA)</Label>
              <Input
                id="promoPrice"
                type="number"
                step="1"
                min="0"
                aria-invalid={!!errors.promoPrice}
                {...register("promoPrice")}
              />
              {errors.promoPrice && (
                <p className="text-sm text-destructive">
                  {errors.promoPrice.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promoEndDate" help="Facultatif. La promotion s'arrête automatiquement à la fin de cette journée (heure du Cameroun) : le prix normal revient tout seul, sans rien décocher. Sans date, elle dure jusqu'à ce que vous la décochiez.">Fin de la promo</Label>
              <Input
                id="promoEndDate"
                type="date"
                {...register("promoEndDate")}
              />
            </div>
          </div>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      {!product && (
        <div data-tour="product-draft" className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="w-fit"
          >
            Enregistrer le brouillon
          </Button>
          {draftSaved && (
            <p className="text-sm text-muted-foreground">
              Brouillon sauvegardé dans ce navigateur.
            </p>
          )}
        </div>
      )}

      <Button data-tour="product-submit" type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Enregistrement..."
          : product
            ? "Enregistrer les modifications"
            : "Créer le produit"}
      </Button>
    </form>
  );
}

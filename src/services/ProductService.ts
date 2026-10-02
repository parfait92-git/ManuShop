import type { Product } from "@/models/product/Product";
import { productRepository } from "@/repositories/ProductRepository";
import type {
  CreateProductDto,
  IProductRepository,
  UpdateProductDto,
} from "@/repositories/interfaces/IProductRepository";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export class ProductService {
  constructor(private readonly products: IProductRepository = productRepository) {}

  getProduct(id: string): Promise<Product | null> {
    return this.products.getById(id);
  }

  listProducts(shopId: string): Promise<Product[]> {
    return this.products.listByShop(shopId);
  }

  /** Produits non mis à la corbeille (BF-99) — ce que le commerçant doit
   * voir dans sa gestion de produits au quotidien. Les produits dépubliés
   * restent inclus (le commerçant doit pouvoir les republier). */
  async listActive(shopId: string): Promise<Product[]> {
    const products = await this.products.listByShop(shopId);
    return products.filter((product) => !product.deletedAt);
  }

  /** Visible pour un client (BF-90) : ni à la corbeille, ni dépublié. Absent
   * de `isPublished` est traité comme publié — voir le commentaire sur
   * `Product.isPublished`. */
  isVisibleToCustomers(product: Product): boolean {
    return !product.deletedAt && product.isPublished !== false;
  }

  setPublished(id: string, isPublished: boolean): Promise<void> {
    return this.products.update(id, { isPublished });
  }

  createProduct(data: CreateProductDto): Promise<Product> {
    return this.products.create(data);
  }

  updateProduct(id: string, data: UpdateProductDto): Promise<void> {
    return this.products.update(id, data);
  }

  deleteProduct(id: string): Promise<void> {
    return this.products.remove(id);
  }

  /**
   * Recherche par nom ou catégorie (BF-10). Filtrage en mémoire : le
   * catalogue d'une boutique reste petit, pas besoin d'un moteur de
   * recherche dédié pour l'instant.
   */
  search(products: Product[], term: string): Product[] {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.category.toLowerCase().includes(normalized)
    );
  }

  /**
   * Proxy de classement "meilleur article" (page Marché/landing, BF-108) —
   * aucune métrique de vente réelle suivie encore (`Order` non branché ici),
   * donc classé avec les seuls signaux réels disponibles sur `Product` :
   * promo active en cours, puis le plus récent, puis le prix le plus élevé
   * en dernier recours. Même heuristique que `getFeaturedArticles` dans
   * `src/data/mockData.ts` (données de démo) — à remplacer par un vrai
   * classement (ventes, vues...) une fois ces données réellement suivies.
   */
  compareByRelevance(a: Product, b: Product): number {
    if (a.isPromo !== b.isPromo) return a.isPromo ? -1 : 1;
    const dateDiff = b.createdAt.toMillis() - a.createdAt.toMillis();
    if (dateDiff !== 0) return dateDiff;
    return b.price - a.price;
  }

  /**
   * Badge à afficher sur la vitrine publique — dérivé de données réelles
   * (pas de "Populaire"/"Coup de cœur" fabriqués : le modèle Product n'a
   * aucun champ pour ça). La promo prime sur la nouveauté.
   */
  getBadge(product: Product): string | null {
    if (product.isPromo && product.promoPrice && product.promoPrice < product.price) {
      const percent = Math.round(
        (1 - product.promoPrice / product.price) * 100
      );
      return `-${percent}%`;
    }

    const ageMs = Date.now() - product.createdAt.toDate().getTime();
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    if (ageMs >= 0 && ageMs <= FOURTEEN_DAYS_MS) {
      return "Nouveau";
    }

    return null;
  }

  /** Photo obligatoire depuis la création (`ProductForm`), mais d'anciens
   * produits peuvent encore n'en avoir aucune : signalés au commerçant
   * (`ProductList`) jusqu'à ce qu'il en ajoute une. */
  hasImage(product: Product): boolean {
    return product.images.length > 0;
  }

  /** Dérivé de `stock`/`stockThreshold`, pas d'un module Stock dédié (pas
   * encore construit) — la seule donnée fiable disponible aujourd'hui. */
  getStockStatus(product: Product): StockStatus {
    if (product.stock <= 0) return "out-of-stock";
    if (product.stock <= product.stockThreshold) return "low-stock";
    return "in-stock";
  }
}

export const productService = new ProductService();

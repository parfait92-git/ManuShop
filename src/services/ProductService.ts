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

  /** Dérivé de `stock`/`stockThreshold`, pas d'un module Stock dédié (pas
   * encore construit) — la seule donnée fiable disponible aujourd'hui. */
  getStockStatus(product: Product): StockStatus {
    if (product.stock <= 0) return "out-of-stock";
    if (product.stock <= product.stockThreshold) return "low-stock";
    return "in-stock";
  }
}

export const productService = new ProductService();

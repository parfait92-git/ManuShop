import type { Product } from "@/models/product/Product";

export type CreateProductDto = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type UpdateProductDto = Partial<
  Omit<Product, "id" | "shopId" | "createdAt" | "updatedAt">
>;

export interface IProductRepository {
  getById(id: string): Promise<Product | null>;
  listByShop(shopId: string): Promise<Product[]>;
  create(data: CreateProductDto): Promise<Product>;
  update(id: string, data: UpdateProductDto): Promise<void>;
  remove(id: string): Promise<void>;
}

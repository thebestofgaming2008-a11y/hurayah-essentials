import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";

export interface Product {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  author: string | null;
  publisher: string | null;
  language: string | null;
  pages: number | null;
  isbn: string | null;
  binding: string | null;
  edition: string | null;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  shipping_class: string | null;
  weight_source_url: string | null;
  weight_confidence: string | null;
  price: number;
  price_inr: number;
  sale_price: number | null;
  sale_price_inr: number | null;
  sku: string | null;
  stock_quantity: number | null;
  category: string | null;
  category_id: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  images: string[] | null;
  linked_product_ids?: string[] | null;
  variant_label?: string | null;
  color_options?: string[] | null;
  size_options?: string[] | null;
  option_types?: Array<{ name: string; values: string[] }> | null;
  badge: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_new_arrival: boolean | null;
  is_bestseller: boolean | null;
  is_on_sale: boolean | null;
  in_stock: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function normalize(p: unknown): Product {
  const r = p as Record<string, unknown>;
  return {
    ...(r as object),
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    color_options: Array.isArray(r.color_options) ? (r.color_options as string[]) : [],
    size_options: Array.isArray(r.size_options) ? (r.size_options as string[]) : [],
    option_types: Array.isArray(r.option_types) ? (r.option_types as Array<{ name: string; values: string[] }>) : [],
  } as Product;
}

export async function listActiveProducts(): Promise<Product[]> {
  try {
    return ((await convex.query(api.products.listActiveProducts, {})) as Product[]).map(normalize);
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = (await convex.query(api.products.getProductById, { id })) as Product | null;
    return product ? normalize(product) : null;
  } catch {
    return null;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const product = (await convex.query(api.products.getProductBySlug, { slug })) as Product | null;
    return product ? normalize(product) : null;
  } catch {
    return null;
  }
}

export async function listFeatured(limit = 8): Promise<Product[]> {
  const data = await listActiveProducts();
  return data.filter((product) => product.is_featured).slice(0, limit);
}

export async function listByCategory(categorySlug: string): Promise<Product[]> {
  try {
    return ((await convex.query(api.products.listByCategory, { category: categorySlug })) as Product[]).map(normalize);
  } catch {
    return [];
  }
}

export async function listByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  try {
    return ((await convex.query(api.products.listByIds, { ids })) as Product[]).map(normalize);
  } catch {
    return [];
  }
}

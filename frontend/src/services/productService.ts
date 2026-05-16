import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";

const sampleProducts = [
  {
    id: "1",
    name: "Fortress of the Muslim",
    slug: "fortress-of-the-muslim",
    short_description: "A compact collection of daily supplications from the Qur'an and Sunnah.",
    description: "Pocket-friendly duas for morning, evening, travel, illness and everyday moments.",
    author: "Sa'id bin Ali bin Wahf Al-Qahtani",
    publisher: "Darussalam",
    language: "English",
    pages: 192,
    binding: "Paperback",
    price: 180,
    price_inr: 180,
    stock_quantity: 80,
    category: "books",
    tags: ["Hadith", "Tazkiyah"],
    cover_image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    images: [],
    badge: "Bestseller",
    rating: 4.9,
    reviews_count: 128,
    is_active: true,
    is_featured: true,
    is_new_arrival: false,
    is_bestseller: true,
    is_on_sale: false,
    in_stock: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "The Sealed Nectar",
    slug: "the-sealed-nectar",
    short_description: "Award-winning biography of Prophet Muhammad ﷺ.",
    description: "A detailed, accessible seerah volume for students and families.",
    author: "Safiur Rahman Mubarakpuri",
    publisher: "Darussalam",
    language: "English",
    pages: 588,
    binding: "Hardcover",
    price: 650,
    price_inr: 650,
    stock_quantity: 42,
    category: "books",
    tags: ["Seerah"],
    cover_image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
    images: [],
    badge: "Classic",
    rating: 4.8,
    reviews_count: 93,
    is_active: true,
    is_featured: true,
    is_new_arrival: false,
    is_bestseller: true,
    is_on_sale: false,
    in_stock: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Arabic Alphabet Flashcards",
    slug: "arabic-alphabet-flashcards",
    short_description: "Durable cards for young learners beginning Arabic letters.",
    description: "Large, clear letterforms with transliteration and playful practice prompts.",
    author: null,
    publisher: "Hurayrah Essentials",
    language: "Arabic / English",
    pages: 56,
    binding: "Card set",
    price: 299,
    price_inr: 299,
    stock_quantity: 70,
    category: "children",
    tags: ["Arabic", "Children"],
    cover_image_url: "https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?auto=format&fit=crop&w=800&q=80",
    images: [],
    badge: "New",
    rating: 4.7,
    reviews_count: 31,
    is_active: true,
    is_featured: false,
    is_new_arrival: true,
    is_bestseller: false,
    is_on_sale: false,
    in_stock: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Everyday Modest Thobe",
    slug: "everyday-modest-thobe",
    short_description: "A breathable everyday thobe with a clean, relaxed fit.",
    description: "Soft-touch fabric, easy movement and subtle detailing for daily wear.",
    author: null,
    publisher: "Hurayrah Essentials",
    language: null,
    pages: null,
    binding: null,
    price: 1299,
    price_inr: 1299,
    sale_price: 1099,
    sale_price_inr: 1099,
    stock_quantity: 24,
    category: "clothing",
    tags: ["Clothing"],
    cover_image_url: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=800&q=80",
    images: [],
    badge: "Sale",
    rating: 4.6,
    reviews_count: 18,
    is_active: true,
    is_featured: true,
    is_new_arrival: true,
    is_bestseller: false,
    is_on_sale: true,
    in_stock: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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
  } as Product;
}

export async function listActiveProducts(): Promise<Product[]> {
  try {
    const products = ((await convex.query(api.products.listActiveProducts, {})) as Product[]).map(normalize);
    return products.length ? products : sampleProducts;
  } catch {
    return sampleProducts;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = (await convex.query(api.products.getProductById, { id })) as Product | null;
    return product ? normalize(product) : sampleProducts.find(p => p.id === id) || null;
  } catch {
    return sampleProducts.find(p => p.id === id) || null;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const product = (await convex.query(api.products.getProductBySlug, { slug })) as Product | null;
    return product ? normalize(product) : sampleProducts.find(p => p.slug === slug) || null;
  } catch {
    return sampleProducts.find(p => p.slug === slug) || null;
  }
}

export async function listFeatured(limit = 8): Promise<Product[]> {
  const data = await listActiveProducts();
  return data.filter((p) => p.is_featured).slice(0, limit);
}

export async function listByCategory(categorySlug: string): Promise<Product[]> {
  try {
    const products = ((await convex.query(api.products.listByCategory, { category: categorySlug })) as Product[]).map(normalize);
    return products.length ? products : sampleProducts.filter(p => p.category === categorySlug);
  } catch {
    return sampleProducts.filter(p => p.category === categorySlug);
  }
}

export async function listByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  try {
    return ((await convex.query(api.products.listByIds, { ids })) as Product[]).map(normalize);
  } catch {
    return sampleProducts.filter(p => ids.includes(p.id));
  }
}

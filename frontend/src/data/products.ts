import type { LucideIcon } from "lucide-react";
import { BookOpen, BookText, Baby, Heart, Shirt, Sparkles } from "lucide-react";
import type { Product as ServiceProduct } from "@/services/productService";

export type Product = ServiceProduct & {
  /** @deprecated use name */
  title?: string;
  /** @deprecated */
  compareAt?: number | null;
  /** @deprecated use reviews_count */
  reviews?: number | null;
  /** @deprecated subjects live in tags[] */
  subject?: string | null;
};

export type CategoryKey = string;

export interface CategoryEntry {
  key: string;
  label: string;
  blurb: string;
  parent?: string;
  Icon: LucideIcon;
}

// Mirrors the slugs actually used in the products table + categories table.
export const CATEGORIES: CategoryEntry[] = [
  // Top level
  { key: "books", label: "Books", blurb: "Authentic Islamic titles across every science.", Icon: BookOpen },
  { key: "clothing", label: "Clothing", blurb: "Modest, comfortable everyday essentials.", Icon: Shirt },
  { key: "children", label: "Essentials", blurb: "Everyday essentials for the household.", Icon: Baby },
  { key: "women", label: "Women", blurb: "Curated for women.", Icon: Heart },
  // Book subjects
  { key: "aqeedah", label: "Aqeedah", blurb: "Creed & belief.", parent: "books", Icon: BookText },
  { key: "arabic", label: "Arabic", blurb: "Language of the Qur'an.", parent: "books", Icon: BookText },
  { key: "fiqh", label: "Fiqh", blurb: "Islamic jurisprudence.", parent: "books", Icon: BookText },
  { key: "hadith", label: "Hadith", blurb: "Prophetic traditions.", parent: "books", Icon: BookText },
  { key: "purification", label: "Purification", blurb: "Tazkiyah of the soul.", parent: "books", Icon: Sparkles },
  { key: "seerah", label: "Seerah", blurb: "The Prophet's life ﷺ.", parent: "books", Icon: BookText },
  { key: "tafsir", label: "Tafsir", blurb: "Qur'anic exegesis.", parent: "books", Icon: BookText },
  { key: "urdu", label: "Urdu", blurb: "Selected Urdu titles.", parent: "books", Icon: BookText },
];

export const TOP_LEVEL_CATEGORIES = CATEGORIES.filter((c) => !c.parent);
export const BOOK_SUBJECTS = CATEGORIES.filter((c) => c.parent === "books");

export const SUBJECTS = ["Aqeedah", "Arabic", "Fiqh", "Hadith", "Purification", "Seerah", "Tafsir", "Urdu"] as const;

export const formatPrice = (
  n: number | null | undefined,
  currency: "INR" | "USD" = "INR",
): string => {
  if (n == null) return "—";
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
};

const isRemote = (s: string | null | undefined): s is string => !!s && /^https?:\/\//i.test(s);

export const productImage = (p: ServiceProduct): string | null => {
  // Prefer working remote URLs over broken local paths during the data migration.
  if (isRemote(p.cover_image_url)) return p.cover_image_url;
  if (Array.isArray(p.images)) {
    const remote = p.images.find(isRemote);
    if (remote) return remote;
  }
  if (p.cover_image_url) return p.cover_image_url;
  if (Array.isArray(p.images) && p.images.length > 0) return p.images[0];
  return null;
};

export const productPrice = (p: ServiceProduct): number => {
  if (p.is_on_sale && p.sale_price_inr != null) return p.sale_price_inr;
  if (p.price_inr != null) return p.price_inr;
  return p.price ?? 0;
};

export const productCompareAt = (p: ServiceProduct): number | null => {
  if (p.is_on_sale && p.sale_price_inr != null && p.price_inr != null) return p.price_inr;
  return null;
};

// Legacy stubs — kept so older imports compile while the migration finishes.
export const PRODUCTS: Product[] = [];
export const getProduct = (_id: string): Product | undefined => undefined;
export const productsByCategory = (_key: CategoryKey): Product[] => [];
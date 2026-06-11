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
  { key: "character-development", label: "Character Development", blurb: "Adab, manners and refinement.", parent: "books", Icon: Heart },
  { key: "dua-adhkar", label: "Du'a & Adhkar", blurb: "Supplications and remembrance.", parent: "books", Icon: Sparkles },
  { key: "womens-issues", label: "Women's Issues", blurb: "Guidance for Muslim women.", parent: "books", Icon: Heart },
  { key: "islamic-history", label: "Islamic History", blurb: "History, biographies and nations.", parent: "books", Icon: BookText },
  { key: "family-marriage", label: "Family & Marriage", blurb: "Marriage, parenting and home life.", parent: "books", Icon: Heart },
];

export const TOP_LEVEL_CATEGORIES = CATEGORIES.filter((c) => !c.parent);
export const BOOK_SUBJECTS = CATEGORIES.filter((c) => c.parent === "books");

export const SUBJECTS = BOOK_SUBJECTS.map((subject) => subject.label);
export const BOOK_SUBJECT_KEYS = new Set(BOOK_SUBJECTS.map((subject) => subject.key));
export const BOOK_SUBJECT_LABELS = new Map(BOOK_SUBJECTS.map((subject) => [subject.key, subject.label]));

const subjectAliases: Record<string, string> = {
  tazkiyah: "purification",
  spirituality: "purification",
  purification: "purification",
  aqidah: "aqeedah",
  aqeedah: "aqeedah",
  creed: "aqeedah",
  tawheed: "aqeedah",
  tawhid: "aqeedah",
  "character development": "character-development",
  character: "character-development",
  manners: "character-development",
  adab: "character-development",
  "du'a": "dua-adhkar",
  "du'a & adhkar": "dua-adhkar",
  dua: "dua-adhkar",
  "dua & adhkar": "dua-adhkar",
  duaa: "dua-adhkar",
  adhkar: "dua-adhkar",
  azkar: "dua-adhkar",
  dhikr: "dua-adhkar",
  remembrance: "dua-adhkar",
  "women's issues": "womens-issues",
  "women issues": "womens-issues",
  "womens issues": "womens-issues",
  womens: "womens-issues",
  women: "womens-issues",
  sisters: "womens-issues",
  "islamic history": "islamic-history",
  history: "islamic-history",
  "family marriage": "family-marriage",
  "family & marriage": "family-marriage",
  family: "family-marriage",
  marriage: "family-marriage",
  nikah: "family-marriage",
};

const subjectSignals: Record<string, RegExp[]> = {
  aqeedah: [
    /\baq[ie]e?dah\b/i,
    /\bcreed\b/i,
    /\btawh[ei]ed\b/i,
    /\btawhid\b/i,
    /\bnullifiers?\b/i,
    /\bnawaqid\b/i,
    /\bfaith\b/i,
    /\biman\b/i,
    /\busool\b/i,
    /\bwasitiyyah\b/i,
    /\bhai'?yah\b/i,
    /\bnames?\s+of\s+allah\b/i,
    /\basma/i,
  ],
  arabic: [
    /\barabic\s+(course|language|grammar|reader|reading)\b/i,
    /\bnahw\b/i,
    /\bsarf\b/i,
    /\bajrumiyyah\b/i,
    /\bajroomiyyah\b/i,
    /\bbalagah\b/i,
    /\bnuraniyyah\b/i,
    /\bnooraniyyah\b/i,
    /\bqa'?idah\b/i,
  ],
  fiqh: [
    /\bfiqh\b/i,
    /\brulings?\b/i,
    /\bwudu\b/i,
    /\bwudhu\b/i,
    /\bsalah\b/i,
    /\bprayer\b/i,
    /\bmarriage\b/i,
    /\bnikah\b/i,
    /\bwomen\b/i,
    /\bobligatory\s+duties\b/i,
    /\bbulugh\b/i,
  ],
  hadith: [
    /\bhadith\b/i,
    /\bahadith\b/i,
    /\bsunnah\b/i,
    /\bbukhari\b/i,
    /\bmuslim\b/i,
    /\briyad\b/i,
    /\bsunan\b/i,
    /\badab\b/i,
  ],
  purification: [
    /\btazkiyah\b/i,
    /\bpurification\b/i,
    /\bheart\b/i,
    /\bsoul\b/i,
    /\bsins?\b/i,
    /\btawbah\b/i,
    /\brepentance\b/i,
    /\bdistress\b/i,
    /\bdua\b/i,
    /\bdhikr\b/i,
    /\bremembrance\b/i,
    /\bmadarij\b/i,
    /\bdivine\s+seekers\b/i,
  ],
  seerah: [
    /\bseerah\b/i,
    /\bprophet'?s?\s+(life|biograph|story|stories|wives|companions|description|depiction)\b/i,
    /\bdepiction\s+of\s+the\s+prophet\b/i,
    /\bsealed\s+nectar\b/i,
    /\bmoon\s+split\b/i,
    /\bbiograph/i,
    /\bwives\s+of\s+the\s+prophet\b/i,
    /\bshama/i,
  ],
  tafsir: [
    /\btafsir\b/i,
    /\bexegesis\b/i,
    /\bahsanul\s+bayan\b/i,
    /\bqur'?anic\s+commentary\b/i,
  ],
  urdu: [/\burdu\b/i],
  "character-development": [
    /\badab\b/i,
    /\bakhlaq\b/i,
    /\bcharacter\b/i,
    /\bmanners?\b/i,
    /\bmorals?\b/i,
    /\betiquette\b/i,
    /\bheart\b/i,
    /\bsins?\b/i,
    /\btazkiyah\b/i,
  ],
  "dua-adhkar": [
    /\bdu['a]*a\b/i,
    /\bdua\b/i,
    /\badhkar\b/i,
    /\bazkar\b/i,
    /\bdhikr\b/i,
    /\bsupplications?\b/i,
    /\bremembrance\b/i,
    /\bdistress\b/i,
    /\byunus\b/i,
  ],
  "womens-issues": [
    /\bwomen'?s?\b/i,
    /\bwoman'?s?\b/i,
    /\bsister\b/i,
    /\bsisters\b/i,
    /\bmuslim women\b/i,
    /\bwives\b/i,
    /\bmother\b/i,
  ],
  "islamic-history": [
    /\bhistory\b/i,
    /\bbiograph/i,
    /\bseerah\b/i,
    /\bprophet'?s?\s+(life|story|stories|wives|companions|description|depiction)\b/i,
    /\bcompanions\b/i,
    /\bsahabah\b/i,
    /\bsealed\s+nectar\b/i,
    /\bmoon\s+split\b/i,
    /\bnations?\b/i,
  ],
  "family-marriage": [
    /\bfamily\b/i,
    /\bmarriage\b/i,
    /\bnikah\b/i,
    /\bparenting\b/i,
    /\braising\b/i,
    /\bchildren\b/i,
    /\bchild\b/i,
    /\bhome\b/i,
    /\bwives\b/i,
  ],
};

export function normalizeBookSubject(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!normalized) return null;
  if (BOOK_SUBJECT_KEYS.has(normalized)) return normalized;
  const compact = normalized.replace(/-/g, " ");
  const byLabel = BOOK_SUBJECTS.find((subject) => subject.label.toLowerCase() === compact);
  if (byLabel) return byLabel.key;
  return subjectAliases[compact] ?? subjectAliases[normalized] ?? null;
}

export function bookSubjectParam(value: string | null | undefined) {
  const key = normalizeBookSubject(value);
  return key ? BOOK_SUBJECTS.find((subject) => subject.key === key) ?? null : null;
}

export function productSubjectKeys(product: Pick<ServiceProduct, "name" | "slug" | "author" | "publisher" | "category" | "category_id" | "tags" | "search_text">): string[] {
  const keys = new Set<string>();
  const categorySubject = normalizeBookSubject(product.category_id) ?? normalizeBookSubject(product.category);
  if (categorySubject) keys.add(categorySubject);

  const signalText = [
    product.name,
    product.slug,
    product.author,
    product.publisher,
    product.category,
    product.category_id,
  ]
    .filter(Boolean)
    .join(" ");

  for (const tag of Array.isArray(product.tags) ? product.tags : []) {
    const exactSubject = BOOK_SUBJECTS.find((subject) => tag.trim() === subject.label)?.key;
    if (exactSubject) {
      keys.add(exactSubject);
      continue;
    }

    const subject = normalizeBookSubject(tag);
    if (subject && subject !== "arabic" && subject !== "seerah") keys.add(subject);
  }

  for (const [key, patterns] of Object.entries(subjectSignals)) {
    if (patterns.some((pattern) => pattern.test(signalText))) keys.add(key);
  }

  return [...keys].filter((key) => BOOK_SUBJECT_KEYS.has(key));
}

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
const MEDIA_IMAGE_HOST = "media.abuhurayrahessentials.site";

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

export function productCardThumbnailUrl(image: string | null | undefined, width = 420): string | null {
  if (!isRemote(image)) return null;
  try {
    const url = new URL(image);
    if (url.hostname !== MEDIA_IMAGE_HOST) return null;
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!path || path.startsWith("thumbnails/") || !/\.(png|jpe?g|webp)$/i.test(path)) return null;
    const safeName = path.replace(/[^a-zA-Z0-9._-]+/g, "_");
    return `${url.origin}/thumbnails/w${width}/${safeName}.webp`;
  } catch {
    return null;
  }
}

export const productPrice = (p: ServiceProduct): number => {
  if (p.is_on_sale && p.sale_price_inr != null) return p.sale_price_inr;
  if (p.price_inr != null) return p.price_inr;
  return p.price ?? 0;
};

export const productCompareAt = (p: ServiceProduct): number | null => {
  if (p.is_on_sale && p.sale_price_inr != null && p.price_inr != null) return p.price_inr;
  return null;
};

export const topCategoryForProduct = (p: Pick<ServiceProduct, "category" | "category_id">): string | null => {
  const category = String(p.category ?? "").trim();
  const categoryId = String(p.category_id ?? "").trim();
  const meta = CATEGORIES.find((entry) => entry.key === categoryId) ?? CATEGORIES.find((entry) => entry.key === category);
  if (meta?.parent) return meta.parent;
  if (meta) return meta.key === "essentials" ? "children" : meta.key;
  if (category === "essentials" || categoryId === "essentials") return "children";
  return category || categoryId || null;
};

// Legacy stubs — kept so older imports compile while the migration finishes.
export const PRODUCTS: Product[] = [];
export const getProduct = (_id: string): Product | undefined => undefined;
export const productsByCategory = (_key: CategoryKey): Product[] => [];

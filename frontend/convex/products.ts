import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, publicProduct, publicProductCard, requireAdmin } from "./lib";

const productInput = {
  name: v.string(),
  slug: v.optional(v.union(v.string(), v.null())),
  short_description: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.union(v.string(), v.null())),
  author: v.optional(v.union(v.string(), v.null())),
  publisher: v.optional(v.union(v.string(), v.null())),
  language: v.optional(v.union(v.string(), v.null())),
  pages: v.optional(v.union(v.number(), v.null())),
  isbn: v.optional(v.union(v.string(), v.null())),
  binding: v.optional(v.union(v.string(), v.null())),
  edition: v.optional(v.union(v.string(), v.null())),
  weight_g: v.optional(v.union(v.number(), v.null())),
  length_cm: v.optional(v.union(v.number(), v.null())),
  width_cm: v.optional(v.union(v.number(), v.null())),
  height_cm: v.optional(v.union(v.number(), v.null())),
  shipping_class: v.optional(v.union(v.string(), v.null())),
  weight_source_url: v.optional(v.union(v.string(), v.null())),
  weight_confidence: v.optional(v.union(v.string(), v.null())),
  price: v.optional(v.number()),
  price_inr: v.number(),
  sale_price: v.optional(v.union(v.number(), v.null())),
  sale_price_inr: v.optional(v.union(v.number(), v.null())),
  sku: v.optional(v.union(v.string(), v.null())),
  stock_quantity: v.optional(v.union(v.number(), v.null())),
  category: v.optional(v.union(v.string(), v.null())),
  category_id: v.optional(v.union(v.string(), v.null())),
  tags: v.optional(v.union(v.array(v.string()), v.null())),
  cover_image_url: v.optional(v.union(v.string(), v.null())),
  images: v.optional(v.union(v.array(v.string()), v.null())),
  linked_product_ids: v.optional(v.union(v.array(v.string()), v.null())),
  variant_label: v.optional(v.union(v.string(), v.null())),
  color_options: v.optional(v.union(v.array(v.string()), v.null())),
  size_options: v.optional(v.union(v.array(v.string()), v.null())),
  option_types: v.optional(v.union(v.array(v.any()), v.null())),
  badge: v.optional(v.union(v.string(), v.null())),
  rating: v.optional(v.union(v.number(), v.null())),
  reviews_count: v.optional(v.union(v.number(), v.null())),
  is_active: v.optional(v.union(v.boolean(), v.null())),
  is_featured: v.optional(v.union(v.boolean(), v.null())),
  show_in_category_section: v.optional(v.union(v.boolean(), v.null())),
  is_new_arrival: v.optional(v.union(v.boolean(), v.null())),
  is_bestseller: v.optional(v.union(v.boolean(), v.null())),
  is_on_sale: v.optional(v.union(v.boolean(), v.null())),
  in_stock: v.optional(v.union(v.boolean(), v.null())),
};

const productPatch = {
  name: v.optional(v.string()),
  slug: v.optional(v.union(v.string(), v.null())),
  short_description: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.union(v.string(), v.null())),
  author: v.optional(v.union(v.string(), v.null())),
  publisher: v.optional(v.union(v.string(), v.null())),
  language: v.optional(v.union(v.string(), v.null())),
  pages: v.optional(v.union(v.number(), v.null())),
  isbn: v.optional(v.union(v.string(), v.null())),
  binding: v.optional(v.union(v.string(), v.null())),
  edition: v.optional(v.union(v.string(), v.null())),
  weight_g: v.optional(v.union(v.number(), v.null())),
  length_cm: v.optional(v.union(v.number(), v.null())),
  width_cm: v.optional(v.union(v.number(), v.null())),
  height_cm: v.optional(v.union(v.number(), v.null())),
  shipping_class: v.optional(v.union(v.string(), v.null())),
  weight_source_url: v.optional(v.union(v.string(), v.null())),
  weight_confidence: v.optional(v.union(v.string(), v.null())),
  price: v.optional(v.number()),
  price_inr: v.optional(v.number()),
  sale_price: v.optional(v.union(v.number(), v.null())),
  sale_price_inr: v.optional(v.union(v.number(), v.null())),
  sku: v.optional(v.union(v.string(), v.null())),
  stock_quantity: v.optional(v.union(v.number(), v.null())),
  category: v.optional(v.union(v.string(), v.null())),
  category_id: v.optional(v.union(v.string(), v.null())),
  tags: v.optional(v.union(v.array(v.string()), v.null())),
  cover_image_url: v.optional(v.union(v.string(), v.null())),
  images: v.optional(v.union(v.array(v.string()), v.null())),
  linked_product_ids: v.optional(v.union(v.array(v.string()), v.null())),
  variant_label: v.optional(v.union(v.string(), v.null())),
  color_options: v.optional(v.union(v.array(v.string()), v.null())),
  size_options: v.optional(v.union(v.array(v.string()), v.null())),
  option_types: v.optional(v.union(v.array(v.any()), v.null())),
  badge: v.optional(v.union(v.string(), v.null())),
  rating: v.optional(v.union(v.number(), v.null())),
  reviews_count: v.optional(v.union(v.number(), v.null())),
  is_active: v.optional(v.union(v.boolean(), v.null())),
  is_featured: v.optional(v.union(v.boolean(), v.null())),
  show_in_category_section: v.optional(v.union(v.boolean(), v.null())),
  is_new_arrival: v.optional(v.union(v.boolean(), v.null())),
  is_bestseller: v.optional(v.union(v.boolean(), v.null())),
  is_on_sale: v.optional(v.union(v.boolean(), v.null())),
  in_stock: v.optional(v.union(v.boolean(), v.null())),
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

function cleanText(value: string | null | undefined, max = 500) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 500) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function cleanUrl(value: string | null | undefined) {
  const url = cleanText(value, 1000);
  if (!url) return null;
  if (
    /^https?:\/\//i.test(url) ||
    /^\/api\/storage\//i.test(url) ||
    /^\/images\//i.test(url) ||
    /^\/assets\//i.test(url) ||
    /^\/photoroom\//i.test(url)
  ) {
    return url;
  }
  throw new Error("Image URL must be http(s), a Convex storage URL, or an approved public asset URL.");
}

function normalize(input: any, isPatch = false, existingPrice?: number) {
  const timestamp = nowIso();
  const output: Record<string, any> = { updated_at: timestamp };
  if (input.name !== undefined) {
    const name = cleanText(input.name, 180);
    if (!name) throw new Error("Product name is required.");
    output.name = name;
    output.slug = cleanNullable(input.slug, 100) || slugify(name);
  } else if (input.slug !== undefined) {
    output.slug = cleanNullable(input.slug, 100);
  }

  if (!isPatch || input.price_inr !== undefined || input.price !== undefined) {
    const priceInr = Number(input.price_inr ?? input.price ?? 0);
    if (!Number.isFinite(priceInr) || priceInr < 0) throw new Error("Product price must be a positive number.");
    output.price = priceInr;
    output.price_inr = priceInr;
  }
  if (input.sale_price_inr !== undefined || input.sale_price !== undefined || !isPatch) {
    const salePriceInr = input.sale_price_inr == null && input.sale_price == null ? null : Number(input.sale_price_inr ?? input.sale_price);
    const priceLimit = output.price_inr ?? existingPrice ?? Number(input.price_inr ?? input.price ?? Number.POSITIVE_INFINITY);
    if (salePriceInr != null && (!Number.isFinite(salePriceInr) || salePriceInr < 0 || salePriceInr > priceLimit)) {
      throw new Error("Sale price must be between ₹0 and the regular price.");
    }
    output.sale_price = salePriceInr;
    output.sale_price_inr = salePriceInr;
    output.is_on_sale = input.is_on_sale ?? Boolean(salePriceInr && salePriceInr > 0);
  }
  if (input.stock_quantity !== undefined || !isPatch) {
    const stock = input.stock_quantity == null ? 0 : Math.floor(Number(input.stock_quantity));
    if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock must be a positive whole number.");
    output.stock_quantity = stock;
    output.in_stock = stock > 0;
  }

  const stringFields: Array<[string, number]> = [
    ["short_description", 280],
    ["description", 5000],
    ["author", 120],
    ["publisher", 120],
    ["language", 40],
    ["isbn", 40],
    ["binding", 80],
    ["edition", 80],
    ["shipping_class", 80],
    ["weight_source_url", 500],
    ["weight_confidence", 40],
    ["sku", 80],
    ["category", 80],
    ["category_id", 80],
    ["variant_label", 80],
    ["badge", 40],
  ];
  for (const [field, max] of stringFields) {
    if (input[field] !== undefined || !isPatch) output[field] = cleanNullable(input[field], max);
  }
  for (const field of ["weight_g", "length_cm", "width_cm", "height_cm"]) {
    if (input[field] !== undefined || !isPatch) {
      const value = input[field] == null || input[field] === "" ? null : Number(input[field]);
      if (value != null && (!Number.isFinite(value) || value < 0)) throw new Error(`${field} must be a positive number.`);
      output[field] = value;
    }
  }
  if (input.cover_image_url !== undefined || !isPatch) output.cover_image_url = cleanUrl(input.cover_image_url);
  if (input.tags !== undefined || !isPatch) {
    output.tags = Array.isArray(input.tags) ? input.tags.map((tag: string) => cleanText(tag, 40)).filter(Boolean).slice(0, 20) : [];
  }
  if (input.images !== undefined || !isPatch) {
    output.images = Array.isArray(input.images) ? input.images.map((url: string) => cleanUrl(url)).filter(Boolean).slice(0, 8) : [];
  }
  if (input.linked_product_ids !== undefined || !isPatch) {
    output.linked_product_ids = Array.isArray(input.linked_product_ids)
      ? input.linked_product_ids.map((id: string) => cleanText(id, 80)).filter(Boolean).slice(0, 12)
      : [];
  }
  for (const field of ["color_options", "size_options"]) {
    if (input[field] !== undefined || !isPatch) {
      output[field] = Array.isArray(input[field])
        ? Array.from(new Set(input[field].map((option: string) => cleanText(option, 60)).filter(Boolean))).slice(0, 30)
        : [];
    }
  }
  if (input.option_types !== undefined || !isPatch) {
    output.option_types = Array.isArray(input.option_types)
      ? input.option_types
          .map((group: any) => ({
            name: cleanText(group?.name, 60),
            values: Array.isArray(group?.values)
              ? Array.from(new Set(group.values.map((value: string) => cleanText(value, 60)).filter(Boolean))).slice(0, 30)
              : [],
          }))
          .filter((group: { name: string; values: string[] }) => group.name && group.values.length)
          .slice(0, 3)
      : [];
  }
  output.is_active = input.is_active ?? (isPatch ? undefined : true);
  output.is_featured = input.is_featured ?? (isPatch ? undefined : false);
  output.show_in_category_section = input.show_in_category_section ?? (isPatch ? undefined : false);
  output.is_new_arrival = input.is_new_arrival ?? (isPatch ? undefined : false);
  output.is_bestseller = input.is_bestseller ?? (isPatch ? undefined : false);
  for (const key of Object.keys(output)) if (output[key] === undefined) delete output[key];
  return output;
}

function isLaunchReady(product: any) {
  return Boolean(product.cover_image_url && (product.description || product.short_description));
}

const BOOK_SUBJECTS = new Set(["aqeedah", "arabic", "fiqh", "hadith", "purification", "seerah", "tafsir", "urdu"]);
const TOP_LEVEL_CATEGORIES = new Set(["books", "clothing", "women", "children"]);

function topCategoryForProduct(product: any) {
  const category = String(product.category ?? "").toLowerCase();
  const categoryId = String(product.category_id ?? "").toLowerCase();
  if (categoryId === "essentials") return "children";
  if (TOP_LEVEL_CATEGORIES.has(categoryId) && categoryId !== "books") return categoryId;
  if (category === "books" || categoryId === "books" || BOOK_SUBJECTS.has(category) || BOOK_SUBJECTS.has(categoryId)) return "books";
  if (category === "essentials" || categoryId === "essentials" || category === "children" || categoryId === "children") return "children";
  return category || categoryId || null;
}

export const listActiveProducts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();
    return rows.filter(isLaunchReady).map(publicProductCard).sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const listAllProducts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("products").collect();
    return rows.map(publicProduct).sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const getProductById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id as any);
    if (!doc || doc.is_active === false || !isLaunchReady(doc)) return null;
    return publicProduct(doc);
  },
});

export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!doc || doc.is_active === false || !isLaunchReady(doc)) return null;
    return publicProduct(doc);
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const requested = args.category === "essentials" ? "children" : args.category;
    const rows = await ctx.db.query("products").collect();
    return rows
      .filter((p) => p.is_active !== false && isLaunchReady(p) && topCategoryForProduct(p) === requested)
      .map(publicProductCard);
  },
});

export const listByIds = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id as any)));
    return docs.filter((doc) => doc && (doc as any).is_active !== false && isLaunchReady(doc)).map((doc) => publicProductCard(doc as any));
  },
});

export const createProduct = mutation({
  args: productInput,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const timestamp = nowIso();
    const payload = normalize(args);
    const existing = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", payload.slug)).first();
    if (existing) throw new Error("A product with this slug already exists.");
    const id = await ctx.db.insert("products", { ...payload, created_at: timestamp });
    const doc = await ctx.db.get(id);
    return doc ? publicProduct(doc) : null;
  },
});

export const updateProduct = mutation({
  args: { id: v.string(), patch: v.object(productPatch) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id as any);
    if (!current) throw new Error("Product not found.");
    const payload = normalize(args.patch, true, current.price_inr ?? current.price);
    if (payload.slug) {
      const existing = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", payload.slug)).first();
      if (existing && String(existing._id) !== args.id) throw new Error("A product with this slug already exists.");
    }
    await ctx.db.patch(args.id as any, payload);
    const doc = await ctx.db.get(args.id as any);
    return doc ? publicProduct(doc) : null;
  },
});

export const deleteProduct = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id as any);
    return true;
  },
});

export const generateProductImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getProductImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.storage.getUrl(args.storageId as any);
  },
});

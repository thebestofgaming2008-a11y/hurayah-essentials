import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, requireAdmin, requireIdentity } from "./lib";

const reviewStatus = new Set(["pending", "published", "hidden"]);

function cleanText(value: string | null | undefined, max = 1000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 1000) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function cleanMedia(urls: string[] | null | undefined) {
  if (!Array.isArray(urls)) return [];
  return urls
    .map((url) => cleanText(url, 1000))
    .filter((url) => /^https?:\/\//i.test(url) || /^data:(image|video)\//i.test(url))
    .slice(0, 6);
}

async function recalculateProductRating(ctx: any, productId: string) {
  const rows = await ctx.db
    .query("reviews")
    .withIndex("by_product_id", (q: any) => q.eq("product_id", productId))
    .collect();
  const published = rows.filter((row: any) => row.status === "published");
  const count = published.length;
  const rating = count ? published.reduce((sum: number, row: any) => sum + row.rating, 0) / count : null;
  await ctx.db.patch(productId as any, {
    rating,
    reviews_count: count,
    updated_at: nowIso(),
  });
}

function publicReview(doc: Record<string, any>) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

export const listPublishedForProduct = query({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.productId))
      .collect();
    return rows
      .filter((row) => row.status === "published")
      .map(publicReview)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("reviews").take(args.limit ?? 200);
    return rows.map(publicReview).sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const submit = mutation({
  args: {
    productId: v.string(),
    rating: v.number(),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.union(v.string(), v.null())),
    mediaUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const product = await ctx.db.get(args.productId as any);
    if (!product || product.is_active === false) throw new Error("Product not found.");
    const rating = Math.max(1, Math.min(5, Math.round(args.rating)));
    const user = auth.user as any;
    const timestamp = nowIso();
    const id = await ctx.db.insert("reviews", {
      product_id: args.productId,
      user_id: auth.userId,
      customer_name: user.name ?? null,
      customer_email: user.email ?? null,
      rating,
      title: cleanNullable(args.title, 100),
      body: cleanNullable(args.body, 1600),
      media_urls: cleanMedia(args.mediaUrls),
      status: "pending",
      admin_note: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicReview(doc) : null;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.string(),
    status: v.string(),
    adminNote: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!reviewStatus.has(status)) throw new Error("Invalid review status.");
    const current = await ctx.db.get(args.id as any);
    if (!current) throw new Error("Review not found.");
    await ctx.db.patch(args.id as any, {
      status,
      admin_note: cleanNullable(args.adminNote, 400),
      updated_at: nowIso(),
    });
    await recalculateProductRating(ctx, current.product_id);
    return true;
  },
});

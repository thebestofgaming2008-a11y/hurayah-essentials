import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, requireAdmin } from "./lib";

const zones = ["Local", "Regional", "National", "Remote"];
const carriers = ["DTDC", "India Post"];
const methods = ["Standard", "Express"];

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function publicDoc(doc: Record<string, any>) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

async function ensureShippingDefaults(ctx: any) {
  const existing = await ctx.db.query("shipping_rates").take(1);
  if (existing.length) return;
  const timestamp = nowIso();
  for (const carrier of carriers) {
    for (const [zoneIndex, zone] of zones.entries()) {
      for (const [methodIndex, method] of methods.entries()) {
        await ctx.db.insert("shipping_rates", {
          carrier,
          zone,
          method,
          base_fee: method === "Express" ? 80 : 50,
          per_item_fee: 0,
          per_weight_fee: method === "Express" ? 80 : 50,
          is_active: true,
          updated_at: timestamp,
        });
      }
    }
  }
}

export const listDiscounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("discounts").collect();
    return rows.map(publicDoc).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  },
});

export const createDiscount = mutation({
  args: {
    code: v.string(),
    type: v.string(),
    value: v.number(),
    usage_limit: v.optional(v.union(v.number(), v.null())),
    starts_at: v.optional(v.union(v.string(), v.null())),
    ends_at: v.optional(v.union(v.string(), v.null())),
    scope_type: v.string(),
    scope_value: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = cleanText(args.code, 40).toUpperCase();
    if (!code) throw new Error("Discount code is required.");
    const existing = await ctx.db.query("discounts").withIndex("by_code", (q) => q.eq("code", code)).first();
    if (existing) throw new Error("A discount with this code already exists.");
    const timestamp = nowIso();
    const id = await ctx.db.insert("discounts", {
      code,
      type: cleanText(args.type, 40) || "percent",
      value: Math.max(0, args.value),
      active: true,
      usage_limit: args.usage_limit ?? null,
      used_count: 0,
      starts_at: args.starts_at ?? null,
      ends_at: args.ends_at ?? null,
      scope_type: cleanText(args.scope_type, 40) || "all",
      scope_value: cleanText(args.scope_value, 120) || null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicDoc(doc) : null;
  },
});

export const updateDiscount = mutation({
  args: {
    id: v.string(),
    patch: v.object({
      code: v.optional(v.string()),
      type: v.optional(v.string()),
      value: v.optional(v.number()),
      active: v.optional(v.boolean()),
      usage_limit: v.optional(v.union(v.number(), v.null())),
      starts_at: v.optional(v.union(v.string(), v.null())),
      ends_at: v.optional(v.union(v.string(), v.null())),
      scope_type: v.optional(v.string()),
      scope_value: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch: Record<string, any> = { updated_at: nowIso() };
    if (args.patch.code !== undefined) patch.code = cleanText(args.patch.code, 40).toUpperCase();
    for (const key of ["type", "value", "active", "usage_limit", "starts_at", "ends_at", "scope_type", "scope_value"]) {
      if ((args.patch as any)[key] !== undefined) patch[key] = (args.patch as any)[key];
    }
    await ctx.db.patch(args.id as any, patch);
    const doc = await ctx.db.get(args.id as any);
    return doc ? publicDoc(doc) : null;
  },
});

export const deleteDiscount = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id as any);
    return true;
  },
});

export const listShippingRates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("shipping_rates").collect();
    return rows.map(publicDoc).sort((a, b) => `${a.carrier}-${a.zone}-${a.method}`.localeCompare(`${b.carrier}-${b.zone}-${b.method}`));
  },
});

export const seedShippingDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ensureShippingDefaults(ctx);
    return true;
  },
});

export const updateShippingRate = mutation({
  args: {
    id: v.string(),
    patch: v.object({
      base_fee: v.optional(v.number()),
      per_item_fee: v.optional(v.number()),
      per_weight_fee: v.optional(v.number()),
      is_active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id as any, { ...args.patch, updated_at: nowIso() });
    const doc = await ctx.db.get(args.id as any);
    return doc ? publicDoc(doc) : null;
  },
});

export const getStoreSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("store_settings").collect();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
});

export const saveStoreSettings = mutation({
  args: { settings: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const timestamp = nowIso();
    for (const [key, value] of Object.entries(args.settings ?? {})) {
      const existing = await ctx.db.query("store_settings").withIndex("by_key", (q) => q.eq("key", key)).first();
      if (existing) await ctx.db.patch(existing._id, { value, updated_at: timestamp });
      else await ctx.db.insert("store_settings", { key, value, updated_at: timestamp });
    }
    return true;
  },
});

export const notifications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [orders, products, reviews, rates] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("reviews").collect(),
      ctx.db.query("shipping_rates").collect(),
    ]);
    const now = Date.now();
    const rateTimes = rates.map((rate) => Date.parse(rate.updated_at)).filter((time) => Number.isFinite(time));
    const oldestRate = rateTimes.length ? Math.min(...rateTimes) : 0;
    const shippingDue = rates.length === 0 || !oldestRate || now - oldestRate >= 30 * 24 * 60 * 60 * 1000;
    const notices = [
      { id: "unshipped", count: orders.filter((o) => o.status === "processing").length, title: "Orders need fulfillment", body: "orders are processing", section: "orders" },
      { id: "tracking", count: orders.filter((o) => o.status === "shipped" && !o.tracking_number).length, title: "Missing tracking", body: "shipped orders need tracking", section: "orders" },
      { id: "low-stock", count: products.filter((p) => (p.stock_quantity ?? 0) <= 5).length, title: "Low stock", body: "products need inventory review", section: "products" },
      { id: "reviews", count: reviews.filter((r) => r.status === "pending").length, title: "Reviews pending", body: "reviews waiting", section: "reviews" },
      { id: "shipping-review", count: shippingDue ? 1 : 0, title: "Shipping rates due", body: "monthly carrier review is due", section: "shipping" },
    ];
    return notices.filter((notice) => notice.count > 0).map((notice) => ({
      id: notice.id,
      title: notice.title,
      body: `${notice.count} ${notice.body}`,
      section: notice.section,
    }));
  },
});

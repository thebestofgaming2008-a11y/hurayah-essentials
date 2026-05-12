import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, publicAddress, requireIdentity } from "./lib";

const addressPatch = {
  type: v.optional(v.union(v.string(), v.null())),
  is_default: v.optional(v.union(v.boolean(), v.null())),
  full_name: v.optional(v.union(v.string(), v.null())),
  phone: v.optional(v.union(v.string(), v.null())),
  address_line_1: v.optional(v.union(v.string(), v.null())),
  address_line_2: v.optional(v.union(v.string(), v.null())),
  city: v.optional(v.union(v.string(), v.null())),
  state: v.optional(v.union(v.string(), v.null())),
  postal_code: v.optional(v.union(v.string(), v.null())),
  country: v.optional(v.union(v.string(), v.null())),
};

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db.query("addresses").withIndex("by_user_id", (q) => q.eq("user_id", auth.userId)).collect();
    return rows.map(publicAddress).sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const create = mutation({
  args: { payload: v.object(addressPatch) },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const timestamp = nowIso();
    const id = await ctx.db.insert("addresses", { user_id: auth.userId, ...args.payload, created_at: timestamp, updated_at: timestamp });
    const doc = await ctx.db.get(id);
    return doc ? publicAddress(doc) : null;
  },
});

export const update = mutation({
  args: { id: v.string(), patch: v.object(addressPatch) },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const existing = await ctx.db.get(args.id as any);
    if (!existing || existing.user_id !== auth.userId) throw new Error("Address not found.");
    await ctx.db.patch(args.id as any, { ...args.patch, updated_at: nowIso() });
    const doc = await ctx.db.get(args.id as any);
    return doc ? publicAddress(doc) : null;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const existing = await ctx.db.get(args.id as any);
    if (!existing || existing.user_id !== auth.userId) throw new Error("Address not found.");
    await ctx.db.delete(args.id as any);
    return true;
  },
});

export const setDefault = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db.query("addresses").withIndex("by_user_id", (q) => q.eq("user_id", auth.userId)).collect();
    for (const row of rows) await ctx.db.patch(row._id, { is_default: row._id === (args.id as any), updated_at: nowIso() });
    return true;
  },
});
import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

export function nowIso() {
  return new Date().toISOString();
}

export function adminEmail() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is not configured in Convex environment.");
  return email.trim().toLowerCase();
}

export async function requireIdentity(ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = await getAuthUserId(ctx);
  if (!identity || !userId) throw new Error("Authentication required.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Authenticated user not found.");
  return { identity, userId, user };
}

export async function requireAdmin(ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>) {
  const auth = await requireIdentity(ctx);
  const email = (auth.user as any).email?.trim().toLowerCase();
  if (email !== adminEmail()) throw new Error("Admin access required.");
  return auth;
}

export function publicProduct(doc: Record<string, any>) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

export function publicProfile(doc: Record<string, any>) {
  const { _id, _creationTime, userId, ...rest } = doc;
  return { id: _id, user_id: userId, ...rest };
}

export function publicAddress(doc: Record<string, any>) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

export function publicOrder(doc: Record<string, any>) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
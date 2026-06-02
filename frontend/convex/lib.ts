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
  return { id: _id, ...normalizeBookCategory(rest) };
}

export function publicProductCard(doc: Record<string, any>) {
  const product = publicProduct(doc);
  const {
    description,
    images,
    linked_product_ids,
    edition,
    length_cm,
    width_cm,
    height_cm,
    weight_source_url,
    weight_confidence,
    ...card
  } = product;
  return card;
}

const BOOK_SUBJECTS = new Set(["aqeedah", "arabic", "fiqh", "hadith", "purification", "seerah", "tafsir", "urdu"]);
const BOOK_SUBJECT_LABELS: Record<string, string> = {
  aqeedah: "Aqeedah",
  arabic: "Arabic",
  fiqh: "Fiqh",
  hadith: "Hadith",
  purification: "Purification",
  seerah: "Seerah",
  tafsir: "Tafsir",
  urdu: "Urdu",
};

function normalizeBookCategory(product: Record<string, any>) {
  const category = String(product.category ?? "").toLowerCase();
  const categoryId = String(product.category_id ?? "").toLowerCase();
  const subject = BOOK_SUBJECTS.has(category) ? category : BOOK_SUBJECTS.has(categoryId) ? categoryId : "";
  const looksLikeBook = Boolean(product.author || product.publisher || product.isbn || product.pages || product.binding);
  if (!subject && !(category === "books" || looksLikeBook)) return product;
  const tags = Array.isArray(product.tags) ? product.tags : [];
  const subjectLabel = subject ? BOOK_SUBJECT_LABELS[subject] : null;
  return {
    ...product,
    category: "books",
    category_id: subject || product.category_id || "books",
    tags: subjectLabel ? Array.from(new Set([...tags, subjectLabel])) : tags,
  };
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

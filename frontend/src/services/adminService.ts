import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import type { Product } from "./productService";

export const PRODUCT_BUCKET = "product-images";

export interface ProductInput {
  name: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  author?: string | null;
  publisher?: string | null;
  language?: string | null;
  pages?: number | null;
  isbn?: string | null;
  binding?: string | null;
  edition?: string | null;
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  shipping_class?: string | null;
  weight_source_url?: string | null;
  weight_confidence?: string | null;
  price?: number;
  price_inr: number;
  sale_price?: number | null;
  sale_price_inr?: number | null;
  sku?: string | null;
  stock_quantity?: number | null;
  category?: string | null;
  category_id?: string | null;
  cover_image_url?: string | null;
  images?: string[];
  linked_product_ids?: string[];
  variant_label?: string | null;
  color_options?: string[] | null;
  size_options?: string[] | null;
  badge?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_new_arrival?: boolean;
  is_on_sale?: boolean;
  tags?: string[];
}

export async function listAllProducts(): Promise<Product[]> {
  return (await convex.query(api.products.listAllProducts, {})) as Product[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function createProduct(input: ProductInput): Promise<Product | null> {
  const payload = {
    ...input,
    slug: input.slug || slugify(input.name) || null,
    price: input.price ?? input.price_inr,
  };
  return (await convex.mutation(api.products.createProduct, payload)) as Product | null;
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
): Promise<Product | null> {
  const next: Record<string, unknown> = { ...patch };
  if (patch.price_inr != null && patch.price == null) next.price = patch.price_inr;
  return (await convex.mutation(api.products.updateProduct, { id, patch: next })) as Product | null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  return await convex.mutation(api.products.deleteProduct, { id });
}

export async function uploadProductImage(file: File): Promise<string | null> {
  const uploadUrl = await convex.mutation(api.products.generateProductImageUploadUrl, {});
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!result.ok) return null;
  const { storageId } = await result.json();
  const url = await convex.query(api.products.getProductImageUrl, { storageId });
  return url ? `${url}#${encodeURIComponent(file.name)}` : null;
}

export interface AdminDiscount {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  scope_type: string;
  scope_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  id: string;
  carrier: string;
  zone: string;
  method: string;
  base_fee: number;
  per_item_fee: number;
  per_weight_fee: number;
  is_active: boolean;
  updated_at: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  section: string;
}

export async function listDiscounts(): Promise<AdminDiscount[]> {
  return (await convex.query(api.admin.listDiscounts, {})) as AdminDiscount[];
}

export async function createDiscount(input: Omit<AdminDiscount, "id" | "active" | "used_count" | "created_at" | "updated_at">): Promise<AdminDiscount | null> {
  return (await convex.mutation(api.admin.createDiscount, input)) as AdminDiscount | null;
}

export async function updateDiscount(id: string, patch: Partial<AdminDiscount>): Promise<AdminDiscount | null> {
  return (await convex.mutation(api.admin.updateDiscount, { id, patch })) as AdminDiscount | null;
}

export async function deleteDiscount(id: string): Promise<boolean> {
  return await convex.mutation(api.admin.deleteDiscount, { id });
}

export async function listShippingRates(): Promise<ShippingRate[]> {
  let rows = (await convex.query(api.admin.listShippingRates, {})) as ShippingRate[];
  if (!rows.length) {
    await convex.mutation(api.admin.seedShippingDefaults, {});
    rows = (await convex.query(api.admin.listShippingRates, {})) as ShippingRate[];
  }
  return rows;
}

export async function updateShippingRate(id: string, patch: Partial<ShippingRate>): Promise<ShippingRate | null> {
  return (await convex.mutation(api.admin.updateShippingRate, { id, patch })) as ShippingRate | null;
}

export async function getStoreSettings(): Promise<Record<string, unknown>> {
  return (await convex.query(api.admin.getStoreSettings, {})) as Record<string, unknown>;
}

export async function saveStoreSettings(settings: Record<string, unknown>): Promise<boolean> {
  return await convex.mutation(api.admin.saveStoreSettings, { settings });
}

export async function listAdminNotifications(): Promise<AdminNotification[]> {
  return (await convex.query(api.admin.notifications, {})) as AdminNotification[];
}

export interface AdminOrder {
  id: string;
  order_number: string | null;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string | null;
  payment_status: string | null;
  shipping_payment_status?: string | null;
  shipping_payment_note?: string | null;
  customer_country_type?: string | null;
  shipping_cost?: number | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  tracking_email_sent_at?: string | null;
  tracking_email_status?: string | null;
  tracking_email_error?: string | null;
  total: number;
  total_inr: number | null;
  created_at: string | null;
  items?: Array<{
    id: string;
    product_id?: string | null;
    product_name?: string | null;
    product_image_url?: string | null;
    selected_color?: string | null;
    selected_size?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export async function listAllOrders(limit = 100): Promise<AdminOrder[]> {
  return (await convex.query(api.orders.listAll, { limit })) as AdminOrder[];
}

export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
  return await convex.mutation(api.orders.updateStatus, { id, status });
}

export async function updateOrderTracking(
  id: string,
  payload: { carrier?: string | null; trackingNumber: string; trackingUrl?: string | null },
): Promise<AdminOrder | null> {
  return (await convex.mutation(api.orders.updateTracking, { id, ...payload })) as AdminOrder | null;
}

export async function sendTrackingEmail(id: string): Promise<boolean> {
  const result = (await convex.action(api.notifications.sendTrackingEmail, { orderId: id })) as { success?: boolean };
  return Boolean(result?.success);
}

export interface AdminCustomer {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string | null;
}

export async function listAllCustomers(limit = 200): Promise<AdminCustomer[]> {
  return (await convex.query(api.users.listCustomers, { limit })) as AdminCustomer[];
}

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  media_urls: string[] | null;
  status: string;
  admin_note: string | null;
  created_at: string | null;
}

export async function listAllReviews(limit = 200): Promise<AdminReview[]> {
  return (await convex.query(api.reviews.listAll, { limit })) as AdminReview[];
}

export async function updateReviewStatus(
  id: string,
  status: "pending" | "published" | "hidden",
  adminNote?: string | null,
): Promise<boolean> {
  return await convex.mutation(api.reviews.updateStatus, { id, status, adminNote: adminNote ?? null });
}

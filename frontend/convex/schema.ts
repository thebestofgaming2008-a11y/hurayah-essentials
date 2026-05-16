import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const optionalString = v.optional(v.union(v.string(), v.null()));
const optionalNumber = v.optional(v.union(v.number(), v.null()));
const optionalBoolean = v.optional(v.union(v.boolean(), v.null()));
const optionalStringArray = v.optional(v.union(v.array(v.string()), v.null()));

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.string(),
    email: optionalString,
    full_name: optionalString,
    phone: optionalString,
    avatar_url: optionalString,
    preferred_currency: optionalString,
    marketing_consent: optionalBoolean,
    date_of_birth: optionalString,
    total_orders: optionalNumber,
    total_spent: optionalNumber,
    created_at: optionalString,
    updated_at: optionalString,
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),
  addresses: defineTable({
    user_id: v.string(),
    type: optionalString,
    is_default: optionalBoolean,
    full_name: optionalString,
    phone: optionalString,
    address_line_1: optionalString,
    address_line_2: optionalString,
    city: optionalString,
    state: optionalString,
    postal_code: optionalString,
    country: optionalString,
    created_at: optionalString,
    updated_at: optionalString,
  }).index("by_user_id", ["user_id"]),
  products: defineTable({
    name: v.string(),
    slug: optionalString,
    short_description: optionalString,
    description: optionalString,
    author: optionalString,
    publisher: optionalString,
    language: optionalString,
    pages: optionalNumber,
    isbn: optionalString,
    binding: optionalString,
    edition: optionalString,
    weight_g: optionalNumber,
    length_cm: optionalNumber,
    width_cm: optionalNumber,
    height_cm: optionalNumber,
    shipping_class: optionalString,
    weight_source_url: optionalString,
    weight_confidence: optionalString,
    price: v.number(),
    price_inr: v.number(),
    sale_price: optionalNumber,
    sale_price_inr: optionalNumber,
    sku: optionalString,
    stock_quantity: optionalNumber,
    category: optionalString,
    category_id: optionalString,
    tags: optionalStringArray,
    cover_image_url: optionalString,
    images: optionalStringArray,
    linked_product_ids: optionalStringArray,
    variant_label: optionalString,
    badge: optionalString,
    rating: optionalNumber,
    reviews_count: optionalNumber,
    is_active: optionalBoolean,
    is_featured: optionalBoolean,
    is_new_arrival: optionalBoolean,
    is_bestseller: optionalBoolean,
    is_on_sale: optionalBoolean,
    in_stock: optionalBoolean,
    created_at: optionalString,
    updated_at: optionalString,
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_active", ["is_active"]),
  orders: defineTable({
    order_number: v.string(),
    user_id: optionalString,
    customer_email: optionalString,
    customer_name: optionalString,
    customer_phone: optionalString,
    status: optionalString,
    payment_status: optionalString,
    subtotal: v.number(),
    tax: optionalNumber,
    shipping_cost: optionalNumber,
    discount: optionalNumber,
    total: v.number(),
    total_inr: optionalNumber,
    currency: optionalString,
    shipping_address: v.optional(v.any()),
    payment_provider: optionalString,
    payment_order_id: optionalString,
    payment_id: optionalString,
    tracking_carrier: optionalString,
    tracking_number: optionalString,
    tracking_url: optionalString,
    tracking_email_sent_at: optionalString,
    tracking_email_status: optionalString,
    tracking_email_error: optionalString,
    created_at: optionalString,
    updated_at: optionalString,
  })
    .index("by_user_id", ["user_id"])
    .index("by_customer_email", ["customer_email"])
    .index("by_order_number", ["order_number"])
    .index("by_created_at", ["created_at"]),
  order_items: defineTable({
    order_id: v.id("orders"),
    product_id: optionalString,
    product_name: optionalString,
    product_image_url: optionalString,
    quantity: v.number(),
    unit_price: v.number(),
    subtotal: v.number(),
  }).index("by_order_id", ["order_id"]),
  reviews: defineTable({
    product_id: v.string(),
    user_id: optionalString,
    customer_name: optionalString,
    customer_email: optionalString,
    rating: v.number(),
    title: optionalString,
    body: optionalString,
    media_urls: optionalStringArray,
    status: v.string(),
    admin_note: optionalString,
    created_at: optionalString,
    updated_at: optionalString,
  })
    .index("by_product_id", ["product_id"])
    .index("by_status", ["status"])
    .index("by_created_at", ["created_at"]),
  discounts: defineTable({
    code: v.string(),
    type: v.string(),
    value: v.number(),
    active: v.boolean(),
    usage_limit: optionalNumber,
    used_count: v.number(),
    starts_at: optionalString,
    ends_at: optionalString,
    scope_type: v.string(),
    scope_value: optionalString,
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["active"]),
  shipping_rates: defineTable({
    carrier: v.string(),
    zone: v.string(),
    method: v.string(),
    base_fee: v.number(),
    per_item_fee: v.number(),
    per_weight_fee: v.number(),
    is_active: v.boolean(),
    updated_at: v.string(),
  })
    .index("by_carrier", ["carrier"])
    .index("by_carrier_zone_method", ["carrier", "zone", "method"]),
  store_settings: defineTable({
    key: v.string(),
    value: v.any(),
    updated_at: v.string(),
  }).index("by_key", ["key"]),
});

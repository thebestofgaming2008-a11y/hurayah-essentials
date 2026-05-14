import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { nowIso, publicOrder, requireAdmin, requireIdentity } from "./lib";
import { calculateShippingInr } from "./shipping";

const cartItem = v.object({
  productId: v.string(),
  qty: v.number(),
  name: v.string(),
  price: v.number(),
  priceInr: v.optional(v.union(v.number(), v.null())),
  image: v.optional(v.union(v.string(), v.null())),
  slug: v.optional(v.union(v.string(), v.null())),
});

const checkoutCustomer = v.object({
  email: v.string(),
  phone: v.string(),
  name: v.string(),
  address_line_1: v.string(),
  address_line_2: v.optional(v.string()),
  city: v.string(),
  postal_code: v.string(),
  country: v.string(),
});

const checkoutPayload = {
  cart: v.array(cartItem),
  customer: checkoutCustomer,
  subtotal: v.number(),
  shipping: v.number(),
  total: v.number(),
};

const ORDER_STATUSES = new Set([
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 160) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function cleanEmail(value: string) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
  return email;
}

function cleanPhone(value: string) {
  const phone = cleanText(value, 32);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("A valid phone number is required.");
  }
  return phone;
}

function cleanTrackingUrl(value: string | null | undefined) {
  const url = cleanText(value, 500);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Tracking URL must start with http:// or https://.");
  }
  return url;
}

async function orderWithItems(ctx: any, order: any) {
  const items = await ctx.db.query("order_items").withIndex("by_order_id", (q: any) => q.eq("order_id", order._id)).collect();
  return {
    ...publicOrder(order),
    items: items.map((item: any) => {
      const { _id, _creationTime, order_id, ...rest } = item;
      return { id: _id, order_id, ...rest };
    }),
  };
}

async function checkoutQuote(ctx: any, cart: Array<any>) {
  if (!cart.length) throw new Error("Cart is empty.");
  let subtotal = 0;
  let itemCount = 0;
  for (const item of cart) {
    const qty = Math.floor(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new Error("Cart quantity is invalid.");
    const product = await ctx.db.get(item.productId as any);
    if (!product || product.is_active === false) throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
    const stock = product.stock_quantity ?? 0;
    if (stock < qty || product.in_stock === false) throw new Error(`Not enough stock for ${product.name}.`);
    const unitPrice = product.sale_price_inr ?? product.price_inr ?? product.price;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price for ${product.name}.`);
    subtotal += unitPrice * qty;
    itemCount += qty;
  }
  const shipping = calculateShippingInr(subtotal);
  const total = subtotal + shipping;
  return { subtotal, shipping, total, amountPaise: Math.round(total * 100), itemCount };
}

async function savePaidOrder(ctx: any, args: {
  cart: Array<any>;
  customer: any;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  if (!args.cart.length) throw new Error("Cart is empty.");
  const customer = {
    email: cleanEmail(args.customer.email),
    phone: cleanPhone(args.customer.phone),
    name: cleanText(args.customer.name, 120),
    address_line_1: cleanText(args.customer.address_line_1, 180),
    address_line_2: cleanNullable(args.customer.address_line_2, 180) ?? undefined,
    city: cleanText(args.customer.city, 80),
    postal_code: cleanText(args.customer.postal_code, 24),
    country: cleanText(args.customer.country, 80),
  };
  if (!customer.name || !customer.address_line_1 || !customer.city || !customer.postal_code || !customer.country) {
    throw new Error("Complete shipping details are required.");
  }

  const normalizedItems = [];
  let computedSubtotal = 0;
  for (const item of args.cart) {
    const qty = Math.floor(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new Error("Cart quantity is invalid.");
    const product = await ctx.db.get(item.productId as any);
    if (!product || product.is_active === false) throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
    const stock = product.stock_quantity ?? 0;
    if (stock < qty || product.in_stock === false) throw new Error(`Not enough stock for ${product.name}.`);
    const unitPrice = product.sale_price_inr ?? product.price_inr ?? product.price;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price for ${product.name}.`);
    computedSubtotal += unitPrice * qty;
    normalizedItems.push({ product, qty, unitPrice });
  }

  const computedShipping = calculateShippingInr(computedSubtotal);
  const computedTotal = computedSubtotal + computedShipping;
  const timestamp = nowIso();
  const orderNumber = `HE-${Date.now().toString().slice(-8)}`;
  const orderId = await ctx.db.insert("orders", {
    order_number: orderNumber,
    user_id: null,
    customer_email: customer.email,
    customer_name: customer.name,
    customer_phone: customer.phone,
    status: "processing",
    payment_status: "paid",
    subtotal: computedSubtotal,
    tax: 0,
    shipping_cost: computedShipping,
    discount: 0,
    total: computedTotal,
    total_inr: computedTotal,
    currency: "INR",
    shipping_address: customer,
    payment_provider: "RAZORPAY",
    payment_order_id: cleanText(args.razorpay_order_id, 120),
    payment_id: cleanText(args.razorpay_payment_id, 120),
    created_at: timestamp,
    updated_at: timestamp,
  });

  for (const item of normalizedItems) {
    await ctx.db.insert("order_items", {
      order_id: orderId,
      product_id: item.product._id,
      product_name: item.product.name,
      product_image_url: item.product.cover_image_url ?? null,
      quantity: item.qty,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.qty,
    });
    const nextStock = Math.max(0, (item.product.stock_quantity ?? 0) - item.qty);
    await ctx.db.patch(item.product._id, {
      stock_quantity: nextStock,
      in_stock: nextStock > 0,
      updated_at: timestamp,
    });
  }

  const order = await ctx.db.get(orderId);
  return order ? publicOrder(order) : null;
}

export const quoteCheckout = query({
  args: { cart: v.array(cartItem) },
  handler: async (ctx, args) => {
    return await checkoutQuote(ctx, args.cart);
  },
});

function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay test keys are not configured.");
  return { keyId, keySecret };
}

function basicAuth(keyId: string, keySecret: string) {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

async function razorpayRequest(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = razorpayKeys();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: basicAuth(keyId, keySecret),
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.description ?? "Razorpay request failed.");
  return body;
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const createRazorpayCheckoutOrder = action({
  args: checkoutPayload,
  handler: async (ctx, args) => {
    const quote = await ctx.runQuery(api.orders.quoteCheckout, { cart: args.cart });
    const { keyId } = razorpayKeys();
    const receipt = `HE-${Date.now().toString().slice(-8)}`;
    const order = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: quote.amountPaise,
        currency: "INR",
        receipt,
        notes: {
          customer: cleanText(args.customer.name, 80),
          email: cleanText(args.customer.email, 120),
        },
      }),
    });
    return { keyId, orderId: order.id, amount: order.amount, currency: order.currency, receipt };
  },
});

export const createMockCheckoutOrder = mutation({
  args: checkoutPayload,
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    if (!args.cart.length) throw new Error("Cart is empty.");

    const customer = {
      email: cleanEmail(args.customer.email),
      phone: cleanPhone(args.customer.phone),
      name: cleanText(args.customer.name, 120),
      address_line_1: cleanText(args.customer.address_line_1, 180),
      address_line_2: cleanNullable(args.customer.address_line_2, 180) ?? undefined,
      city: cleanText(args.customer.city, 80),
      postal_code: cleanText(args.customer.postal_code, 24),
      country: cleanText(args.customer.country, 80),
    };
    if (!customer.name || !customer.address_line_1 || !customer.city || !customer.postal_code || !customer.country) {
      throw new Error("Complete shipping details are required.");
    }

    const normalizedItems = [];
    let computedSubtotal = 0;
    let itemCount = 0;
    for (const item of args.cart) {
      const qty = Math.floor(item.qty);
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        throw new Error("Cart quantity is invalid.");
      }
      const product = await ctx.db.get(item.productId as any);
      if (!product || product.is_active === false) {
        throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
      }
      const stock = product.stock_quantity ?? 0;
      if (stock < qty || product.in_stock === false) {
        throw new Error(`Not enough stock for ${product.name}.`);
      }
      const unitPrice = product.sale_price_inr ?? product.price_inr ?? product.price;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid price for ${product.name}.`);
      }
      computedSubtotal += unitPrice * qty;
      itemCount += qty;
      normalizedItems.push({ product, qty, unitPrice });
    }
    const computedShipping = calculateShippingInr(computedSubtotal);
    const computedTotal = computedSubtotal + computedShipping;
    const timestamp = nowIso();
    const orderNumber = `HE-${Date.now().toString().slice(-8)}`;
    const orderId = await ctx.db.insert("orders", {
      order_number: orderNumber,
      user_id: auth.userId,
      customer_email: customer.email,
      customer_name: customer.name,
      customer_phone: customer.phone,
      status: "processing",
      payment_status: "MOCKED_PAID",
      subtotal: computedSubtotal,
      tax: 0,
      shipping_cost: computedShipping,
      discount: 0,
      total: computedTotal,
      total_inr: computedTotal,
      currency: "INR",
      shipping_address: customer,
      payment_provider: "RAZORPAY_MOCKED",
      payment_order_id: `mock_order_${Date.now()}`,
      payment_id: `mock_pay_${Date.now()}`,
      created_at: timestamp,
      updated_at: timestamp,
    });
    for (const item of normalizedItems) {
      await ctx.db.insert("order_items", {
        order_id: orderId,
        product_id: item.product._id,
        product_name: item.product.name,
        product_image_url: item.product.cover_image_url ?? null,
        quantity: item.qty,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.qty,
      });
      const nextStock = Math.max(0, (item.product.stock_quantity ?? 0) - item.qty);
      await ctx.db.patch(item.product._id, {
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
        updated_at: timestamp,
      });
    }
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", auth.userId)).unique();
    if (profile) {
      await ctx.db.patch(profile._id, {
        total_orders: (profile.total_orders ?? 0) + 1,
        total_spent: (profile.total_spent ?? 0) + computedTotal,
        updated_at: timestamp,
      });
    }
    const order = await ctx.db.get(orderId);
    return order ? publicOrder(order) : null;
  },
});

export const markRazorpayPaid = mutation({
  args: {
    id: v.string(),
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const order = await ctx.db.get(args.id as any);
    if (!order) throw new Error("Order not found.");
    if (order.user_id !== auth.userId) throw new Error("Order access denied.");
    await ctx.db.patch(args.id as any, {
      payment_status: "paid",
      payment_provider: "RAZORPAY",
      payment_order_id: cleanText(args.razorpay_order_id, 120),
      payment_id: cleanText(args.razorpay_payment_id, 120),
      updated_at: nowIso(),
    });
    const saved = await ctx.db.get(args.id as any);
    return saved ? publicOrder(saved) : null;
  },
});

export const saveVerifiedGuestOrder = internalMutation({
  args: {
    ...checkoutPayload,
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args) => {
    return await savePaidOrder(ctx, args);
  },
});

export const verifyRazorpayPayment = action({
  args: {
    ...checkoutPayload,
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args) => {
    const { keySecret } = razorpayKeys();
    const expectedSignature = await hmacSha256Hex(keySecret, `${args.razorpay_order_id}|${args.razorpay_payment_id}`);
    if (expectedSignature !== args.razorpay_signature) throw new Error("Razorpay signature verification failed.");

    const [quote, razorpayOrder] = await Promise.all([
      ctx.runQuery(api.orders.quoteCheckout, { cart: args.cart }),
      razorpayRequest(`/orders/${args.razorpay_order_id}`),
    ]);
    if (razorpayOrder.amount !== quote.amountPaise || razorpayOrder.currency !== "INR") {
      throw new Error("Razorpay amount does not match the current cart total.");
    }

    return await ctx.runMutation(internal.orders.saveVerifiedGuestOrder, {
      cart: args.cart,
      customer: args.customer,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
      razorpay_signature: args.razorpay_signature,
    });
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db.query("orders").withIndex("by_user_id", (q) => q.eq("user_id", auth.userId)).collect();
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("orders").take(args.limit ?? 100);
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const getAdminOrderForEmail = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.id as any);
    return order ? publicOrder(order) : null;
  },
});

export const updateStatus = mutation({
  args: { id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!ORDER_STATUSES.has(status)) throw new Error("Invalid order status.");
    await ctx.db.patch(args.id as any, { status, updated_at: nowIso() });
    return true;
  },
});

export const updateTracking = mutation({
  args: {
    id: v.string(),
    carrier: v.optional(v.union(v.string(), v.null())),
    trackingNumber: v.string(),
    trackingUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const trackingNumber = cleanText(args.trackingNumber, 120);
    if (!trackingNumber) throw new Error("Tracking number is required.");
    await ctx.db.patch(args.id as any, {
      tracking_carrier: cleanNullable(args.carrier, 80),
      tracking_number: trackingNumber,
      tracking_url: cleanTrackingUrl(args.trackingUrl),
      status: "shipped",
      tracking_email_status: "ready",
      tracking_email_error: null,
      updated_at: nowIso(),
    });
    const order = await ctx.db.get(args.id as any);
    return order ? publicOrder(order) : null;
  },
});

export const markTrackingEmailResult = mutation({
  args: { id: v.string(), status: v.string(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch: Record<string, string | null> = {
      tracking_email_status: args.status,
      tracking_email_error: args.error ?? null,
      updated_at: nowIso(),
    };
    if (args.status === "sent") patch.tracking_email_sent_at = nowIso();
    await ctx.db.patch(args.id as any, patch);
    return true;
  },
});

export const getByNumber = query({
  args: { orderNumber: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const orderNumber = cleanText(args.orderNumber, 40).toUpperCase();
    const email = cleanEmail(args.email);
    const order = await ctx.db.query("orders").withIndex("by_order_number", (q) => q.eq("order_number", orderNumber)).first();
    if (!order || order.customer_email?.trim().toLowerCase() !== email) return null;
    return await orderWithItems(ctx, order);
  },
});

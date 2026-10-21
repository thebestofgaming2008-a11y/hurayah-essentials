// @vitest-environment node
import { convexTest } from "convex-test";
import { describe, expect, it, vi, afterEach } from "vitest";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const customer = { email: "test@example.com", name: "Test Customer", phone: "+919876543210", address_line_1: "Test address", city: "Delhi", postal_code: "110001", country: "India" };
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function setup(twoLines = false) {
  const t = convexTest(schema, modules);
  const productId = await t.run((ctx) => ctx.db.insert("products", { name: "Test book", price: 100, price_inr: 100, stock_quantity: 10, in_stock: true, is_active: true }));
  const cart = [{ productId, name: "Test book", price: 1, qty: 2 }];
  if (twoLines) cart.push({ productId, name: "Test book", price: 1, qty: 3 });
  const amount = twoLines ? 50000 : 20000;
  const intentId = await t.mutation(internal.orders.reserveCheckoutIntent, { razorpay_order_id: "order_test", customer, cart, amount_paise: amount });
  const finalize = () => t.mutation(internal.orders.finalizeCheckoutIntent, { razorpay_order_id: "order_test", razorpay_payment_id: "pay_test", amount_paise: amount, currency: "INR" });
  return { t, productId, intentId, finalize, amount };
}

describe("payment and inventory recovery", () => {
  it("uses server prices and creates only one order for repeated callbacks", async () => {
    const { t, productId, finalize } = await setup();
    await finalize();
    await finalize();
    const result = await t.run(async (ctx) => ({ orders: await ctx.db.query("orders").collect(), product: await ctx.db.get(productId) }));
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].total).toBe(200);
    expect(result.product?.stock_quantity).toBe(8);
  });

  it("deduplicates webhook deliveries and preserves a paid order after a late failure event", async () => {
    const { t, productId } = await setup();
    const event = { event_id: "event_capture", event_type: "payment.captured", razorpay_order_id: "order_test", razorpay_payment_id: "pay_test", amount_paise: 20000, currency: "INR" };
    await t.mutation(internal.orders.recordRazorpayWebhook, event);
    expect(await t.mutation(internal.orders.recordRazorpayWebhook, event)).toEqual({ duplicate: true });
    await t.mutation(internal.orders.recordRazorpayWebhook, { ...event, event_id: "event_late_failure", event_type: "payment.failed" });
    const result = await t.run(async (ctx) => ({ order: await ctx.db.query("orders").first(), product: await ctx.db.get(productId) }));
    expect(result.order?.payment_status).toBe("paid");
    expect(result.product?.stock_quantity).toBe(8);
  });

  it("releases abandoned stock once and recovers a later captured payment", async () => {
    const { t, productId, intentId, finalize } = await setup();
    await t.run((ctx) => ctx.db.patch(intentId, { expires_at: Date.now() - 1 }));
    await t.mutation(internal.orders.cleanupExpiredCheckoutIntents, {});
    await t.mutation(internal.orders.cleanupExpiredCheckoutIntents, {});
    expect((await t.run((ctx) => ctx.db.get(productId)))?.stock_quantity).toBe(10);
    await finalize();
    expect((await t.run((ctx) => ctx.db.get(productId)))?.stock_quantity).toBe(8);
  });

  it("saves a paid order even if its product was removed after checkout", async () => {
    const { t, productId, finalize } = await setup();
    await t.run((ctx) => ctx.db.delete(productId));
    await finalize();
    expect(await t.run((ctx) => ctx.db.query("orders").first())).toMatchObject({ total: 200, payment_status: "paid", inventory_attention: true });
  });

  it("flags an amount mismatch instead of silently creating a paid order", async () => {
    const { t, intentId } = await setup();
    await t.mutation(internal.orders.finalizeCheckoutIntent, { razorpay_order_id: "order_test", razorpay_payment_id: "pay_test", amount_paise: 1, currency: "INR" });
    expect(await t.run((ctx) => ctx.db.query("orders").first())).toBeNull();
    expect((await t.run((ctx) => ctx.db.get(intentId)))?.status).toBe("recovery_required");
  });

  it("decrements total stock across multiple variants of the same product", async () => {
    const { t, productId, finalize } = await setup(true);
    await finalize();
    expect((await t.run((ctx) => ctx.db.get(productId)))?.stock_quantity).toBe(5);
  });

  it("rejects a quote when variant quantities together exceed stock", async () => {
    const { t, productId } = await setup();
    await expect(t.query(api.orders.quoteCheckout, { cart: [
      { productId, name: "Test book", price: 1, qty: 5 },
      { productId, name: "Test book", price: 1, qty: 5 },
    ] })).rejects.toThrow(/Not enough stock/);
  });

  it("rejects unsigned webhooks without writes", async () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "test-only-secret");
    const t = convexTest(schema, modules);
    const response = await t.fetch("/razorpay/webhook", { method: "POST", body: "{}" });
    expect(response.status).toBe(401);
    expect(await t.run((ctx) => ctx.db.query("razorpay_webhook_events").collect())).toEqual([]);
  });

  it("rejects unauthenticated administrative access", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.orders.listAll, {})).rejects.toThrow(/Authentication/);
  });

  it("does not regress a full refund when an older partial refund arrives", async () => {
    const { t, finalize } = await setup();
    await finalize();
    await t.mutation(internal.orders.applyRazorpayRefund, { razorpay_payment_id: "pay_test", amount_refunded_paise: 20000 });
    await t.mutation(internal.orders.applyRazorpayRefund, { razorpay_payment_id: "pay_test", amount_refunded_paise: 5000 });
    expect(await t.run((ctx) => ctx.db.query("orders").first())).toMatchObject({ payment_status: "refunded", refund_amount_inr: 200 });
  });

  it("retires expired recovery candidates so they cannot block newer checkouts", async () => {
    const { t, intentId } = await setup();
    const old = Date.now() - 20 * 86400000;
    await t.run((ctx) => ctx.db.patch(intentId, { status: "released", expires_at: old, reconcile_after: old }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await t.action(internal.orders.reconcileCapturedPayments, {});
    expect((await t.run((ctx) => ctx.db.get(intentId)))?.reconcile_after).toBeNull();
    expect(await t.query(internal.orders.listUnresolvedCheckoutIntents, { now: Date.now() })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

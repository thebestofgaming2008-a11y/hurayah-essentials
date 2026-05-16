import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useShop } from "@/store/shop";
import { createRazorpayCheckoutOrder, verifyRazorpayPayment } from "@/services/orderService";
import { calculateShippingInr } from "@/services/shipping";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { PaymentMethods } from "@/components/shop/PaymentMethods";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const Checkout = () => {
  const { cartLines, cartSubtotal, clearCart, updateQty, removeFromCart, openCart } = useShop();
  const { format, currency } = useCurrency();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    postalCode: "",
    country: "India",
  });
  const shipping = calculateShippingInr(cartSubtotal, cartLines);
  const total = cartSubtotal + shipping;

  const steps = useMemo(() => [
    { label: "Contact", done: Boolean(form.email && form.phone) },
    { label: "Shipping", done: Boolean(form.firstName && form.lastName && form.address && form.city && form.postalCode) },
    { label: "Payment", done: true },
  ], [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email.";
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!/^\+?[0-9\s().-]{8,20}$/.test(form.phone.trim()) || phoneDigits.length < 8 || phoneDigits.length > 15) {
      nextErrors.phone = "Enter a valid WhatsApp number with country code, for example +91 98765 43210.";
    }
    if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!form.address.trim()) nextErrors.address = "Address is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!form.postalCode.trim()) nextErrors.postalCode = "Postal code is required.";
    if (!form.country.trim()) nextErrors.country = "Country is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (cartLines.length === 0) return;
    setSubmitting(true);
    try {
      const customer = {
        email: form.email.trim(),
        phone: form.phone.trim(),
        name: `${form.firstName} ${form.lastName}`.trim(),
        address_line_1: form.address.trim(),
        address_line_2: form.apartment.trim() || undefined,
        city: form.city.trim(),
        postal_code: form.postalCode.trim(),
        country: form.country.trim(),
      };
      const payload = {
        cart: cartLines,
        customer,
        subtotal: cartSubtotal,
        shipping,
        total,
      };
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) throw new Error("Razorpay checkout could not be loaded. Check your connection and try again.");
      const RazorpayCheckout = window.Razorpay;
      const razorpayOrder = await createRazorpayCheckoutOrder(payload);
      await new Promise<void>((resolve, reject) => {
        const checkout = new RazorpayCheckout({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Hurayrah Essentials",
          description: "Secure checkout",
          order_id: razorpayOrder.orderId,
          prefill: { name: customer.name, email: customer.email, contact: customer.phone },
          notes: { source: "hurayah_webshop" },
          theme: { color: "#171717" },
          handler: async (response: any) => {
            try {
              const order = await verifyRazorpayPayment({
                ...payload,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              clearCart();
              toast({ title: "Payment received", description: "Your order was verified and saved securely." });
              navigate(`/order-confirmation?id=${order?.order_number ?? "HE-PAID"}`);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment was cancelled.")) },
        });
        checkout.on("payment.failed", (response: any) => reject(new Error(response?.error?.description ?? "Payment failed.")));
        checkout.open();
      });
    } catch (error) {
      console.error("checkout", error);
      toast({ title: "Could not place order", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  if (cartLines.length === 0) {
    return (
      <SiteLayout hideHeader compactFooter>
        <div className="mx-auto max-w-[760px] px-4 md:px-8 py-16 md:py-24 text-center">
          <h1 className="mt-5 text-foreground font-semibold tracking-tight text-3xl">Your cart is empty</h1>
          <p className="mt-2 text-foreground/60 text-sm">Add items before starting checkout.</p>
          <Link
            to="/shop"
            data-testid="checkout-empty-browse-link"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-brand text-brand-foreground font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
          >
            Browse products
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout hideHeader compactFooter>
      <div className="vibe-admin min-h-[calc(100vh-120px)] border-t border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
        <div className="mx-auto max-w-[1280px] px-3 sm:px-4 md:px-8 py-4 md:py-8">
          <div className="vibe-card mb-4 px-4 py-3 md:mb-6 md:px-5 md:py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => navigate(-1)} data-testid="checkout-go-back-button" className="inline-flex items-center gap-1.5 text-[12px] text-[rgb(var(--vibe-muted))] transition-colors hover:text-[rgb(var(--vibe-foreground))]">
                  ← Back
                </button>
                <button type="button" onClick={openCart} data-testid="checkout-back-to-cart-link" className="inline-flex items-center gap-1.5 text-[12px] text-[rgb(var(--vibe-muted))] transition-colors hover:text-[rgb(var(--vibe-foreground))]">
                  Review cart
                </button>
              </div>
              <h1 className="text-[20px] font-semibold tracking-tight md:text-[24px]">Checkout</h1>
              <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">Guest checkout. Customers can track orders with order number and email.</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" data-testid="checkout-progress-steps">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-2 shrink-0">
                  <span className={cn("grid h-7 w-7 place-items-center rounded-md border text-[11px] font-medium", step.done ? "border-[rgb(var(--vibe-foreground))] bg-[rgb(var(--vibe-foreground))] text-white" : "border-[rgb(var(--vibe-border))] bg-white text-[rgb(var(--vibe-muted))]")}>
                    {step.done ? "✓" : index + 1}
                  </span>
                  <span className="text-[11px] font-medium text-[rgb(var(--vibe-muted))]">{step.label}</span>
                </div>
              ))}
            </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid lg:grid-cols-[minmax(0,1fr)_430px] gap-4 lg:gap-6" data-testid="checkout-form">
            <div className="space-y-4">
              <Section title="Contact">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Email" type="email" value={form.email} onChange={setField("email")} error={errors.email} required testId="checkout-email-input" />
                  <Field
                    label="Phone / WhatsApp"
                    type="tel"
                    value={form.phone}
                    onChange={setField("phone")}
                    error={errors.phone}
                    required
                    testId="checkout-phone-input"
                    hint="Important: dispatch tracking is sent by WhatsApp, so this must be the customer's real WhatsApp number with country code."
                    placeholder="+91 98765 43210"
                  />
                </div>
              </Section>

              <Section title="Shipping address">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="First name" value={form.firstName} onChange={setField("firstName")} error={errors.firstName} required testId="checkout-first-name-input" />
                  <Field label="Last name" value={form.lastName} onChange={setField("lastName")} error={errors.lastName} required testId="checkout-last-name-input" />
                </div>
                <Field label="Address" value={form.address} onChange={setField("address")} error={errors.address} required testId="checkout-address-input" />
                <Field label="Apartment, suite (optional)" value={form.apartment} onChange={setField("apartment")} testId="checkout-apartment-input" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="City" value={form.city} onChange={setField("city")} error={errors.city} required testId="checkout-city-input" />
                  <Field label="Postal code" value={form.postalCode} onChange={setField("postalCode")} error={errors.postalCode} required testId="checkout-postal-code-input" />
                </div>
                <Field label="Country" value={form.country} onChange={setField("country")} error={errors.country} required testId="checkout-country-input" />
              </Section>

              <Section title="Delivery method">
                <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-between gap-3" data-testid="checkout-delivery-method-card">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Standard tracked delivery</p>
                    <p className="text-xs text-foreground/55 mt-0.5">India rate: ₹50 up to 500g, ₹80 around 1kg. Tracking is shared by WhatsApp after dispatch.</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{shipping === 0 ? "Free" : format(shipping)}</span>
                </div>
              </Section>

              <Section title="Payment">
                <p className="text-xs text-foreground/55 inline-flex items-center gap-1 mb-2">
                  Secure payment handoff
                </p>
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-foreground/75" data-testid="checkout-razorpay-live-notice">
                  Test checkout is active. The order is verified before saving.
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Payment provider" placeholder="Checkout" disabled value="" onChange={() => undefined} testId="checkout-card-number-input" />
                  <Field label="Mode" placeholder="Test keys" disabled value="" onChange={() => undefined} testId="checkout-expiry-input" />
                  <Field label="Verification" placeholder="Signature checked" disabled value="" onChange={() => undefined} testId="checkout-cvc-input" />
                </div>
              </Section>
            </div>

            <aside className="vibe-card h-fit p-4 md:p-5 lg:sticky lg:top-[150px]" data-testid="checkout-order-summary">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium">Order summary</h2>
                <span className="rounded bg-[rgb(var(--vibe-surface))] px-2 py-1 text-[11px] text-[rgb(var(--vibe-muted))]">{cartLines.length} items</span>
              </div>
              <ul className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {cartLines.map((line) => (
                  <li key={line.cartKey ?? line.productId} className="rounded-lg border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] p-2.5 text-[12px]" data-testid={`checkout-summary-item-${line.cartKey ?? line.productId}`}>
                    <div className="flex items-start gap-3">
                    <span className="h-16 w-12 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                      {line.image && <img src={line.image} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2 font-medium leading-snug">{line.name}</p>
                      {(line.selectedColor || line.selectedSize) && (
                        <p className="mt-1 text-[11px] text-[rgb(var(--vibe-muted))]">
                          {[line.selectedColor && `Colour: ${line.selectedColor}`, line.selectedSize && `Size: ${line.selectedSize}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-grid grid-cols-[30px_30px_30px] overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                          <button type="button" onClick={() => updateQty(line.cartKey ?? line.productId, line.qty - 1)} className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]" aria-label="Decrease quantity">
                            -
                          </button>
                          <span className="grid h-8 place-items-center border-x border-[rgb(var(--vibe-border))] font-mono text-[12px] font-medium tabular-nums">{line.qty}</span>
                          <button type="button" onClick={() => updateQty(line.cartKey ?? line.productId, line.qty + 1)} className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]" aria-label="Increase quantity">
                            +
                          </button>
                        </div>
                        <button type="button" onClick={() => removeFromCart(line.cartKey ?? line.productId)} className="h-8 rounded-md px-2 text-[10px] text-[rgb(var(--vibe-muted))] hover:bg-red-50 hover:text-red-600" aria-label="Remove item">
                          Remove
                        </button>
                      </div>
                    </div>
                    <span className="font-mono font-medium tabular-nums">{format(line.price * line.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-[rgb(var(--vibe-border))] pt-4 text-[12px]">
                <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Subtotal</dt><dd className="font-mono font-medium tabular-nums">{format(cartSubtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Shipping</dt><dd className="font-mono font-medium tabular-nums">{shipping === 0 ? "Free" : format(shipping)}</dd></div>
                <div className="mt-3 flex justify-between border-t border-[rgb(var(--vibe-border))] pt-3 text-[13px]">
                  <dt className="font-medium">Total</dt>
                  <dd className="font-mono font-semibold tabular-nums" data-testid="checkout-total-amount">{format(total)}</dd>
                </div>
              </dl>
              {currency !== "INR" && (
                <p className="mt-3 rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] px-3 py-2 text-[11px] text-[rgb(var(--vibe-muted))]" data-testid="checkout-currency-disclaimer">
                  Converted totals are approximate. Checkout is recorded in INR.
                </p>
              )}
              <PaymentMethods compact className="mt-4" />
              <button
                type="submit"
                disabled={submitting}
                data-testid="checkout-submit-button"
                className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Opening checkout..." : `Pay securely - ${format(total)}`}
              </button>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[rgb(var(--vibe-muted))]">
                <span className="rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] px-2 py-2">Server-checked totals</span>
                <span className="rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] px-2 py-2">WhatsApp tracking</span>
              </div>
            </aside>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="vibe-card space-y-3 p-4 md:p-5" data-testid={`checkout-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <h2 className="text-[13px] font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, testId, error, hint, ...props }: { label: string; value: string; onChange: (value: string) => void; testId: string; error?: string; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] text-[rgb(var(--vibe-muted))]">
        {label}
        {hint && (
          <span title={hint} aria-label={hint} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-600">
            !
          </span>
        )}
      </span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        aria-invalid={Boolean(error)}
        className={cn("h-9 w-full rounded-md border bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none transition-colors focus:ring-1 focus:ring-zinc-500 disabled:bg-[rgb(var(--vibe-surface))] disabled:text-[rgb(var(--vibe-muted))]", error ? "border-red-400" : "border-[rgb(var(--vibe-border))]")}
      />
      {error && <span className="mt-1 block text-[11px] text-red-600" data-testid={`${testId}-error`}>{error}</span>}
    </label>
  );
}

export default Checkout;

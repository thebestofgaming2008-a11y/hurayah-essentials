import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PaymentMethods } from "@/components/shop/PaymentMethods";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { checkoutShippingForCountry } from "@/services/shipping";
import { createRazorpayCheckoutOrder, verifyRazorpayPayment } from "@/services/orderService";
import { useShop } from "@/store/shop";
import logo from "@/assets/logo-header.png";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

const INDIA_ADDRESS = { stateLabel: "State / union territory", postalLabel: "PIN code", cityLabel: "City", stateRequired: true };

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
  const { format } = useCurrency();
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
    state: "",
    postalCode: "",
    country: "India",
  });
  const shippingMeta = checkoutShippingForCountry(form.country);
  const total = cartSubtotal + shippingMeta.amount;
  const address = INDIA_ADDRESS;

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email.";
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!/^\+?[0-9\s().-]{8,20}$/.test(form.phone.trim()) || phoneDigits.length < 8 || phoneDigits.length > 15) nextErrors.phone = "Enter a valid WhatsApp number.";
    if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!form.address.trim()) nextErrors.address = "Address is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (address.stateRequired && !form.state.trim()) nextErrors.state = `${address.stateLabel} is required.`;
    if (!form.postalCode.trim() && !address.postalLabel.includes("optional")) nextErrors.postalCode = `${address.postalLabel} is required.`;
    if (!form.country.trim()) nextErrors.country = "Country is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || cartLines.length === 0) return;

    setSubmitting(true);
    try {
      const customer = {
        email: form.email.trim(),
        phone: form.phone.trim(),
        name: `${form.firstName} ${form.lastName}`.trim(),
        address_line_1: form.address.trim(),
        address_line_2: form.apartment.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        postal_code: form.postalCode.trim(),
        country: form.country.trim(),
      };
      const payload = { cart: cartLines, customer, subtotal: cartSubtotal, shipping: shippingMeta.amount, total };
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
          theme: { color: "#030f30" },
          handler: async (response: any) => {
            try {
              const order = await verifyRazorpayPayment({
                ...payload,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              clearCart();
              toast({ title: "Payment received", description: "Your order was saved." });
              navigate(`/order-confirmation?id=${encodeURIComponent(order?.order_number ?? "#1")}&shipping=${shippingMeta.paymentStatus}`);
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
      toast({ title: "Could not place order", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (cartLines.length === 0) {
    return (
      <SiteLayout hideHeader compactFooter>
        <div className="mx-auto max-w-[760px] px-4 py-16 text-center md:px-8 md:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Your cart is empty</h1>
          <Link to="/shop" data-testid="checkout-empty-browse-link" className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 font-semibold text-brand-foreground hover:opacity-95">
            Browse products
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout hideHeader compactFooter>
      <div className="commerce-shell min-h-[calc(100vh-120px)] border-t border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
        <div className="mx-auto max-w-[1200px] px-3 py-4 sm:px-4 md:px-8 md:py-8">
          <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center border-b border-[rgb(var(--vibe-border))] pb-4">
            <button type="button" onClick={() => navigate(-1)} data-testid="checkout-go-back-button" className="text-[12px] text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]">
              <span className="hidden sm:inline">Back to store</span><span className="sm:hidden">Back</span>
            </button>
            <img src={logo} alt="Hurayrah Essentials" className="h-9 w-auto object-contain md:h-11" />
            <button type="button" onClick={openCart} data-testid="checkout-back-to-cart-link" className="justify-self-end text-[12px] text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]">
              Review cart
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_410px]" data-testid="checkout-form">
            <div className="space-y-4">
              <div>
                <h1 className="text-[24px] font-semibold text-[rgb(var(--vibe-foreground))] md:text-[30px]">Checkout</h1>
                <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">Complete your delivery details and continue to payment.</p>
              </div>
              <Section title="Contact">
                <Field label="Email" type="email" value={form.email} onChange={setField("email")} error={errors.email} required testId="checkout-email-input" autoComplete="email" />
                <Field label="Phone / WhatsApp" type="tel" value={form.phone} onChange={setField("phone")} error={errors.phone} required testId="checkout-phone-input" placeholder="+91 98765 43210" autoComplete="tel" />
              </Section>

              <Section title="Delivery">
                <div>
                  <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Country / region</span>
                  <div data-testid="checkout-country-input" className="flex h-10 w-full items-center rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))] px-3 text-[13px] text-[rgb(var(--vibe-foreground))]">
                    India
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name" value={form.firstName} onChange={setField("firstName")} error={errors.firstName} required testId="checkout-first-name-input" autoComplete="given-name" />
                  <Field label="Last name" value={form.lastName} onChange={setField("lastName")} error={errors.lastName} required testId="checkout-last-name-input" autoComplete="family-name" />
                </div>
                <Field label="Address" value={form.address} onChange={setField("address")} error={errors.address} required testId="checkout-address-input" autoComplete="address-line1" />
                <Field label="Apartment, suite, etc. (optional)" value={form.apartment} onChange={setField("apartment")} testId="checkout-apartment-input" autoComplete="address-line2" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={address.cityLabel} value={form.city} onChange={setField("city")} error={errors.city} required testId="checkout-city-input" autoComplete="address-level2" />
                  <Field label={address.stateLabel} value={form.state} onChange={setField("state")} error={errors.state} required={address.stateRequired} testId="checkout-state-input" autoComplete="address-level1" />
                  <Field label={address.postalLabel} value={form.postalCode} onChange={setField("postalCode")} error={errors.postalCode} required={!address.postalLabel.includes("optional")} testId="checkout-postal-code-input" autoComplete="postal-code" />
                </div>
                <p className="text-[11px] text-[rgb(var(--vibe-muted))]">
                  Shipping is included across India.
                </p>
              </Section>

              <Section title="Payment">
                <div className="rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 py-3 text-[12px] text-[rgb(var(--vibe-muted))]">
                  You will pay securely through Razorpay.
                </div>
              </Section>
            </div>

            <aside className="vibe-card h-fit p-4 md:p-5 lg:sticky lg:top-[120px]" data-testid="checkout-order-summary">
              <h2 className="text-[13px] font-medium">Order summary</h2>
              <ul className="mt-4 space-y-3">
                {cartLines.map((line) => (
                  <li key={line.cartKey ?? line.productId} className="flex gap-3 text-[12px]" data-testid={`checkout-summary-item-${line.cartKey ?? line.productId}`}>
                    <span className="h-16 w-12 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                      {line.image && <img src={line.image} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium">{line.name}</p>
                      {(line.selectedColor || line.selectedSize) && <p className="mt-1 text-[11px] text-[rgb(var(--vibe-muted))]">{[line.selectedColor, line.selectedSize].filter(Boolean).join(" / ")}</p>}
                      <div className="mt-2 inline-grid grid-cols-[30px_30px_30px] overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                        <button type="button" onClick={() => updateQty(line.cartKey ?? line.productId, line.qty - 1)} className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]" aria-label="Decrease quantity">-</button>
                        <span className="grid h-8 place-items-center border-x border-[rgb(var(--vibe-border))] font-mono text-[12px]">{line.qty}</span>
                        <button type="button" onClick={() => updateQty(line.cartKey ?? line.productId, line.qty + 1)} className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]" aria-label="Increase quantity">+</button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(line.cartKey ?? line.productId)} className="ml-2 text-[11px] text-[rgb(var(--vibe-muted))] hover:text-red-600">Remove</button>
                    </div>
                    <span className="font-mono font-medium">{format(line.price * line.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-[rgb(var(--vibe-border))] pt-4 text-[12px]">
                <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Subtotal</dt><dd className="font-mono font-medium">{format(cartSubtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Shipping</dt><dd className="font-mono font-medium">Included</dd></div>
                <div className="flex justify-between border-t border-[rgb(var(--vibe-border))] pt-3 text-[13px]"><dt className="font-medium">Total</dt><dd className="font-mono font-semibold" data-testid="checkout-total-amount">{format(total)}</dd></div>
              </dl>
              <PaymentMethods compact className="mt-4" />
              <button type="submit" disabled={submitting} data-testid="checkout-submit-button" className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                {submitting ? "Opening checkout..." : `Pay ${format(total)}`}
              </button>
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

function Field({ label, value, onChange, testId, error, className, ...props }: { label: string; value: string; onChange: (value: string) => void; testId: string; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        aria-invalid={Boolean(error)}
        className={cn("h-10 w-full rounded-md border bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-[rgb(var(--vibe-surface))] disabled:text-[rgb(var(--vibe-muted))]", error ? "border-red-400" : "border-[rgb(var(--vibe-border))]")}
      />
      {error && <span className="mt-1 block text-[11px] text-red-600" data-testid={`${testId}-error`}>{error}</span>}
    </label>
  );
}

export default Checkout;

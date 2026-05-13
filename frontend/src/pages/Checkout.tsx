import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, Info, Lock, MapPin, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useShop } from "@/store/shop";
import { useAuth } from "@/contexts/AuthContext";
import { createRazorpayCheckoutOrder, verifyRazorpayPayment } from "@/services/orderService";
import { calculateShippingInr, FREE_SHIPPING_THRESHOLD_INR } from "@/services/shipping";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

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
  const { cartLines, cartSubtotal, clearCart } = useShop();
  const { user } = useAuth();
  const { format, currency } = useCurrency();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    email: user?.email ?? "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    postalCode: "",
    country: "India",
  });
  const shipping = calculateShippingInr(cartSubtotal);
  const total = cartSubtotal + shipping;

  const steps = useMemo(() => [
    { label: "Contact", done: Boolean(form.email && form.phone) },
    { label: "Shipping", done: Boolean(form.firstName && form.lastName && form.address && form.city && form.postalCode) },
    { label: "Payment", done: true },
  ], [form]);

  useEffect(() => {
    if (user?.email) setForm((prev) => ({ ...prev, email: prev.email || user.email || "" }));
  }, [user?.email]);

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
    if (!user) {
      toast({ title: "Sign in required", description: "Create an account before checkout." });
      navigate("/login?redirect=/checkout");
      return;
    }
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
      <SiteLayout>
        <div className="mx-auto max-w-[760px] px-4 md:px-8 py-16 md:py-24 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-hero text-hero-foreground grid place-items-center">
            <ShoppingBag className="h-7 w-7" />
          </div>
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
    <SiteLayout>
      <div className="bg-[#F8FAF9] border-t border-border/70">
        <div className="mx-auto max-w-[1180px] px-4 md:px-8 py-6 md:py-10">
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <Link to="/cart" data-testid="checkout-back-to-cart-link" className="inline-flex items-center gap-1.5 text-sm text-foreground/65 hover:text-brand transition-colors mb-3">
                <ArrowLeft className="h-4 w-4" /> Back to cart
              </Link>
              <h1 className="text-foreground font-semibold tracking-tight text-3xl md:text-4xl">Secure checkout</h1>
              <p className="mt-1 text-sm text-foreground/60">Fast checkout, WhatsApp-ready tracking, final charge recorded in INR.</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" data-testid="checkout-progress-steps">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-2 shrink-0">
                  <span className={cn("h-7 w-7 rounded-full grid place-items-center border text-xs font-semibold", step.done ? "bg-brand text-brand-foreground border-brand" : "bg-background text-foreground/50 border-border")}>
                    {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="text-xs font-medium text-foreground/70">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 lg:gap-8" data-testid="checkout-form">
            <div className="space-y-4">
              {!user && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="checkout-sign-in-required-notice">
                  Sign in is required before checkout. You’ll be redirected if you submit now.
                </div>
              )}
              <Section title="Contact" icon={<ShieldCheck className="h-4 w-4" />}>
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

              <Section title="Shipping address" icon={<MapPin className="h-4 w-4" />}>
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

              <Section title="Delivery method" icon={<Truck className="h-4 w-4" />}>
                <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-between gap-3" data-testid="checkout-delivery-method-card">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Standard tracked delivery</p>
                    <p className="text-xs text-foreground/55 mt-0.5">Flat India rate. Free over {format(FREE_SHIPPING_THRESHOLD_INR)}. Tracking is shared by WhatsApp after dispatch.</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{shipping === 0 ? "Free" : format(shipping)}</span>
                </div>
              </Section>

              <Section title="Payment" icon={<CreditCard className="h-4 w-4" />}>
                <p className="text-xs text-foreground/55 inline-flex items-center gap-1 mb-2">
                  <Lock className="h-3 w-3" /> Secure payment handoff
                </p>
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm text-foreground/75" data-testid="checkout-razorpay-live-notice">
                  Razorpay test checkout is active. The order is created through Razorpay and the payment signature is verified before saving.
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Payment provider" placeholder="Razorpay Checkout" disabled value="" onChange={() => undefined} testId="checkout-card-number-input" />
                  <Field label="Mode" placeholder="Test keys" disabled value="" onChange={() => undefined} testId="checkout-expiry-input" />
                  <Field label="Verification" placeholder="Signature checked" disabled value="" onChange={() => undefined} testId="checkout-cvc-input" />
                </div>
              </Section>
            </div>

            <aside className="rounded-lg border border-border bg-background p-5 md:p-6 h-fit lg:sticky lg:top-[170px] shadow-sm" data-testid="checkout-order-summary">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground text-lg">Order summary</h2>
                <span className="text-xs rounded-full bg-hero px-2 py-1 text-hero-foreground font-medium">{cartLines.length} items</span>
              </div>
              <ul className="mt-4 space-y-3 max-h-[330px] overflow-y-auto pr-1">
                {cartLines.map((line) => (
                  <li key={line.productId} className="flex items-center gap-3 text-sm" data-testid={`checkout-summary-item-${line.productId}`}>
                    <span className="h-14 w-11 rounded-md bg-placeholder shrink-0 overflow-hidden border border-border">
                      {line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{line.name}</p>
                      <p className="text-xs text-foreground/55">Qty {line.qty}</p>
                    </div>
                    <span className="font-semibold tabular-nums">{format(line.price * line.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
                <div className="flex justify-between"><dt className="text-foreground/65">Subtotal</dt><dd className="font-medium tabular-nums">{format(cartSubtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-foreground/65">Shipping</dt><dd className="font-medium tabular-nums">{shipping === 0 ? "Free" : format(shipping)}</dd></div>
                <div className="border-t border-border pt-3 mt-3 flex justify-between text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-bold text-hero-foreground tabular-nums" data-testid="checkout-total-amount">{format(total)}</dd>
                </div>
              </dl>
              {currency !== "INR" && (
                <p className="mt-3 rounded-md bg-[#F8FAF9] border border-border px-3 py-2 text-xs text-foreground/60" data-testid="checkout-currency-disclaimer">
                  Converted totals are approximate. Checkout is recorded in INR.
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                data-testid="checkout-submit-button"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold py-3 hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Opening Razorpay..." : `Pay securely · ${format(total)}`}
              </button>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-foreground/60">
                <span className="rounded-md bg-[#F8FAF9] border border-border px-2 py-2 inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Server-checked totals</span>
                <span className="rounded-md bg-[#F8FAF9] border border-border px-2 py-2 inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> WhatsApp tracking</span>
              </div>
            </aside>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
};

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-5 md:p-6 space-y-3 shadow-sm" data-testid={`checkout-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <h2 className="font-semibold text-foreground text-base inline-flex items-center gap-2">{icon}{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, testId, error, hint, ...props }: { label: string; value: string; onChange: (value: string) => void; testId: string; error?: string; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground/70">
        {label}
        {hint && (
          <span title={hint} aria-label={hint} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-600">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        aria-invalid={Boolean(error)}
        className={cn("w-full rounded-md border bg-background px-3 py-2.5 text-foreground outline-none focus:border-brand transition-colors disabled:bg-foreground/5 disabled:text-foreground/45", error ? "border-destructive" : "border-border")}
      />
      {error && <span className="mt-1 block text-xs text-destructive" data-testid={`${testId}-error`}>{error}</span>}
    </label>
  );
}

export default Checkout;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PaymentMethods } from "@/components/shop/PaymentMethods";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { listAddresses, type Address } from "@/services/accountService";
import { checkoutShippingForCountry } from "@/services/shipping";
import { createRazorpayCheckoutOrder, verifyRazorpayPaymentWithRetry, type RazorpayVerificationArgs } from "@/services/orderService";
import { useShop } from "@/store/shop";
import logo from "@/assets/logo-header.png";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

const INDIA_ADDRESS = { stateLabel: "State / union territory", postalLabel: "PIN code", cityLabel: "City", stateRequired: true };
const PENDING_RAZORPAY_ORDER_KEY = "hurayah_pending_razorpay_order";
const WHATSAPP_NUMBER = "918491943437";

type CountryOption = {
  code: string;
  name: string;
};

const FALLBACK_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahrain", "Bangladesh", "Belgium", "Brazil", "Brunei", "Bulgaria", "Canada", "China", "Denmark", "Egypt", "Finland",
  "France", "Germany", "Ghana", "Greece", "Hong Kong", "India", "Indonesia", "Ireland", "Italy", "Japan", "Jordan",
  "Kenya", "Kuwait", "Malaysia", "Maldives", "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway", "Oman",
  "Pakistan", "Philippines", "Qatar", "Saudi Arabia", "Singapore", "South Africa", "Spain", "Sri Lanka", "Sweden",
  "Switzerland", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Yemen",
];

const FALLBACK_COUNTRY_CODES: Record<string, string> = {
  Afghanistan: "AF", Albania: "AL", Algeria: "DZ", Andorra: "AD", Angola: "AO", Argentina: "AR", Armenia: "AM", Australia: "AU", Austria: "AT", Azerbaijan: "AZ",
  Bahrain: "BH", Bangladesh: "BD", Belgium: "BE", Brazil: "BR", Brunei: "BN", Bulgaria: "BG", Canada: "CA", China: "CN", Denmark: "DK", Egypt: "EG", Finland: "FI",
  France: "FR", Germany: "DE", Ghana: "GH", Greece: "GR", "Hong Kong": "HK", India: "IN", Indonesia: "ID", Ireland: "IE", Italy: "IT", Japan: "JP", Jordan: "JO",
  Kenya: "KE", Kuwait: "KW", Malaysia: "MY", Maldives: "MV", Morocco: "MA", Netherlands: "NL", "New Zealand": "NZ", Nigeria: "NG", Norway: "NO", Oman: "OM",
  Pakistan: "PK", Philippines: "PH", Qatar: "QA", "Saudi Arabia": "SA", Singapore: "SG", "South Africa": "ZA", Spain: "ES", "Sri Lanka": "LK", Sweden: "SE",
  Switzerland: "CH", Thailand: "TH", Turkey: "TR", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US", Yemen: "YE",
};

function getCountryOptions(): CountryOption[] {
  try {
    const intlWithRegions = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const options = (intlWithRegions.supportedValuesOf?.("region") ?? [])
      .map((code) => ({ code, name: displayNames.of(code) ?? code }))
      .filter((country) => Boolean(country.name && !/^\d+$/.test(country.name)))
      .sort((a, b) => a.name.localeCompare(b.name));
    return options.length ? options : FALLBACK_COUNTRIES.map((name) => ({ code: FALLBACK_COUNTRY_CODES[name] ?? name, name }));
  } catch {
    return FALLBACK_COUNTRIES.map((name) => ({ code: FALLBACK_COUNTRY_CODES[name] ?? name, name }));
  }
}

const COUNTRIES = getCountryOptions();
const ADDRESS_BY_COUNTRY: Record<string, typeof INDIA_ADDRESS> = {
  India: INDIA_ADDRESS,
  "United States": { stateLabel: "State", postalLabel: "ZIP code", cityLabel: "City", stateRequired: true },
  Canada: { stateLabel: "Province", postalLabel: "Postal code", cityLabel: "City", stateRequired: true },
  Australia: { stateLabel: "State / territory", postalLabel: "Postcode", cityLabel: "Suburb", stateRequired: true },
  "United Kingdom": { stateLabel: "County (optional)", postalLabel: "Postcode", cityLabel: "Town / city", stateRequired: false },
  "United Arab Emirates": { stateLabel: "Emirate", postalLabel: "Postal code (optional)", cityLabel: "City", stateRequired: true },
  "Saudi Arabia": { stateLabel: "Province / region", postalLabel: "Postal code", cityLabel: "City", stateRequired: false },
};

function countryNameFromCode(code: string | null | undefined) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(String(code ?? "").toUpperCase()) ?? "India";
  } catch {
    const fallback: Record<string, string> = { IN: "India", US: "United States", GB: "United Kingdom", AE: "United Arab Emirates", SA: "Saudi Arabia", BE: "Belgium" };
    return fallback[String(code ?? "").toUpperCase()] ?? "India";
  }
}

function flagFromCountryCode(code: string) {
  if (!/^[A-Z]{2}$/i.test(code)) return "";
  const normalized = code.toUpperCase();
  return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

function CountryFlag({ country }: { country?: CountryOption }) {
  if (!country) return <span className="h-4 w-5 shrink-0" />;

  return (
    <span className="flex h-4 w-5 shrink-0 items-center justify-center overflow-hidden text-[15px] leading-none">
      {flagFromCountryCode(country.code)}
    </span>
  );
}

function openWhatsappMessage(message: string) {
  const link = document.createElement("a");
  link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
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
  const { user, profile } = useAuth();
  const { currency, detectedCountry, format } = useCurrency();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
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
  const address = ADDRESS_BY_COUNTRY[form.country] ?? { stateLabel: "State / province / region", postalLabel: "Postal code", cityLabel: "City", stateRequired: false };
  const isIndiaCheckout = shippingMeta.countryType === "india";

  useEffect(() => {
    if (!detectedCountry) return;
    setForm((prev) => {
      if (prev.country && prev.country !== "India") return prev;
      return { ...prev, country: countryNameFromCode(detectedCountry) };
    });
  }, [detectedCountry]);

  const applySavedAddress = useCallback((saved: Address) => {
    const nameParts = String(saved.full_name ?? "").trim().split(/\s+/).filter(Boolean);
    setSelectedAddressId(saved.id);
    setForm((prev) => ({
      ...prev,
      email: prev.email || user?.email || "",
      phone: saved.phone || prev.phone,
      firstName: nameParts[0] || prev.firstName,
      lastName: nameParts.slice(1).join(" ") || prev.lastName,
      address: saved.address_line_1 || "",
      apartment: saved.address_line_2 || "",
      city: saved.city || "",
      state: saved.state || "",
      postalCode: saved.postal_code || "",
      country: "India",
    }));
    setErrors({});
  }, [user?.email]);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setSelectedAddressId("");
      return;
    }
    let cancelled = false;
    void listAddresses(user.id).then((rows) => {
      if (cancelled) return;
      const sorted = [...rows].sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)));
      setSavedAddresses(sorted);
    }).catch(() => {
      if (!cancelled) setSavedAddresses([]);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => {
      const nameParts = String(profile?.full_name ?? user.name ?? "").trim().split(/\s+/).filter(Boolean);
      return {
        ...prev,
        email: prev.email || user.email || "",
        phone: prev.phone || profile?.phone || "",
        firstName: prev.firstName || nameParts[0] || "",
        lastName: prev.lastName || nameParts.slice(1).join(" "),
      };
    });
  }, [profile?.full_name, profile?.phone, user]);

  const finishPaidOrder = useCallback(async (verification: RazorpayVerificationArgs) => {
    localStorage.setItem(PENDING_RAZORPAY_ORDER_KEY, JSON.stringify(verification));
    const order = await verifyRazorpayPaymentWithRetry(verification);
    localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
    clearCart();
    toast({ title: "Payment received", description: "Your order was saved." });
    const paymentStatus = checkoutShippingForCountry(verification.customer.country).paymentStatus;
    navigate(`/order-confirmation?id=${encodeURIComponent(order?.order_number ?? "#1")}&shipping=${paymentStatus}`);
  }, [clearCart, navigate]);

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_RAZORPAY_ORDER_KEY);
    if (!raw) return;
    let cancelled = false;
    let verification: RazorpayVerificationArgs;
    try {
      verification = JSON.parse(raw) as RazorpayVerificationArgs;
    } catch {
      localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
      return;
    }
    setSubmitting(true);
    toast({ title: "Recovering your paid order", description: "Please keep this page open while we confirm it." });
    finishPaidOrder(verification)
      .catch(() => {
        if (!cancelled) toast({ title: "Payment received, order confirmation pending", description: "Refresh this checkout page to retry. Do not pay again.", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finishPaidOrder]);

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
      if (!isIndiaCheckout) {
        const itemLines = cartLines.map((line, index) => {
          const options = [line.selectedColor, line.selectedSize].filter(Boolean).join(" / ");
          const productUrl = line.slug ? `${window.location.origin}/product/${line.slug}` : "";
          return [
            `${index + 1}. ${line.name}`,
            options ? `   Options: ${options}` : "",
            `   Quantity: ${line.qty}`,
            productUrl ? `   Product page: ${productUrl}` : "",
          ].filter(Boolean).join("\n");
        });
        const addressLines = [
          `Assalamu alaikum. I would like to order to ${customer.country}.`,
          "",
          `Name: ${customer.name}`,
          `Email: ${customer.email}`,
          `WhatsApp number: ${customer.phone}`,
          "",
          "",
          `Country: ${customer.country}`,
          `Address: ${customer.address_line_1}`,
          ...(customer.address_line_2 ? [`Apartment / extra: ${customer.address_line_2}`] : []),
          `City: ${customer.city}`,
          ...(customer.state ? [`${address.stateLabel}: ${customer.state}`] : []),
          `${address.postalLabel}: ${customer.postal_code}`,
          "",
          "",
        ];
        const message = [...addressLines, ...itemLines].join("\n");
        openWhatsappMessage(message);
        toast({ title: "WhatsApp order request opened", description: "Your cart was not charged. The store will confirm international shipping and payment on WhatsApp." });
        return;
      }
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
              await finishPaidOrder({
                ...payload,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (error) {
              reject(new Error("Payment received, but order confirmation is pending. Refresh this checkout page to retry. Do not pay again."));
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
                <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">
                  {isIndiaCheckout ? "Complete your delivery details and continue to payment." : "Complete your details and send the cart to WhatsApp for international shipping/payment confirmation."}
                </p>
              </div>
              <Section title="Contact">
                <Field label="Email" type="email" value={form.email} onChange={setField("email")} error={errors.email} required testId="checkout-email-input" autoComplete="email" />
                <Field label="Phone / WhatsApp" type="tel" value={form.phone} onChange={setField("phone")} error={errors.phone} required testId="checkout-phone-input" placeholder="+91 98765 43210" autoComplete="tel" />
              </Section>

              <Section title="Delivery">
                {isIndiaCheckout && savedAddresses.length > 0 && (
                  <div>
                    <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Saved addresses</span>
                    <div className="grid gap-2 sm:grid-cols-2" data-testid="checkout-saved-addresses">
                      {savedAddresses.map((saved) => (
                        <button
                          key={saved.id}
                          type="button"
                          onClick={() => applySavedAddress(saved)}
                          className={cn(
                            "rounded-md border bg-white px-3 py-2.5 text-left text-[12px] transition-colors hover:border-brand",
                            selectedAddressId === saved.id ? "border-brand ring-1 ring-brand/20" : "border-[rgb(var(--vibe-border))]",
                          )}
                          data-testid={`checkout-saved-address-${saved.id}`}
                        >
                          <span className="block font-medium">{saved.full_name || "Saved address"}{saved.is_default ? " · Default" : ""}</span>
                          <span className="mt-0.5 block line-clamp-2 text-[11px] text-[rgb(var(--vibe-muted))]">{[saved.address_line_1, saved.city, saved.state, saved.postal_code].filter(Boolean).join(", ")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <CountrySelect
                    value={form.country}
                    onChange={setField("country")}
                    error={errors.country}
                  />
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
                  {isIndiaCheckout ? "Shipping is included across India." : "International shipping is confirmed on WhatsApp before payment. No online payment is taken here."}
                </p>
              </Section>

              <Section title="Payment">
                <div className="rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 py-3 text-[12px] text-[rgb(var(--vibe-muted))]">
                  {isIndiaCheckout ? "You will pay securely through Razorpay." : "Razorpay is available for India only. International customers complete the next step on WhatsApp."}
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
                <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Shipping</dt><dd className="text-right font-mono font-medium">{isIndiaCheckout ? "Included" : "Confirmed on WhatsApp"}</dd></div>
                <div className="flex justify-between border-t border-[rgb(var(--vibe-border))] pt-3 text-[13px]"><dt className="font-medium">Total</dt><dd className="font-mono font-semibold" data-testid="checkout-total-amount">{format(total)}</dd></div>
              </dl>
              {isIndiaCheckout && <PaymentMethods compact className="mt-4" />}
              <button type="submit" disabled={submitting} data-testid="checkout-submit-button" className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                {submitting ? (isIndiaCheckout ? "Opening checkout..." : "Opening WhatsApp...") : isIndiaCheckout ? `Pay ${format(total)}` : "Send request on WhatsApp"}
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

function CountrySelect({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => COUNTRIES.find((country) => country.name === value), [value]);
  const filteredCountries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter((country) => {
      const haystack = `${country.name} ${country.code}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const selectCountry = (country: CountryOption) => {
    onChange(country.name);
    setQuery("");
    setOpen(false);
  };

  const handleSearchChange = (nextQuery: string) => {
    setQuery(nextQuery);
    const exactMatch = COUNTRIES.find((country) => country.name.toLowerCase() === nextQuery.trim().toLowerCase());
    if (exactMatch) onChange(exactMatch.name);
    if (!open) setOpen(true);
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Country / region</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-[13px] text-[rgb(var(--vibe-foreground))] outline-none transition-colors hover:border-zinc-400 focus:ring-1 focus:ring-zinc-500",
          error ? "border-red-400" : "border-[rgb(var(--vibe-border))]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CountryFlag country={selected} />
          <span className="truncate">{value || "Choose your country"}</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "ml-2 h-2 w-2 shrink-0 rotate-45 border-b border-r border-[rgb(var(--vibe-muted))] transition-transform",
            open && "rotate-[225deg]",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white shadow-xl">
          <div className="border-b border-[rgb(var(--vibe-border))] p-2">
            <input
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredCountries[0]) {
                  event.preventDefault();
                  selectCountry(filteredCountries[0]);
                }
                if (event.key === "Escape") setOpen(false);
              }}
              data-testid="checkout-country-input"
              className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))] px-3 text-[12px] text-[rgb(var(--vibe-foreground))] outline-none focus:border-zinc-500 focus:bg-white"
              autoComplete="off"
              placeholder="Find your country..."
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1" role="listbox">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.name === value;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => selectCountry(country)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2 px-3 text-left text-[12px] transition-colors hover:bg-[rgb(var(--vibe-surface))] focus:bg-[rgb(var(--vibe-surface))] focus:outline-none",
                      isSelected && "bg-[rgb(var(--vibe-surface))] text-brand",
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <CountryFlag country={country} />
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    {isSelected && <span aria-hidden="true" className="shrink-0 text-[12px]">✓</span>}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-[12px] text-[rgb(var(--vibe-muted))]">No country found.</div>
            )}
          </div>
        </div>
      )}
      {error && <span className="mt-1 block text-[11px] text-red-600" data-testid="checkout-country-input-error">{error}</span>}
    </div>
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

import { useState } from "react";
import { Package, Truck, CheckCircle2, Search } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { trackOrder } from "@/services/orderService";

const STEPS = [
  { Icon: CheckCircle2, label: "Order placed", done: true },
  { Icon: Package, label: "Processing", done: true },
  { Icon: Truck, label: "Shipped", done: false },
  { Icon: CheckCircle2, label: "Delivered", done: false },
];

function normalizeOrderStatus(status: string | null | undefined) {
  if (status === "shipped" || status === "delivered" || status === "cancelled" || status === "returned") return status;
  return "processing";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    returned: "Returned",
  };
  return labels[status] ?? "Processing";
}

const TrackOrder = () => {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("Out for delivery");
  const [notFound, setNotFound] = useState(false);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[720px] px-4 md:px-8 py-12 md:py-20">
        <h1 className="text-foreground italic font-bold tracking-tight text-3xl md:text-4xl text-center">Track your order</h1>
        <p className="mt-2 text-center text-foreground/60">Enter your order ID and email to see status.</p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setNotFound(false);
            const order = await trackOrder(id, email);
            if (!order) {
              setNotFound(true);
              setSubmitted(false);
              return;
            }
            setStatus(normalizeOrderStatus(order.status));
            setSubmitted(true);
          }}
          className="mt-8 rounded-2xl border border-border bg-background p-5 md:p-6 space-y-3"
          data-testid="track-order-form"
        >
          <label className="block text-sm">
            <span className="block text-foreground/70 mb-1.5">Order ID</span>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="HE-XXXXXXXX" required data-testid="track-order-id-input" className="w-full rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-brand" />
          </label>
          <label className="block text-sm">
            <span className="block text-foreground/70 mb-1.5">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="track-order-email-input" className="w-full rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-brand" />
          </label>
          <button className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold py-3 hover:opacity-95" data-testid="track-order-submit-button">
            <Search className="h-4 w-4" /> Track order
          </button>
        </form>

        {notFound && (
          <p className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="track-order-not-found-alert">
            No order found for that ID and email.
          </p>
        )}

        {submitted && (
          <div className="mt-8 rounded-2xl border border-border bg-hero/30 p-6" data-testid="track-order-result">
            <p className="text-sm text-foreground/65">Order <span className="font-mono font-semibold">{id || "HE-XXXXXXXX"}</span></p>
            <h2 className="mt-1 text-xl font-semibold">{statusLabel(status)}</h2>
            <ol className="mt-6 grid grid-cols-4 gap-2 text-center">
              {STEPS.map((s, i) => (
                <li key={i} className="flex flex-col items-center gap-2">
                  <span className={`h-10 w-10 grid place-items-center rounded-full ${s.done ? "bg-brand text-brand-foreground" : "bg-background border border-border text-foreground/40"}`}>
                    <s.Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-xs ${s.done ? "text-foreground" : "text-foreground/50"}`}>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default TrackOrder;

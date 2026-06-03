import { useState, type FormEvent } from "react";
import { ChevronDown, Package } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { trackOrder } from "@/services/orderService";
import type { Order } from "@/services/accountService";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { submitOrderReview } from "@/services/reviewService";

const steps = ["Order placed", "Processing", "Shipped", "Delivered"];

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

function stepDone(label: string, status: string) {
  const rank: Record<string, number> = { processing: 1, shipped: 2, delivered: 3 };
  const index = steps.indexOf(label);
  return index <= (rank[status] ?? 1);
}

const TrackOrder = () => {
  const { format } = useCurrency();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("processing");
  const [order, setOrder] = useState<Order | null>(null);
  const [itemsOpen, setItemsOpen] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <SiteLayout compactFooter>
      <div className="commerce-shell min-h-[calc(100vh-120px)] bg-[rgb(var(--vibe-page))] px-4 py-8 text-[rgb(var(--vibe-foreground))] md:px-8 md:py-12">
        <div className="mx-auto grid max-w-[980px] gap-4 lg:grid-cols-[360px_1fr]">
          <section className="vibe-card p-5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">Guest order lookup</p>
            <h1 className="mt-1 text-[20px] font-semibold tracking-tight md:text-[24px]">Track order</h1>
            <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">Use the order number and checkout email. No customer account is needed.</p>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setNotFound(false);
                setLookupError(false);
                setLoading(true);
                try {
                  const foundOrder = await trackOrder(id, email) as Order | null;
                  if (!foundOrder) {
                    setNotFound(true);
                    setSubmitted(false);
                    setOrder(null);
                    return;
                  }
                  setOrder(foundOrder);
                  setStatus(normalizeOrderStatus(foundOrder.status));
                  setItemsOpen(true);
                  setSubmitted(true);
                } catch {
                  setLookupError(true);
                  setSubmitted(false);
                  setOrder(null);
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-5 space-y-3"
              data-testid="track-order-form"
            >
              <label className="block">
                <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Order ID</span>
                <input value={id} onChange={(event) => setId(event.target.value)} placeholder="#1" required data-testid="track-order-id-input" className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required data-testid="track-order-email-input" className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
              </label>
              <button disabled={loading} className="h-9 w-full rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50" data-testid="track-order-submit-button">
                {loading ? "Checking..." : "Track order"}
              </button>
            </form>

            {notFound && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700" data-testid="track-order-not-found-alert">
                No order found for that ID and email.
              </p>
            )}
            {lookupError && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                Tracking is temporarily unavailable. Please try again shortly.
              </p>
            )}
          </section>

          <section className="vibe-card overflow-hidden">
            <div className="border-b border-[rgb(var(--vibe-border))] px-5 py-4">
              <h2 className="text-[13px] font-medium">Order status</h2>
              <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Live fulfillment status appears here after lookup.</p>
            </div>
            {!submitted ? (
              <div className="p-6 text-[13px] text-[rgb(var(--vibe-muted))]">
                Enter your details to view processing, shipment, tracking, and delivery status.
              </div>
            ) : (
              <div className="p-5" data-testid="track-order-result">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[12px] text-[rgb(var(--vibe-muted))]">{order?.order_number ?? (id || "#1")}</p>
                    <h3 className="mt-1 text-[18px] font-semibold">{statusLabel(status)}</h3>
                  </div>
                  <span className="w-fit rounded bg-[rgb(var(--vibe-surface))] px-2 py-1 text-[11px] capitalize text-[rgb(var(--vibe-muted))]">{status}</span>
                </div>
                <ol className="mt-6 grid gap-2 sm:grid-cols-4">
                  {steps.map((label) => {
                    const done = stepDone(label, status);
                    return (
                      <li key={label} className={`rounded-md border px-3 py-3 text-[12px] ${done ? "border-zinc-300 bg-white text-[rgb(var(--vibe-foreground))]" : "border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-muted))]"}`}>
                        <span className="font-medium">{label}</span>
                        <span className="mt-1 block font-mono text-[10px]">{done ? "complete" : "pending"}</span>
                      </li>
                    );
                  })}
                </ol>
                {order && (
                  <div className="mt-5 rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                    <button type="button" onClick={() => setItemsOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <span className="text-[13px] font-medium">Order items</span>
                      <span className="inline-flex items-center gap-2 text-[12px] text-[rgb(var(--vibe-muted))]">
                        {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? "" : "s"}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", itemsOpen && "rotate-180")} />
                      </span>
                    </button>
                    {itemsOpen && <TrackedOrderItems order={order} email={email} formatPrice={format} />}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </SiteLayout>
  );
};

function TrackedOrderItems({ order, email, formatPrice }: { order: Order; email: string; formatPrice: (amount: number | null | undefined) => string }) {
  const items = order.items ?? [];
  if (items.length === 0) return <p className="border-t border-[rgb(var(--vibe-border))] px-4 py-3 text-[12px] text-[rgb(var(--vibe-muted))]">No item details saved for this order.</p>;
  return (
    <div className="space-y-2 border-t border-[rgb(var(--vibe-border))] p-3">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-md bg-[rgb(var(--vibe-surface))] p-2.5">
          <div className="h-14 w-12 shrink-0 overflow-hidden rounded border border-[rgb(var(--vibe-border))] bg-white">
            {item.product_image_url ? <img src={item.product_image_url} alt={item.product_name ?? "Product"} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-4 w-4 text-[rgb(var(--vibe-muted))]" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{item.product_name ?? "Product"}</p>
            {(item.selected_color || item.selected_size) && <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{[item.selected_color && `Colour: ${item.selected_color}`, item.selected_size && `Size: ${item.selected_size}`].filter(Boolean).join(" / ")}</p>}
            <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">Qty {item.quantity} · {formatPrice(item.subtotal)}</p>
            {item.product_id && order.order_number && email && (
              <TrackedReviewForm orderNumber={order.order_number} email={email} productId={item.product_id} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackedReviewForm({ orderNumber, email, productId }: { orderNumber: string; email: string; productId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return toast({ title: "Write a short review first", variant: "destructive" });
    setSaving(true);
    try {
      await submitOrderReview({ orderNumber, email, productId, rating: Number(rating) || 5, title: title || null, body });
      setSubmitted(true);
      setOpen(false);
      toast({ title: "Review submitted", description: "It will appear after approval." });
    } catch (error) {
      toast({ title: "Could not submit review", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (submitted) return <p className="mt-2 text-[11px] text-emerald-700">Review submitted for approval.</p>;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((value) => !value)} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[11px] font-medium hover:bg-[rgb(var(--vibe-accent))]">
        {open ? "Cancel review" : "Add review"}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-2 grid gap-2 rounded-md border border-[rgb(var(--vibe-border))] bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
            <label className="block text-[12px]">
              <span className="mb-1.5 block text-[rgb(var(--vibe-muted))]">Rating</span>
              <input type="number" min="1" max="5" step="0.1" value={rating} onChange={(event) => setRating(event.target.value)} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
            </label>
            <label className="block text-[12px]">
              <span className="mb-1.5 block text-[rgb(var(--vibe-muted))]">Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional" className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
            </label>
          </div>
          <label className="block text-[12px]">
            <span className="mb-1.5 block text-[rgb(var(--vibe-muted))]">Review</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} className="w-full resize-y rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
          </label>
          <button type="submit" disabled={saving} className="h-8 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[11px] font-medium text-white disabled:opacity-60">
            {saving ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}
    </div>
  );
}

export default TrackOrder;

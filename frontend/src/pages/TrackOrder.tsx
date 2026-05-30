import { useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { trackOrder } from "@/services/orderService";

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
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("processing");
  const [notFound, setNotFound] = useState(false);

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
                const order = await trackOrder(id, email);
                if (!order) {
                  setNotFound(true);
                  setSubmitted(false);
                  return;
                }
                setStatus(normalizeOrderStatus(order.status));
                setSubmitted(true);
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
              <button className="h-9 w-full rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90" data-testid="track-order-submit-button">
                Track order
              </button>
            </form>

            {notFound && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700" data-testid="track-order-not-found-alert">
                No order found for that ID and email.
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
                    <p className="font-mono text-[12px] text-[rgb(var(--vibe-muted))]">{id || "#1"}</p>
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
              </div>
            )}
          </section>
        </div>
      </div>
    </SiteLayout>
  );
};

export default TrackOrder;

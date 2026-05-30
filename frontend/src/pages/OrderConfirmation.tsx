import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";

const OrderConfirmation = () => {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "#1";
  return (
    <SiteLayout>
      <div className="mx-auto max-w-[640px] px-4 md:px-8 py-16 md:py-24 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-brand/10 text-brand grid place-items-center">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-foreground italic font-bold tracking-tight text-3xl md:text-4xl">
          Thank you for your order!
        </h1>
        <p className="mt-2 text-foreground/65">
          Your order was saved successfully. Shipping across India is included, and tracking will be shared by WhatsApp after dispatch.
        </p>
        <p className="mt-6 inline-block rounded-full bg-hero/40 px-4 py-1.5 text-sm font-medium text-foreground" data-testid="order-confirmation-id">
          Order ID: <span className="font-mono font-semibold">{id}</span>
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/track" data-testid="order-confirmation-track-link" className="inline-flex items-center justify-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold px-6 py-3 hover:opacity-95 transition-opacity">
            Track your order
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/shop" data-testid="order-confirmation-shop-link" className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 font-semibold hover:border-brand hover:text-brand transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
};

export default OrderConfirmation;

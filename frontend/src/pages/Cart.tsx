import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useShop } from "@/store/shop";
import { calculateShippingInr, FREE_SHIPPING_THRESHOLD_INR } from "@/services/shipping";
import { useCurrency } from "@/contexts/CurrencyContext";

const Cart = () => {
  const { cartLines, cartSubtotal, updateQty, removeFromCart } = useShop();
  const { format, currency } = useCurrency();
  const navigate = useNavigate();
  const shipping = calculateShippingInr(cartSubtotal);
  const total = cartSubtotal + shipping;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-foreground italic font-bold tracking-tight text-2xl md:text-4xl mb-6 md:mb-10">
          Your cart
        </h1>

        {cartLines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 md:p-16 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
            <p className="mt-1 text-sm text-foreground/60">Find something you'll love.</p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
            >
              Browse products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
              {cartLines.map((line) => {
                const link = `/product/${line.slug ?? line.productId}`;
                return (
                  <li key={line.productId} className="p-4 md:p-5 flex gap-4">
                    <Link
                      to={link}
                      className="shrink-0 h-24 w-20 md:h-28 md:w-24 rounded-lg bg-placeholder overflow-hidden"
                    >
                      {line.image && (
                        <img
                          src={line.image}
                          alt={line.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={link} className="block">
                        <h3 className="text-sm md:text-base font-medium text-foreground hover:text-brand line-clamp-1">
                          {line.name}
                        </h3>
                      </Link>
                      <p className="mt-1 text-sm md:text-base font-semibold text-hero-foreground">
                        {format(line.price)}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-border">
                          <button
                            onClick={() => updateQty(line.productId, line.qty - 1)}
                            aria-label="Decrease quantity"
                            data-testid={`cart-decrease-quantity-${line.productId}`}
                            className="h-8 w-8 grid place-items-center hover:bg-foreground/5 rounded-l-full"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{line.qty}</span>
                          <button
                            onClick={() => updateQty(line.productId, line.qty + 1)}
                            aria-label="Increase quantity"
                            data-testid={`cart-increase-quantity-${line.productId}`}
                            className="h-8 w-8 grid place-items-center hover:bg-foreground/5 rounded-r-full"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(line.productId)}
                          data-testid={`cart-remove-item-${line.productId}`}
                          className="text-xs text-foreground/55 hover:text-destructive inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="rounded-2xl border border-border bg-hero/30 p-5 md:p-6 h-fit">
              <h2 className="font-semibold text-foreground text-lg">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-foreground/65">Subtotal</dt>
                  <dd className="font-medium">{format(cartSubtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/65">Shipping</dt>
                  <dd className="font-medium">
                    {shipping === 0 ? "Free" : format(shipping)}
                  </dd>
                </div>
                <div className="border-t border-border pt-3 mt-3 flex justify-between text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-bold text-hero-foreground">{format(total)}</dd>
                </div>
              </dl>
              <button
                onClick={() => navigate("/checkout")}
                data-testid="cart-checkout-button"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold py-3 hover:opacity-95 transition-opacity"
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs text-foreground/55 text-center">
                Free India shipping over {format(FREE_SHIPPING_THRESHOLD_INR)} · Final charge in INR{currency !== "INR" ? " · converted prices are approximate" : ""}
              </p>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default Cart;

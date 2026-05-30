import { Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useShop } from "@/store/shop";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PaymentMethods } from "@/components/shop/PaymentMethods";

const Cart = () => {
  const { cartLines, cartSubtotal, updateQty, removeFromCart } = useShop();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const shipping = 0;
  const total = cartSubtotal + shipping;

  return (
    <SiteLayout>
      <div className="commerce-shell mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">Your order</p>
            <h1 className="mt-1 text-[26px] font-semibold md:text-[34px]">Shopping cart</h1>
          </div>
          <Link to="/shop" className="hidden h-8 items-center rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] sm:inline-flex">Continue shopping</Link>
        </div>

        {cartLines.length === 0 ? (
          <div className="vibe-card p-10 text-center md:p-16">
            <h2 className="mt-4 text-[15px] font-semibold">Your cart is empty</h2>
            <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">Find something you'll love.</p>
            <Link
              to="/shop"
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <ul className="vibe-card divide-y divide-[rgb(var(--vibe-border))] overflow-hidden">
              {cartLines.map((line) => {
                const link = `/product/${line.slug ?? line.productId}`;
                return (
                  <li key={line.cartKey ?? line.productId} className="flex gap-4 p-4 transition-colors hover:bg-[rgb(var(--vibe-accent))]/45 md:p-5">
                    <Link
                      to={link}
                      className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-white md:h-28 md:w-24"
                    >
                      {line.image && (
                        <img
                          src={line.image}
                          alt={line.name}
                          loading="eager"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={link} className="block">
                        <h3 className="line-clamp-1 text-[13px] font-medium hover:text-zinc-600 md:text-[14px]">
                          {line.name}
                        </h3>
                      </Link>
                      <p className="mt-1 font-mono text-[12px] font-medium md:text-[13px]">
                        {format(line.price)}
                      </p>
                      {(line.selectedColor || line.selectedSize) && (
                        <p className="mt-1 text-[11px] text-[rgb(var(--vibe-muted))]">
                          {[line.selectedColor && `Colour: ${line.selectedColor}`, line.selectedSize && `Size: ${line.selectedSize}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-grid grid-cols-[32px_32px_32px] overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                          <button
                            onClick={() => updateQty(line.cartKey ?? line.productId, line.qty - 1)}
                            aria-label="Decrease quantity"
                            data-testid={`cart-decrease-quantity-${line.cartKey ?? line.productId}`}
                            className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]"
                          >
                            -
                          </button>
                          <span className="grid h-8 place-items-center border-x border-[rgb(var(--vibe-border))] font-mono text-[12px] font-medium">{line.qty}</span>
                          <button
                            onClick={() => updateQty(line.cartKey ?? line.productId, line.qty + 1)}
                            aria-label="Increase quantity"
                            data-testid={`cart-increase-quantity-${line.cartKey ?? line.productId}`}
                            className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(line.cartKey ?? line.productId)}
                          data-testid={`cart-remove-item-${line.cartKey ?? line.productId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[rgb(var(--vibe-muted))] hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="vibe-card h-fit p-5 md:p-6">
              <h2 className="text-[13px] font-medium">Order summary</h2>
              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-[rgb(var(--vibe-muted))]">Subtotal</dt>
                  <dd className="font-mono font-medium">{format(cartSubtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[rgb(var(--vibe-muted))]">Shipping</dt>
                  <dd className="font-mono font-medium">
                    Included
                  </dd>
                </div>
                <div className="mt-3 flex justify-between border-t border-[rgb(var(--vibe-border))] pt-3 text-[13px]">
                  <dt className="font-medium">Total</dt>
                  <dd className="font-mono font-semibold">{format(total)}</dd>
                </div>
              </dl>
              <button
                onClick={() => navigate("/checkout")}
                data-testid="cart-checkout-button"
                className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90"
              >
                Checkout
              </button>
              <PaymentMethods compact className="mt-4" />
              <p className="mt-3 text-center text-[11px] text-[rgb(var(--vibe-muted))]">
                Shipping is included across India.
              </p>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default Cart;

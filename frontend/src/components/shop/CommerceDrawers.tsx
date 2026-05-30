import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Trash2, X } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { productImage, productPrice } from "@/data/products";
import { cn } from "@/lib/utils";
import { listActiveProducts, listByIds, type Product } from "@/services/productService";
import { useShop } from "@/store/shop";
import { PaymentMethods } from "@/components/shop/PaymentMethods";

const overlayBase = "fixed inset-0 z-[60] bg-black/25 transition-opacity";
const panelBase =
  "commerce-shell fixed right-0 top-0 z-[61] flex h-dvh w-full max-w-[430px] flex-col overflow-hidden border-l border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))] shadow-2xl transition-transform duration-300 ease-out";

function hasProductOptions(product: Product) {
  return Boolean(product.color_options?.length || product.size_options?.length);
}

function normalizedTags(product: Product) {
  const genericTags = new Set(["book", "books", "english", "arabic", "urdu", "clothing", "essential", "essentials"]);
  return new Set((product.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter((tag) => tag && !genericTags.has(tag)));
}

function recommendationScore(candidate: Product, cartProducts: Product[]) {
  const candidateTags = normalizedTags(candidate);
  let score = candidate.is_featured ? 2 : 0;
  if (candidate.is_bestseller) score += 1;
  if (candidate.is_new_arrival) score += 0.5;

  for (const cartProduct of cartProducts) {
    if (candidate.category && candidate.category === cartProduct.category) score += 4;
    for (const tag of normalizedTags(cartProduct)) {
      if (candidateTags.has(tag)) score += 3;
    }
  }

  return score;
}

function selectCartRecommendations(products: Product[], cartProducts: Product[], cartProductIds: Set<string>, limit = 3) {
  const ranked = products
    .filter((product) => !cartProductIds.has(product.id) && product.is_active !== false && product.in_stock !== false && (product.stock_quantity ?? 0) > 0)
    .map((product) => ({ product, score: recommendationScore(product, cartProducts), tags: normalizedTags(product) }))
    .sort((a, b) => b.score - a.score || Number(Boolean(b.product.is_featured)) - Number(Boolean(a.product.is_featured)));

  const selected: typeof ranked = [];
  const usedCategories = new Set<string>();
  const usedTags = new Set<string>();

  while (selected.length < limit && ranked.length > 0) {
    ranked.sort((a, b) => {
      const aCategoryFresh = a.product.category && !usedCategories.has(a.product.category) ? 1 : 0;
      const bCategoryFresh = b.product.category && !usedCategories.has(b.product.category) ? 1 : 0;
      const aTagFresh = [...a.tags].some((tag) => !usedTags.has(tag)) ? 1 : 0;
      const bTagFresh = [...b.tags].some((tag) => !usedTags.has(tag)) ? 1 : 0;
      const aRepeatedTags = [...a.tags].filter((tag) => usedTags.has(tag)).length;
      const bRepeatedTags = [...b.tags].filter((tag) => usedTags.has(tag)).length;
      const aDiversifiedScore = a.score + aCategoryFresh * 4 + aTagFresh * 2 - aRepeatedTags * 4 - (aCategoryFresh ? 0 : 1);
      const bDiversifiedScore = b.score + bCategoryFresh * 4 + bTagFresh * 2 - bRepeatedTags * 4 - (bCategoryFresh ? 0 : 1);
      return bDiversifiedScore - aDiversifiedScore || b.score - a.score;
    });

    const [next] = ranked.splice(0, 1);
    selected.push(next);
    if (next.product.category) usedCategories.add(next.product.category);
    for (const tag of next.tags) usedTags.add(tag);
  }

  return selected.map(({ product }) => product);
}

function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(overlayBase, open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(panelBase, open ? "translate-x-0" : "translate-x-full")}
        aria-hidden={!open}
      >
        <div className="flex h-14 items-center justify-between gap-4 border-b border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] px-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[rgb(var(--vibe-surface))] text-[rgb(var(--vibe-muted))]">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[rgb(var(--vibe-muted))] transition-colors hover:bg-[rgb(var(--vibe-accent))] hover:text-[rgb(var(--vibe-foreground))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}

export function CartDrawer() {
  const { cartOpen, closeCart, cartLines, cartSubtotal, cartCount, updateQty, removeFromCart, toggleWishlist, isWishlisted, addToCart } = useShop();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const shipping = 0;
  const total = cartSubtotal + shipping;

  useEffect(() => {
    if (!cartOpen) return;
    let cancelled = false;
    const cartProductIds = new Set(cartLines.map((line) => line.productId));
    Promise.all([listActiveProducts(), listByIds([...cartProductIds])]).then(([products, cartProducts]) => {
      if (!cancelled) setRecommendations(selectCartRecommendations(products, cartProducts, cartProductIds));
    });
    return () => {
      cancelled = true;
    };
  }, [cartOpen, cartLines]);

  const goCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <DrawerShell
      open={cartOpen}
      onClose={closeCart}
      title="Your cart"
      subtitle={cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} ready` : "Add something beautiful"}
    >
      {cartLines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h3 className="mt-4 text-[15px] font-semibold">Your cart is empty</h3>
          <p className="mt-1 max-w-[260px] text-[12px] text-[rgb(var(--vibe-muted))]">Browse books and essentials, then your order summary will stay one tap away.</p>
          <Link
            to="/shop"
            onClick={closeCart}
            className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <ul className="space-y-2">
              {cartLines.map((line) => {
                const wished = isWishlisted(line.productId);
                return (
                  <li key={line.cartKey ?? line.productId} className="vibe-card p-3 transition-colors hover:border-zinc-300">
                    <div className="flex gap-3">
                      <Link to={`/product/${line.slug ?? line.productId}`} onClick={closeCart} className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-white">
                        {line.image && <img src={line.image} alt={line.name} loading="eager" decoding="async" className="h-full w-full object-cover" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/product/${line.slug ?? line.productId}`} onClick={closeCart} className="line-clamp-2 text-[13px] font-medium leading-snug hover:text-zinc-600">
                          {line.name}
                        </Link>
                        <p className="mt-1 font-mono text-[12px] font-medium tabular-nums">{format(line.price)}</p>
                        {(line.selectedColor || line.selectedSize) && (
                          <p className="mt-1 text-[11px] text-[rgb(var(--vibe-muted))]">
                            {[line.selectedColor && `Colour: ${line.selectedColor}`, line.selectedSize && `Size: ${line.selectedSize}`].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="inline-grid grid-cols-[30px_30px_30px] overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                            <button type="button" onClick={() => updateQty(line.cartKey ?? line.productId, line.qty - 1)} className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]" aria-label="Decrease quantity">
                              -
                            </button>
                            <span className="grid h-8 place-items-center border-x border-[rgb(var(--vibe-border))] font-mono text-[12px] font-medium tabular-nums">{line.qty}</span>
                            <button type="button" onClick={() => updateQty(line.cartKey ?? line.productId, line.qty + 1)} className="grid h-8 place-items-center hover:bg-[rgb(var(--vibe-accent))]" aria-label="Increase quantity">
                              +
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleWishlist(line.productId)}
                              className={cn("grid h-8 w-8 place-items-center rounded-md border border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] hover:text-[rgb(var(--vibe-foreground))]", wished && "bg-[rgb(var(--vibe-foreground))] text-white")}
                              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                            >
                              <Heart className={cn("h-3.5 w-3.5", wished && "fill-current")} />
                            </button>
                            <button type="button" onClick={() => removeFromCart(line.cartKey ?? line.productId)} className="grid h-8 w-8 place-items-center rounded-md border border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))] hover:border-red-200 hover:text-red-600" aria-label="Remove item">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {recommendations.length > 0 && (
              <section className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-medium">
                  Recommended with this order
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {recommendations.map((product) => {
                    const image = productImage(product);
                    const price = productPrice(product);
                    return (
                      <div key={product.id} className="group rounded-md border border-[rgb(var(--vibe-border))] bg-white p-2 transition-colors hover:border-zinc-400">
                        <Link to={`/product/${product.slug ?? product.id}`} onClick={closeCart} className="block aspect-[3/4] overflow-hidden rounded bg-white">
                          {image && <img src={image} alt="" loading="eager" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />}
                        </Link>
                        <Link to={`/product/${product.slug ?? product.id}`} onClick={closeCart} className="mt-2 line-clamp-2 block text-[11px] font-medium leading-snug">{product.name}</Link>
                        <span className="mt-1 block font-mono text-[11px] text-[rgb(var(--vibe-muted))]">{format(price)}</span>
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => hasProductOptions(product) ? (closeCart(), navigate(`/product/${product.slug ?? product.id}`)) : addToCart({ id: product.id, name: product.name, price, priceInr: product.price_inr, image, slug: product.slug ?? undefined, weightG: product.weight_g, shippingClass: product.shipping_class })}
                            className="h-7 rounded-md bg-[rgb(var(--vibe-foreground))] px-1 text-[10px] font-medium text-white"
                          >
                            {hasProductOptions(product) ? "Select" : "Add"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleWishlist(product.id)}
                            className="h-7 rounded-md border border-[rgb(var(--vibe-border))] px-1 text-[10px] text-[rgb(var(--vibe-muted))]"
                          >
                            Wish
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          <div className="border-t border-[rgb(var(--vibe-border))] bg-white p-4">
            <dl className="space-y-2 text-[12px]">
              <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Subtotal</dt><dd className="font-mono font-medium tabular-nums">{format(cartSubtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[rgb(var(--vibe-muted))]">Shipping</dt><dd className="font-mono font-medium tabular-nums">Included</dd></div>
              <div className="flex justify-between border-t border-[rgb(var(--vibe-border))] pt-3 text-[13px]"><dt className="font-medium">Total</dt><dd className="font-mono font-semibold tabular-nums">{format(total)}</dd></div>
            </dl>
            <button type="button" onClick={goCheckout} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90">
              Checkout
            </button>
            <PaymentMethods compact className="mt-4" />
            <p className="mt-2 text-center text-[11px] text-[rgb(var(--vibe-muted))]">
              Shipping is included across India.
            </p>
          </div>
        </>
      )}
    </DrawerShell>
  );
}

export function WishlistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wishlist, toggleWishlist, addToCart } = useShop();
  const { format } = useCurrency();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listByIds(wishlist).then((products) => {
      if (!cancelled) {
        setItems(products);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, wishlist]);

  return (
    <DrawerShell open={open} onClose={onClose} title="Wishlist" subtitle={`${wishlist.length} saved item${wishlist.length === 1 ? "" : "s"}`}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-[rgb(var(--vibe-surface))]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-[15px] font-semibold">Nothing saved yet</h3>
            <p className="mt-1 max-w-[260px] text-[12px] text-[rgb(var(--vibe-muted))]">Use the heart on products to build a short list for later.</p>
            <Link to="/shop" onClick={onClose} className="mt-6 grid h-9 place-items-center rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white">Browse products</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((product) => {
              const image = productImage(product);
              const price = productPrice(product);
              return (
                <li key={product.id} className="vibe-card p-3">
                  <div className="flex gap-3">
                    <Link to={`/product/${product.slug ?? product.id}`} onClick={onClose} className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-white">
                      {image && <img src={image} alt={product.name} loading="eager" decoding="async" className="h-full w-full object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${product.slug ?? product.id}`} onClick={onClose} className="line-clamp-2 text-[13px] font-medium leading-snug hover:text-zinc-600">{product.name}</Link>
                      <p className="mt-1 font-mono text-[12px] font-medium">{format(price)}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => hasProductOptions(product) ? (onClose(), navigate(`/product/${product.slug ?? product.id}`)) : addToCart({ id: product.id, name: product.name, price, priceInr: product.price_inr, image, slug: product.slug ?? undefined, weightG: product.weight_g, shippingClass: product.shipping_class })}
                          className="h-8 flex-1 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[11px] font-medium text-white"
                        >
                          {hasProductOptions(product) ? "Choose options" : "Add to cart"}
                        </button>
                        <button type="button" onClick={() => toggleWishlist(product.id)} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[11px] text-[rgb(var(--vibe-muted))] hover:border-red-200 hover:text-red-600">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DrawerShell>
  );
}

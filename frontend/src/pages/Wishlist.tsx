import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useShop } from "@/store/shop";
import { listByIds, type Product } from "@/services/productService";

const Wishlist = () => {
  const { wishlist, addToCart, toggleWishlist } = useShop();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (wishlist.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listByIds(wishlist).then((products) => {
      if (cancelled) return;
      setItems(products);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [wishlist]);

  return (
    <SiteLayout hideHeader compactFooter>
      <div className="vibe-admin mx-auto max-w-[1440px] px-4 py-8 md:px-8 md:py-12">
        <div className="vibe-card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between md:mb-8 md:p-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">Saved shelf</p>
            <h1 className="mt-1 text-[20px] font-semibold tracking-tight md:text-[24px]">
              Wishlist
            </h1>
            <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">
              Keep future buys here, then move items to cart when the customer is ready.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                items.forEach((p) =>
                  addToCart({
                    id: p.id,
                    name: p.name,
                    price: p.sale_price_inr ?? p.price_inr ?? p.price,
                    priceInr: p.price_inr,
                    image: p.cover_image_url ?? p.images?.[0] ?? null,
                    slug: p.slug ?? undefined,
                    weightG: p.weight_g,
                    shippingClass: p.shipping_class,
                  }),
                );
              }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Add all to cart
            </button>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-lg border border-[rgb(var(--vibe-border))] bg-white" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="vibe-card p-10 text-center md:p-16">
            <h2 className="mt-4 text-[15px] font-semibold">No saved items yet</h2>
            <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">
              Tap the heart on any product to save it here.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white hover:opacity-90"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <div key={p.id} className="vibe-card p-2">
                <ProductCard product={p} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      addToCart({
                        id: p.id,
                        name: p.name,
                        price: p.sale_price_inr ?? p.price_inr ?? p.price,
                        priceInr: p.price_inr,
                        image: p.cover_image_url ?? p.images?.[0] ?? null,
                        slug: p.slug ?? undefined,
                        weightG: p.weight_g,
                        shippingClass: p.shipping_class,
                      })
                    }
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[11px] font-medium text-white"
                  >
                    Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(p.id)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[11px] font-medium text-[rgb(var(--vibe-muted))] transition-colors hover:border-red-200 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default Wishlist;

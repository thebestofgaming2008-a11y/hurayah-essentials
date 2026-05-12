import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useShop } from "@/store/shop";
import { listByIds, type Product } from "@/services/productService";

const Wishlist = () => {
  const { wishlist } = useShop();
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
    <SiteLayout>
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-foreground italic font-bold tracking-tight text-2xl md:text-4xl mb-6 md:mb-10">
          Your wishlist
        </h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-hero/40 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 md:p-16 text-center">
            <Heart className="h-10 w-10 mx-auto text-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold">No saved items yet</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Tap the heart on any product to save it here.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
            >
              Browse products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default Wishlist;
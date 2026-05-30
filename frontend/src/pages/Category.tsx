import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATEGORIES } from "@/data/products";
import { listByCategory, type Product } from "@/services/productService";

const Category = () => {
  const { key } = useParams<{ key: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    listByCategory(key).then((data) => {
      if (!cancelled) {
        setProducts(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) return <Navigate to="/shop" replace />;
  const meta = CATEGORIES.find((c) => c.key === key) ?? {
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    blurb: "Curated for you.",
  };

  return (
    <SiteLayout>
      <section className="bg-hero border-b border-border">
        <div className="mx-auto max-w-[1440px] px-4 py-7 text-center md:px-8 md:py-12">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Collection
          </p>
          <h1 className="mt-2 text-3xl font-bold italic tracking-tight text-foreground md:text-5xl">
            {meta.label}
          </h1>
          <p className="mt-3 text-foreground/65 text-sm md:text-lg max-w-2xl mx-auto">
            {meta.blurb}
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            {loading ? "Loading…" : `${products.length} products`}
          </p>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-10 md:py-16">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-lg bg-hero/40 animate-pulse"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-foreground/70 mb-3">
                Nothing in this collection yet.
              </p>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-md bg-brand text-brand-foreground text-sm font-semibold px-4 py-2 hover:opacity-90"
              >
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p, index) => (
                <ProductCard key={p.id} product={p} priority={index < 4} />
              ))}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold hover:border-brand hover:text-brand transition-colors"
            >
              Browse all products
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default Category;

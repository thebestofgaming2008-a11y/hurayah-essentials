import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATEGORIES, TOP_LEVEL_CATEGORIES, productPrice, type CategoryKey } from "@/data/products";
import { listActiveProducts, type Product } from "@/services/productService";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const PRICE_MIN = 100;
const PRICE_MAX = 5000;

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
  const subject = params.get("subject") ?? "";
  const initialCat = (params.get("category") as CategoryKey | null) ?? null;

  const [cat, setCat] = useState<CategoryKey | null>(initialCat);
  const [sort, setSort] = useState<SortKey>("featured");
  const [maxPrice, setMaxPrice] = useState<number>(PRICE_MAX);
  const [open, setOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listActiveProducts().then((data) => {
      if (cancelled) return;
      setAllProducts(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCat((params.get("category") as CategoryKey | null) ?? null);
  }, [params]);

  const setCategory = (next: CategoryKey | null) => {
    setCat(next);
    const p = new URLSearchParams(params);
    if (next) p.set("category", next);
    else p.delete("category");
    setParams(p, { replace: true });
  };

  const clearSubject = () => {
    const next = new URLSearchParams(params);
    next.delete("subject");
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    setCat(null);
    setMaxPrice(PRICE_MAX);
    setParams(new URLSearchParams(), { replace: true });
  };

  const filtered = useMemo(() => {
    let list = [...allProducts];
    if (cat) list = list.filter((p) => p.category === cat);
    if (subject)
      list = list.filter(
        (p) =>
          Array.isArray(p.tags) &&
          p.tags.some((t) => (t ?? "").toLowerCase() === subject.toLowerCase()),
      );
    if (q) {
      list = list.filter((p) => {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        const haystack = [
          p.name,
          p.author,
          p.short_description,
          p.description,
          p.publisher,
          p.isbn,
          p.category,
          p.language,
          ...tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    list = list.filter((p) => productPrice(p) <= maxPrice);
    if (sort === "price-asc") list.sort((a, b) => productPrice(a) - productPrice(b));
    else if (sort === "price-desc") list.sort((a, b) => productPrice(b) - productPrice(a));
    return list;
  }, [allProducts, cat, subject, q, maxPrice, sort]);

  const activeFilterCount =
    (cat ? 1 : 0) + (subject ? 1 : 0) + (maxPrice < PRICE_MAX ? 1 : 0);

  const Filters = (
    <div className="space-y-7">
      <div>
        <h3 className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-3">
          Category
        </h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "flex items-center justify-between text-left text-sm rounded-md px-2.5 py-2 transition-colors",
              cat === null ? "bg-brand text-brand-foreground" : "text-foreground/75 hover:bg-hero/60",
            )}
          >
            <span>All products</span>
            <span className="text-xs opacity-70">{allProducts.length}</span>
          </button>
          {TOP_LEVEL_CATEGORIES.map((c) => {
            const count = allProducts.filter((p) => p.category === c.key).length;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  "flex items-center justify-between text-left text-sm rounded-md px-2.5 py-2 transition-colors",
                  cat === c.key
                    ? "bg-brand text-brand-foreground"
                    : "text-foreground/75 hover:bg-hero/60",
                )}
              >
                <span>{c.label}</span>
                <span className="text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-3">
          Max price
        </h3>
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={50}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <div className="flex justify-between text-xs text-foreground/60 mt-1.5">
          <span>₹{PRICE_MIN}</span>
          <span className="font-semibold text-foreground">
            Up to ₹{maxPrice.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full text-sm rounded-md border border-border py-2 text-foreground/70 hover:bg-hero/60 hover:text-brand transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <SiteLayout>
      <section className="border-b border-border bg-hero/65">
        <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-8 md:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Collection</p>
          <h1 className="mt-1.5 text-3xl text-hero-foreground md:text-5xl">Shop all products</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/65 md:text-base">
            Books, clothing and essentials selected for everyday benefit.
          </p>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:-mx-0 md:mt-6 md:px-0">
            <button onClick={() => setCategory(null)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", !cat ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-foreground/75 hover:border-brand")}>All</button>
            {TOP_LEVEL_CATEGORIES.map((category) => (
              <button key={category.key} onClick={() => setCategory(category.key)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", cat === category.key ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-foreground/75 hover:border-brand")}>
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-10">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 lg:gap-12">
          <aside className="hidden md:block">
            <div className="sticky top-4">{Filters}</div>
          </aside>

          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-border pb-4">
              <p className="text-sm text-foreground/65">
                <span className="font-semibold text-foreground">{filtered.length}</span> product
                {filtered.length === 1 ? "" : "s"}
                {q && <span className="ml-1">for "{q}"</span>}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {subject && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-xs font-medium">
                    {subject}
                    <button onClick={clearSubject} aria-label="Clear subject">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {cat && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hero text-hero-foreground px-2.5 py-1 text-xs font-medium">
                    {CATEGORIES.find((c) => c.key === cat)?.label}
                    <button onClick={() => setCategory(null)} aria-label="Clear category">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm transition-colors hover:border-brand md:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 h-5 min-w-[20px] px-1 grid place-items-center rounded-full bg-brand text-brand-foreground text-[10px] font-semibold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="commerce-control h-10 max-w-[170px] px-3 text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      Sort: {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-3 xl:grid-cols-4 md:gap-x-6 md:gap-y-9">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-lg bg-hero/40 animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <p className="text-foreground/70 mb-3">
                  {allProducts.length === 0
                    ? "No products yet - your shop is ready for its first listing."
                    : "No products match your filters."}
                </p>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center rounded-md bg-brand text-brand-foreground text-sm font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filtered.map((p, index) => (
                  <ProductCard key={p.id} product={p} priority={index < 4} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="commerce-sheet-in absolute right-0 top-0 h-full w-[88%] max-w-[340px] overflow-y-auto bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-md hover:bg-foreground/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {Filters}
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-md bg-brand text-brand-foreground py-2.5 text-sm font-semibold"
            >
              Show {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </button>
          </aside>
        </div>
      )}
    </SiteLayout>
  );
};

export default Shop;

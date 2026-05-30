import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Truck,
  Shield,
  RotateCcw,
  Headphones,
  Instagram,
  BookOpen,
  Scroll,
  Feather,
  Quote,
  Languages,
  Scale,
  Heart,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import calligraphyLeft from "@/assets/calligraphy-left.png";
import calligraphyRight from "@/assets/calligraphy-right.png";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATEGORIES, type CategoryKey } from "@/data/products";
import { listActiveProducts, type Product } from "@/services/productService";

const GUARANTEES = ["Authentic titles", "India-wide delivery", "Secure checkout"];

const SUBJECTS = [
  { name: "Aqeedah", desc: "Creed & belief", Icon: Shield },
  { name: "Seerah", desc: "The Prophet's life", Icon: Scroll },
  { name: "Tafsir", desc: "Qur'anic exegesis", Icon: BookOpen },
  { name: "Hadith", desc: "Prophetic traditions", Icon: Quote },
  { name: "Fiqh", desc: "Islamic jurisprudence", Icon: Scale },
  { name: "Arabic", desc: "Language of the Qur'an", Icon: Languages },
  { name: "Tazkiyah", desc: "Purification of the soul", Icon: Feather },
  { name: "Essentials", desc: "Everyday household picks", Icon: Heart },
];

const VALUE_PROPS = [
  { Icon: Truck, title: "India-wide delivery", desc: "Shipping included across India." },
  { Icon: Shield, title: "Secure checkout", desc: "Encrypted payments, every time." },
  { Icon: RotateCcw, title: "Easy returns", desc: "Hassle-free returns on every order." },
  { Icon: Headphones, title: "Real support", desc: "Friendly humans, here to help." },
];

const TESTIMONIALS = [
  { quote: "I'm truly delighted to receive my books, honey and saffron along with free miswak. The packaging was so secure and well done. Everything arrived perfectly intact. JazakAllahu khayran!", name: "Customer" },
  { quote: "Your book Mukhtasar al-'Uluww is truly amazing - the print, the quality, the content... everything is so pleasing to the eyes and a coolness to the heart especially since it speaks about our Rabb.", name: "Customer" },
  { quote: "The delivery was extremely quick they came in less than 2 weeks and they arrived in good condition. The books are in extremely good condition as they are brand new. My only regret is not getting more sub'han'Allah.", name: "Customer" },
];

const TAB_KEYS: CategoryKey[] = ["books", "clothing", "children"];

const Index = () => {
  const location = useLocation();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<CategoryKey>("books");

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
    const requested = new URLSearchParams(location.search).get("category") as CategoryKey | null;
    if (requested && TAB_KEYS.includes(requested)) setActiveCat(requested);
    if (location.hash === "#categories") {
      window.setTimeout(() => document.getElementById("categories")?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
    }
  }, [location.hash, location.search]);

  const activeMeta = CATEGORIES.find((c) => c.key === activeCat)!;
  const featured = useMemo(
    () => allProducts.filter((p) => p.is_featured).slice(0, 4),
    [allProducts],
  );
  const bestsellers = useMemo(
    () => allProducts.filter((p) => p.is_bestseller).slice(0, 8),
    [allProducts],
  );
  const newArrivals = useMemo(
    () => allProducts.filter((p) => p.is_new_arrival).slice(0, 8),
    [allProducts],
  );
  const activeProducts = useMemo(
    () => allProducts.filter((p) => p.category === activeCat).slice(0, 12),
    [allProducts, activeCat],
  );

  // Fallbacks: if no flagged products yet, show the latest items so sections never look empty
  const featuredView = featured.length ? featured : allProducts.slice(0, 4);
  const bestsellersView = bestsellers.length ? bestsellers : allProducts.slice(0, 8);
  const newArrivalsView = newArrivals.length ? newArrivals : allProducts.slice(0, 8);

  // Safety fallback if a category key is not found
  if (!activeMeta) return null;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-hero">
        <img
          src={calligraphyLeft}
          alt=""
          aria-hidden
          className="pointer-events-none select-none absolute opacity-90"
          style={{ top: "-10vw", left: "-11.04vw", width: "29.04vw", height: "auto" }}
        />
        <img
          src={calligraphyRight}
          alt=""
          aria-hidden
          className="pointer-events-none select-none absolute opacity-90"
          style={{ top: "-10vw", right: "-11vw", width: "28.84vw", height: "auto" }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 35%, hsl(0 0% 100% / 0.45), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-[1440px] px-4 py-12 md:py-20 lg:py-24 text-center">
          <h1 className="font-bold italic tracking-tight text-foreground text-[clamp(1.75rem,5vw,5.125rem)] leading-[0.95]">
            SEEK KNOWLEDGE
          </h1>
          <p className="text-hero-foreground tracking-tight text-[clamp(2.5rem,8vw,7.625rem)] leading-[0.95] -mt-1 md:-mt-2">
            AFFORDABLY.
          </p>

          <p className="mt-4 md:mt-6 text-[hsl(0_0%_0%_/_0.65)] text-[clamp(0.875rem,1.6vw,2.375rem)] tracking-tight">
            Seeking knowledge made easy.
          </p>

          <ul className="mt-3 md:mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[hsl(0_0%_0%_/_0.6)] text-xs sm:text-sm md:text-base">
            {GUARANTEES.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>

          <div className="mt-7 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link
              to="/shop"
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-brand text-brand-foreground font-bold tracking-tight text-base md:text-lg px-10 md:px-14 py-3.5 md:py-4 shadow-2xl hover:opacity-95 transition-opacity"
            >
              Browse products
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#categories"
              className="glass-cta inline-flex items-center justify-center rounded-2xl text-hero-foreground font-bold tracking-tight text-base md:text-lg px-10 md:px-14 py-3.5 md:py-4 transition-all"
            >
              Check out categories
            </a>
          </div>
        </div>
      </section>

      <section id="products" className="bg-hero pb-16 md:pb-24">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="flex items-end justify-between mb-6 md:mb-10">
            <h2 className="text-foreground tracking-tight text-2xl md:text-3xl lg:text-4xl">
              Featured Products
            </h2>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-1 text-foreground text-sm md:text-base hover:text-brand transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg bg-background/40 animate-pulse" />
              ))}
            </div>
          ) : featuredView.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No products yet - your shop is ready for its first listing.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredView.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="categories" className="bg-background border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-14 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
            <div>
              <h2 className="text-foreground tracking-tight text-2xl md:text-3xl lg:text-4xl">
                Shop by category
              </h2>
              <p className="mt-2 text-foreground/60 text-sm md:text-base">{activeMeta.blurb}</p>
            </div>
            <div
              role="tablist"
              aria-label="Product categories"
              className="inline-flex self-start md:self-auto rounded-full border border-border bg-hero/40 p-1"
            >
              {TAB_KEYS.map((key) => {
                const meta = CATEGORIES.find((c) => c.key === key);
                if (!meta) return null;
                const active = key === activeCat;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setActiveCat(key)}
                    className={`px-4 md:px-5 py-2 rounded-full text-sm md:text-base font-medium transition-all ${
                      active
                        ? "bg-brand text-brand-foreground shadow-sm"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeProducts.length === 0 ? (
            <p className="text-sm text-foreground/55 py-8 text-center">
              No {activeMeta.label.toLowerCase()} listed yet.
            </p>
          ) : (
            <div className="-mx-4 md:-mx-8 px-4 md:px-8 overflow-x-auto pb-3 [scrollbar-width:thin]">
              <div className="flex gap-4 md:gap-6 min-w-max">
                {activeProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    className="w-[160px] sm:w-[200px] md:w-[240px] shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link
              to={`/shop?category=${activeCat}`}
              className="group inline-flex items-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold text-sm md:text-base px-6 md:px-8 py-3 hover:opacity-95 transition-opacity"
            >
              Shop all {activeMeta.label.toLowerCase()}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <CollectionSection
        eyebrow="Customer favourites"
        title="Bestsellers"
        blurb="The titles and essentials our community keeps coming back to."
        products={bestsellersView}
        ctaTo="/shop"
        ctaLabel="See all bestsellers"
        bgClass="bg-hero/40"
      />

      <CollectionSection
        eyebrow="Just landed"
        title="New arrivals"
        blurb="Fresh off the press and into your library."
        products={newArrivalsView}
        ctaTo="/shop"
        ctaLabel="Browse new arrivals"
        bgClass="bg-background"
      />

      <section id="subjects" className="bg-hero/40 border-t border-border scroll-mt-[140px]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
            <div className="max-w-xl">
              <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Browse the library
              </p>
              <h2 className="mt-2 text-foreground tracking-tight text-2xl md:text-3xl lg:text-4xl">
                Choose your subject
              </h2>
              <p className="mt-3 text-foreground/60 text-sm md:text-base">
                Start where your heart is drawn - explore titles by field of study.
              </p>
            </div>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-1 text-foreground text-sm md:text-base hover:text-brand transition-colors self-start md:self-auto"
            >
              View all subjects
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {SUBJECTS.map(({ name, desc, Icon }) => (
              <Link
                key={name}
                to={`/shop?category=books&subject=${encodeURIComponent(name)}`}
                className="group relative bg-background p-6 md:p-8 flex flex-col gap-4 hover:bg-hero/60 transition-colors"
              >
                <span className="h-10 w-10 grid place-items-center rounded-lg border border-border text-brand group-hover:bg-brand group-hover:text-brand-foreground group-hover:border-brand transition-colors">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground text-base md:text-lg tracking-tight">
                    {name}
                  </h3>
                  <p className="mt-1 text-xs md:text-sm text-foreground/55">{desc}</p>
                </div>
                <ArrowRight className="absolute top-6 right-6 h-4 w-4 text-foreground/30 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-12 md:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x divide-border lg:divide-y-0 border border-border rounded-2xl overflow-hidden">
            {VALUE_PROPS.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-5 md:p-6 bg-background">
                <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-hero text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm md:text-base tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-xs md:text-sm text-foreground/55 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-hero/40 border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Kind words
            </p>
            <h2 className="mt-2 text-foreground tracking-tight text-2xl md:text-3xl lg:text-4xl">
              From our community
            </h2>
            <p className="mt-3 text-foreground/60 text-sm md:text-base">
              Honest words from readers and customers in our community.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="relative rounded-2xl bg-background border border-border p-7 md:p-8 flex flex-col gap-5 hover:shadow-lg transition-shadow"
              >
                <Quote className="h-7 w-7 text-brand/30" aria-hidden />
                <blockquote className="text-foreground/85 text-base md:text-[17px] leading-relaxed tracking-tight">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-auto pt-4 border-t border-border flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-brand text-brand-foreground grid place-items-center font-semibold text-sm">
                    {t.name.charAt(0)}
                  </span>
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-12 md:mt-16 flex flex-col items-center gap-3">
            <p className="text-sm text-foreground/60">
              More reviews shared by customers on our Instagram stories.
            </p>
            <a
              href="https://www.instagram.com/stories/highlights/18086224496025327/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full bg-brand text-brand-foreground px-6 md:px-7 py-3 md:py-3.5 font-semibold text-sm md:text-base shadow-md hover:shadow-xl transition-all"
            >
              <Instagram className="h-5 w-5" />
              See all reviews on Instagram
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

function CollectionSection({
  eyebrow,
  title,
  blurb,
  products,
  ctaTo,
  ctaLabel,
  bgClass,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  products: Product[];
  ctaTo: string;
  ctaLabel: string;
  bgClass: string;
}) {
  if (!products.length) return null;
  return (
    <section className={`${bgClass} border-t border-border`}>
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-14 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-10">
          <div>
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-foreground tracking-tight text-2xl md:text-3xl lg:text-4xl">
              {title}
            </h2>
            <p className="mt-2 text-foreground/60 text-sm md:text-base max-w-xl">{blurb}</p>
          </div>
          <Link
            to={ctaTo}
            className="group inline-flex items-center gap-1 text-foreground text-sm md:text-base hover:text-brand transition-colors self-start md:self-auto"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="-mx-4 md:-mx-8 px-4 md:px-8 overflow-x-auto pb-3 [scrollbar-width:thin]">
          <div className="flex gap-4 md:gap-6 min-w-max">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                className="w-[160px] sm:w-[200px] md:w-[240px] shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Index;

import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Heart, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATEGORIES, productCompareAt, productImage, productPrice, type CategoryKey } from "@/data/products";
import { getProductById, getProductBySlug, listByCategory, listByIds, type Product } from "@/services/productService";
import { canReviewProduct, listPublishedReviews, submitReview, type ProductReview } from "@/services/reviewService";
import { useShop } from "@/store/shop";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, isWishlisted, toggleWishlist } = useShop();
  const { format } = useCurrency();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [versions, setVersions] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState<"description" | "details">("description");
  const [mainImgError, setMainImgError] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [hasPassedPrimaryAdd, setHasPassedPrimaryAdd] = useState(false);
  const [footerNearViewport, setFooterNearViewport] = useState(false);
  const primaryAddRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setQty(1);
    setActiveImage(0);
    setMainImgError(false);
    setSelectedColor("");
    setSelectedSize("");
    setHasPassedPrimaryAdd(false);
    setFooterNearViewport(false);

    (async () => {
      let nextProduct = await getProductBySlug(id);
      if (!nextProduct) nextProduct = await getProductById(id);
      if (cancelled) return;

      setProduct(nextProduct);
      setReviews(nextProduct ? await listPublishedReviews(nextProduct.id).catch(() => []) : []);
      setCanReview(nextProduct && user ? await canReviewProduct(nextProduct.id).catch(() => false) : false);
      setVersions(nextProduct?.linked_product_ids?.length ? await listByIds(nextProduct.linked_product_ids).catch(() => []) : []);

      if (nextProduct?.category) {
        const categoryProducts = await listByCategory(nextProduct.category);
        if (!cancelled) setRelated(categoryProducts.filter((item) => item.id !== nextProduct!.id).slice(0, 8));
      } else {
        setRelated([]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    const primaryAdd = primaryAddRef.current;
    const footer = document.querySelector<HTMLElement>("[data-site-footer]");
    if (!primaryAdd || !footer) return;

    const primaryObserver = new IntersectionObserver(([entry]) => {
      setHasPassedPrimaryAdd(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    const footerObserver = new IntersectionObserver(([entry]) => {
      setFooterNearViewport(entry.isIntersecting);
    }, { rootMargin: "0px 0px 72px 0px" });

    primaryObserver.observe(primaryAdd);
    footerObserver.observe(footer);
    return () => {
      primaryObserver.disconnect();
      footerObserver.disconnect();
    };
  }, [loading, product?.id]);

  if (loading) {
    return (
      <SiteLayout>
        <main className="min-h-screen bg-[#dfe7f6] px-5 py-12">
          <div className="mx-auto grid max-w-[1220px] gap-10 lg:grid-cols-[420px_1fr]">
            <div className="aspect-square rounded-md bg-zinc-200 animate-pulse" />
            <div className="space-y-4">
              <div className="h-16 w-3/4 rounded bg-zinc-200 animate-pulse" />
              <div className="h-12 w-40 rounded bg-zinc-200 animate-pulse" />
              <div className="h-36 rounded bg-zinc-200 animate-pulse" />
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  if (!product) return <Navigate to="/shop" replace />;

  const wished = isWishlisted(product.id);
  const price = productPrice(product);
  const compareAt = productCompareAt(product);
  const cover = productImage(product);
  const gallery = Array.from(new Set([cover, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean) as string[]));
  const mainImage = gallery[activeImage] ?? cover;
  const categoryMeta = CATEGORIES.find((category) => category.key === (product.category as CategoryKey | null));
  const stock = product.stock_quantity ?? 0;
  const inStock = product.in_stock !== false && stock > 0;
  const colorOptions = product.color_options ?? [];
  const sizeOptions = product.size_options ?? [];
  const activeColor = selectedColor || colorOptions[0] || "";
  const activeSize = selectedSize || sizeOptions[0] || "";

  const onAdd = () => {
    if (!inStock) return;
    addToCart({ id: product.id, name: product.name, price, priceInr: product.price_inr, image: cover, slug: product.slug ?? undefined, weightG: product.weight_g, shippingClass: product.shipping_class, selectedColor: activeColor || null, selectedSize: activeSize || null }, qty);
    toast({ title: "Added to cart", description: product.name });
  };

  return (
    <SiteLayout>
      <main className="min-h-screen bg-background px-4 py-4 text-[#06133a] sm:px-6 sm:py-8 lg:px-10 lg:pb-10">
        <div className="mx-auto max-w-[1220px]">
          <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs text-[#06133a]/65 sm:mb-8 sm:text-sm">
            <Link to="/" className="hover:text-[#06133a]">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {categoryMeta && (
              <>
                <Link to={`/shop?category=${categoryMeta.key}`} className="hover:text-[#06133a]">{categoryMeta.label}</Link>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <span className="line-clamp-1 text-[#06133a]">{product.name}</span>
          </nav>

          <section className="pdp-fade-in">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12 xl:gap-20">
            <div className="mx-auto w-full max-w-[620px] lg:mx-0">
              <div className="aspect-square overflow-hidden rounded-md border border-[#06133a]/15 bg-white shadow-[0_18px_40px_-30px_rgba(3,15,48,0.5)]">
                {mainImage && !mainImgError ? (
                  isVideoUrl(mainImage) ? (
                    <video key={mainImage} src={mainImage} className="pdp-image-swap h-full w-full object-cover" controls playsInline />
                  ) : (
                    <img key={mainImage} src={mainImage} alt={product.name} onError={() => setMainImgError(true)} className="pdp-image-swap h-full w-full object-cover" />
                  )
                ) : (
                  <div className="h-full w-full bg-[#d9d9d9]" />
                )}
              </div>
              <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 sm:gap-4">
                {gallery.map((src, index) => (
                  <button key={src} type="button" onClick={() => setActiveImage(index)} className={cn("pdp-press aspect-square w-[82px] shrink-0 overflow-hidden rounded-md bg-[#d9d9d9] sm:w-[96px]", activeImage === index && "ring-2 ring-[#06133a]")}>
                    {isVideoUrl(src) ? <video src={src} className="h-full w-full object-cover" muted playsInline /> : <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 lg:sticky lg:top-[150px] lg:h-fit lg:pt-0">
              {product.badge && <span className="inline-flex rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-foreground">{product.badge}</span>}
              <h1 className="mt-3 font-serif text-[2rem] leading-[1.05] text-[#020b2d] sm:text-5xl lg:text-6xl">
                {product.name}
              </h1>
              {(product.author || product.publisher) && (
                <p className="mt-2 font-serif text-lg text-black/60 sm:text-2xl">By {product.author || product.publisher}</p>
              )}
              <p className={cn("mt-4 text-sm font-semibold", inStock ? "text-emerald-700" : "text-red-700")}>{inStock ? "In stock" : "Out of stock"}</p>

              <div className="mt-5">
                <div>
                  {versions.length > 0 && (
                    <>
                      <p className="mb-2 font-serif text-lg text-black/70">Choose variant</p>
                      <select
                        value={product.slug ?? product.id}
                        onChange={(event) => navigate(`/product/${event.target.value}`)}
                        className="commerce-control h-12 w-full px-3 font-serif text-lg text-[#06133a]"
                      >
                        <option value={product.slug ?? product.id}>{product.variant_label || "Current variant"}</option>
                        {versions.map((version) => (
                          <option key={version.id} value={version.slug ?? version.id}>{version.variant_label || version.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 font-serif text-4xl leading-none text-black sm:text-5xl">
                {format(price)}
                {compareAt && <span className="ml-4 text-2xl text-black/35 line-through">{format(compareAt)}</span>}
              </div>

              {(colorOptions.length > 0 || sizeOptions.length > 0) && (
                <div className="mt-6 grid max-w-[49rem] gap-4 sm:grid-cols-2">
                  {colorOptions.length > 0 && <OptionGroup label="Colour" options={colorOptions} value={activeColor} onChange={setSelectedColor} />}
                  {sizeOptions.length > 0 && <OptionGroup label="Size" options={sizeOptions} value={activeSize} onChange={setSelectedSize} />}
                </div>
              )}

              <div className="mt-6">
                <p className="mb-2 font-serif text-lg text-black/70">Quantity</p>
                <div className="inline-grid h-12 grid-cols-[44px_44px_44px] overflow-hidden rounded-md border border-[#06133a]/20 bg-white font-serif text-xl text-black">
                  <button className="pdp-press grid place-items-center hover:bg-[#eef2fa]" type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                  <span className="grid place-items-center border-x border-[#06133a]/15">{qty}</span>
                  <button className="pdp-press grid place-items-center hover:bg-[#eef2fa]" type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-6 grid max-w-[49rem] gap-3">
                <button
                  ref={primaryAddRef}
                  type="button"
                  onClick={onAdd}
                  disabled={!inStock}
                  className="pdp-press inline-flex h-14 w-full max-w-[49rem] items-center justify-center rounded-md bg-brand px-4 text-xl font-bold text-brand-foreground shadow-lg transition-all hover:opacity-95 disabled:opacity-50 sm:h-16 sm:text-2xl"
                >
                  {inStock ? "Add to cart" : "Out of stock"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={cn("pdp-press inline-flex h-12 w-full max-w-[49rem] items-center justify-center gap-2 rounded-md border border-brand bg-white px-4 text-base font-bold text-hero-foreground transition-all hover:bg-[#eef2fa]", wished && "bg-[#eef2fa]")}
                >
                  <Heart className={cn("h-4 w-4", wished && "fill-current")} />
                  {wished ? "Saved to wishlist" : "Add to wishlist"}
                </button>
              </div>
              <div className="mt-5 grid gap-3 border-y border-[#06133a]/10 py-4 text-sm text-black/65 sm:grid-cols-2">
                <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand" /> Shipping included across India</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /> Secure checkout with Razorpay</p>
              </div>

              <section className="mt-8 max-w-[49rem]">
                <div className="flex flex-wrap gap-x-6 gap-y-2 font-serif text-lg sm:gap-x-8 sm:text-xl">
                  <button type="button" onClick={() => setTab("description")} className={cn("pdp-press pb-2", tab === "description" ? "border-b border-[#06133a] font-semibold text-[#06133a]" : "text-black/60")}>Product Description</button>
                  <button type="button" onClick={() => setTab("details")} className={cn("pdp-press pb-2", tab === "details" ? "border-b border-[#06133a] font-semibold text-[#06133a]" : "text-black/60")}>Product Details</button>
                </div>
                {tab === "description" ? (
                  <p className="mt-5 whitespace-pre-line font-serif text-lg leading-relaxed text-black/80 sm:text-xl">{product.description || product.short_description || "Product details coming soon."}</p>
                ) : (
                  <dl className="mt-5 grid gap-3 font-serif text-lg text-black sm:grid-cols-2">
                    <Fact label="Category" value={categoryMeta?.label || product.category || "Product"} />
                    {product.language && <Fact label="Language" value={product.language} />}
                    {product.isbn && <Fact label="ISBN" value={product.isbn} />}
                    {product.sku && <Fact label="SKU" value={product.sku} />}
                  </dl>
                )}
              </section>
            </div>
          </div>
          </section>

          <ReviewsSection productId={product.id} userReady={Boolean(user)} canReview={canReview} reviews={reviews} onSubmitted={async () => setReviews(await listPublishedReviews(product.id).catch(() => reviews))} />

          {related.length > 0 && (
            <section className="mt-14 border-t border-[#06133a] pt-8 sm:mt-20 sm:pt-10">
              <h2 className="mb-6 font-serif text-3xl text-[#06133a] sm:mb-8 sm:text-4xl">More from {categoryMeta?.label ?? "this category"}</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {related.map((item) => <ProductCard key={item.id} product={item} />)}
              </div>
            </section>
          )}
        </div>
        {hasPassedPrimaryAdd && !footerNearViewport && (
          <div className="commerce-quick-add-in fixed inset-x-0 bottom-0 z-30 border-t border-[#06133a]/15 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_-24px_rgba(3,15,48,0.7)] backdrop-blur-md lg:hidden">
            <div className="mx-auto flex max-w-[640px] items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#06133a]">{product.name}</p>
                <p className="font-serif text-lg text-black">{format(price)}</p>
              </div>
              <button type="button" onClick={onAdd} disabled={!inStock} className="pdp-press inline-flex h-12 min-w-[148px] items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-brand-foreground shadow-lg disabled:opacity-50">
                {inStock ? "Add to cart" : "Out of stock"}
              </button>
            </div>
          </div>
        )}
      </main>
    </SiteLayout>
  );
};

function OptionGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 font-serif text-xl text-black/70">{label}: <span className="text-black">{value}</span></p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "pdp-press min-h-10 rounded-md border px-3 font-serif text-base text-black transition-colors sm:text-lg",
                active ? "border-[#06133a] bg-white shadow-sm" : "border-[#06133a]/25 bg-white/45 hover:border-[#06133a]/60",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-black/45">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

function ReviewsSection({ productId, userReady, canReview, reviews, onSubmitted }: { productId: string; userReady: boolean; canReview: boolean; reviews: ProductReview[]; onSubmitted: () => Promise<void> }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userReady) return toast({ title: "Please sign in to review this product", variant: "destructive" });
    if (!canReview) return toast({ title: "Only verified customers can review this product", variant: "destructive" });
    setSubmitting(true);
    try {
      await submitReview({ productId, rating, title: title || null, body: body || null });
      toast({ title: "Review submitted", description: "It will appear after approval." });
      setTitle("");
      setBody("");
      await onSubmitted();
    } catch {
      toast({ title: "Could not submit review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pdp-fade-in mt-14 max-w-[49rem] lg:ml-auto">
      <div className="flex items-center gap-6 border-b border-[#06133a] pb-6">
        <h2 className="font-serif text-3xl text-black sm:text-4xl">Customer Reviews</h2>
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <div className="rounded-md border border-[#06133a]/30 bg-white/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="review-rating" className="font-serif text-xl text-[#06133a]">Your rating</label>
            <input
              id="review-rating"
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={rating}
              onChange={(event) => setRating(Math.max(1, Math.min(5, Number(event.target.value) || 1)))}
              className="h-10 w-24 border border-[#06133a]/35 bg-white/70 px-3 text-right font-serif text-xl outline-none"
            />
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="mt-3 w-full accent-[#06133a]"
            aria-label="Review rating"
          />
        </div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review title" className="h-11 border border-[#06133a]/40 bg-white/60 px-3 font-serif text-xl outline-none" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your review" rows={4} className="resize-none border border-[#06133a]/40 bg-white/60 px-3 py-2 font-serif text-xl outline-none" />
        {!canReview && (
          <p className="rounded-md border border-[#06133a]/20 bg-white/45 px-3 py-2 font-serif text-lg text-[#06133a]/75">
            Reviews are text-only at launch and open after a verified purchase on this account email.
          </p>
        )}
        <button disabled={submitting || !canReview} className="pdp-press h-12 rounded-md bg-brand font-bold text-brand-foreground shadow-2xl disabled:opacity-50">{submitting ? "Submitting..." : "Add review"}</button>
      </form>
      <div className="mt-8 space-y-5">
        {reviews.map((review) => (
          <article key={review.id} className="border-b border-[#06133a]/20 pb-4 font-serif">
            {review.title && <h3 className="mt-2 text-2xl text-black">{review.title}</h3>}
            {review.body && <p className="mt-1 text-xl leading-tight text-black/75">{review.body}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProductDetail;

import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Heart, Minus, Plus, Truck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { RatingStars, StarRatingInput } from "@/components/shop/ReviewStars";
import { BOOK_SUBJECT_LABELS, CATEGORIES, productCardThumbnailUrl, productCompareAt, productImage, productPrice, productSubjectKeys, topCategoryForProduct, type CategoryKey } from "@/data/products";
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const primaryCtaRef = useRef<HTMLButtonElement | null>(null);
  const [showMobileQuickAdd, setShowMobileQuickAdd] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setQty(1);
    setActiveImage(0);
    setMainImgError(false);
    setSelectedColor("");
    setSelectedSize("");
    setSelectedOptions({});
    setShowMobileQuickAdd(false);
    setRelated([]);
    setVersions([]);
    setReviews([]);
    setCanReview(false);

    (async () => {
      let nextProduct = await getProductBySlug(id);
      if (!nextProduct) nextProduct = await getProductById(id);
      if (cancelled) return;

      setProduct(nextProduct);
      setLoading(false);

      if (!nextProduct) return;

      const relatedCategory = topCategoryForProduct(nextProduct);
      const [reviewsResult, canReviewResult, versionsResult, relatedResult] = await Promise.allSettled([
        listPublishedReviews(nextProduct.id),
        user ? canReviewProduct(nextProduct.id) : Promise.resolve(false),
        nextProduct.linked_product_ids?.length ? listByIds(nextProduct.linked_product_ids) : Promise.resolve([]),
        relatedCategory ? listByCategory(relatedCategory) : Promise.resolve([]),
      ]);

      if (cancelled) return;

      setReviews(reviewsResult.status === "fulfilled" ? reviewsResult.value : []);
      setCanReview(canReviewResult.status === "fulfilled" ? canReviewResult.value : false);
      setVersions(versionsResult.status === "fulfilled" ? versionsResult.value : []);
      if (relatedResult.status === "fulfilled") {
        setRelated(relatedResult.value.filter((item) => item.id !== nextProduct.id).slice(0, 8));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const node = primaryCtaRef.current;
        if (!node) return;
        const buttonRect = node.getBoundingClientRect();
        const footerRect = document.querySelector("footer")?.getBoundingClientRect();
        const pastPrimaryButton = buttonRect.bottom < 0;
        const footerApproaching = footerRect ? footerRect.top < window.innerHeight - 24 : false;
        setShowMobileQuickAdd(pastPrimaryButton && !footerApproaching);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [product?.id]);

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
  const productTopCategory = topCategoryForProduct(product) as CategoryKey | null;
  const categoryMeta = CATEGORIES.find((category) => category.key === productTopCategory);
  const subjectEntries = productTopCategory === "books"
    ? productSubjectKeys(product)
        .map((key) => ({ key, label: BOOK_SUBJECT_LABELS.get(key) }))
        .filter((entry): entry is { key: string; label: string } => Boolean(entry.label))
    : [];
  const subjectLabels = subjectEntries.map((entry) => entry.label);
  const stock = product.stock_quantity ?? 0;
  const inStock = product.in_stock !== false && stock > 0;
  const colorOptions = product.color_options ?? [];
  const sizeOptions = product.size_options ?? [];
  const optionGroups = normalizeOptionGroupsForDisplay(product.option_types?.length ? product.option_types : [
    ...(sizeOptions.length ? [{ name: "Size", values: sizeOptions }] : []),
    ...(colorOptions.length ? [{ name: "Colour", values: colorOptions }] : []),
  ]);
  const activeColor = selectedColor || colorOptions[0] || "";
  const activeSize = selectedSize || sizeOptions[0] || "";

  const onAdd = () => {
    if (!inStock) return;
    addToCart({ id: product.id, name: product.name, price, priceInr: product.price_inr, image: cover, slug: product.slug ?? undefined, weightG: product.weight_g, shippingClass: product.shipping_class, selectedColor: activeColor || null, selectedSize: activeSize || null }, qty);
    toast({ title: "Added to cart", description: product.name });
  };

  return (
    <SiteLayout>
      <main className="min-h-screen overflow-x-hidden bg-background px-4 py-4 text-[#06133a] sm:px-6 sm:py-8 lg:px-10 lg:pb-10">
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

          <section>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12 xl:gap-20">
            <div className="mx-auto w-full max-w-[620px] min-w-0 lg:mx-0">
              <div className="aspect-square max-h-[calc(100dvh-220px)] overflow-hidden rounded-md border border-[#06133a]/15 bg-white shadow-[0_18px_40px_-30px_rgba(3,15,48,0.5)]">
                {mainImage && !mainImgError ? (
                  isVideoUrl(mainImage) ? (
                    <video key={mainImage} src={mainImage} className="pdp-image-swap h-full w-full object-contain" controls playsInline />
                  ) : (
                    <img key={mainImage} src={mainImage} alt={product.name} loading="eager" fetchPriority="high" decoding="async" width={900} height={900} sizes="(min-width: 1024px) 48vw, 100vw" onError={() => setMainImgError(true)} className="pdp-image-swap h-full w-full object-contain" />
                  )
                ) : (
                  <div className="h-full w-full bg-[#d9d9d9]" />
                )}
              </div>
              <div className="no-scrollbar mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 sm:gap-4">
                {gallery.map((src, index) => {
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setActiveImage(index);
                        setMainImgError(false);
                      }}
                      className={cn("pdp-press aspect-square w-[68px] shrink-0 overflow-hidden rounded-md bg-[#d9d9d9] sm:w-[96px]", activeImage === index && "ring-2 ring-[#06133a]")}
                    >
                      <GalleryThumbnail src={src} productName={product.name} />
                    </button>
                  );
                })}
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

              {versions.length > 0 && (
                <OtherEditions
                  current={product}
                  editions={versions}
                  formatPrice={format}
                  onSelect={(edition) => navigate(`/product/${edition.slug ?? edition.id}`)}
                />
              )}

              <div className="mt-6 font-serif text-4xl leading-none text-black sm:text-5xl">
                {format(price)}
                {compareAt && <span className="ml-4 text-2xl text-black/35 line-through">{format(compareAt)}</span>}
              </div>

              {optionGroups.length > 0 && (
                <div className="mt-6 grid max-w-[49rem] gap-4 sm:grid-cols-2">
                  {optionGroups.map((group) => {
                    const lower = group.name.toLowerCase();
                    const value = lower === "color" || lower === "colour"
                      ? selectedColor || group.values[0] || ""
                      : lower === "size"
                        ? selectedSize || group.values[0] || ""
                        : selectedOptions[group.name] || group.values[0] || "";
                    return (
                      <OptionGroup
                        key={group.name}
                        label={group.name}
                        options={group.values}
                        value={value}
                        onChange={(next) => {
                          if (lower === "color" || lower === "colour") setSelectedColor(next);
                          else if (lower === "size") setSelectedSize(next);
                          else setSelectedOptions((current) => ({ ...current, [group.name]: next }));
                        }}
                      />
                    );
                  })}
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
                  ref={primaryCtaRef}
                  type="button"
                  onClick={onAdd}
                  disabled={!inStock}
                  data-testid="product-primary-add-to-cart-button"
                  className="premium-cart-button inline-flex h-14 w-full max-w-[49rem] items-center justify-center px-4 text-xl font-bold disabled:opacity-50 sm:h-16 sm:text-2xl"
                >
                  {inStock ? "Add to cart" : "Out of stock"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={cn("premium-outline-button inline-flex h-12 w-full max-w-[49rem] items-center justify-center gap-2 px-4 text-base font-bold", wished && "bg-[#eef2fa]")}
                >
                  <Heart className={cn("h-4 w-4", wished && "fill-current")} />
                  {wished ? "Saved to wishlist" : "Add to wishlist"}
                </button>
              </div>
              <div className="mt-5 border-y border-[#06133a]/10 py-4 text-sm text-black/65">
                <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand" /> Shipping included across India</p>
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
                    {subjectLabels.length > 0 && <Fact label={subjectLabels.length > 1 ? "Subjects" : "Subject"} value={subjectLabels.join(", ")} />}
                    {product.language && <Fact label="Language" value={product.language} />}
                    {product.isbn && <Fact label="ISBN" value={product.isbn} />}
                    {product.sku && <Fact label="SKU" value={product.sku} />}
                  </dl>
                )}
              </section>
            </div>
          </div>
          </section>

          {showMobileQuickAdd && (
            <div className="commerce-quick-add-in fixed inset-x-0 bottom-0 z-50 border-t border-[#06133a]/15 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_38px_-24px_rgba(3,15,48,0.85)] backdrop-blur-md lg:hidden">
              <div className="mx-auto flex max-w-[640px] items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#06133a]">{product.name}</p>
                  <p className="font-serif text-lg text-black">{format(price)}</p>
                </div>
                <button type="button" onClick={onAdd} disabled={!inStock} data-testid="product-sticky-add-to-cart-button" className="premium-cart-button inline-flex h-12 min-w-[148px] items-center justify-center px-4 text-sm font-bold disabled:opacity-50">
                  {inStock ? "Add to cart" : "Out of stock"}
                </button>
              </div>
            </div>
          )}

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
      </main>
    </SiteLayout>
  );
};

function GalleryThumbnail({ src, productName }: { src: string; productName: string }) {
  const thumbnail = productCardThumbnailUrl(src);
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);

  if (isVideoUrl(src)) {
    return <video src={src} className="h-full w-full object-contain" muted playsInline />;
  }

  if (failed) {
    return <span className="block h-full w-full bg-[#eef2fa]" aria-hidden />;
  }

  const image = useOriginal || !thumbnail ? src : thumbnail;
  return (
    <img
      src={image}
      alt={`${productName} thumbnail`}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (thumbnail && image !== src) {
          setUseOriginal(true);
          return;
        }
        setFailed(true);
      }}
      className="h-full w-full object-contain"
    />
  );
}

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

function OtherEditions({ current, editions, formatPrice, onSelect }: { current: Product; editions: Product[]; formatPrice: (amount: number | null | undefined) => string; onSelect: (product: Product) => void }) {
  const rows = editions.filter((edition) => edition.id !== current.id);
  if (!rows.length) return null;
  return (
    <section className="mt-6 max-w-[49rem] border-y border-[#06133a]/10 py-4">
      <h2 className="font-serif text-lg text-[#06133a]">Other Editions</h2>
      <div className="mt-3 space-y-3">
        {rows.map((edition) => {
          const image = productImage(edition);
          const thumb = productCardThumbnailUrl(image) ?? image;
          return (
            <button
              key={edition.id}
              type="button"
              onClick={() => onSelect(edition)}
              className="pdp-press grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-0 py-1 text-left transition-colors hover:bg-[#eef2fa] sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4"
            >
              <span className="block aspect-square overflow-hidden rounded bg-[#d9d9d9]">
                {thumb ? <img src={thumb} alt={edition.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-base leading-tight text-[#06133a] sm:text-lg">{edition.name}</span>
                {(edition.author || edition.publisher) && <span className="mt-0.5 block truncate text-xs text-[#06133a]/65 sm:text-sm">{edition.author || edition.publisher}</span>}
              </span>
              <span className="pl-2 text-right font-serif text-sm text-[#06133a] sm:text-base">{formatPrice(productPrice(edition))}</span>
            </button>
          );
        })}
      </div>
    </section>
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

function normalizeOptionGroupsForDisplay(groups: Array<{ name: string; values: string[] }> | null | undefined) {
  return (groups ?? [])
    .map((group) => ({
      name: group.name?.trim(),
      values: Array.from(new Set((group.values ?? []).map((value) => value.trim()).filter(Boolean))),
    }))
    .filter((group): group is { name: string; values: string[] } => Boolean(group.name && group.values.length))
    .slice(0, 3);
}

function ReviewsSection({ productId, userReady, canReview, reviews, onSubmitted }: { productId: string; userReady: boolean; canReview: boolean; reviews: ProductReview[]; onSubmitted: () => Promise<void> }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reviewCount = reviews.length;
  const averageRating = reviewCount ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviewCount : 0;
  const distribution = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: reviews.filter((review) => Math.round(Number(review.rating) || 0) === score).length,
  }));
  const canSubmit = userReady && canReview;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userReady) return toast({ title: "Please sign in to review this product", variant: "destructive" });
    if (!canReview) return toast({ title: "Reviews are for verified purchases", description: "Open your order from account or tracking to review it.", variant: "destructive" });
    if (!body.trim()) return toast({ title: "Write a short review first", variant: "destructive" });
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
    <section className="mt-14 max-w-[49rem] lg:ml-auto">
      <div className="rounded-md border border-[#06133a]/12 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(3,15,48,0.7)] sm:p-6">
        <div className="flex flex-col gap-5 border-b border-[#06133a]/12 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#06133a]/45">Verified feedback</p>
            <h2 className="mt-1 font-serif text-3xl text-black sm:text-4xl">Customer Reviews</h2>
          </div>
          <div className="sm:text-right">
            <RatingStars rating={averageRating} count={reviewCount} size="lg" />
            <p className="mt-1 text-[12px] text-black/45">{reviewCount ? "Based on published reviews" : "No published reviews yet"}</p>
          </div>
        </div>

        {reviewCount > 0 && (
          <div className="mt-5 grid gap-2">
            {distribution.map(({ score, count }) => (
              <div key={score} className="grid grid-cols-[42px_1fr_28px] items-center gap-3 text-[12px] text-black/55">
                <span>{score} star</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[#e7ebf3]">
                  <span className="block h-full rounded-full bg-[#06133a]" style={{ width: `${reviewCount ? (count / reviewCount) * 100 : 0}%` }} />
                </span>
                <span className="text-right">{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-md border border-[#06133a]/12 bg-[#f7f8fb] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#06133a]">Write a review</h3>
              <p className="mt-1 text-[12px] text-black/55">
                Reviews are text-only, tied to real orders, and published after approval.
              </p>
            </div>
            {!canSubmit && (
              <Link to="/track" className="mt-3 inline-flex h-9 w-fit items-center justify-center rounded-md border border-[#06133a]/20 bg-white px-3 text-[12px] font-semibold text-[#06133a] hover:bg-hero/50 sm:mt-0">
                Review from order
              </Link>
            )}
          </div>

          {canSubmit ? (
            <form onSubmit={submit} className="mt-4 grid gap-3">
              <div className="rounded-md border border-[#06133a]/12 bg-white p-3">
                <span className="mb-2 block text-[12px] font-medium text-black/55">Your rating</span>
                <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />
              </div>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review title (optional)" className="h-11 rounded-md border border-[#06133a]/18 bg-white px-3 text-[15px] outline-none focus:border-[#06133a] focus:ring-2 focus:ring-[#06133a]/10" />
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Tell others what stood out about this product" rows={4} className="resize-none rounded-md border border-[#06133a]/18 bg-white px-3 py-2 text-[15px] outline-none focus:border-[#06133a] focus:ring-2 focus:ring-[#06133a]/10" />
              <button disabled={submitting} className="premium-cart-button h-11 rounded-md px-4 text-sm font-bold disabled:opacity-50">{submitting ? "Submitting..." : "Submit review"}</button>
            </form>
          ) : (
            <p className="mt-4 rounded-md border border-[#06133a]/12 bg-white px-3 py-2 text-[12px] text-black/60">
              {userReady ? "Open a paid order from your account or tracking page to review purchased items." : "Sign in or use guest order tracking after purchase to add a review."}
            </p>
          )}
        </div>

        <div className="mt-7 space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#06133a]/18 bg-white px-4 py-6 text-center">
              <p className="font-serif text-xl text-[#06133a]">No reviews yet</p>
              <p className="mt-1 text-sm text-black/50">Be the first verified customer to share a helpful review.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-md border border-[#06133a]/12 bg-white p-4 shadow-[0_12px_28px_-26px_rgba(3,15,48,0.65)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <RatingStars rating={review.rating} size="sm" />
                    {review.title && <h3 className="mt-2 text-lg font-semibold text-black">{review.title}</h3>}
                  </div>
                  <div className="text-right text-[11px] text-black/45">
                    <p>{review.customer_name || "Verified customer"}</p>
                    {review.created_at && <p>{new Date(review.created_at).toLocaleDateString()}</p>}
                  </div>
                </div>
                {review.body && <p className="mt-3 text-[15px] leading-relaxed text-black/68">{review.body}</p>}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductDetail;

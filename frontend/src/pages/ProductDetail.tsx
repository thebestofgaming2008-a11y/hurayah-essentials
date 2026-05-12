import { useEffect, useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import {
  CATEGORIES,
  productCompareAt,
  productImage,
  productPrice,
  type CategoryKey,
} from "@/data/products";
import {
  getProductById,
  getProductBySlug,
  listByCategory,
  listByIds,
  type Product,
} from "@/services/productService";
import {
  listPublishedReviews,
  submitReview,
  type ProductReview,
} from "@/services/reviewService";
import { useShop } from "@/store/shop";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart, isWishlisted, toggleWishlist } = useShop();
  const { format } = useCurrency();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [versions, setVersions] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [mainImgError, setMainImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setQty(1);
    setActiveImage(0);
    setMainImgError(false);

    (async () => {
      let nextProduct = await getProductBySlug(id);
      if (!nextProduct) nextProduct = await getProductById(id);
      if (cancelled) return;

      setProduct(nextProduct);
      setReviews(nextProduct ? await listPublishedReviews(nextProduct.id).catch(() => []) : []);
      setVersions(
        nextProduct?.linked_product_ids?.length
          ? await listByIds(nextProduct.linked_product_ids).catch(() => [])
          : [],
      );

      if (nextProduct?.category) {
        const categoryProducts = await listByCategory(nextProduct.category);
        if (!cancelled) {
          setRelated(categoryProducts.filter((item) => item.id !== nextProduct!.id).slice(0, 4));
        }
      } else {
        setRelated([]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <div className="aspect-[4/5] rounded-lg bg-hero/40 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-hero/40 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-hero/40 animate-pulse" />
              <div className="h-64 rounded-lg bg-hero/40 animate-pulse" />
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!product) return <Navigate to="/shop" replace />;

  const wished = isWishlisted(product.id);
  const price = productPrice(product);
  const compareAt = productCompareAt(product);
  const cover = productImage(product);
  const gallery = Array.from(
    new Set([cover, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean) as string[]),
  );
  const mainImage = gallery[activeImage] ?? cover;
  const categoryMeta = CATEGORIES.find((category) => category.key === (product.category as CategoryKey | null));
  const ratingValue = product.rating ?? 0;
  const stock = product.stock_quantity ?? 0;
  const inStock = product.in_stock !== false && stock > 0;

  const onAdd = () => {
    if (!inStock) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price,
        priceInr: product.price_inr,
        image: cover,
        slug: product.slug ?? undefined,
      },
      qty,
    );
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-foreground/55 md:text-sm">
          <Link to="/" className="hover:text-brand">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {categoryMeta && (
            <>
              <Link to={`/category/${categoryMeta.key}`} className="hover:text-brand">
                {categoryMeta.label}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="line-clamp-1 text-foreground/80">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12 pdp-fade-in">
          <div className="grid gap-3 md:grid-cols-[88px_1fr] lg:sticky lg:top-28 lg:self-start">
            {gallery.length > 1 && (
              <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
                {gallery.slice(0, 8).map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className={cn(
                      "h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-placeholder pdp-press",
                      activeImage === index ? "border-brand shadow-sm" : "border-border hover:border-foreground/35",
                    )}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="order-1 aspect-[4/5] overflow-hidden rounded-lg border border-border bg-placeholder shadow-sm md:order-2">
              {mainImage && !mainImgError ? (
                <img
                  key={mainImage}
                  src={mainImage}
                  alt={product.name}
                  onError={() => setMainImgError(true)}
                  className="h-full w-full object-cover pdp-image-swap"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-hero/40 text-sm font-medium text-foreground/35">
                  No image available
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="border-b border-border pb-6">
              <div className="flex flex-wrap items-center gap-2">
                {product.badge && (
                  <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                    {product.badge}
                  </span>
                )}
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", inStock ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600")}>
                  {inStock ? "In stock" : "Out of stock"}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                {product.name}
              </h1>
              {(product.author || product.publisher) && (
                <p className="mt-2 text-sm text-foreground/60 md:text-base">
                  {product.author ? `by ${product.author}` : product.publisher}
                </p>
              )}

              {ratingValue > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-foreground/70">
                  <span className="flex gap-0.5 text-brand">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className={cn("h-4 w-4", index < Math.round(ratingValue) && "fill-current")} />
                    ))}
                  </span>
                  <span className="font-medium text-foreground">{ratingValue.toFixed(1)}</span>
                  {product.reviews_count != null && product.reviews_count > 0 && (
                    <span className="text-foreground/50">
                      · {product.reviews_count} review{product.reviews_count === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
            </section>

            <aside className="rounded-lg border border-border bg-background p-5 shadow-sm lg:sticky lg:top-28">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-semibold text-foreground">{format(price)}</span>
                {compareAt && <span className="pb-1 text-base text-foreground/40 line-through">{format(compareAt)}</span>}
              </div>

              {product.short_description && (
                <p className="mt-4 text-sm leading-relaxed text-foreground/72">{product.short_description}</p>
              )}

              {versions.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/50">Version</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-md border border-brand bg-brand/5 px-3 py-2 text-sm font-medium text-brand">
                      {product.variant_label || product.language || "Current"}
                    </span>
                    {versions.map((version) => (
                      <Link
                        key={version.id}
                        to={`/product/${version.slug ?? version.id}`}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground/75 pdp-press hover:border-brand hover:text-brand"
                      >
                        {version.variant_label || version.language || version.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm font-medium text-foreground/70">Quantity</span>
                <div className="inline-flex items-center rounded-md border border-border">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="grid h-9 w-9 place-items-center hover:bg-foreground/5">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity" className="grid h-9 w-9 place-items-center hover:bg-foreground/5">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={!inStock}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground pdp-press hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {inStock ? "Add to cart" : "Out of stock"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Toggle wishlist"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md border px-5 py-3 text-sm font-semibold pdp-press",
                    wished ? "border-brand bg-brand/10 text-brand" : "border-border text-foreground/80 hover:border-brand hover:text-brand",
                  )}
                >
                  <Heart className={cn("h-5 w-5", wished && "fill-current")} />
                  {wished ? "Saved" : "Save for later"}
                </button>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-foreground/70">
                <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand" /> Free India shipping over ₹999</li>
                <li className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-brand" /> 7-day returns where eligible</li>
                <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-brand" /> Secure checkout, totals verified server-side</li>
              </ul>
            </aside>

            <section className="rounded-lg border border-border p-5">
              <h2 className="text-base font-semibold text-foreground">Details</h2>
              {product.description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground/70">{product.description}</p>
              )}
              {(product.publisher || product.language || product.pages != null || product.binding || product.isbn) && (
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  {product.publisher && <ProductFact label="Publisher" value={product.publisher} />}
                  {product.language && <ProductFact label="Language" value={product.language} />}
                  {product.pages != null && <ProductFact label="Pages" value={String(product.pages)} />}
                  {product.binding && <ProductFact label="Binding" value={product.binding} />}
                  {product.isbn && <ProductFact label="ISBN" value={product.isbn} mono />}
                </dl>
              )}
            </section>
          </div>
        </div>

        <ReviewsSection
          productId={product.id}
          userReady={Boolean(user)}
          reviews={reviews}
          onSubmitted={async () => {
            setReviews(await listPublishedReviews(product.id).catch(() => reviews));
          }}
        />

        {related.length > 0 && (
          <section className="mt-16 md:mt-24">
            <h2 className="mb-6 text-xl tracking-tight text-foreground md:text-3xl">You may also like</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
};

function ProductFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-foreground/[0.025] px-3 py-2">
      <dt className="text-xs text-foreground/50">{label}</dt>
      <dd className={cn("mt-0.5 font-medium text-foreground", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function ReviewsSection({
  productId,
  userReady,
  reviews,
  onSubmitted,
}: {
  productId: string;
  userReady: boolean;
  reviews: ProductReview[];
  onSubmitted: () => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const uploadMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = await Promise.all(
      Array.from(files).slice(0, 4).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );
    setMediaUrls((current) => [...current, ...next].slice(0, 6));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userReady) {
      toast({ title: "Please sign in to review this product", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({ productId, rating, title: title || null, body: body || null, mediaUrls });
      toast({ title: "Review submitted", description: "It will appear after approval." });
      setTitle("");
      setBody("");
      setMediaUrls([]);
      await onSubmitted();
    } catch {
      toast({ title: "Could not submit review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reviewMedia = reviews.flatMap((review) => review.media_urls ?? []).slice(0, 8);

  return (
    <section className="mt-16 border-t border-border pt-10 pdp-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Customer reviews</h2>
          <p className="mt-1 text-sm text-foreground/60">Photos, videos and written feedback from customers.</p>
        </div>
        <span className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/65">
          {reviews.length} published
        </span>
      </div>

      {reviewMedia.length > 0 && (
        <div className="mb-6 flex gap-3 overflow-x-auto no-scrollbar">
          {reviewMedia.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-placeholder">
              {url.startsWith("data:video") ? (
                <video src={url} className="h-full w-full object-cover" />
              ) : (
                <img src={url} alt="Customer review media" className="h-full w-full object-cover" />
              )}
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <form onSubmit={submit} className="rounded-lg border border-border bg-background p-5">
          <h3 className="text-base font-semibold text-foreground">Write a review</h3>
          <div className="mt-4 flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <button key={index} type="button" onClick={() => setRating(index + 1)} aria-label={`${index + 1} stars`}>
                <Star className={cn("h-5 w-5 text-brand", index < rating && "fill-current")} />
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Short title"
            className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What should other customers know?"
            rows={4}
            className="mt-3 w-full resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm pdp-press hover:border-brand">
            Upload photos or videos
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(event) => void uploadMedia(event.target.files)} />
          </label>
          {mediaUrls.length > 0 && <p className="mt-2 text-xs text-foreground/55">{mediaUrls.length} media file(s) added</p>}
          <button disabled={submitting} className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground pdp-press disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>

        <div className="space-y-4">
          {reviews.length === 0 && <p className="rounded-lg border border-border p-5 text-sm text-foreground/60">No published reviews yet.</p>}
          {reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-border p-5">
              <div className="flex items-center gap-1 text-brand">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className={cn("h-4 w-4", index < review.rating && "fill-current")} />
                ))}
              </div>
              {review.title && <h3 className="mt-2 font-medium text-foreground">{review.title}</h3>}
              {review.body && <p className="mt-1 text-sm leading-relaxed text-foreground/70">{review.body}</p>}
              <p className="mt-3 text-xs text-foreground/45">
                {review.customer_name || review.customer_email || "Verified customer"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductDetail;

import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Minus, Plus, Star } from "lucide-react";
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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setQty(1);
    setActiveImage(0);
    setMainImgError(false);
    setSelectedColor("");
    setSelectedSize("");

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

  if (loading) {
    return (
      <SiteLayout>
        <main className="min-h-screen bg-[#dfe7f6] px-5 py-12">
          <div className="mx-auto grid max-w-[1220px] gap-10 lg:grid-cols-[420px_1fr]">
            <div className="aspect-[5/7] rounded-md bg-zinc-200 animate-pulse" />
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
  const ratingValue = product.rating ?? 0;
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
      <main className="min-h-screen bg-[#dfe7f6] px-4 py-8 text-[#06133a] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1220px]">
          <nav className="mb-8 flex flex-wrap items-center gap-1 text-sm text-[#06133a]/65">
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
            <div className="mb-8">
              <h1 className="font-serif text-5xl leading-[0.95] text-[#020b2d] drop-shadow-[0_3px_3px_rgba(2,11,45,0.25)] md:text-7xl">
                {product.name}
              </h1>
              {(product.author || product.publisher) && (
                <p className="mt-2 text-right font-serif text-3xl text-black/65">By {product.author || product.publisher}</p>
              )}
            </div>

          <div className="grid gap-10 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-32">
            <div>
              <div className="aspect-square overflow-hidden rounded-md border border-[#06133a]/25 bg-[#d9d9d9]">
                {mainImage && !mainImgError ? (
                  isVideoUrl(mainImage) ? (
                    <video src={mainImage} className="h-full w-full object-cover" controls playsInline />
                  ) : (
                    <img src={mainImage} alt={product.name} onError={() => setMainImgError(true)} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="h-full w-full bg-[#d9d9d9]" />
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-5">
                {gallery.slice(0, 3).map((src, index) => (
                  <button key={src} type="button" onClick={() => setActiveImage(index)} className={cn("aspect-square overflow-hidden rounded-md bg-[#d9d9d9]", activeImage === index && "ring-2 ring-[#06133a]")}>
                    {isVideoUrl(src) ? <video src={src} className="h-full w-full object-cover" muted playsInline /> : <img src={src} alt="" className="h-full w-full object-cover" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 lg:pt-0">
              <div className="grid gap-4 lg:grid-cols-[1fr_245px] lg:items-start">
                <div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex text-[#e4aa00]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className={cn("h-9 w-9 stroke-[1.8]", index < Math.round(ratingValue) && "fill-current")} />
                      ))}
                    </div>
                    <span className="font-serif text-2xl text-black">({product.reviews_count ?? reviews.length})</span>
                  </div>
                </div>

                <div className="lg:pt-14">
                  {versions.length > 0 && (
                    <select
                      value={product.slug ?? product.id}
                      onChange={(event) => navigate(`/product/${event.target.value}`)}
                      className="mt-2 h-14 bg-[#1f1f1f] px-4 font-serif text-2xl font-semibold text-white outline-none"
                    >
                      <option value={product.slug ?? product.id}>{product.variant_label || "Current variant"}</option>
                      {versions.map((version) => (
                        <option key={version.id} value={version.slug ?? version.id}>{version.variant_label || version.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-7 font-serif text-6xl leading-none text-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)]">
                {format(price)}
                {compareAt && <span className="ml-4 text-2xl text-black/35 line-through">{format(compareAt)}</span>}
              </div>

              {(colorOptions.length > 0 || sizeOptions.length > 0) && (
                <div className="mt-6 grid max-w-[49rem] gap-4 sm:grid-cols-2">
                  {colorOptions.length > 0 && <OptionGroup label="Colour" options={colorOptions} value={activeColor} onChange={setSelectedColor} />}
                  {sizeOptions.length > 0 && <OptionGroup label="Size" options={sizeOptions} value={activeSize} onChange={setSelectedSize} />}
                </div>
              )}

              <div className="mt-5 grid max-w-[49rem] gap-2">
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={cn("glass-cta inline-flex h-[3.625rem] w-full max-w-[49rem] items-center justify-center rounded-2xl px-[3.1875rem] pb-[0.4375rem] pt-1 text-lg font-bold tracking-tight text-hero-foreground transition-all md:text-xl", wished && "bg-white/45")}
                >
                  Wishlist
                </button>
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={!inStock}
                  className="inline-flex h-[4.5rem] w-full max-w-[49rem] items-center justify-center rounded-md bg-brand px-[3.1875rem] pb-[0.4375rem] pt-1 text-2xl font-bold tracking-tight text-brand-foreground shadow-2xl transition-opacity hover:opacity-95 disabled:opacity-50 md:text-3xl"
                >
                  {inStock ? "Add to cart" : "Out of stock"}
                </button>
              </div>

              <div className="mt-5 inline-flex h-16 items-center gap-4 bg-[#d9d9d9] px-2 font-serif text-4xl text-black">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Minus className="h-9 w-9" /></button>
                <span className="w-10 text-center">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><Plus className="h-9 w-9" /></button>
              </div>

              <section className="mt-24 max-w-[49rem]">
                <div className="flex gap-8 font-serif text-3xl">
                  <button type="button" onClick={() => setTab("description")} className={cn("pb-2", tab === "description" ? "border-b border-[#06133a] font-semibold text-[#06133a]" : "text-black/60")}>Product Description</button>
                  <button type="button" onClick={() => setTab("details")} className={cn("pb-2", tab === "details" ? "border-b border-[#06133a] font-semibold text-[#06133a]" : "text-black/60")}>Product Details</button>
                </div>
                {tab === "description" ? (
                  <p className="mt-9 whitespace-pre-line font-serif text-3xl leading-[1.05] text-black">{product.description || product.short_description || "Product details coming soon."}</p>
                ) : (
                  <dl className="mt-9 grid gap-3 font-serif text-2xl text-black sm:grid-cols-2">
                    <Fact label="Category" value={categoryMeta?.label || product.category || "Product"} />
                    {product.binding && <Fact label="Binding" value={product.binding} />}
                    {product.language && <Fact label="Language" value={product.language} />}
                    {product.pages != null && <Fact label="Pages" value={String(product.pages)} />}
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
            <section className="mt-20 border-t border-[#06133a] pt-10">
              <h2 className="mb-8 font-serif text-4xl text-[#06133a]">More from {categoryMeta?.label ?? "this category"}</h2>
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
                "min-h-10 rounded-md border px-3 font-serif text-lg text-black transition-colors",
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
      await submitReview({ productId, rating, title: title || null, body: body || null, mediaUrls: [] });
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
    <section className="mt-20 max-w-[49rem] lg:ml-[calc(420px+8rem)]">
      <div className="flex items-center gap-6 border-b border-[#06133a] pb-6">
        <h2 className="font-serif text-4xl text-black">Customer Reviews</h2>
        <div className="flex text-[#e4aa00]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}</div>
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
        <button disabled={submitting || !canReview} className="h-12 rounded-md bg-brand font-bold text-brand-foreground shadow-2xl disabled:opacity-50">{submitting ? "Submitting..." : "Add review"}</button>
      </form>
      <div className="mt-8 space-y-5">
        {reviews.map((review) => (
          <article key={review.id} className="border-b border-[#06133a]/20 pb-4 font-serif">
            <div className="flex text-[#e4aa00]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={cn("h-5 w-5", index < review.rating && "fill-current")} />)}</div>
            {review.title && <h3 className="mt-2 text-2xl text-black">{review.title}</h3>}
            {review.body && <p className="mt-1 text-xl leading-tight text-black/75">{review.body}</p>}
            {(review.media_urls?.length ?? 0) > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {review.media_urls?.map((url) => (
                  <div key={url} className="aspect-square overflow-hidden rounded-md bg-white/40">
                    {isVideoUrl(url) ? <video src={url} className="h-full w-full object-cover" controls playsInline /> : <img src={url} alt="" className="h-full w-full object-cover" />}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProductDetail;

import { useState } from "react";
import { Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/shop";
import type { Product } from "@/services/productService";
import { productImage, productPrice, productCompareAt, productCardThumbnailUrl } from "@/data/products";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Props {
  product: Product;
  className?: string;
  priority?: boolean;
}

export function ProductCard({ product, className, priority = false }: Props) {
  const { toggleWishlist, isWishlisted, addToCart } = useShop();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [imgError, setImgError] = useState(false);
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const wished = isWishlisted(product.id);
  const price = productPrice(product);
  const compareAt = productCompareAt(product);
  const originalImage = productImage(product);
  const thumbnailImage = productCardThumbnailUrl(originalImage);
  const image = useOriginalImage ? originalImage : thumbnailImage ?? originalImage;
  const showImage = !!image && !imgError;
  const link = `/product/${product.slug ?? product.id}`;
  const hasOptions = Boolean((product.color_options?.length ?? 0) || (product.size_options?.length ?? 0));

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasOptions) {
      navigate(link);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price,
      priceInr: product.price_inr,
      image,
      slug: product.slug ?? undefined,
      weightG: product.weight_g,
      shippingClass: product.shipping_class,
    });
  };

  return (
    <article className={cn("commerce-card-in premium-card-hover group flex h-full min-w-0 flex-col", className)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-white transition-all duration-300 group-hover:border-brand/25 group-hover:shadow-[0_18px_34px_-24px_rgba(3,15,48,0.64)]">
        <Link to={link} className="absolute inset-0 z-10" aria-label={product.name} />
        {showImage ? (
          <img
            src={image as string}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={420}
            height={630}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 25vw, 50vw"
            onError={() => {
              if (!useOriginalImage && originalImage && image !== originalImage) {
                setUseOriginalImage(true);
                return;
              }
              setImgError(true);
            }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-white text-foreground/35 text-xs font-medium tracking-wide">
            No image
          </div>
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 z-20 rounded-full bg-brand text-brand-foreground text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1">
            {product.badge}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          data-testid={`product-card-wishlist-button-${product.id}`}
          className={cn(
            "absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-sm transition-all hover:bg-background sm:right-3 sm:top-3",
            wished ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          )}
        >
          <Heart className={cn("h-4 w-4", wished && "fill-current text-brand")} />
        </button>
        <button
          type="button"
          onClick={onAdd}
          data-testid={`product-card-add-to-cart-button-${product.id}`}
          className="premium-cart-button absolute inset-x-3 bottom-3 z-20 hidden h-10 items-center justify-center px-3 text-sm font-semibold md:inline-flex md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"
        >
          {hasOptions ? "Choose options" : "Add to cart"}
        </button>
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <Link to={link}>
          <h3
            title={product.name}
            className="line-clamp-2 min-h-[2.5rem] break-words text-sm font-medium leading-5 text-foreground transition-colors hover:text-brand md:min-h-[2.7rem] md:text-base md:leading-[1.35]"
          >
            {product.name}
          </h3>
        </Link>
        {product.author && (
          <p
            title={product.author}
            className="mt-0.5 line-clamp-1 min-h-4 break-words text-xs leading-4 text-foreground/60 md:min-h-5 md:text-sm md:leading-5"
          >
            {product.author}
          </p>
        )}
        {!product.author && (
          <span aria-hidden className="mt-0.5 block min-h-4 md:min-h-5" />
        )}
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-sm md:text-base text-hero-foreground font-semibold">
            {format(price)}
          </p>
          {compareAt && (
            <p className="text-xs text-foreground/40 line-through">{format(compareAt)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="premium-outline-button mt-auto inline-flex h-10 w-full items-center justify-center px-2 text-xs font-semibold md:hidden"
        >
          {hasOptions ? "Choose options" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}

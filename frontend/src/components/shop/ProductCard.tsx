import { useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/shop";
import type { Product } from "@/services/productService";
import { productImage, productPrice, productCompareAt } from "@/data/products";
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
  const wished = isWishlisted(product.id);
  const price = productPrice(product);
  const compareAt = productCompareAt(product);
  const image = productImage(product);
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
    <article className={cn("commerce-card-in group min-w-0", className)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-white transition-all duration-300 group-hover:border-brand/25 group-hover:shadow-[0_14px_28px_-20px_rgba(3,15,48,0.55)]">
        <Link to={link} className="absolute inset-0 z-10" aria-label={product.name} />
        {showImage ? (
          <img
            src={image as string}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={() => setImgError(true)}
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
          className="absolute inset-x-3 bottom-3 z-20 hidden items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground shadow-lg transition-all duration-200 md:inline-flex md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"
        >
          <ShoppingBag className="h-4 w-4" />
          {hasOptions ? "Choose options" : "Add to cart"}
        </button>
      </div>
      <div className="mt-3 flex min-h-[126px] flex-col md:min-h-[88px]">
        <Link to={link}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground transition-colors hover:text-brand md:min-h-0 md:text-base">
            {product.name}
          </h3>
        </Link>
        {product.author && (
          <p className="text-xs md:text-sm text-foreground/60 line-clamp-1">{product.author}</p>
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
          className="mt-auto inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-brand bg-background px-2 text-xs font-semibold text-brand transition-all hover:bg-brand hover:text-brand-foreground md:hidden"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {hasOptions ? "Choose options" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}

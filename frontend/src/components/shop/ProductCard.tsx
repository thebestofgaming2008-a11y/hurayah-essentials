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
}

export function ProductCard({ product, className }: Props) {
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
    <article className={cn("group", className)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-300 group-hover:shadow-lg">
        <Link to={link} className="absolute inset-0 z-10" aria-label={product.name} />
        {showImage ? (
          <img
            src={image as string}
            alt={product.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={() => setImgError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
            "absolute top-3 right-3 z-20 h-9 w-9 grid place-items-center rounded-full bg-background/95 text-foreground shadow-sm hover:bg-background transition-all",
            wished ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          )}
        >
          <Heart className={cn("h-4 w-4", wished && "fill-current text-brand")} />
        </button>
        <button
          type="button"
          onClick={onAdd}
          data-testid={`product-card-add-to-cart-button-${product.id}`}
          className="absolute inset-x-2 bottom-2 z-20 inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2 text-[11px] font-semibold text-brand-foreground shadow-lg transition-all duration-200 active:scale-[0.98] md:inset-x-3 md:bottom-3 md:translate-y-2 md:gap-2 md:py-2.5 md:text-sm md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"
        >
          <ShoppingBag className="h-4 w-4" />
          {hasOptions ? "Choose options" : "Add to cart"}
        </button>
      </div>
      <div className="mt-3">
        <Link to={link}>
          <h3 className="text-sm md:text-base text-foreground font-medium line-clamp-1 hover:text-brand transition-colors">
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
      </div>
    </article>
  );
}

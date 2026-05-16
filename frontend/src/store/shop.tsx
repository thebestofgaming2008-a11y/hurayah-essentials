import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

export interface CartProductInput {
  id: string;
  name: string;
  price: number;
  priceInr?: number | null;
  image?: string | null;
  slug?: string | null;
  weightG?: number | null;
  shippingClass?: string | null;
  selectedColor?: string | null;
  selectedSize?: string | null;
}

export interface CartLine {
  cartKey: string;
  productId: string;
  qty: number;
  name: string;
  price: number;
  priceInr: number | null;
  image: string | null;
  slug: string | null;
  weightG: number | null;
  shippingClass: string | null;
  selectedColor: string | null;
  selectedSize: string | null;
}

interface ShopState {
  cart: CartLine[];
  cartLines: CartLine[];
  wishlist: string[];
  cartOpen: boolean;
  addToCart: (product: CartProductInput, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: number;
  cartSubtotal: number;
}

const ShopContext = createContext<ShopState | null>(null);

const KEY_CART = "he_cart_v2";
const KEY_WISH = "he_wishlist_v1";

function load<T>(k: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => load<CartLine[]>(KEY_CART, []));
  const [wishlist, setWishlist] = useState<string[]>(() => load<string[]>(KEY_WISH, []));
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY_CART, JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY_WISH, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = useCallback((product: CartProductInput, qty = 1) => {
    setCart((prev) => {
      const optionKey = [product.selectedColor, product.selectedSize].map((value) => value?.trim() || "_").join("|");
      const cartKey = `${product.id}::${optionKey}`;
      const found = prev.find((c) => (c.cartKey ?? c.productId) === cartKey);
      if (found) {
        return prev.map((c) =>
          (c.cartKey ?? c.productId) === cartKey ? { ...c, qty: c.qty + qty } : c,
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          qty,
          name: product.name,
          price: product.price,
          priceInr: product.priceInr ?? null,
          image: product.image ?? null,
          slug: product.slug ?? null,
          weightG: product.weightG ?? null,
          shippingClass: product.shippingClass ?? null,
          selectedColor: product.selectedColor?.trim() || null,
          selectedSize: product.selectedSize?.trim() || null,
        },
      ];
    });
    setCartOpen(true);
    toast({ title: "Added to cart", description: product.name });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((c) => (c.cartKey ?? c.productId) !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((c) => (c.cartKey ?? c.productId) !== id)
        : prev.map((c) => ((c.cartKey ?? c.productId) === id ? { ...c, qty } : c)),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const toggleCart = useCallback(() => setCartOpen((open) => !open), []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      if (prev.includes(id)) {
        toast({ title: "Removed from wishlist" });
        return prev.filter((x) => x !== id);
      }
      toast({ title: "Saved to wishlist" });
      return [...prev, id];
    });
  }, []);

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.qty, 0),
    [cart],
  );

  const value: ShopState = {
    cart,
    cartLines: cart,
    wishlist,
    cartOpen,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    toggleWishlist,
    isWishlisted,
    cartCount,
    cartSubtotal,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

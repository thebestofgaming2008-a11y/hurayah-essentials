import { Heart, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-header.png";
import { useShop } from "@/store/shop";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { WishlistDrawer } from "@/components/shop/CommerceDrawers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICON_BUTTON =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all duration-150 hover:bg-foreground/[0.06] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-hero";

const BADGE =
  "absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 grid place-items-center rounded-full bg-brand text-brand-foreground text-[10px] font-semibold leading-none tabular-nums shadow-sm";

const CURRENCY_FLAGS: Record<string, string> = {
  INR: "🇮🇳",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  EUR: "🇪🇺",
  AED: "🇦🇪",
  SAR: "🇸🇦",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AED: "د.إ",
  SAR: "﷼",
};

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const navigate = useNavigate();
  const { cartCount, wishlist, openCart } = useShop();
  const { user, isAdmin, signOut } = useAuth();
  const { currency, currencies, setCurrency, loading: currencyLoading } = useCurrency();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative inline-block py-2.5 transition-colors text-sm md:text-[15px] whitespace-nowrap",
      isActive
        ? "text-hero-foreground font-semibold after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] after:bg-brand after:rounded-full"
        : "text-foreground/75 hover:text-brand",
    );

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate("/");
  };

  const goCategorySection = (category: string) => {
    setMenuOpen(false);
    navigate(`/?category=${encodeURIComponent(category)}#categories`);
  };

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-40 transition-shadow duration-200",
          scrolled ? "shadow-[0_4px_18px_-12px_rgba(3,15,48,0.35)]" : "",
        )}
        data-testid="site-header-sticky-wrapper"
      >
        <div className="bg-brand text-brand-foreground">
          <div className="relative mx-auto flex max-w-[1440px] items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm">
            {isAdmin && (
              <Link
                to="/admin"
                data-testid="site-header-admin-pill"
                className="absolute left-3 sm:left-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold tracking-wide transition-colors"
                title="Open admin dashboard"
              >
                <LayoutDashboard className="h-3 w-3" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <p className="text-center truncate px-[120px] sm:px-[180px] max-w-full">
              International orders may incur customs / import duties
            </p>
            <div className="absolute right-0 top-0 w-[150px] sm:right-4">
              <p className="grid h-6 place-items-center bg-[#1f1f1f] text-[10px] font-normal tracking-normal text-white/65">
                Currency Selector
              </p>
              <Select
                value={currency}
                onValueChange={setCurrency}
                disabled={currencyLoading}
              >
                <SelectTrigger
                  data-testid="site-header-currency-select"
                  aria-label="Select display currency"
                  className="h-[42px] w-full gap-3 rounded-none border-0 bg-[#031044] px-4 text-white shadow-none after:ml-auto after:text-[30px] after:leading-none after:content-['₹'] focus:ring-0 focus:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-white [&>span]:grid [&>span]:w-full [&>span]:grid-cols-[1fr_auto] [&>span]:items-center [&>span>span:first-child]:hidden [&>span>span:nth-child(2)]:text-[26px] [&>span>span:nth-child(2)]:leading-none"
                >
                  <SelectValue>
                    <span aria-hidden className="hidden" />
                    <span className="leading-none">{currency}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[120px]">
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden className="text-[14px] leading-none">{CURRENCY_SYMBOLS[c] ?? c}</span>
                        <span className="font-semibold">{c}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <header className="bg-hero/95 backdrop-blur-sm border-b border-foreground/[0.12]" data-testid="storefront-header">
          <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-4 py-2 sm:py-2.5 md:px-8 md:py-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              data-testid="site-header-open-menu-button"
              className={cn(ICON_BUTTON, "justify-self-start")}
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to="/"
              className="flex min-w-0 justify-self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-md"
              aria-label="Hurayrah Essentials home"
              data-testid="site-header-logo-link"
            >
              <img
                src={logo}
                alt="Hurayrah Essentials"
                className="h-9 sm:h-11 md:h-12 w-auto object-contain transition-all"
              />
            </Link>

            <div className="justify-self-end flex items-center justify-end gap-0.5 sm:gap-1 min-w-0">
              <button
                type="button"
                onClick={() => setWishlistOpen(true)}
                aria-label={`Wishlist (${wishlist.length} items)`}
                data-testid="site-header-wishlist-link"
                className={cn(ICON_BUTTON, "hidden sm:inline-flex")}
              >
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && <span className={BADGE}>{wishlist.length}</span>}
              </button>
              <Link
                to="/track"
                aria-label="Track order"
                data-testid="site-header-account-link"
                className={ICON_BUTTON}
              >
                <Package className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={openCart}
                aria-label={`Cart (${cartCount} items)`}
                data-testid="site-header-cart-link"
                className={ICON_BUTTON}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && <span className={BADGE}>{cartCount}</span>}
              </button>
            </div>
          </div>

          <form
            onSubmit={submitSearch}
            className="mx-auto max-w-[1440px] px-3 sm:px-4 md:px-8 pb-2 sm:pb-2.5 md:pb-3"
          >
            <label className="mx-auto flex items-center gap-2 rounded-full bg-header-surface border border-foreground/10 px-3.5 py-2 sm:py-2.5 max-w-[640px] focus-within:border-brand focus-within:shadow-sm transition-all">
              <Search className="h-4 w-4 md:h-[18px] md:w-[18px] text-muted-foreground shrink-0" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, author, ISBN, publisher…"
                className="bg-transparent flex-1 min-w-0 text-sm md:text-[15px] outline-none placeholder:text-muted-foreground"
                aria-label="Search products"
                data-testid="site-header-search-input"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  data-testid="site-header-clear-search-button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </form>

          <nav className="mx-auto max-w-[1440px] px-3 sm:px-4 md:px-8">
            <ul className="flex justify-center items-center gap-4 sm:gap-7 md:gap-10 overflow-x-auto no-scrollbar -mx-1 px-1 text-center" data-testid="site-header-primary-nav">
              <li className="shrink-0">
                <NavLink to="/shop" className={navLinkClass} data-testid="site-header-shop-link" end>
                  Shop all
                </NavLink>
              </li>

              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => goCategorySection("books")}
                  data-testid="site-header-books-link"
                  className="inline-block py-2.5 text-sm md:text-[15px] transition-colors whitespace-nowrap text-foreground/75 hover:text-brand"
                >
                  Books
                </button>
              </li>

              <li className="shrink-0">
                <Link to="/?category=clothing#categories" className="inline-block py-2.5 text-sm md:text-[15px] transition-colors whitespace-nowrap text-foreground/75 hover:text-brand" data-testid="site-header-clothing-link">
                  Clothing
                </Link>
              </li>
              <li className="shrink-0">
                <Link to="/?category=children#categories" className="inline-block py-2.5 text-sm md:text-[15px] transition-colors whitespace-nowrap text-foreground/75 hover:text-brand" data-testid="site-header-essentials-link">
                  Essentials
                </Link>
              </li>
              <li className="shrink-0">
                <NavLink to="/contact" className={navLinkClass} data-testid="site-header-contact-link">
                  Contact
                </NavLink>
              </li>
            </ul>
          </nav>
        </header>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          data-testid="site-header-mobile-menu-overlay"
        >
          <aside
            className="absolute left-0 top-0 h-full w-[85%] max-w-[340px] bg-background shadow-xl p-5 flex flex-col gap-1 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="site-header-mobile-menu-panel"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold italic text-lg">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                data-testid="site-header-close-menu-button"
                className="h-9 w-9 grid place-items-center rounded-md hover:bg-foreground/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {user && (
              <div className="mb-2 rounded-lg bg-hero/60 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wider text-foreground/50">Signed in as</p>
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              </div>
            )}

            <nav className="flex flex-col">
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  data-testid="site-header-admin-link"
                  className="py-3 border-b border-border text-base font-semibold text-brand hover:underline inline-flex items-center gap-2"
                >
                  Admin dashboard
                </Link>
              )}

              <Link
                to="/shop"
                onClick={() => setMenuOpen(false)}
                data-testid="site-header-mobile-shop-link"
                className="py-3 border-b border-border text-base text-foreground hover:text-brand transition-colors"
              >
                Shop all
              </Link>

              <button
                type="button"
                onClick={() => goCategorySection("books")}
                data-testid="site-header-mobile-books-button"
                className="py-3 border-b border-border text-base text-foreground hover:text-brand transition-colors text-left w-full"
              >
                Books
              </button>

              <Link
                to="/?category=clothing#categories"
                onClick={() => setMenuOpen(false)}
                data-testid="site-header-mobile-clothing-link"
                className="py-3 border-b border-border text-base text-foreground hover:text-brand"
              >
                Clothing
              </Link>
              <Link
                to="/?category=children#categories"
                onClick={() => setMenuOpen(false)}
                data-testid="site-header-mobile-essentials-link"
                className="py-3 border-b border-border text-base text-foreground hover:text-brand"
              >
                Essentials
              </Link>
              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                data-testid="site-header-mobile-contact-link"
                className="py-3 border-b border-border text-base text-foreground hover:text-brand"
              >
                Contact
              </Link>

              <div className="mt-3 pt-3 border-t border-border">
                {user ? (
                  <>
                    <Link
                      to="/track"
                      onClick={() => setMenuOpen(false)}
                      data-testid="site-header-mobile-account-link"
                      className="py-3 block text-base text-foreground hover:text-brand"
                    >
                      Track order
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setMenuOpen(false)}
                      data-testid="site-header-mobile-wishlist-link"
                      className="py-3 block text-base text-foreground hover:text-brand"
                    >
                      Wishlist
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      data-testid="site-header-sign-out-button"
                      className="py-3 inline-flex items-center gap-2 text-base text-foreground/70 hover:text-brand transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/track"
                      onClick={() => setMenuOpen(false)}
                      data-testid="site-header-mobile-login-link"
                      className="py-3 block text-base font-semibold text-brand hover:underline"
                    >
                      Track order
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setMenuOpen(false)}
                      data-testid="site-header-mobile-anonymous-wishlist-link"
                      className="py-3 block text-base text-foreground hover:text-brand"
                    >
                      Wishlist
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </aside>
        </div>
      )}
      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </>
  );
}

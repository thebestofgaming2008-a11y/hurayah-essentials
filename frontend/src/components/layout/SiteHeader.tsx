import { LayoutDashboard, LogOut, Package, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-header.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useShop } from "@/store/shop";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  "absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-brand-foreground shadow-sm";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AED: "د.إ",
  SAR: "﷼",
};

export function SiteHeader() {
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { cartCount, openCart } = useShop();
  const { user, isAdmin, signOut } = useAuth();
  const { currency, currencies, setCurrency, loading: currencyLoading } = useCurrency();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative inline-block whitespace-nowrap py-2.5 text-sm transition-colors md:text-[15px]",
      isActive
        ? "font-semibold text-hero-foreground after:absolute after:-bottom-px after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand"
        : "text-foreground/75 hover:text-brand",
    );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const goCategorySection = (category: string) => {
    navigate(`/?category=${encodeURIComponent(category)}#categories`);
  };

  const accountControl = user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Open account menu" data-testid="site-header-account-menu-button" className={ICON_BUTTON}>
          <User className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[224px] rounded-md border border-border bg-background p-0 shadow-lg">
        <DropdownMenuLabel className="px-4 py-3">
          <p className="truncate text-sm font-semibold">{user.name || user.email?.split("@")[0] || "Account"}</p>
          <p className="truncate text-[12px] font-normal text-foreground/60">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5">
          <Link to="/account" className="flex items-center gap-3"><User className="h-4 w-4" /> My Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5">
          <Link to="/track" className="flex items-center gap-3"><Package className="h-4 w-4" /> Track Order</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5">
              <Link to="/admin" className="flex items-center gap-3"><LayoutDashboard className="h-4 w-4" /> Admin Dashboard</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer px-4 py-2.5 text-red-600 focus:text-red-600">
          <LogOut className="mr-3 h-4 w-4" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Link to="/login?redirect=/account" data-testid="site-header-sign-in-link" className="inline-flex h-9 items-center rounded-md px-3 text-[13px] font-medium text-foreground hover:bg-foreground/[0.06] hover:text-brand">
      Sign in
    </Link>
  );

  return (
    <div className={cn("sticky top-0 z-40 transition-shadow duration-200", scrolled && "shadow-[0_4px_18px_-12px_rgba(3,15,48,0.35)]")} data-testid="site-header-sticky-wrapper">
      <div className="bg-brand text-brand-foreground">
        <div className="relative mx-auto flex max-w-[1440px] items-center overflow-hidden px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-xs md:text-sm">
          {isAdmin && (
            <Link to="/admin" data-testid="site-header-admin-pill" className="absolute left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide hover:bg-white/20 sm:left-4 sm:text-xs">
              <LayoutDashboard className="h-3 w-3" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <div className="mx-auto min-w-0 flex-1 overflow-hidden px-[96px] sm:px-[160px]">
            <div className="notice-marquee whitespace-nowrap">
              <span className="px-8">International orders may incur customs / import duties</span>
              <span className="px-8">International orders may incur customs / import duties</span>
            </div>
          </div>
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center sm:right-4">
            <Select value={currency} onValueChange={setCurrency} disabled={currencyLoading}>
              <SelectTrigger data-testid="site-header-currency-select" aria-label="Select display currency" className="h-7 w-[92px] rounded-sm border-0 bg-transparent px-2 text-[11px] text-brand-foreground shadow-none hover:bg-white/10 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-brand-foreground/70">
                <SelectValue>
                  <span className="inline-flex items-center gap-1.5 leading-none"><span>{currency}</span><span>{CURRENCY_SYMBOLS[currency] ?? currency}</span></span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[120px]">
                {currencies.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    <span className="inline-flex items-center gap-2"><span className="font-semibold">{c}</span><span className="text-[14px] leading-none">{CURRENCY_SYMBOLS[c] ?? c}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <header className="border-b border-foreground/[0.12] bg-hero/95 backdrop-blur-sm" data-testid="storefront-header">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-3 py-2 sm:px-4 sm:py-2.5 md:px-8 md:py-3">
          <div className="justify-self-start">{accountControl}</div>
          <Link to="/" className="flex min-w-0 justify-self-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Hurayrah Essentials home" data-testid="site-header-logo-link">
            <img src={logo} alt="Hurayrah Essentials" className="h-9 w-auto object-contain transition-all sm:h-11 md:h-12" />
          </Link>
          <div className="flex min-w-0 justify-self-end">
            <button type="button" onClick={openCart} aria-label={`Cart (${cartCount} items)`} data-testid="site-header-cart-link" className={ICON_BUTTON}>
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <span className={BADGE}>{cartCount}</span>}
            </button>
          </div>
        </div>

        <form onSubmit={submitSearch} className="mx-auto max-w-[1440px] px-3 pb-2 sm:px-4 sm:pb-2.5 md:px-8 md:pb-3">
          <label className="mx-auto flex max-w-[640px] items-center gap-2 rounded-full border border-foreground/10 bg-header-surface px-3.5 py-2 transition-all focus-within:border-brand focus-within:shadow-sm sm:py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground md:h-[18px] md:w-[18px]" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="I am looking for..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:text-[15px]" aria-label="Search products" data-testid="site-header-search-input" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" data-testid="site-header-clear-search-button" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </form>

        <nav className="mx-auto max-w-[1440px] px-3 sm:px-4 md:px-8">
          <ul className="-mx-1 flex items-center justify-center gap-4 overflow-x-auto px-1 text-center sm:gap-7 md:gap-10" data-testid="site-header-primary-nav">
            <li className="shrink-0"><NavLink to="/shop" className={navLinkClass} data-testid="site-header-shop-link" end>Shop all</NavLink></li>
            <li className="shrink-0"><button type="button" onClick={() => goCategorySection("books")} data-testid="site-header-books-link" className="inline-block whitespace-nowrap py-2.5 text-sm text-foreground/75 hover:text-brand md:text-[15px]">Books</button></li>
            <li className="shrink-0"><button type="button" onClick={() => goCategorySection("clothing")} data-testid="site-header-clothing-link" className="inline-block whitespace-nowrap py-2.5 text-sm text-foreground/75 hover:text-brand md:text-[15px]">Clothing</button></li>
            <li className="shrink-0"><button type="button" onClick={() => goCategorySection("children")} data-testid="site-header-essentials-link" className="inline-block whitespace-nowrap py-2.5 text-sm text-foreground/75 hover:text-brand md:text-[15px]">Essentials</button></li>
            <li className="shrink-0"><NavLink to="/contact" className={navLinkClass} data-testid="site-header-contact-link">Contact</NavLink></li>
          </ul>
        </nav>
      </header>
    </div>
  );
}

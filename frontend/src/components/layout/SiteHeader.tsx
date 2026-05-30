import { LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-header.png";
import { useAuth } from "@/contexts/AuthContext";
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

const ICON_BUTTON =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all duration-150 hover:bg-foreground/[0.06] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-hero";

const BADGE =
  "absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-brand-foreground shadow-sm";

export function SiteHeader() {
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { cartCount, openCart } = useShop();
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
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
    setMenuOpen(false);
    navigate("/");
  };

  const goCategorySection = (category: string) => {
    setMenuOpen(false);
    navigate(`/?category=${encodeURIComponent(category)}#categories`);
  };

  const accountControl = user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Open account menu" data-testid="site-header-account-menu-button" className={ICON_BUTTON}>
          <User className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[224px] rounded-md border border-border bg-background p-0 shadow-lg">
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
    <Link to="/login?redirect=/account" aria-label="Sign in" data-testid="site-header-sign-in-link" className={ICON_BUTTON}>
      <User className="h-5 w-5" />
    </Link>
  );

  return (
    <div className={cn("sticky top-0 z-40 transition-shadow duration-200", scrolled && "shadow-[0_4px_18px_-12px_rgba(3,15,48,0.35)]")} data-testid="site-header-sticky-wrapper">
      <div className="bg-brand text-brand-foreground">
        <div className="relative mx-auto flex max-w-[1440px] items-center overflow-hidden px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-xs md:text-sm">
          {isAdmin && (
            <Link to="/admin" data-testid="site-header-admin-pill" className="absolute left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold tracking-wide hover:bg-white/10 sm:left-4 sm:text-xs">
              <LayoutDashboard className="h-3 w-3" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <div className="mx-auto min-w-0 flex-1 px-3 text-center sm:px-8">
            Shipping included across India
          </div>
        </div>
      </div>

      <header className="border-b border-foreground/[0.1] bg-hero/95 backdrop-blur-md" data-testid="storefront-header">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:px-4 sm:py-2 md:px-8">
          <div className="flex justify-self-start">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" data-testid="site-header-open-menu-button" className={cn(ICON_BUTTON, "md:hidden")}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <Link to="/" className="flex min-w-0 justify-self-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Hurayrah Essentials home" data-testid="site-header-logo-link">
            <img src={logo} alt="Hurayrah Essentials" className="h-8 w-auto object-contain transition-all sm:h-9 md:h-10" />
          </Link>
          <div className="flex min-w-0 justify-self-end">
            {accountControl}
            <button type="button" onClick={() => setSearchOpen((open) => !open)} aria-label="Search products" data-testid="site-header-search-toggle" className={ICON_BUTTON}>
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button type="button" onClick={openCart} aria-label={`Cart (${cartCount} items)`} data-testid="site-header-cart-link" className={ICON_BUTTON}>
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <span className={BADGE}>{cartCount}</span>}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={submitSearch} className="mx-auto max-w-[1440px] px-3 pb-2 sm:px-4 md:px-8">
            <label className="mx-auto flex max-w-[640px] items-center gap-2 rounded-md border border-foreground/15 bg-background px-3.5 py-2 shadow-sm transition-all focus-within:border-brand">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground md:h-[18px] md:w-[18px]" aria-hidden />
              <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="I am looking for..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:text-[15px]" aria-label="Search products" data-testid="site-header-search-input" />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" data-testid="site-header-clear-search-button" className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </form>
        )}

        <nav className="mx-auto hidden max-w-[1440px] px-3 sm:px-4 md:block md:px-8">
          <ul className="-mx-1 flex items-center justify-center gap-4 overflow-x-auto px-1 text-center sm:gap-7 md:gap-10" data-testid="site-header-primary-nav">
            <li className="shrink-0"><NavLink to="/shop" className={navLinkClass} data-testid="site-header-shop-link" end>Shop all</NavLink></li>
            <li className="shrink-0"><button type="button" onClick={() => goCategorySection("books")} data-testid="site-header-books-link" className="inline-block whitespace-nowrap py-2.5 text-sm text-foreground/75 hover:text-brand md:text-[15px]">Books</button></li>
            <li className="shrink-0"><button type="button" onClick={() => goCategorySection("clothing")} data-testid="site-header-clothing-link" className="inline-block whitespace-nowrap py-2.5 text-sm text-foreground/75 hover:text-brand md:text-[15px]">Clothing</button></li>
            <li className="shrink-0"><button type="button" onClick={() => goCategorySection("children")} data-testid="site-header-essentials-link" className="inline-block whitespace-nowrap py-2.5 text-sm text-foreground/75 hover:text-brand md:text-[15px]">Essentials</button></li>
            <li className="shrink-0"><NavLink to="/contact" className={navLinkClass} data-testid="site-header-contact-link">Contact</NavLink></li>
          </ul>
        </nav>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)} data-testid="site-header-mobile-menu-overlay">
          <aside className="commerce-sheet-in absolute left-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col overflow-y-auto border-r border-foreground/10 bg-hero shadow-2xl" onClick={(event) => event.stopPropagation()} data-testid="site-header-mobile-menu-panel">
            <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
              <Link to="/" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-3">
                <img src={logo} alt="" className="h-9 w-auto object-contain" />
                <span className="text-[13px] font-semibold text-hero-foreground">Back to store</span>
              </Link>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" data-testid="site-header-close-menu-button" className="grid h-9 w-9 place-items-center rounded-md hover:bg-foreground/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3 py-5">
              {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-[14px] font-semibold text-brand hover:bg-white/55">Admin dashboard</Link>}
              <Link to="/shop" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-[14px] text-foreground hover:bg-white/55 hover:text-brand">Shop all</Link>
              <button type="button" onClick={() => goCategorySection("books")} className="w-full rounded-md px-3 py-3 text-left text-[14px] text-foreground hover:bg-white/55 hover:text-brand">Books</button>
              <button type="button" onClick={() => goCategorySection("clothing")} className="w-full rounded-md px-3 py-3 text-left text-[14px] text-foreground hover:bg-white/55 hover:text-brand">Clothing</button>
              <button type="button" onClick={() => goCategorySection("children")} className="w-full rounded-md px-3 py-3 text-left text-[14px] text-foreground hover:bg-white/55 hover:text-brand">Essentials</button>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-[14px] text-foreground hover:bg-white/55 hover:text-brand">Contact</Link>
              <div className="mt-3 border-t border-foreground/10 pt-3">
                <Link to="/track" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-3 text-[14px] text-foreground hover:bg-white/55 hover:text-brand">Track order</Link>
                {user ? (
                  <button type="button" onClick={handleSignOut} className="inline-flex w-full items-center gap-2 rounded-md px-3 py-3 text-[14px] text-red-600 hover:bg-white/55">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                ) : (
                  <Link to="/login?redirect=/account" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-3 text-[14px] font-semibold text-brand hover:bg-white/55">Sign in</Link>
                )}
              </div>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

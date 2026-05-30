import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShopProvider } from "@/store/shop";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convex } from "@/integrations/convex/client";
import { upsertProfile } from "@/services/accountService";
import { lazy, Suspense, useEffect, useRef } from "react";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Shop = lazy(() => import("./pages/Shop.tsx"));
const Category = lazy(() => import("./pages/Category.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const Cart = lazy(() => import("./pages/Cart.tsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const TrackOrder = lazy(() => import("./pages/TrackOrder.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Static = lazy(() => import("./pages/Static.tsx"));

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4 text-center">
      <div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        <p className="mt-4 text-sm text-hero-foreground/65">Loading...</p>
      </div>
    </div>
  );
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login?redirect=/admin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CurrencyProfileSync() {
  const { user, profile } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const syncedUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id || syncedUserRef.current === user.id) return;
    syncedUserRef.current = user.id;
    if (profile?.preferred_currency && profile.preferred_currency !== currency && !localStorage.getItem("he_currency_manual_v1")) {
      setCurrency(profile.preferred_currency);
    }
  }, [currency, profile?.preferred_currency, setCurrency, user?.id]);
  useEffect(() => {
    if (!user?.id || !currency || profile?.preferred_currency === currency) return;
    const timer = window.setTimeout(() => {
      void upsertProfile(user.id, user.email ?? null, { preferred_currency: currency });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [currency, profile?.preferred_currency, user?.email, user?.id]);
  return null;
}

function BasicAnalytics() {
  useEffect(() => {
    const token = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
    if (!token || document.querySelector("script[data-cf-beacon]")) return;
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.setAttribute("data-cf-beacon", JSON.stringify({ token, spa: true }));
    document.head.appendChild(script);
  }, []);
  return null;
}

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [hash, pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BasicAnalytics />
        <ScrollManager />
        <ConvexAuthProvider client={convex}>
          <AuthProvider>
            <CurrencyProfileSync />
            <ShopProvider>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/category/:key" element={<Category />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
                  <Route path="/track" element={<TrackOrder />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/:slug" element={<Static />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ShopProvider>
          </AuthProvider>
        </ConvexAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

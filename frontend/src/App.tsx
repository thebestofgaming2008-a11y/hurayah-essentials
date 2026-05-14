import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShopProvider } from "@/store/shop";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { convex } from "@/integrations/convex/client";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Shop from "./pages/Shop.tsx";
import Category from "./pages/Category.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Cart from "./pages/Cart.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Checkout from "./pages/Checkout.tsx";
import OrderConfirmation from "./pages/OrderConfirmation.tsx";
import Login from "./pages/Login.tsx";
import Admin from "./pages/Admin.tsx";
import TrackOrder from "./pages/TrackOrder.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import Static from "./pages/Static.tsx";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground/60 text-sm">
      Loading…
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ConvexAuthProvider client={convex}>
          <AuthProvider>
            <ShopProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/category/:key" element={<Category />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/account" element={<Navigate to="/track" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/:slug" element={<Static />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ShopProvider>
          </AuthProvider>
        </ConvexAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

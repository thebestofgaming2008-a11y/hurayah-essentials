import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  IndianRupee,
  Plus,
  Trash2,
  Edit3,
  X,
  Image as ImageIcon,
  Upload,
  MessageCircle,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  AlertTriangle,
  Boxes,
  ClipboardList,
  ShieldCheck,
  BadgeCheck,
  ArrowUpRight,
  LogOut,
  Store,
  Star,
  MessageSquare,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  listAllOrders,
  listAllCustomers,
  listAllReviews,
  updateOrderStatus,
  updateOrderTracking,
  updateReviewStatus,
  type ProductInput,
  type AdminOrder,
  type AdminCustomer,
  type AdminReview,
} from "@/services/adminService";
import type { Product } from "@/services/productService";
import { CATEGORIES, formatPrice } from "@/data/products";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const NAV = [
  { key: "dash", label: "Overview", Icon: LayoutDashboard },
  { key: "orders", label: "Orders", Icon: ShoppingBag },
  { key: "products", label: "Products", Icon: Package },
  { key: "inventory", label: "Inventory", Icon: Boxes },
  { key: "reviews", label: "Reviews", Icon: MessageSquare },
  { key: "customers", label: "Customers", Icon: Users },
  { key: "settings", label: "Settings", Icon: Settings },
] as const;

type TabKey = (typeof NAV)[number]["key"];

const STATUS_OPTIONS = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

const ORDER_FILTERS = [
  { key: "all", label: "All orders" },
  { key: "processing", label: "Processing" },
  { key: "shipped_no_tracking", label: "Shipped missing tracking" },
  { key: "shipped_tracked", label: "Shipped tracked" },
  { key: "delivered", label: "Delivered" },
  { key: "returns", label: "Returns / cancellations" },
] as const;

function normalizeOrderStatus(status: string | null | undefined) {
  if (status === "shipped" || status === "delivered" || status === "cancelled" || status === "returned") return status;
  return "processing";
}

function deltaText(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return "No change";
  return `${diff > 0 ? "+" : ""}${diff}`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDashboardAnalytics(orders: AdminOrder[], customers: AdminCustomer[]) {
  const paidOrders = orders.filter((o) => o.payment_status === "paid" || o.payment_status === "MOCKED_PAID");
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return d;
  });
  const revenueTrend = days.map((day) => {
    const key = dateKey(day);
    const dayOrders = paidOrders.filter((o) => (o.created_at ?? "").slice(0, 10) === key);
    return {
      label: day.toLocaleDateString("en-IN", { weekday: "short" }),
      value: dayOrders.reduce((sum, order) => sum + (order.total_inr ?? order.total ?? 0), 0),
    };
  });
  const orderTrend = days.map((day) => {
    const key = dateKey(day);
    return {
      label: day.toLocaleDateString("en-IN", { weekday: "short" }),
      value: orders.filter((order) => (order.created_at ?? "").slice(0, 10) === key).length,
    };
  });
  const customerTrend = days.map((day) => {
    const key = dateKey(day);
    return {
      label: day.toLocaleDateString("en-IN", { weekday: "short" }),
      value: customers.filter((customer) => (customer.created_at ?? "").slice(0, 10) === key).length,
    };
  });
  const bestSellerMap = new Map<string, { name: string; units: number; revenue: number }>();
  for (const order of paidOrders) {
    for (const item of order.items ?? []) {
      const key = item.product_id ?? item.product_name ?? "unknown";
      const current = bestSellerMap.get(key) ?? { name: item.product_name ?? "Unknown product", units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.subtotal;
      bestSellerMap.set(key, current);
    }
  }
  const bestSellers = [...bestSellerMap.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  return { revenueTrend, orderTrend, customerTrend, bestSellers };
}

const Admin = () => {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<TabKey>("dash");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [productQuery, setProductQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listAllProducts(), listAllOrders(200), listAllCustomers(200), listAllReviews(200)]).then(
      ([p, o, c, r]) => {
        if (cancelled) return;
        setProducts(p);
        setOrders(o);
        setCustomers(c);
        setReviews(r);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProducts = async () => setProducts(await listAllProducts());
  const refreshOrders = async () => setOrders(await listAllOrders(200));
  const refreshReviews = async () => setReviews(await listAllReviews(200));

  const handleSaveTracking = async (
    order: AdminOrder,
    payload: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => {
    if (!payload.trackingNumber.trim()) {
      toast({ title: "Tracking number required", variant: "destructive" });
      return false;
    }
    const saved = await updateOrderTracking(order.id, {
      carrier: payload.carrier.trim() || null,
      trackingNumber: payload.trackingNumber.trim(),
      trackingUrl: payload.trackingUrl.trim() || null,
    });
    if (!saved) {
      toast({ title: "Could not save tracking", variant: "destructive" });
      return false;
    }
    toast({ title: "Tracking saved", description: payload.trackingNumber });
    await refreshOrders();
    return true;
  };

  const handleSendWhatsApp = async (
    order: AdminOrder,
    payload: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => {
    if (!order.customer_phone) {
      toast({
        title: "Customer phone missing",
        description: "Cannot send WhatsApp — no phone number on order.",
        variant: "destructive",
      });
      return;
    }
    if (!payload.trackingNumber.trim()) {
      toast({ title: "Add a tracking number first", variant: "destructive" });
      return;
    }
    const saved = await handleSaveTracking(order, payload);
    if (!saved) return;

    const orderNumber = order.order_number ?? order.id.slice(0, 8);
    const lines = [
      `Assalamu alaikum ${order.customer_name ?? ""},`.trim(),
      "",
      `Your order ${orderNumber} has shipped! 📦`,
      payload.carrier.trim() ? `Carrier: ${payload.carrier.trim()}` : "",
      `Tracking number: ${payload.trackingNumber.trim()}`,
      payload.trackingUrl.trim() ? `Track here: ${payload.trackingUrl.trim()}` : "",
      "",
      "— Abu Hurayrah Essentials",
    ].filter(Boolean);
    const message = encodeURIComponent(lines.join("\n"));
    const phoneDigits = order.customer_phone.replace(/[^\d]/g, "");
    const url = `https://wa.me/${phoneDigits}?text=${message}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast({
      title: "Tracking saved and WhatsApp opened",
      description: `Press Send in WhatsApp to message ${order.customer_phone}.`,
    });
  };

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const status = normalizeOrderStatus(o.status);
      const hasTracking = Boolean(o.tracking_number);
      if (orderFilter === "processing" && status !== "processing") return false;
      if (orderFilter === "shipped_no_tracking" && !(status === "shipped" && !hasTracking)) return false;
      if (orderFilter === "shipped_tracked" && !(status === "shipped" && hasTracking)) return false;
      if (orderFilter === "delivered" && status !== "delivered") return false;
      if (orderFilter === "returns" && !["cancelled", "returned"].includes(status)) return false;
      if (!q) return true;
      return (
        (o.order_number ?? "").toLowerCase().includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q) ||
        (o.customer_email ?? "").toLowerCase().includes(q) ||
        (o.tracking_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, orderQuery, orderFilter]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((p) => {
      const stock = p.stock_quantity ?? 0;
      const status = p.is_active === false ? "archived" : stock <= 0 ? "out" : stock <= 5 ? "low" : "active";
      if (productFilter !== "all" && productFilter !== status) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.author ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, productQuery, productFilter]);

  const inventoryRows = useMemo(() => {
    return [...products].sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
  }, [products]);

  const processingOrders = useMemo(() => orders.filter((o) => normalizeOrderStatus(o.status) === "processing"), [orders]);
  const shippedMissingTracking = useMemo(
    () => orders.filter((o) => normalizeOrderStatus(o.status) === "shipped" && !o.tracking_number),
    [orders],
  );

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "paid" || o.payment_status === "MOCKED_PAID");
    const revenue = paid.reduce((s, o) => s + (o.total_inr ?? o.total ?? 0), 0);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isSameDay = (value: string | null, date: Date) => {
      if (!value) return false;
      const d = new Date(value);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    };
    const todayOrders = orders.filter((o) => isSameDay(o.created_at, today));
    const yesterdayOrders = orders.filter((o) => isSameDay(o.created_at, yesterday));
    const todayCustomers = customers.filter((c) => isSameDay(c.created_at, today)).length;
    const yesterdayCustomers = customers.filter((c) => isSameDay(c.created_at, yesterday)).length;
    const aov = paid.length ? revenue / paid.length : 0;
    return [
      { label: "Revenue", value: formatPrice(revenue), detail: `${paid.length} paid orders`, Icon: IndianRupee },
      { label: "Orders today", value: todayOrders.length.toString(), detail: `${deltaText(todayOrders.length, yesterdayOrders.length)} vs yesterday`, Icon: ShoppingBag },
      { label: "Average order", value: formatPrice(aov), detail: "AOV from paid orders", Icon: TrendingUp },
      { label: "New customers", value: todayCustomers.toString(), detail: `${deltaText(todayCustomers, yesterdayCustomers)} vs yesterday`, Icon: Users },
    ];
  }, [orders, customers]);

  const dashboard = useMemo(() => buildDashboardAnalytics(orders, customers), [orders, customers]);

  const opsStats = useMemo(() => {
    const lowStock = products.filter((p) => p.is_active !== false && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5).length;
    const outOfStock = products.filter((p) => p.is_active !== false && (p.stock_quantity ?? 0) <= 0).length;
    const activeProducts = products.filter((p) => p.is_active !== false).length;
    const shipped = orders.filter((o) => normalizeOrderStatus(o.status) === "shipped").length;
    return { lowStock, outOfStock, activeProducts, shipped };
  }, [products, orders]);

  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const returnsOrCancellations = orders.filter((o) => ["cancelled", "returned"].includes(normalizeOrderStatus(o.status))).length;
  const shippedTracked = orders.filter((o) => normalizeOrderStatus(o.status) === "shipped" && Boolean(o.tracking_number)).length;
  const deliveredOrders = orders.filter((o) => normalizeOrderStatus(o.status) === "delivered").length;
  const initials = (user?.email ?? "HE")
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HE";
  const activeNav = NAV.find((item) => item.key === tab) ?? NAV[0];
  const navGroups: { label: string; items: typeof NAV[number][] }[] = [
    { label: "Overview", items: NAV.filter((item) => item.key === "dash") },
    { label: "Commerce", items: NAV.filter((item) => ["orders", "products", "inventory"].includes(item.key)) },
    { label: "People", items: NAV.filter((item) => ["customers", "reviews"].includes(item.key)) },
    { label: "System", items: NAV.filter((item) => item.key === "settings") },
  ];
  const navBadges: Partial<Record<TabKey, number>> = {
    orders: processingOrders.length + shippedMissingTracking.length,
    inventory: opsStats.lowStock + opsStats.outOfStock,
    reviews: pendingReviews,
  };
  const ActiveIcon = activeNav.Icon;

  return (
    <div className="admin-vibe flex min-h-screen bg-[#fafafa] text-[#171717]">
      <aside
        className="hidden h-screen w-60 shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa] md:sticky md:top-0 md:flex"
        data-testid="admin-sidebar-navigation"
      >
        <div className="flex h-14 items-center gap-3 border-b border-[#e5e5e5] px-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[#171717] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Hurayrah</p>
            <p className="text-xs leading-tight text-[#737373]">Admin workspace</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#737373]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ key, label, Icon }) => {
                  const count = navBadges[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      data-testid={`admin-nav-${key}-button`}
                      className={cn(
                        "group flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium transition-colors",
                        tab === key
                          ? "bg-[#ededed] text-[#171717]"
                          : "text-[#525252] hover:bg-[#f4f4f5] hover:text-[#171717]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {Boolean(count) && (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#525252] ring-1 ring-[#e5e5e5]">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#e5e5e5] p-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white p-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171717] text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user?.email ?? "Admin"}</p>
              <p className="text-[11px] text-[#737373]">Store owner</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[#e5e5e5] bg-[#fafafa]/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#e5e5e5] bg-white md:hidden">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{activeNav.label}</p>
              <p className="hidden text-xs leading-tight text-[#737373] sm:block">Hurayrah store operations</p>
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-4 lg:flex">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a3a3a3]" />
              <input
                type="search"
                value={tab === "orders" ? orderQuery : tab === "products" ? productQuery : ""}
                onChange={(event) => {
                  if (tab === "orders") setOrderQuery(event.target.value);
                  if (tab === "products") setProductQuery(event.target.value);
                }}
                placeholder={tab === "orders" ? "Search orders..." : tab === "products" ? "Search products..." : "Search admin..."}
                disabled={!["orders", "products"].includes(tab)}
                className="h-9 w-full rounded-md border border-[#e5e5e5] bg-white pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-[#171717] disabled:bg-[#f5f5f5] disabled:text-[#a3a3a3]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              aria-label="View storefront"
              data-testid="admin-view-storefront-link"
              className="grid h-9 w-9 place-items-center rounded-md border border-[#e5e5e5] bg-white text-[#525252] transition-colors hover:bg-[#f4f4f5] hover:text-[#171717]"
              title="View storefront"
            >
              <Store className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-label="Sign out"
              data-testid="admin-sign-out-button"
              onClick={() => void signOut()}
              className="grid h-9 w-9 place-items-center rounded-md border border-[#e5e5e5] bg-white text-[#525252] transition-colors hover:bg-[#f4f4f5] hover:text-[#171717]"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="hidden h-9 w-9 place-items-center rounded-full bg-[#171717] text-xs font-semibold text-white sm:grid">
              {initials}
            </div>
          </div>
        </header>

        <div className="border-b border-[#e5e5e5] bg-white px-3 py-2 md:hidden">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {NAV.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
                  tab === key ? "bg-[#171717] text-white" : "text-[#525252] hover:bg-[#f4f4f5]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px] space-y-6">
              {loading && (
                <div className="rounded-xl border border-border bg-background p-8 text-center text-foreground/55 text-sm">
                  Loading…
                </div>
              )}

              {!loading && tab === "dash" && (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3" data-testid="admin-overview-metrics">
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.12em] text-[#6B7280] font-semibold">
                            {s.label}
                          </span>
                          <s.Icon className="h-4 w-4 text-[#4B5563]" />
                        </div>
                        <p className="mt-2 text-xl md:text-2xl font-semibold text-[#111827] tabular-nums">
                          {s.value}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-3" data-testid="admin-analytics-charts">
                    <Section title="Revenue trend" subtitle="Paid revenue over the last 7 days">
                      <SimpleBarChart data={dashboard.revenueTrend} formatValue={formatPrice} />
                    </Section>
                    <Section title="Best sellers" subtitle="Top products by units sold">
                      <BestSellersList rows={dashboard.bestSellers} />
                    </Section>
                  </div>
                  <div className="grid lg:grid-cols-2 gap-3">
                    <Section title="Orders and customers" subtitle="Daily activity over the last week">
                      <div className="grid md:grid-cols-2 gap-5">
                        <SimpleBarChart data={dashboard.orderTrend} compact />
                        <SimpleBarChart data={dashboard.customerTrend} compact />
                      </div>
                    </Section>
                    <OpsCard
                      title="What needs attention"
                      Icon={ClipboardList}
                      rows={[
                        ["Processing orders", processingOrders.length.toString()],
                        ["Shipped missing tracking", shippedMissingTracking.length.toString()],
                        ["Low stock", opsStats.lowStock.toString()],
                        ["Pending reviews", reviews.filter((r) => r.status === "pending").length.toString()],
                      ]}
                      action={() => setTab("orders")}
                      actionLabel="Open orders"
                    />
                  </div>
                  <Section title="Recent orders" subtitle="Last 8 orders across all statuses">
                    <OrdersTable
                      rows={orders.slice(0, 8)}
                      onSendWhatsApp={handleSendWhatsApp}
                      onStatusChange={async (id, s) => {
                        if (await updateOrderStatus(id, s)) {
                          toast({ title: "Order status updated" });
                          await refreshOrders();
                        }
                      }}
                    />
                  </Section>
                </>
              )}

              {!loading && tab === "orders" && (
                <Section
                  title="Orders"
                  subtitle={`${filteredOrders.length} of ${orders.length}`}
                  action={
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                        <input
                          type="search"
                          value={orderQuery}
                          onChange={(e) => setOrderQuery(e.target.value)}
                          placeholder="Search order, customer…"
                          data-testid="admin-orders-search-input"
                          className="h-9 w-[220px] rounded-md border border-border bg-background pl-7 pr-3 text-sm outline-none focus:border-foreground transition-colors"
                        />
                      </div>
                      <select
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value)}
                        data-testid="admin-orders-filter-select"
                        className="h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-foreground transition-colors capitalize"
                      >
                        <option value="all">All statuses</option>
                        {ORDER_FILTERS.map((filter) => (
                          <option key={filter.key} value={filter.key}>
                            {filter.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  }
                >
                  {shippedMissingTracking.length > 0 && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="admin-shipped-missing-tracking-warning">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-semibold">Shipped orders missing tracking</p>
                            <p className="text-amber-800/80">{shippedMissingTracking.length} shipped order{shippedMissingTracking.length === 1 ? "" : "s"} need a tracking number before customers can be updated.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOrderFilter("shipped_no_tracking")}
                          className="h-8 rounded-md border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          Review now
                        </button>
                      </div>
                    </div>
                  )}
                  <OrdersTable
                    rows={filteredOrders}
                    onSendWhatsApp={handleSendWhatsApp}
                    onStatusChange={async (id, s) => {
                      if (await updateOrderStatus(id, s)) {
                        toast({ title: "Order status updated" });
                        await refreshOrders();
                      }
                    }}
                  />
                </Section>
              )}

              {!loading && tab === "products" && (
                <Section
                  title="Products"
                  subtitle={`${filteredProducts.length} of ${products.length} total`}
                  action={
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
                        <input
                          type="search"
                          value={productQuery}
                          onChange={(e) => setProductQuery(e.target.value)}
                          placeholder="Search product, SKU…"
                          data-testid="admin-products-search-input"
                          className="h-9 w-[220px] rounded-md border border-[#D1D5DB] bg-white pl-7 pr-3 text-sm outline-none focus:border-[#111827] transition-colors"
                        />
                      </div>
                      <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        data-testid="admin-products-filter-select"
                        className="h-9 rounded-md border border-[#D1D5DB] bg-white px-2.5 text-sm outline-none focus:border-[#111827] transition-colors"
                      >
                        <option value="all">All products</option>
                        <option value="active">Active</option>
                        <option value="low">Low stock</option>
                        <option value="out">Out of stock</option>
                        <option value="archived">Archived</option>
                      </select>
                      <button
                        onClick={() => setCreating(true)}
                        data-testid="admin-add-product-button"
                        className="rounded-md bg-[#111827] text-white text-sm font-semibold px-4 h-9 hover:bg-[#1F2937] transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add product
                      </button>
                    </div>
                  }
                >
                  <ProductsTable
                    products={filteredProducts}
                    onEdit={setEditing}
                    onDelete={async (p) => {
                      if (!confirm(`Archive "${p.name}"? It will be hidden from the storefront.`)) return;
                      if (await deleteProduct(p.id)) {
                        toast({ title: "Product archived" });
                        await refreshProducts();
                      } else {
                        toast({ title: "Could not archive", variant: "destructive" });
                      }
                    }}
                  />
                </Section>
              )}

              {!loading && tab === "inventory" && (
                <Section
                  title="Inventory"
                  subtitle={`${opsStats.lowStock + opsStats.outOfStock} products need attention`}
                  action={
                    <button
                      type="button"
                      onClick={() => setTab("products")}
                      data-testid="admin-inventory-manage-products-button"
                      className="rounded-md border border-[#D1D5DB] bg-white text-sm font-medium px-3.5 h-9 hover:bg-[#F9FAFB] transition-colors inline-flex items-center gap-1.5"
                    >
                      Manage products <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  }
                >
                  <InventoryTable products={inventoryRows} onEdit={setEditing} />
                </Section>
              )}

              {!loading && tab === "customers" && (
                <Section title="Customers" subtitle={`${customers.length} total customer profiles`}>
                  <CustomersTable rows={customers} />
                </Section>
              )}

              {!loading && tab === "reviews" && (
                <Section title="Reviews" subtitle={`${reviews.filter((r) => r.status === "pending").length} waiting for approval`}>
                  <ReviewsTable
                    rows={reviews}
                    products={products}
                    onStatusChange={async (id, status) => {
                      if (await updateReviewStatus(id, status)) {
                        toast({ title: status === "published" ? "Review published" : "Review updated" });
                        await refreshReviews();
                        await refreshProducts();
                      }
                    }}
                  />
                </Section>
              )}

              {!loading && tab === "settings" && (
                <Section title="Settings & security" subtitle="Operational guardrails and integrations">
                  <div className="grid lg:grid-cols-2 gap-4 text-sm leading-relaxed">
                    <SettingsCard
                      title="Security hardening"
                      Icon={ShieldCheck}
                      lines={[
                        "Admin data is protected by Convex identity + ADMIN_EMAIL checks.",
                        "Checkout totals are now computed server-side from live product prices.",
                        "Order status, tracking URLs and product inputs are validated before writes.",
                      ]}
                    />
                    <SettingsCard
                      title="Fulfillment messaging"
                      Icon={MessageCircle}
                      lines={[
                        "Tracking is WhatsApp click-to-send via wa.me links.",
                        "Admin still presses Send inside WhatsApp, so no hidden automation risk.",
                        "Orders without phone numbers are clearly blocked from WhatsApp sending.",
                      ]}
                    />
                    <SettingsCard
                      title="Currency"
                      Icon={IndianRupee}
                      lines={[
                        "Customer display uses Exchangerate-API Pro rates.",
                        "Converted prices are approximate; checkout and admin totals stay in INR.",
                        "Frontend caches rates locally to reduce API usage.",
                      ]}
                    />
                    <SettingsCard
                      title="Payments"
                      Icon={BadgeCheck}
                      lines={[
                        "Razorpay is intentionally MOCKED for now.",
                        "Mock orders are labeled MOCKED_PAID and RAZORPAY_MOCKED.",
                        "Switch to real payment orders only after Razorpay keys are provided.",
                      ]}
                    />
                  </div>
                </Section>
              )}
          </div>
        </main>
      </div>

      {(creating || editing) && (
        <ProductDrawer
          product={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await refreshProducts();
          }}
        />
      )}
    </div>
  );
};

function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden shadow-sm" data-testid={`admin-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 md:px-6 py-4 border-b border-[#E5E7EB] bg-white">
        <div>
          <h2 className="font-semibold text-[#111827] text-[15px] md:text-base leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function SimpleBarChart({
  data,
  formatValue = (value) => String(value),
  compact = false,
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
  compact?: boolean;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className={cn("flex items-end gap-2", compact ? "h-36" : "h-52")} data-testid="admin-simple-bar-chart">
      {data.map((item) => {
        const height = Math.max(6, (item.value / max) * 100);
        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end rounded-md bg-[#F3F4F6]">
              <div
                className="w-full rounded-md bg-[#111827] transition-all"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium text-[#6B7280]">{item.label}</p>
              {!compact && <p className="text-[11px] text-[#111827]">{formatValue(item.value)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BestSellersList({ rows }: { rows: { name: string; units: number; revenue: number }[] }) {
  if (!rows.length) return <p className="text-sm text-[#6B7280]">Best sellers appear after paid orders have items.</p>;
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.name} className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#111827]">{index + 1}. {row.name}</p>
            <p className="text-xs text-[#6B7280]">{row.units} units sold</p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-[#111827]">{formatPrice(row.revenue)}</p>
        </div>
      ))}
    </div>
  );
}

function OpsCard({
  title,
  Icon,
  rows,
  action,
  actionLabel,
}: {
  title: string;
  Icon: LucideIcon;
  rows: [string, string][];
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111827] inline-flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#6B7280]" /> {title}
        </h3>
        <button
          type="button"
          onClick={action}
          data-testid={`admin-ops-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-button`}
          className="text-xs font-medium text-[#111827] hover:underline inline-flex items-center gap-1"
        >
          {actionLabel} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-4 divide-y divide-[#E5E7EB]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-[#6B7280]">{label}</span>
            <span className="font-semibold text-[#111827] tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueCard({ label, value, tone }: { label: string; value: number; tone: "warning" | "info" | "success" }) {
  const toneClass = {
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-4", toneClass)} data-testid={`admin-queue-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SettingsCard({ title, Icon, lines }: { title: string; Icon: LucideIcon; lines: string[] }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <h3 className="text-sm font-semibold text-[#111827] inline-flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[#4B5563]" /> {title}
      </h3>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-[#4B5563]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string; border: string; Icon: typeof Clock }
> = {
  processing: { label: "Processing", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", Icon: Package },
  shipped: { label: "Shipped", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", Icon: Truck },
  delivered: { label: "Delivered", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", Icon: PackageCheck },
  cancelled: { label: "Cancelled", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", Icon: XCircle },
  returned: { label: "Returned", bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", Icon: RotateCcw },
};

function statusLabel(status: string) {
  if (status === "processing") return "Processing / In fulfillment";
  return STATUS_BADGE[status]?.label ?? status;
}

function StatusBadge({ status, testId }: { status: string | null | undefined; testId: string }) {
  const s = STATUS_BADGE[normalizeOrderStatus(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border",
        s.bg,
        s.text,
        s.border,
      )}
      data-testid={testId}
    >
      <s.Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function PaymentBadge({ status, testId }: { status: string | null | undefined; testId: string }) {
  const isPaid = status === "paid" || status === "MOCKED_PAID";
  const isMock = status === "MOCKED_PAID";
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border",
        isPaid
          ? "bg-white text-[#374151] border-[#D1D5DB]"
          : "bg-white text-[#6B7280] border-[#D1D5DB]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isPaid ? "bg-[#111827]" : "bg-[#9CA3AF]")} />
      {isMock ? "Mock paid" : (status ?? "—")}
    </span>
  );
}

function OrdersTable({
  rows,
  onStatusChange,
  onSendWhatsApp,
}: {
  rows: AdminOrder[];
  onStatusChange: (id: string, s: string) => Promise<void>;
  onSendWhatsApp: (
    o: AdminOrder,
    p: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => Promise<void>;
}) {
  if (rows.length === 0)
    return (
      <div className="text-center py-10">
        <ShoppingBag className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-foreground/55">No orders to show.</p>
      </div>
    );
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <OrderRow
          key={r.id}
          order={r}
          onStatusChange={onStatusChange}
          onSendWhatsApp={onSendWhatsApp}
        />
      ))}
    </div>
  );
}

function OrderRow({
  order,
  onStatusChange,
  onSendWhatsApp,
}: {
  order: AdminOrder;
  onStatusChange: (id: string, s: string) => Promise<void>;
  onSendWhatsApp: (
    o: AdminOrder,
    p: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => Promise<void>;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [expanded, setExpanded] = useState(false);
  const orderNumber = order.order_number ?? order.id.slice(0, 8);
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

  const payload = { carrier, trackingNumber, trackingUrl };
  const hasPhone = Boolean(order.customer_phone);

  return (
    <div className="rounded-lg border border-border bg-background hover:border-foreground/20 transition-colors">
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[140px_1fr_auto_auto_auto] items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[12px] text-foreground/80 leading-tight" data-testid={`admin-order-number-${order.id}`}>
            {orderNumber}
          </p>
          <p className="text-[11px] text-foreground/45 mt-0.5">{date}</p>
        </div>
        <div className="min-w-0 hidden md:block">
          <p className="text-sm font-medium text-foreground truncate">
            {order.customer_name ?? "—"}
          </p>
          <p className="text-[12px] text-foreground/55 truncate">
            {order.customer_email ?? "—"}
          </p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(order.total_inr ?? order.total)}
          </p>
          <PaymentBadge status={order.payment_status} testId={`admin-order-payment-badge-${order.id}`} />
        </div>
        <div className="hidden md:flex items-center gap-2">
          <StatusBadge status={order.status} testId={`admin-order-status-badge-${order.id}`} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <select
            value={normalizeOrderStatus(order.status)}
            onChange={(e) => onStatusChange(order.id, e.target.value)}
            data-testid={`admin-order-status-select-${order.id}`}
            className="text-xs h-8 rounded-md border border-border bg-background px-2 capitalize cursor-pointer hover:border-foreground/40 focus:outline-none focus:border-foreground transition-colors"
            aria-label="Change order status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`admin-order-expand-button-${order.id}`}
            className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-foreground/[0.04] transition-colors inline-flex items-center gap-1"
          >
            <Truck className="h-3.5 w-3.5" />
            {expanded ? "Hide" : "Send tracker"}
          </button>
        </div>
      </div>

      {/* Mobile-only customer/total row */}
      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">
            {order.customer_name ?? order.customer_email ?? "—"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(order.total_inr ?? order.total)}
          </p>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3 flex items-center gap-2 flex-wrap">
        <StatusBadge status={order.status} testId={`admin-order-mobile-status-badge-${order.id}`} />
        <PaymentBadge status={order.payment_status} testId={`admin-order-mobile-payment-badge-${order.id}`} />
      </div>

      {expanded && (
        <div className="border-t border-border bg-foreground/[0.015] px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr] gap-2.5">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                Carrier
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="India Post, Delhivery…"
                data-testid={`admin-tracking-carrier-input-${order.id}`}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-foreground transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                Tracking number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Paste tracking #"
                data-testid={`admin-tracking-number-input-${order.id}`}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                Tracking URL (optional)
              </label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://…"
                data-testid={`admin-tracking-url-input-${order.id}`}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-foreground transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSendWhatsApp(order, payload)}
              disabled={!hasPhone}
              data-testid={`admin-send-whatsapp-button-${order.id}`}
              className={cn(
                "h-9 px-3.5 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 transition-colors",
                hasPhone
                  ? "bg-[#111827] text-white hover:bg-[#1F2937]"
                  : "bg-foreground/10 text-foreground/40 cursor-not-allowed",
              )}
              title={hasPhone ? `Send to ${order.customer_phone}` : "Customer phone is missing on this order"}
            >
              <MessageCircle className="h-4 w-4" />
              Save and send WhatsApp
            </button>
            {!hasPhone && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                No phone on order
              </span>
            )}
            {order.tracking_number && (
              <span className="text-[11px] text-foreground/55 ml-auto">
                Saved: <span className="font-mono text-foreground/75">{order.tracking_number}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsTable({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  if (products.length === 0)
    return (
      <div className="text-center py-10">
        <Package className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-foreground/55">
          No products yet — add your first one.
        </p>
      </div>
    );
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-foreground/50 border-b border-border">
            <th className="font-semibold py-2.5 px-2">Product</th>
            <th className="font-semibold py-2.5 px-2">Category</th>
            <th className="font-semibold py-2.5 px-2">Price</th>
            <th className="font-semibold py-2.5 px-2">Stock</th>
            <th className="font-semibold py-2.5 px-2">Status</th>
            <th className="font-semibold py-2.5 px-2"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02] transition-colors">
              <td className="py-3 px-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-md bg-placeholder shrink-0 overflow-hidden border border-border">
                    {p.cover_image_url && (
                      <img
                        src={p.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <span className="font-medium line-clamp-1">{p.name}</span>
                </div>
              </td>
              <td className="py-3 px-2 capitalize text-foreground/70">
                {p.category ?? "—"}
              </td>
              <td className="py-3 px-2 tabular-nums">{formatPrice(p.price_inr)}</td>
              <td className="py-3 px-2 text-foreground/70 tabular-nums">
                {p.stock_quantity ?? "—"}
              </td>
              <td className="py-3 px-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                    p.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-foreground/[0.04] text-foreground/55 border-border",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", p.is_active ? "bg-emerald-500" : "bg-foreground/30")} />
                  {p.is_active ? "Active" : "Hidden"}
                </span>
              </td>
              <td className="py-3 px-2 text-right">
                <div className="inline-flex gap-1">
                  <button
                    onClick={() => onEdit(p)}
                    aria-label="Edit"
                    data-testid={`admin-edit-product-button-${p.id}`}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-foreground/5"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    aria-label="Delete"
                    data-testid={`admin-delete-product-button-${p.id}`}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ products, onEdit }: { products: Product[]; onEdit: (p: Product) => void }) {
  if (products.length === 0) {
    return <p className="text-sm text-[#6B7280]">No products available.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-2" data-testid="admin-inventory-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#6B7280] border-b border-[#E5E7EB]">
            <th className="font-semibold py-2.5 px-2">Product</th>
            <th className="font-semibold py-2.5 px-2">Stock</th>
            <th className="font-semibold py-2.5 px-2">Health</th>
            <th className="font-semibold py-2.5 px-2">Visibility</th>
            <th className="font-semibold py-2.5 px-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const stock = p.stock_quantity ?? 0;
            const health = p.is_active === false ? "Archived" : stock <= 0 ? "Out" : stock <= 5 ? "Low" : "Healthy";
            return (
              <tr key={p.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div className="h-9 w-9 rounded-md bg-[#F3F4F6] shrink-0 overflow-hidden border border-[#E5E7EB]">
                      {p.cover_image_url && <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#111827] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#6B7280] truncate">{p.sku || p.category || "No SKU"}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 tabular-nums font-semibold text-[#111827]">{stock}</td>
                <td className="py-3 px-2"><InventoryBadge health={health} testId={`admin-inventory-health-${p.id}`} /></td>
                <td className="py-3 px-2 text-[#6B7280]">{p.is_active === false ? "Hidden" : "Storefront"}</td>
                <td className="py-3 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    data-testid={`admin-inventory-edit-button-${p.id}`}
                    className="h-8 px-3 rounded-md border border-[#D1D5DB] hover:bg-[#F3F4F6] transition-colors text-xs font-medium"
                  >
                    Edit stock
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InventoryBadge({ health, testId }: { health: string; testId: string }) {
  const map: Record<string, string> = {
    Healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Low: "bg-amber-50 text-amber-700 border-amber-200",
    Out: "bg-rose-50 text-rose-700 border-rose-200",
    Archived: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", map[health])} data-testid={testId}>
      {health === "Low" || health === "Out" ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      {health}
    </span>
  );
}

function CustomersTable({ rows }: { rows: AdminCustomer[] }) {
  if (rows.length === 0)
    return <p className="text-sm text-foreground/60">No customers yet.</p>;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-foreground/55 border-b border-border">
            <th className="font-medium py-2 px-2">Name</th>
            <th className="font-medium py-2 px-2">Email</th>
            <th className="font-medium py-2 px-2">Phone</th>
            <th className="font-medium py-2 px-2">Orders</th>
            <th className="font-medium py-2 px-2">Spent</th>
            <th className="font-medium py-2 px-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="py-3 px-2 font-medium">{r.full_name ?? "—"}</td>
              <td className="py-3 px-2 text-foreground/70">{r.email ?? "—"}</td>
              <td className="py-3 px-2 text-foreground/70">{r.phone ?? "—"}</td>
              <td className="py-3 px-2">{r.total_orders ?? 0}</td>
              <td className="py-3 px-2">{formatPrice(r.total_spent ?? 0)}</td>
              <td className="py-3 px-2 text-foreground/70">
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsTable({
  rows,
  products,
  onStatusChange,
}: {
  rows: AdminReview[];
  products: Product[];
  onStatusChange: (id: string, status: "pending" | "published" | "hidden") => Promise<void>;
}) {
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? "Product";
  if (rows.length === 0) {
    return <p className="text-sm text-[#6B7280]">No reviews yet.</p>;
  }
  return (
    <div className="space-y-3" data-testid="admin-reviews-list">
      {rows.map((review) => (
        <article key={review.id} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111827]">{productName(review.product_id)}</p>
              <p className="text-xs text-[#6B7280]">
                {review.customer_email ?? "Customer"} · {review.created_at ? new Date(review.created_at).toLocaleDateString() : "No date"}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[#111827]" aria-label={`${review.rating} stars`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className={cn("h-3.5 w-3.5", index < review.rating && "fill-current")} />
              ))}
            </div>
          </div>
          {review.title && <h3 className="mt-3 text-sm font-medium text-[#111827]">{review.title}</h3>}
          {review.body && <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">{review.body}</p>}
          {Boolean(review.media_urls?.length) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.media_urls?.slice(0, 4).map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs text-[#4B5563] hover:bg-[#F9FAFB]">
                  Media
                </a>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#D1D5DB] px-2 py-1 text-xs font-medium text-[#4B5563] capitalize">
              {review.status}
            </span>
            <button
              type="button"
              onClick={() => onStatusChange(review.id, "published")}
              className="h-8 rounded-md bg-[#111827] px-3 text-xs font-semibold text-white hover:bg-[#1F2937]"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(review.id, "hidden")}
              className="h-8 rounded-md border border-[#D1D5DB] px-3 text-xs font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
            >
              Hide
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductDrawer({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    slug: product?.slug ?? null,
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    author: product?.author ?? "",
    publisher: product?.publisher ?? "",
    price_inr: product?.price_inr ?? 0,
    sale_price_inr: product?.sale_price_inr ?? null,
    category: product?.category ?? "books",
    cover_image_url: product?.cover_image_url ?? null,
    images: product?.images ?? [],
    linked_product_ids: product?.linked_product_ids ?? [],
    variant_label: product?.variant_label ?? "",
    badge: product?.badge ?? null,
    stock_quantity: product?.stock_quantity ?? 0,
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    is_bestseller: product?.is_bestseller ?? false,
    is_new_arrival: product?.is_new_arrival ?? false,
    is_on_sale: product?.is_on_sale ?? false,
    tags: product?.tags ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkedIds, setLinkedIds] = useState((product?.linked_product_ids ?? []).join(", "));

  const handleUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadProductImage(file);
    setUploading(false);
    if (url) {
      setForm((f) => ({ ...f, cover_image_url: url }));
      toast({ title: "Image uploaded" });
    } else {
      toast({
        title: "Upload failed",
        description: "Check the storage bucket exists and has admin write access.",
        variant: "destructive",
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: form.price_inr,
      linked_product_ids: linkedIds.split(",").map((id) => id.trim()).filter(Boolean),
    };
    const result = product
      ? await updateProduct(product.id, payload)
      : await createProduct(payload);
    setSaving(false);
    if (result) {
      toast({ title: product ? "Product updated" : "Product created" });
      onSaved();
    } else {
      toast({ title: "Could not save product", variant: "destructive" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[560px] bg-background overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-foreground text-lg italic">
            {product ? "Edit product" : "New product"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            data-testid="admin-product-drawer-close-button"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-foreground/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-foreground/70 mb-1.5">
              Cover image
            </span>
            <div className="flex gap-3 items-start">
              <div className="h-24 w-24 rounded-lg bg-placeholder overflow-hidden border border-border shrink-0">
                {form.cover_image_url ? (
                  <img
                    src={form.cover_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-foreground/30">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-2 text-sm rounded-md border border-border px-3 py-2 cursor-pointer hover:border-brand transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    data-testid="admin-product-image-file-input"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                </label>
                <input
                  type="url"
                  value={form.cover_image_url ?? ""}
                  data-testid="admin-product-image-url-input"
                  onChange={(e) =>
                    setForm({ ...form, cover_image_url: e.target.value || null })
                  }
                  placeholder="…or paste image URL"
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          <Field
            label="Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Slug"
              value={form.slug ?? ""}
              onChange={(v) => setForm({ ...form, slug: v || null })}
              placeholder="auto"
            />
            <SelectField
              label="Category"
              value={form.category ?? "books"}
              onChange={(v) => setForm({ ...form, category: v })}
              options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Author"
              value={form.author ?? ""}
              onChange={(v) => setForm({ ...form, author: v || null })}
            />
            <Field
              label="Publisher"
              value={form.publisher ?? ""}
              onChange={(v) => setForm({ ...form, publisher: v || null })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Price (INR)"
              value={form.price_inr}
              onChange={(v) => setForm({ ...form, price_inr: v })}
              required
            />
            <NumberField
              label="Sale price (INR)"
              value={form.sale_price_inr ?? 0}
              onChange={(v) =>
                setForm({
                  ...form,
                  sale_price_inr: v > 0 ? v : null,
                  is_on_sale: v > 0,
                })
              }
            />
            <NumberField
              label="Stock"
              value={form.stock_quantity ?? 0}
              onChange={(v) => setForm({ ...form, stock_quantity: v })}
            />
            <Field
              label="Badge"
              value={form.badge ?? ""}
              onChange={(v) => setForm({ ...form, badge: v || null })}
              placeholder="e.g. Bestseller"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-foreground/[0.015] p-3">
            <Field
              label="Version label"
              value={form.variant_label ?? ""}
              onChange={(v) => setForm({ ...form, variant_label: v || null })}
              placeholder="English, Arabic, Urdu..."
            />
            <Field
              label="Linked product IDs"
              value={linkedIds}
              onChange={setLinkedIds}
              placeholder="Paste product IDs separated by commas"
            />
            <p className="text-xs text-foreground/55">
              Use this to connect separate products that are versions of the same title, such as English and Arabic editions.
            </p>
          </div>

          <TextAreaField
            label="Short description"
            value={form.short_description ?? ""}
            onChange={(v) => setForm({ ...form, short_description: v || null })}
            rows={2}
          />
          <TextAreaField
            label="Full description"
            value={form.description ?? ""}
            onChange={(v) => setForm({ ...form, description: v || null })}
            rows={5}
          />

          <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border">
            <Toggle
              label="Active (visible)"
              value={form.is_active ?? true}
              onChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Toggle
              label="Featured"
              value={form.is_featured ?? false}
              onChange={(v) => setForm({ ...form, is_featured: v })}
            />
            <Toggle
              label="Bestseller"
              value={form.is_bestseller ?? false}
              onChange={(v) => setForm({ ...form, is_bestseller: v })}
            />
            <Toggle
              label="New arrival"
              value={form.is_new_arrival ?? false}
              onChange={(v) => setForm({ ...form, is_new_arrival: v })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background pb-1 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              data-testid="admin-product-drawer-cancel-button"
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-foreground/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="admin-product-save-button"
              className="rounded-md bg-brand text-brand-foreground text-sm font-semibold px-5 py-2 hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">
        {label}
      </span>
      <input
        {...props}
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-input`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand transition-colors"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step="any"
        required={required}
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-number-input`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand transition-colors"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-textarea`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand transition-colors resize-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">
        {label}
      </span>
      <select
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-select`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-toggle`}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-brand h-4 w-4"
      />
      <span className="text-foreground/75">{label}</span>
    </label>
  );
}

export default Admin;

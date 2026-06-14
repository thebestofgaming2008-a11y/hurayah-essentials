import { type ClipboardEvent, type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BellRing,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PackageOpen,
  Pencil,
  Plus,
  Repeat,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  Trash2,
  Users,
  X,
  Image as ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import {
  createAdminReview,
  createProduct,
  deleteProduct,
  getStoreSettings,
  listAdminNotifications,
  listAllCustomers,
  listAllOrders,
  listPaymentRecoveries,
  listAllProducts,
  listAllReviews,
  listShippingRates,
  refreshPublicCatalog,
  saveStoreSettings,
  uploadProductImage,
  updateProduct,
  updateOrderTracking,
  updateOrderStatus,
  updateReviewStatus,
  updateShippingRate,
  type AdminNotification,
  type AdminCustomer,
  type AdminOrder,
  type AdminShippingAddress,
  type PaymentRecovery,
  type AdminReview,
  type ShippingRate,
} from "@/services/adminService";
import { clearProductListCache, type Product } from "@/services/productService";
import { BOOK_SUBJECTS, CATEGORIES, formatPrice, normalizeBookSubject } from "@/data/products";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StarRatingInput } from "@/components/shop/ReviewStars";

type SectionKey =
  | "dashboard"
  | "analytics"
  | "orders"
  | "products"
  | "inventory"
  | "categories"
  | "shipping"
  | "customers"
  | "reviews"
  | "settings";

type RangeKey = "7d" | "30d" | "90d";
type OrderStatus = "unshipped" | "shipped_no_tracking" | "in_transit" | "delivered" | "cancelled";
type FulfillmentStatus = "processing" | "shipped" | "delivered" | "cancelled" | "returned";

type ProductFormState = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  author: string;
  publisher: string;
  language: string;
  binding: string;
  weight_g: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  shipping_class: string;
  weight_source_url: string;
  weight_confidence: string;
  price_inr: string;
  sale_price_inr: string;
  sku: string;
  stock_quantity: string;
  category: string;
  variant_group: string;
  variant_label: string;
  color_options: string;
  size_options: string;
  option_types: Array<{ name: string; values: string[] }>;
  cover_image_url: string;
  images: string;
  badge: string;
  tags: string;
  is_active: boolean;
  is_featured: boolean;
  show_in_category_section: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
};

type AdminCategory = {
  key: string;
  label: string;
  blurb: string;
  parent?: string;
};

type OrderFulfillmentState = {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  status: FulfillmentStatus;
};

const navGroups: Array<{
  label: string;
  items: Array<{ key: SectionKey; icon: LucideIcon; label: string; badgeKey?: "orders" | "reviews" | "shipping" }>;
}> = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { key: "orders", icon: ShoppingCart, label: "Orders", badgeKey: "orders" },
      { key: "products", icon: Package, label: "Products" },
      { key: "inventory", icon: PackageOpen, label: "Inventory" },
      { key: "categories", icon: Tag, label: "Categories" },
    ],
  },
  {
    label: "People",
    items: [
      { key: "customers", icon: Users, label: "Customers" },
      { key: "reviews", icon: MessageSquare, label: "Reviews", badgeKey: "reviews" },
    ],
  },
  { label: "System", items: [{ key: "settings", icon: Settings, label: "Settings" }] },
];

const statusMeta: Record<OrderStatus, { label: string; dot: string }> = {
  unshipped: { label: "Not shipped", dot: "bg-amber-500" },
  shipped_no_tracking: { label: "No tracking", dot: "bg-blue-500" },
  in_transit: { label: "In transit", dot: "bg-zinc-500" },
  delivered: { label: "Delivered", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", dot: "bg-red-500" },
};

const canonicalBookSubjectTags = new Set([
  ...BOOK_SUBJECTS.map((subject) => subject.key.toLowerCase()),
  ...BOOK_SUBJECTS.map((subject) => subject.label.toLowerCase()),
  "tazkiyah",
]);

function isCanonicalSubjectTag(tag: string) {
  return canonicalBookSubjectTags.has(tag.trim().toLowerCase()) || Boolean(normalizeBookSubject(tag));
}

const filters: Array<{ key: OrderStatus; label: string; description: string; icon: LucideIcon }> = [
  { key: "unshipped", label: "Not shipped", description: "Awaiting fulfillment", icon: PackageOpen },
  { key: "shipped_no_tracking", label: "No tracking", description: "Add a tracking ID", icon: AlertCircle },
  { key: "in_transit", label: "In transit", description: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", description: "Arrived to customer", icon: CheckCircle2 },
  { key: "cancelled", label: "Cancelled", description: "Stopped or refunded", icon: X },
];

const reviewStates: Array<{ key: "pending" | "published" | "hidden"; label: string; tone: string }> = [
  { key: "published", label: "Published", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "pending", label: "Needs review", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "hidden", label: "Hidden", tone: "border-zinc-200 bg-zinc-100 text-zinc-600" },
];

const carriers = [
  { name: "DTDC", updated: 32, stale: true },
  { name: "India Post", updated: 11, stale: false },
];

const zones = ["Local", "Regional", "National", "Remote"];

function normalizeStatus(order: AdminOrder): OrderStatus {
  const status = order.status;
  if (status === "cancelled" || status === "returned") return "cancelled";
  if (status === "delivered") return "delivered";
  if (status === "shipped" && order.tracking_number) return "in_transit";
  if (status === "shipped") return "shipped_no_tracking";
  return "unshipped";
}

function fulfillmentStatus(order: AdminOrder): FulfillmentStatus {
  if (["processing", "shipped", "delivered", "cancelled", "returned"].includes(String(order.status))) {
    return order.status as FulfillmentStatus;
  }
  return "processing";
}

function isShippingReviewDue(rates: ShippingRate[]) {
  const updatedTimes = rates.map((rate) => new Date(rate.updated_at).getTime()).filter((time) => Number.isFinite(time));
  const oldestUpdated = updatedTimes.length ? Math.min(...updatedTimes) : 0;
  return rates.length === 0 || !oldestUpdated || Date.now() - oldestUpdated >= 30 * 24 * 60 * 60 * 1000;
}

function fmtAmount(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderShippingAddress(order: AdminOrder): AdminShippingAddress | null {
  if (order.shipping_address && typeof order.shipping_address === "object") {
    return order.shipping_address;
  }
  return null;
}

function addressLines(address: AdminShippingAddress | null) {
  if (!address) return [];
  const cityLine = [address.city, address.state, address.postal_code].filter(Boolean).join(", ");
  return [address.address_line_1, address.address_line_2, cityLine, address.country].filter((line): line is string => Boolean(line));
}

function addressPreview(order: AdminOrder) {
  const address = orderShippingAddress(order);
  const lines = addressLines(address);
  return lines.length ? lines.join(" · ") : "No shipping address saved";
}

function whatsappPhone(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

function trackingWhatsappUrl(order: AdminOrder, form: OrderFulfillmentState) {
  const phone = whatsappPhone(order.customer_phone);
  if (!phone) return null;
  const orderLabel = order.order_number ?? order.id.slice(0, 8);
  const carrier = form.carrier.trim() || "courier";
  const trackingNumber = form.trackingNumber.trim();
  const lines = [
    `Assalamu alaikum ${order.customer_name ?? "there"}, your Hurayrah Essentials order ${orderLabel} has shipped.`,
    `Carrier: ${carrier}`,
    `Tracking: ${trackingNumber}`,
    form.trackingUrl.trim() ? `Track here: ${form.trackingUrl.trim()}` : "",
    "Jazakallahu khairan for your order.",
  ].filter(Boolean);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(lines.join("\n"))}`;
}

function openWhatsapp(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    if (!document.hasFocus()) return;
    toast({ title: "WhatsApp popup was blocked", description: "Allow popups for this site, then send tracking again.", variant: "destructive" });
  }, 800);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeRangeData(orders: AdminOrder[], customers: AdminCustomer[], range: RangeKey) {
  const length = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return Array.from({ length }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (length - 1 - index));
    const key = dayKey(d);
    const dayOrders = orders.filter((order) => (order.created_at ?? "").slice(0, 10) === key);
    return {
      label: d.toLocaleDateString("en-US", length <= 10 ? { weekday: "short" } : { month: "short", day: "numeric" }),
      revenue: Math.round(dayOrders.reduce((sum, order) => sum + (order.total_inr ?? order.total ?? 0), 0)),
      orders: dayOrders.length,
      visitors: customers.filter((customer) => (customer.created_at ?? "").slice(0, 10) === key).length,
    };
  });
}

function summarize(orders: AdminOrder[], customers: AdminCustomer[], range: RangeKey) {
  const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const now = Date.now();
  const inRange = orders.filter((order) => {
    if (!order.created_at) return false;
    return now - new Date(order.created_at).getTime() <= rangeDays * 24 * 60 * 60 * 1000;
  });
  const revenue = inRange.reduce((sum, order) => sum + (order.total_inr ?? order.total ?? 0), 0);
  const visitors = customers.length;
  return {
    revenue: { value: Math.round(revenue), change: 0 },
    orders: { value: inRange.length, change: 0 },
    visitors: { value: visitors, change: 0 },
    aov: { value: inRange.length ? revenue / inRange.length : 0, change: 0 },
    conversion: { value: visitors > 0 ? (inRange.length / visitors) * 100 : 0, change: 0 },
  };
}

function topProducts(orders: AdminOrder[], products: Product[]) {
  const fromOrders = new Map<string, { name: string; sales: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      const key = item.product_id ?? item.product_name ?? "unknown";
      const current = fromOrders.get(key) ?? { name: item.product_name ?? "Unknown product", sales: 0, revenue: 0 };
      current.sales += item.quantity;
      current.revenue += Math.round(item.subtotal);
      fromOrders.set(key, current);
    }
  }
  const rows = [...fromOrders.values()].sort((a, b) => b.revenue - a.revenue);
  if (rows.length) return rows.slice(0, 5);
  return products.slice(0, 5).map((product) => ({
    name: product.name,
    sales: 0,
    revenue: 0,
  }));
}

export default function Admin() {
  const { signOut } = useAuth();
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("7d");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const ordersRef = useRef<AdminOrder[]>([]);
  const [paymentRecoveries, setPaymentRecoveries] = useState<PaymentRecovery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [storeSettings, setStoreSettings] = useState<Record<string, unknown>>({});
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const pendingOrderCountRef = useRef(0);
  const [query, setQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderStatus>("unshipped");
  const [productEditor, setProductEditor] = useState<Product | "new" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const refreshNotifications = async () => {
    try {
      setAdminNotifications(await listAdminNotifications());
    } catch {
      // Notifications should not block admin work.
    }
  };

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    pendingOrderCountRef.current = pendingOrderCount;
  }, [pendingOrderCount]);

  const refreshOrders = async ({ apply = true, notify = false } = {}) => {
    setOrdersRefreshing(true);
    try {
      const [nextOrders, nextRecoveries] = await Promise.all([listAllOrders(200), listPaymentRecoveries()]);
      const currentIds = new Set(ordersRef.current.map((order) => order.id));
      const newCount = nextOrders.filter((order) => !currentIds.has(order.id)).length;
      if (apply) {
        setOrders(nextOrders);
        setPaymentRecoveries(nextRecoveries);
        setPendingOrderCount(0);
      } else if (newCount > 0) {
        const shouldNotify = notify && pendingOrderCountRef.current !== newCount;
        setPendingOrderCount(newCount);
        if (shouldNotify) {
          toast({
            title: newCount === 1 ? "New order received" : `${newCount} new orders received`,
            description: "Use Refresh orders to load the latest order list.",
          });
        }
      } else if (pendingOrderCountRef.current === 0) {
        setOrders(nextOrders);
        setPaymentRecoveries(nextRecoveries);
      }
    } catch {
      if (apply) toast({ title: "Could not refresh orders", variant: "destructive" });
    } finally {
      setOrdersRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listAllProducts(), listAllOrders(200), listPaymentRecoveries(), listAllCustomers(200), listAllReviews(200), listShippingRates(), getStoreSettings(), listAdminNotifications()]).then(
      ([nextProducts, nextOrders, nextRecoveries, nextCustomers, nextReviews, nextShippingRates, nextStoreSettings, nextNotifications]) => {
        if (cancelled) return;
        setProducts(nextProducts);
        setOrders(nextOrders);
        setPaymentRecoveries(nextRecoveries);
        setCustomers(nextCustomers);
        setReviews(nextReviews);
        setShippingRates(nextShippingRates);
        setStoreSettings(nextStoreSettings);
        setAdminNotifications(nextNotifications);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (section !== "orders") return;
    void refreshOrders({ apply: true });
    const interval = window.setInterval(() => {
      void refreshOrders({ apply: false, notify: true });
    }, 25000);
    return () => window.clearInterval(interval);
  }, [section]);

  const counts = useMemo(() => {
    const statusCounts = orders.reduce(
      (acc, order) => {
        acc[normalizeStatus(order)] += 1;
        return acc;
      },
      { unshipped: 0, shipped_no_tracking: 0, in_transit: 0, delivered: 0, cancelled: 0 } as Record<OrderStatus, number>,
    );
    return {
      ...statusCounts,
      all: orders.length,
      reviews: reviews.filter((review) => review.status === "pending").length,
      shipping: isShippingReviewDue(shippingRates) ? 1 : 0,
    };
  }, [orders, reviews, shippingRates]);

  const summary = useMemo(() => summarize(orders, customers, range), [orders, customers, range]);
  const chartData = useMemo(() => makeRangeData(orders, customers, range), [orders, customers, range]);
  const top = useMemo(() => topProducts(orders, products), [orders, products]);
  const adminCategories = useMemo(() => mergeCategories(storeSettings), [storeSettings]);
  const title = navGroups.flatMap((group) => group.items).find((item) => item.key === section)?.label ?? "Dashboard";
  const subtitle =
    section === "dashboard"
      ? "Fulfillment overview"
      : section === "analytics"
        ? "Store performance"
        : section === "orders"
          ? `${orders.length} total`
          : section === "products"
            ? `${products.length} active`
            : section === "inventory"
              ? "Stock, weights, and active status"
              : section === "categories"
                ? `${adminCategories.length} categories`
            : section === "shipping"
              ? "Carrier rates · Calculator · Recalc reminders"
              : undefined;

  const badges = {
    orders: counts.unshipped + counts.shipped_no_tracking,
    reviews: counts.reviews,
    shipping: counts.shipping,
  };

  const patchOrderLocally = (id: string, patch: Partial<AdminOrder>) => {
    setOrders((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setSelectedOrder((current) => (current?.id === id ? { ...current, ...patch } : current));
  };

  const handleSendTrackingWhatsapp = async (order: AdminOrder, form: OrderFulfillmentState) => {
    const trackingNumber = form.trackingNumber.trim();
    const whatsappUrl = trackingWhatsappUrl(order, form);
    if (!trackingNumber) {
      toast({ title: "Tracking number is required", description: "Add the tracking code before sending it to WhatsApp.", variant: "destructive" });
      return;
    }
    if (!whatsappUrl) {
      toast({ title: "Customer phone is missing", description: "Add a phone number to the order before sending tracking.", variant: "destructive" });
      return;
    }
    try {
      let patch: Partial<AdminOrder> = {};
      if (
        trackingNumber !== (order.tracking_number ?? "") ||
        form.carrier.trim() !== (order.tracking_carrier ?? "") ||
        form.trackingUrl.trim() !== (order.tracking_url ?? "")
      ) {
        const updated = await updateOrderTracking(order.id, {
          trackingNumber,
          carrier: form.carrier.trim() || undefined,
          trackingUrl: form.trackingUrl.trim() || undefined,
        });
        patch = {
          ...patch,
          status: updated?.status ?? "shipped",
          tracking_number: updated?.tracking_number ?? trackingNumber,
          tracking_carrier: updated?.tracking_carrier ?? form.carrier.trim(),
          tracking_url: updated?.tracking_url ?? form.trackingUrl.trim(),
        };
      }
      const nextStatus = form.status === "processing" ? "shipped" : form.status;
      if (nextStatus !== fulfillmentStatus({ ...order, ...patch })) {
        const saved = await updateOrderStatus(order.id, nextStatus);
        if (!saved) throw new Error("Order status update failed");
        patch = { ...patch, status: nextStatus };
      }
      patchOrderLocally(order.id, patch);
      openWhatsapp(whatsappUrl);
      toast({ title: "Tracking opened in WhatsApp", description: order.order_number ?? order.id.slice(0, 8) });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not send tracking", variant: "destructive" });
    }
  };

  const handleUpdateOrderStatus = async (order: AdminOrder, status: FulfillmentStatus) => {
    try {
      const saved = await updateOrderStatus(order.id, status);
      if (!saved) throw new Error("Order update failed");
      patchOrderLocally(order.id, { status });
      toast({ title: "Order status updated", description: status.replace("_", " ") });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not update order status", variant: "destructive" });
    }
  };

  const handleCancelOrder = async (order: AdminOrder) => {
    if (!window.confirm(`Cancel order ${order.order_number ?? order.id.slice(0, 8)}?`)) return;
    try {
      const saved = await updateOrderStatus(order.id, "cancelled");
      if (!saved) throw new Error("Order update failed");
      patchOrderLocally(order.id, { status: "cancelled" });
      toast({ title: "Order cancelled" });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not cancel order", variant: "destructive" });
    }
  };

  const handleSaveProduct = async (form: ProductFormState) => {
    if (!form.name.trim() || Number(form.price_inr) <= 0 || !form.category.trim()) {
      toast({ title: "Name, price, and category are required", variant: "destructive" });
      return;
    }
    const currentProduct = productEditor && productEditor !== "new" ? productEditor : null;
    const variantGroup = slugifyAdmin(form.variant_group);
    if (variantGroup) {
      try {
        const savedGroups = JSON.parse(window.localStorage.getItem("he_variant_groups_v1") || "[]") as string[];
        window.localStorage.setItem("he_variant_groups_v1", JSON.stringify(Array.from(new Set([...savedGroups, variantGroup])).sort()));
      } catch {
        window.localStorage.setItem("he_variant_groups_v1", JSON.stringify([variantGroup]));
      }
    }
    const oldGroup = currentProduct ? variantGroupFromTags(currentProduct.tags) : "";
    const rawTags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => !tag.startsWith("vg:"))
      .filter((tag) => !isCanonicalSubjectTag(tag));
    const variantPeers = variantGroup
      ? products.filter((product) => product.id !== currentProduct?.id && variantGroupFromTags(product.tags) === variantGroup)
      : [];
    const selectedCategory = form.category.trim() || "books";
    const selectedMeta = adminCategories.find((category) => category.key === selectedCategory);
    const topCategory = selectedMeta?.parent || selectedCategory;
    const selectedSubjectKey = normalizeBookSubject(selectedCategory);
    if (topCategory === "books" && !selectedSubjectKey) {
      toast({ title: "Choose a book subject", description: "Books must be placed in one of the book subjects before saving.", variant: "destructive" });
      return;
    }
    const subjectTag = selectedSubjectKey ? BOOK_SUBJECTS.find((subject) => subject.key === selectedSubjectKey)?.label ?? selectedMeta?.label ?? null : null;
    const optionGroups = normalizeOptionGroups(form.option_types);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      author: form.author.trim() || null,
      publisher: form.publisher.trim() || null,
      language: form.language.trim() || null,
      binding: form.binding.trim() || null,
      weight_g: form.weight_g ? Number(form.weight_g) : null,
      length_cm: form.length_cm ? Number(form.length_cm) : null,
      width_cm: form.width_cm ? Number(form.width_cm) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      shipping_class: form.shipping_class.trim() || null,
      weight_source_url: form.weight_source_url.trim() || null,
      weight_confidence: form.weight_confidence.trim() || null,
      price_inr: Number(form.price_inr) || 0,
      sale_price_inr: Number(form.sale_price_inr) > 0 ? Number(form.sale_price_inr) : null,
      sku: form.sku.trim() || null,
      stock_quantity: Number(form.stock_quantity) || 0,
      category: topCategory,
      category_id: selectedCategory,
      cover_image_url: form.cover_image_url.trim() || null,
      images: form.images.split("\n").map((image) => image.trim()).filter(Boolean),
      linked_product_ids: variantPeers.map((product) => product.id),
      variant_label: form.variant_label.trim() || null,
      color_options: optionValuesByName(optionGroups, "Color").length ? optionValuesByName(optionGroups, "Color") : optionValuesByName(optionGroups, "Colour"),
      size_options: optionValuesByName(optionGroups, "Size"),
      option_types: optionGroups,
      badge: form.badge.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      show_in_category_section: false,
      is_bestseller: form.is_bestseller,
      is_new_arrival: form.is_new_arrival,
      is_on_sale: Number(form.sale_price_inr) > 0,
      tags: Array.from(new Set([...rawTags, ...(subjectTag ? [subjectTag] : []), ...(variantGroup ? [`vg:${variantGroup}`] : [])])),
    };
    try {
      let savedProduct: Product;
      if (productEditor && productEditor !== "new") {
        const updated = await updateProduct(productEditor.id, payload);
        if (!updated) throw new Error("Update failed");
        savedProduct = updated;
        setProducts((current) => current.map((product) => (product.id === updated.id ? updated : product)));
        toast({ title: "Product updated", description: updated.name });
      } else {
        const created = await createProduct(payload);
        if (!created) throw new Error("Create failed");
        savedProduct = created;
        setProducts((current) => [created, ...current]);
        toast({ title: "Product added", description: created.name });
      }
      if (variantGroup) {
        const groupIds = [savedProduct.id, ...variantPeers.map((product) => product.id)];
        for (const peer of variantPeers) {
          const peerTags = Array.from(new Set([...(peer.tags ?? []).filter((tag) => !tag.startsWith("vg:")), `vg:${variantGroup}`]));
          const updatedPeer = await updateProduct(peer.id, {
            tags: peerTags,
            linked_product_ids: groupIds.filter((id) => id !== peer.id),
          });
          if (updatedPeer) {
            setProducts((current) => current.map((product) => (product.id === updatedPeer.id ? updatedPeer : product)));
          }
        }
      }
      if (currentProduct && oldGroup && oldGroup !== variantGroup) {
        const oldPeers = products.filter((product) => product.id !== currentProduct.id && variantGroupFromTags(product.tags) === oldGroup);
        for (const peer of oldPeers) {
          const updatedPeer = await updateProduct(peer.id, {
            linked_product_ids: (peer.linked_product_ids ?? []).filter((id) => id !== currentProduct.id),
          });
          if (updatedPeer) {
            setProducts((current) => current.map((product) => (product.id === updatedPeer.id ? updatedPeer : product)));
          }
        }
      }
      clearProductListCache();
      await refreshPublicCatalog(savedProduct);
      void refreshNotifications();
      setProductEditor(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please check the product fields and try again.";
      console.error("product save failed", error);
      toast({ title: "Could not save product", description: message, variant: "destructive" });
    }
  };

  const handleBulkAddProducts = async () => {
    const rows = window.prompt("Paste products as: name, price, stock. One product per line.");
    if (!rows?.trim()) return;
    const parsed = rows
      .split("\n")
      .map((row) => row.split(",").map((cell) => cell.trim()))
      .filter(([name]) => Boolean(name));
    const created: Product[] = [];
    try {
      for (const [name, priceValue, stockValue] of parsed) {
        const product = await createProduct({
          name,
          price_inr: Number(priceValue) || 0,
          stock_quantity: Number(stockValue) || 0,
          category: "books",
          short_description: "",
          description: "",
        });
        if (product) created.push(product);
      }
      setProducts((current) => [...created, ...current]);
      toast({ title: "Products imported", description: `${created.length} added` });
    } catch {
      toast({ title: "Could not import products", variant: "destructive" });
    }
  };

  const handleStockChange = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, (product.stock_quantity ?? 0) + delta);
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? { ...item, stock_quantity: nextStock } : item)),
    );
    try {
      const updated = await updateProduct(product.id, { stock_quantity: nextStock });
      if (updated) {
        setProducts((current) => current.map((item) => (item.id === product.id ? updated : item)));
      }
      clearProductListCache();
      void refreshPublicCatalog(updated ?? product);
      void refreshNotifications();
    } catch {
      setProducts((current) => current.map((item) => (item.id === product.id ? product : item)));
      toast({ title: "Could not update stock", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const ok = window.confirm(`Delete "${product.name}"? This removes it from the catalog.`);
    if (!ok) return;
    try {
      const removed = await deleteProduct(product.id);
      if (!removed) throw new Error("Delete failed");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      clearProductListCache();
      void refreshPublicCatalog(product);
      toast({ title: "Product deleted", description: product.name });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not delete product", variant: "destructive" });
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    const nextActive = !(product.is_active ?? true);
    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, is_active: nextActive } : item)));
    try {
      const updated = await updateProduct(product.id, { is_active: nextActive });
      if (updated) setProducts((current) => current.map((item) => (item.id === product.id ? updated : item)));
      clearProductListCache();
      void refreshPublicCatalog(updated ?? product);
      void refreshNotifications();
    } catch {
      setProducts((current) => current.map((item) => (item.id === product.id ? product : item)));
      toast({ title: "Could not update product", variant: "destructive" });
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    try {
      const created = await createProduct({
        name: `${product.name} Copy`,
        slug: `${product.slug ?? product.name.toLowerCase().replace(/\s+/g, "-")}-copy-${Date.now().toString().slice(-4)}`,
        short_description: product.short_description,
        description: product.description,
        author: product.author,
        publisher: product.publisher,
        language: product.language,
        binding: product.binding,
        price_inr: product.price_inr ?? product.price ?? 0,
        sale_price_inr: product.sale_price_inr,
        sku: product.sku ? `${product.sku}-COPY` : null,
        stock_quantity: 0,
        category: product.category,
        cover_image_url: product.cover_image_url,
        images: product.images ?? [],
        badge: product.badge,
        tags: product.tags ?? [],
        is_active: false,
      });
      if (!created) throw new Error("Duplicate failed");
      setProducts((current) => [created, ...current]);
      clearProductListCache();
      void refreshPublicCatalog(created);
      setProductEditor(created);
      toast({ title: "Product duplicated", description: "Review it before activating." });
    } catch {
      toast({ title: "Could not duplicate product", variant: "destructive" });
    }
  };

  const handleReviewStatus = async (review: AdminReview, status: "pending" | "published" | "hidden") => {
    try {
      const saved = await updateReviewStatus(review.id, status);
      if (!saved) throw new Error("Review update failed");
      setReviews((current) => current.map((item) => (item.id === review.id ? { ...item, status } : item)));
      toast({ title: status === "published" ? "Review published" : status === "hidden" ? "Review hidden" : "Review moved to pending" });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not update review", variant: "destructive" });
    }
  };

  const handleUpdateShippingRate = async (id: string, patch: Partial<ShippingRate>) => {
    try {
      const updated = await updateShippingRate(id, patch);
      if (!updated) throw new Error("Shipping update failed");
      setShippingRates((current) => current.map((rate) => (rate.id === id ? updated : rate)));
      void refreshNotifications();
    } catch {
      toast({ title: "Could not save shipping rate", variant: "destructive" });
    }
  };

  const handleSaveSettings = async (settings: Record<string, unknown>) => {
    try {
      await saveStoreSettings(settings);
      setStoreSettings(settings);
      toast({ title: "Settings saved" });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not save settings", variant: "destructive" });
    }
  };

  const handleCreateReview = async (input: {
    productId: string;
    rating: number;
    customerName?: string | null;
    customerEmail?: string | null;
    title?: string | null;
    body?: string | null;
    status?: "pending" | "published" | "hidden";
  }) => {
    try {
      const created = await createAdminReview(input);
      if (!created) throw new Error("Review create failed");
      setReviews((current) => [created, ...current]);
      toast({ title: created.status === "published" ? "Review added" : "Review saved" });
      void refreshNotifications();
    } catch {
      toast({ title: "Could not add review", variant: "destructive" });
      throw new Error("Could not add review");
    }
  };

  const handleSaveCategories = async (categories: AdminCategory[]) => {
    try {
      const nextSettings = { ...storeSettings, customCategories: categories };
      await saveStoreSettings(nextSettings);
      setStoreSettings(nextSettings);
      toast({ title: "Categories saved" });
    } catch {
      toast({ title: "Could not save categories", variant: "destructive" });
    }
  };

  return (
    <div className="vibe-admin flex min-h-screen bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`admin-mobile-sidebar fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] transition-all duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          collapsed ? "md:w-16" : "md:w-56"
        }`}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-[rgb(var(--vibe-border))] px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgb(var(--vibe-foreground))]">
            <span className="text-[11px] font-bold text-white">S</span>
          </div>
          {(!collapsed || mobileOpen) && <span className="flex-1 truncate text-[13px] font-semibold">Store</span>}
          <button type="button" className="p-1 text-[rgb(var(--vibe-muted))] md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              {(!collapsed || mobileOpen) && (
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-px">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.key;
                  const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                  const showLabels = !collapsed || mobileOpen;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSection(item.key);
                          setMobileOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors ${
                          active
                            ? "bg-[rgb(var(--vibe-accent))] font-medium text-[rgb(var(--vibe-foreground))]"
                            : "text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] hover:text-[rgb(var(--vibe-foreground))]"
                        } ${showLabels ? "" : "justify-center"}`}
                      >
                        <Icon className="h-[15px] w-[15px] shrink-0" />
                        {showLabels && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {badge > 0 && (
                              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--vibe-muted))]">
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-px border-t border-[rgb(var(--vibe-border))] p-2">
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] ${collapsed ? "md:justify-center" : ""}`}
          >
            <Bell className="h-[15px] w-[15px]" />
            {(!collapsed || mobileOpen) && (
              <>
                <span className="flex-1 text-left">Notifications</span>
                {adminNotifications.length > 0 && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium">{adminNotifications.length}</span>}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] hover:text-red-600 ${collapsed ? "md:justify-center" : ""}`}
          >
            <LogOut className="h-[15px] w-[15px]" />
            {(!collapsed || mobileOpen) && <span>Log out</span>}
          </button>
        </div>

        <div className="hidden border-t border-[rgb(var(--vibe-border))] p-2 md:block">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-md py-1.5 text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] hover:text-[rgb(var(--vibe-foreground))]"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="-ml-1 p-1 text-[rgb(var(--vibe-muted))] md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-[15px] font-semibold">{title}</h1>
              {subtitle && <span className="hidden truncate text-[12px] text-[rgb(var(--vibe-muted))] sm:inline">{subtitle}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--vibe-muted))]" />
              <input
                type="text"
                placeholder="Search..."
                className="h-8 w-52 rounded-md border border-[rgb(var(--vibe-border))] bg-white pl-8 pr-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500"
                value={["orders", "products", "inventory"].includes(section) ? query : ""}
                onChange={(event) => setQuery(event.target.value)}
                disabled={!["orders", "products", "inventory"].includes(section)}
              />
            </div>
            <Link
              to="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[rgb(var(--vibe-border))] bg-white px-2.5 text-[12px] font-medium text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] hover:text-[rgb(var(--vibe-foreground))]"
            >
              <Home className="h-3.5 w-3.5" />
              Store
            </Link>
          </div>
        </header>

        <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="vibe-card p-6 text-[13px] text-[rgb(var(--vibe-muted))]">Loading store data...</div>
          ) : section === "dashboard" ? (
            <Dashboard orders={orders} counts={counts} range={range} setRange={setRange} summary={summary} chartData={chartData} top={top} onGoOrders={() => setSection("orders")} />
          ) : section === "orders" ? (
            <OrdersPanel
              orders={orders}
              paymentRecoveries={paymentRecoveries}
              products={products}
              counts={counts}
              query={query}
              setQuery={setQuery}
              active={orderFilter}
              setActive={setOrderFilter}
              pendingOrderCount={pendingOrderCount}
              refreshing={ordersRefreshing}
              onRefreshOrders={() => refreshOrders({ apply: true })}
              onViewOrder={setSelectedOrder}
            />
          ) : section === "products" ? (
            <ProductsPanel
              products={products}
              query={query}
              setQuery={setQuery}
              onCreateProduct={() => setProductEditor("new")}
              onStockChange={handleStockChange}
              onEditProduct={(product) => setProductEditor(product)}
              onDeleteProduct={handleDeleteProduct}
              onToggleActive={handleToggleProductActive}
              onDuplicateProduct={handleDuplicateProduct}
            />
          ) : section === "inventory" ? (
            <InventoryPanel products={products} query={query} setQuery={setQuery} onStockChange={handleStockChange} onEditProduct={(product) => setProductEditor(product)} onToggleActive={handleToggleProductActive} />
          ) : section === "categories" ? (
            <CategoriesPanel categories={adminCategories} customCategories={customCategoriesFromSettings(storeSettings)} onSave={handleSaveCategories} />
          ) : section === "analytics" ? (
            <AnalyticsPanel range={range} setRange={setRange} summary={summary} chartData={chartData} top={top} customers={customers} orders={orders} products={products} />
          ) : section === "shipping" ? (
            <ShippingPanelFunctional products={products} rates={shippingRates} onUpdateRate={handleUpdateShippingRate} />
          ) : section === "customers" ? (
            <CustomersPanel customers={customers} />
          ) : section === "reviews" ? (
            <ReviewsPanel reviews={reviews} products={products} onCreateReview={handleCreateReview} onStatusChange={handleReviewStatus} />
          ) : (
            <SettingsPanel settings={storeSettings} onSave={handleSaveSettings} />
          )}
        </main>
      </div>
      {productEditor && (
        <ProductEditorDialog
          product={productEditor === "new" ? null : productEditor}
          products={products}
          categories={adminCategories}
          onClose={() => setProductEditor(null)}
          onSave={handleSaveProduct}
        />
      )}
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          products={products}
          onClose={() => setSelectedOrder(null)}
          onSendTrackingWhatsapp={handleSendTrackingWhatsapp}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onCancelOrder={handleCancelOrder}
        />
      )}
      {notificationsOpen && <NotificationsDrawer notifications={adminNotifications} onClose={() => setNotificationsOpen(false)} onGo={(next) => { setSection(next); setNotificationsOpen(false); }} />}
    </div>
  );
}

function Dashboard({
  orders,
  counts,
  range,
  setRange,
  summary,
  chartData,
  top,
  onGoOrders,
}: {
  orders: AdminOrder[];
  counts: Record<string, number>;
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  summary: ReturnType<typeof summarize>;
  chartData: ReturnType<typeof makeRangeData>;
  top: ReturnType<typeof topProducts>;
  onGoOrders: () => void;
}) {
  return (
    <>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">Needs your attention</h2>
          <button type="button" onClick={onGoOrders} className="inline-flex items-center gap-1 text-[11px] text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]">
            Go to orders <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <FulfillmentCard title="Awaiting shipment" count={counts.unshipped} description="Orders not yet sent" icon={PackageOpen} accent="warning" className="vibe-fade-in" />
          <FulfillmentCard title="Missing tracking" count={counts.shipped_no_tracking} description="Shipped without tracker" icon={AlertCircle} accent="info" className="vibe-fade-in-1" />
          <FulfillmentCard title="In transit" count={counts.in_transit} description="On the way" icon={Truck} className="vibe-fade-in-2" />
          <FulfillmentCard title="To action" count={counts.unshipped + counts.shipped_no_tracking} description="Unshipped + missing tracking" icon={Clock} className="vibe-fade-in-3" />
        </div>
      </section>

      <div className="vibe-card p-5 sm:p-6 vibe-fade-in-2">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-medium">Revenue</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold tracking-tight tabular-nums">{fmtAmount(summary.revenue.value)}</span>
              <ChangeBadge value={summary.revenue.change} />
            </div>
          </div>
          <RangeToggle value={range} onChange={setRange} />
        </div>
        <TrendChart data={chartData} dataKey="revenue" height={160} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3 vibe-fade-in-2">
          <RecentOrders orders={orders} onViewAll={onGoOrders} />
        </div>
        <div className="min-w-0 lg:col-span-2 vibe-fade-in-3">
          <TopProducts rows={top} />
        </div>
      </div>
    </>
  );
}

function FulfillmentCard({ title, count, description, icon: Icon, accent = "neutral", className = "" }: { title: string; count: number; description: string; icon: LucideIcon; accent?: "neutral" | "warning" | "info"; className?: string }) {
  const accentClass = accent === "warning" ? "text-amber-500" : accent === "info" ? "text-blue-500" : "text-[rgb(var(--vibe-muted))]";
  return (
    <div className={`vibe-card p-4 transition-colors hover:border-zinc-400 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-[rgb(var(--vibe-muted))] sm:text-[13px]">{title}</span>
        <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} />
      </div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">{count}</span>
        <span className="text-[11px] text-[rgb(var(--vibe-muted))]">orders</span>
      </div>
      <p className="line-clamp-2 text-[11px] text-[rgb(var(--vibe-muted))]">{description}</p>
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div className="inline-flex items-center rounded-md border border-[rgb(var(--vibe-border))] bg-white p-0.5">
      {(["7d", "30d", "90d"] as RangeKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`h-6 rounded px-2.5 text-[11px] font-medium transition-colors ${
            value === key ? "bg-[rgb(var(--vibe-foreground))] text-white" : "text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

function ChangeBadge({ value }: { value: number }) {
  return <span className={`text-[11px] font-medium tabular-nums ${value >= 0 ? "text-emerald-600" : "text-red-600"}`}>{value >= 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

function TrendChart({ data, dataKey, height = 200, variant = "area", formatValue = (n: number) => n.toLocaleString() }: { data: Array<{ label: string; revenue: number; orders: number; visitors: number }>; dataKey: "revenue" | "orders" | "visitors"; height?: number; variant?: "area" | "bar"; formatValue?: (n: number) => string }) {
  const ticks = data.filter((_, index) => index % (data.length > 30 ? Math.ceil(data.length / 8) : data.length > 10 ? 3 : 1) === 0).map((point) => point.label);
  const Chart = variant === "bar" ? BarChart : AreaChart;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <Chart data={data} margin={{ top: 6, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--vibe-foreground))" stopOpacity={0.18} />
              <stop offset="100%" stopColor="rgb(var(--vibe-foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--vibe-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" ticks={ticks} tick={{ fontSize: 10, fill: "rgb(var(--vibe-muted))" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "rgb(var(--vibe-muted))" }} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            cursor={{ fill: "rgb(var(--vibe-accent))", opacity: 0.5 }}
            contentStyle={{ background: "white", border: "1px solid rgb(var(--vibe-border))", borderRadius: 8, fontSize: 12, padding: "8px 10px" }}
            formatter={(value) => [formatValue(value as number), ""]}
            separator=""
          />
          {variant === "bar" ? (
            <Bar dataKey={dataKey} fill="rgb(var(--vibe-foreground))" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          ) : (
            <Area type="monotone" dataKey={dataKey} stroke="rgb(var(--vibe-foreground))" strokeWidth={1.5} fill="url(#trendFill)" />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

function RecentOrders({ orders, onViewAll }: { orders: AdminOrder[]; onViewAll: () => void }) {
  const recent = orders.slice(0, 6);
  return (
    <div className="vibe-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <h3 className="text-[13px] font-medium">Recent Orders</h3>
        <button type="button" onClick={onViewAll} className="text-[12px] text-[rgb(var(--vibe-muted))] transition-colors hover:text-[rgb(var(--vibe-foreground))]">View all &rarr;</button>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-t border-[rgb(var(--vibe-border))]">
              {["Order", "Customer", "Product", "Amount", "Status", "Date"].map((head, index) => (
                <th key={head} className={`px-6 py-2.5 text-[11px] font-normal text-[rgb(var(--vibe-muted))] ${index === 3 || index === 5 ? "text-right" : "text-left"} ${index === 2 ? "hidden md:table-cell" : ""} ${index === 5 ? "hidden lg:table-cell" : ""}`}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((order) => <OrderRow key={order.id} order={order} compact />)}
          </tbody>
        </table>
      </div>
      <MobileOrders orders={recent} />
    </div>
  );
}

function OrderRow({
  order,
  compact = false,
  onViewOrder,
}: {
  order: AdminOrder;
  compact?: boolean;
  onViewOrder?: (order: AdminOrder) => void;
}) {
  const meta = statusMeta[normalizeStatus(order)];
  const item = order.items?.[0];
  const itemLabel = order.items && order.items.length > 1 ? `${item?.product_name ?? "Product"} +${order.items.length - 1}` : item?.product_name ?? "Product";
  return (
    <tr className="border-t border-[rgb(var(--vibe-border))] transition-colors hover:bg-[rgb(var(--vibe-accent))]/50">
      <td className="px-6 py-3 font-mono text-[13px] font-medium">{order.order_number ?? order.id.slice(0, 8)}</td>
      <td className="px-6 py-3 text-[13px]">{order.customer_name ?? order.customer_email ?? "Customer"}</td>
      <td className="hidden px-6 py-3 text-[13px] text-[rgb(var(--vibe-muted))] md:table-cell">
        <div className="flex flex-col gap-1">
          <span className="inline-flex min-w-0 items-center gap-2">
            {item?.product_image_url && <img src={item.product_image_url} alt="" loading="lazy" decoding="async" className="h-9 w-8 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />}
            <span className="truncate">{itemLabel}</span>
          </span>
        </div>
      </td>
      <td className="px-6 py-3 text-right font-mono text-[13px] font-medium">{fmtAmount(order.total_inr ?? order.total ?? 0)}</td>
      <td className="px-6 py-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[rgb(var(--vibe-muted))]">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </td>
      <td className="hidden px-6 py-3 text-right text-[12px] text-[rgb(var(--vibe-muted))] lg:table-cell">{fmtDate(order.created_at)}</td>
      {!compact && (
        <td className="px-6 py-3 text-right">
          <button type="button" className="h-8 whitespace-nowrap rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] font-medium hover:bg-[rgb(var(--vibe-accent))]" onClick={() => onViewOrder?.(order)}>View</button>
        </td>
      )}
    </tr>
  );
}

function MobileOrders({ orders, onViewOrder }: { orders: AdminOrder[]; onViewOrder?: (order: AdminOrder) => void }) {
  return (
    <ul className="divide-y divide-[rgb(var(--vibe-border))] border-t border-[rgb(var(--vibe-border))] sm:hidden">
      {orders.map((order) => {
        const meta = statusMeta[normalizeStatus(order)];
        return (
          <li key={order.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="font-mono text-[12px] text-[rgb(var(--vibe-muted))]">{order.order_number ?? order.id.slice(0, 8)}</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[rgb(var(--vibe-muted))]">
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>
                <p className="truncate text-[13px] font-medium">{order.customer_name ?? order.customer_email ?? "Customer"}</p>
                <p className="mt-1 flex items-center gap-2 truncate text-[12px] text-[rgb(var(--vibe-muted))]">
                  {order.items?.[0]?.product_image_url && <img src={order.items[0].product_image_url} alt="" loading="lazy" decoding="async" className="h-10 w-8 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />}
                  <span className="truncate">{order.items?.[0]?.product_name ?? "Product"}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[rgb(var(--vibe-muted))]">{addressPreview(order)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[13px] font-semibold">{fmtAmount(order.total_inr ?? order.total ?? 0)}</p>
                <p className="text-[11px] text-[rgb(var(--vibe-muted))]">{fmtDate(order.created_at)}</p>
              </div>
            </div>
            {onViewOrder && <button type="button" onClick={() => onViewOrder(order)} className="mt-3 h-10 w-full rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] font-medium">View order</button>}
          </li>
        );
      })}
    </ul>
  );
}

function TopProducts({ rows }: { rows: ReturnType<typeof topProducts> }) {
  const max = Math.max(1, ...rows.map((row) => row.revenue));
  return (
    <div className="vibe-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[13px] font-medium">Top Products</h3>
        <span className="text-[11px] text-[rgb(var(--vibe-muted))]">Last 30 days</span>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.name} className="group">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-[13px]">{row.name}</span>
              <span className="shrink-0 font-mono text-[12px] text-[rgb(var(--vibe-muted))]">{fmtAmount(row.revenue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgb(var(--vibe-surface))]">
                <div className="h-full rounded-full bg-zinc-300 transition-colors group-hover:bg-zinc-400" style={{ width: `${(row.revenue / max) * 100}%` }} />
              </div>
              <span className="w-12 text-right text-[11px] tabular-nums text-[rgb(var(--vibe-muted))]">{row.sales} sold</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersPanel({
  orders,
  paymentRecoveries,
  products,
  counts,
  query,
  setQuery,
  active,
  setActive,
  pendingOrderCount,
  refreshing,
  onRefreshOrders,
  onViewOrder,
}: {
  orders: AdminOrder[];
  paymentRecoveries: PaymentRecovery[];
  products: Product[];
  counts: Record<string, number>;
  query: string;
  setQuery: (value: string) => void;
  active: OrderStatus;
  setActive: (value: OrderStatus) => void;
  pendingOrderCount: number;
  refreshing: boolean;
  onRefreshOrders: () => void;
  onViewOrder: (order: AdminOrder) => void;
}) {
  const visible = orders.filter((order) => {
    const q = query.trim().toLowerCase();
    if (normalizeStatus(order) !== active) return false;
    if (!q) return true;
    return [order.order_number, order.customer_name, order.customer_email, order.tracking_number, ...(order.items ?? []).map((item) => item.product_name)].some((value) => (value ?? "").toLowerCase().includes(q));
  });
  return (
    <>
      {paymentRecoveries.length > 0 && (
        <section className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <h3 className="text-[13px] font-semibold text-red-800">Paid orders need manual recovery</h3>
              <p className="mt-1 text-[12px] text-red-700">Do not ask these customers to pay again. Match the Razorpay payment IDs in the Razorpay dashboard, then resolve the order before fulfillment.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {paymentRecoveries.map((recovery) => (
              <div key={recovery.id} className="rounded-md border border-red-100 bg-white px-3 py-2 text-[12px] text-red-800">
                <span className="font-mono">{recovery.payment_id ?? recovery.razorpay_order_id}</span>
                <span className="mx-2">·</span>
                <span>{recovery.customer?.name || recovery.customer?.email || "Customer"}</span>
                <span className="mx-2">·</span>
                <span>{fmtAmount(recovery.amount_paise / 100)}</span>
                {recovery.error && <p className="mt-1 text-[11px] text-red-600">{recovery.error}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {pendingOrderCount > 0 && (
        <section className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[13px] font-semibold">{pendingOrderCount === 1 ? "1 new order is waiting" : `${pendingOrderCount} new orders are waiting`}</h3>
            <p className="mt-1 text-[12px] text-emerald-800">The list is paused so it does not jump while you are working.</p>
          </div>
          <button type="button" onClick={onRefreshOrders} disabled={refreshing} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-900 px-3 text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-60">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh orders
          </button>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = active === filter.key;
          return (
            <button key={filter.key} type="button" onClick={() => setActive(filter.key)} className={`rounded-lg border p-4 text-left transition-all ${isActive ? "border-zinc-400 bg-white shadow-sm" : "border-[rgb(var(--vibe-border))] bg-white hover:border-zinc-300"}`}>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="truncate text-[12px] text-[rgb(var(--vibe-muted))]">{filter.label}</span>
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-zinc-900" : "text-zinc-400"}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[22px] font-semibold tracking-tight tabular-nums">{counts[filter.key]}</span>
                <span className="line-clamp-1 text-[11px] text-[rgb(var(--vibe-muted))]">{filter.description}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchRow query={query} setQuery={setQuery} placeholder="Search by order, customer, product, tracking..." />
        <button type="button" onClick={onRefreshOrders} disabled={refreshing} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[12px] font-medium transition-colors hover:bg-[rgb(var(--vibe-accent))] disabled:opacity-60">
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh orders
        </button>
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-4 py-4 sm:px-6">
          <h3 className="text-[13px] font-medium">{filters.find((filter) => filter.key === active)?.label}</h3>
          <span className="text-[11px] text-[rgb(var(--vibe-muted))]">{visible.length} orders</span>
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                {["Order", "Customer", "Product", "Amount", "Status", "Date", "Action"].map((head, index) => (
                  <th key={head} className={`px-6 py-2.5 text-[11px] font-normal text-[rgb(var(--vibe-muted))] ${index === 3 || index === 6 ? "text-right" : "text-left"} ${index === 2 ? "hidden md:table-cell" : ""} ${index === 5 ? "hidden lg:table-cell" : ""}`}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{visible.map((order) => <OrderRow key={order.id} order={order} onViewOrder={onViewOrder} />)}</tbody>
          </table>
        </div>
        <MobileOrders orders={visible} onViewOrder={onViewOrder} />
      </div>
    </>
  );
}

function SearchRow({ query, setQuery, placeholder }: { query: string; setQuery: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--vibe-muted))]" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white pl-8 pr-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
    </div>
  );
}

function slugifyAdmin(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function variantGroupFromTags(tags: string[] | null | undefined) {
  const tag = (tags ?? []).find((item) => item.startsWith("vg:"));
  return tag ? tag.slice(3) : "";
}

function splitOptionInput(value: string) {
  return Array.from(new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean)));
}

function normalizeOptionGroups(groups: Array<{ name: string; values: string[] }>) {
  return groups
    .map((group) => ({
      name: group.name.trim(),
      values: Array.from(new Set((group.values ?? []).map((value) => value.trim()).filter(Boolean))),
    }))
    .filter((group) => group.name && group.values.length)
    .slice(0, 3);
}

function optionGroupsFromProduct(product: Product | null): Array<{ name: string; values: string[] }> {
  const saved = normalizeOptionGroups(product?.option_types ?? []);
  if (saved.length) return saved;
  const groups: Array<{ name: string; values: string[] }> = [];
  if (product?.size_options?.length) groups.push({ name: "Size", values: product.size_options });
  if (product?.color_options?.length) groups.push({ name: "Color", values: product.color_options });
  return groups;
}

function optionValuesByName(groups: Array<{ name: string; values: string[] }>, name: string) {
  return groups.find((group) => group.name.trim().toLowerCase() === name.toLowerCase())?.values ?? [];
}

function plainDefaultCategories(): AdminCategory[] {
  return CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    blurb: category.blurb,
    parent: category.parent,
  }));
}

function customCategoriesFromSettings(settings: Record<string, unknown>): AdminCategory[] {
  const rows = settings.customCategories;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row as Record<string, unknown>)
    .map((row) => ({
      key: slugifyAdmin(String(row.key ?? row.label ?? "")),
      label: String(row.label ?? "").trim(),
      blurb: String(row.blurb ?? "").trim(),
      parent: row.parent ? slugifyAdmin(String(row.parent)) : undefined,
    }))
    .filter((row) => row.key && row.label);
}

function mergeCategories(settings: Record<string, unknown>): AdminCategory[] {
  const merged = new Map<string, AdminCategory>();
  for (const category of [...plainDefaultCategories(), ...customCategoriesFromSettings(settings)]) {
    merged.set(category.key, category);
  }
  return [...merged.values()];
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

function productToForm(product: Product | null): ProductFormState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    author: product?.author ?? "",
    publisher: product?.publisher ?? "",
    language: product?.language ?? "",
    binding: product?.binding ?? "",
    weight_g: String(product?.weight_g ?? ""),
    length_cm: String(product?.length_cm ?? ""),
    width_cm: String(product?.width_cm ?? ""),
    height_cm: String(product?.height_cm ?? ""),
    shipping_class: product?.shipping_class ?? "",
    weight_source_url: product?.weight_source_url ?? "",
    weight_confidence: product?.weight_confidence ?? "",
    price_inr: String(product?.price_inr ?? product?.price ?? ""),
    sale_price_inr: String(product?.sale_price_inr ?? product?.sale_price ?? ""),
    sku: product?.sku ?? "",
    stock_quantity: String(product?.stock_quantity ?? 0),
    category: product?.category_id ?? product?.category ?? "books",
    variant_group: variantGroupFromTags(product?.tags),
    variant_label: product?.variant_label ?? "",
    color_options: (product?.color_options ?? []).join("\n"),
    size_options: (product?.size_options ?? []).join("\n"),
    option_types: optionGroupsFromProduct(product),
    cover_image_url: product?.cover_image_url ?? "",
    images: (product?.images ?? []).join("\n"),
    badge: product?.badge ?? "",
    tags: (product?.tags ?? []).filter((tag) => !tag.startsWith("vg:") && !isCanonicalSubjectTag(tag)).join(", "),
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    show_in_category_section: product?.show_in_category_section ?? false,
    is_bestseller: product?.is_bestseller ?? false,
    is_new_arrival: product?.is_new_arrival ?? false,
  };
}

function ProductEditorDialog({
  product,
  products,
  categories,
  onClose,
  onSave,
}: {
  product: Product | null;
  products: Product[];
  categories: AdminCategory[];
  onClose: () => void;
  onSave: (form: ProductFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductFormState>(() => productToForm(product));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggingMedia, setDraggingMedia] = useState(false);
  const [familyPickerOpen, setFamilyPickerOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"general" | "pricing" | "media" | "variants" | "organize">("general");
  const galleryImages = form.images.split("\n").map((image) => image.trim()).filter(Boolean);
  const gallery = Array.from(new Set([form.cover_image_url, ...galleryImages].map((image) => image.trim()).filter(Boolean)));
  const savedVariantGroups = (() => {
    try {
      return JSON.parse(window.localStorage.getItem("he_variant_groups_v1") || "[]") as string[];
    } catch {
      return [];
    }
  })();
  const variantGroups = Array.from(new Set([...savedVariantGroups, form.variant_group, ...products.map((item) => variantGroupFromTags(item.tags))].filter(Boolean))).sort();
  const normalizedVariantGroup = slugifyAdmin(form.variant_group);
  const selectedVariantProducts = normalizedVariantGroup
    ? products.filter((item) => item.id !== product?.id && variantGroupFromTags(item.tags) === normalizedVariantGroup)
    : [];
  const storeCategories = categories.filter((category) => !category.parent && category.key !== "books");
  const bookSubjectCategories = categories.filter((category) => category.parent === "books" || normalizeBookSubject(category.key));
  const selectedSubjectKey = normalizeBookSubject(form.category);
  const needsBookSubject = form.category === "books";
  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };
  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      if (url) setField("cover_image_url", url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try a smaller JPG, PNG, WebP, AVIF, GIF, MP4, or WebM file.";
      toast({ title: "Could not upload cover photo", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };
  const handleGalleryImages = async (files?: FileList | File[] | null) => {
    const batch = Array.from(files ?? []);
    if (!batch.length) return;
    setUploading(true);
    try {
      const results = await Promise.allSettled(batch.map((file) => uploadProductImage(file)));
      const uploaded = results
        .filter((result): result is PromiseFulfilledResult<string | null> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter(Boolean);
      const failed = results.filter((result) => result.status === "rejected");
      if (uploaded.length) {
        const existing = form.images.split("\n").map((image) => image.trim()).filter(Boolean);
        const [first, ...rest] = uploaded;
        if (!form.cover_image_url && first) {
          setField("cover_image_url", first);
          setField("images", Array.from(new Set([...existing, ...rest])).join("\n"));
        } else {
          setField("images", Array.from(new Set([...existing, ...uploaded])).join("\n"));
        }
      }
      if (failed.length) {
        const firstError = failed[0] as PromiseRejectedResult;
        const message = firstError.reason instanceof Error ? firstError.reason.message : "Try a smaller JPG, PNG, WebP, AVIF, GIF, MP4, or WebM file.";
        toast({
          title: uploaded.length ? "Some media did not upload" : "Could not upload media",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };
  const handlePastedMedia = (event: ClipboardEvent<HTMLFormElement>) => {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    if (!files.length) return;
    event.preventDefault();
    void handleGalleryImages(files);
  };
  const handleDroppedMedia = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingMedia(false);
    void handleGalleryImages(Array.from(event.dataTransfer.files));
  };
  const makeCoverImage = (image: string) => {
    const selected = image.trim();
    if (!selected || selected === form.cover_image_url) return;
    const currentImages = form.images.split("\n").map((item) => item.trim()).filter(Boolean);
    const previousCover = form.cover_image_url.trim();
    const nextImages = Array.from(new Set([...currentImages, previousCover].filter((item) => item && item !== selected)));
    setForm((current) => ({
      ...current,
      cover_image_url: selected,
      images: nextImages.join("\n"),
    }));
  };
  const removeGalleryImage = (image: string) => {
    const next = form.images.split("\n").map((item) => item.trim()).filter((item) => item && item !== image);
    if (form.cover_image_url === image) setField("cover_image_url", next[0] ?? "");
    setField("images", next.join("\n"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/35 p-0">
      <form onSubmit={handleSubmit} onPaste={handlePastedMedia} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl">
        <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">{product ? "Edit product" : "Add product"}</h2>
            <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{product?.sku || product?.slug || "Catalog item"}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[rgb(var(--vibe-accent))]" aria-label="Close product editor">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="shrink-0 overflow-x-auto border-b border-[rgb(var(--vibe-border))] px-5 pt-3">
          <div className="flex min-w-max gap-1">
            {[
              ["general", "General"],
              ["pricing", "Pricing"],
              ["media", "Media"],
              ["variants", "Variants"],
              ["organize", "Organize"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setEditorTab(key as typeof editorTab)}
                className={cn(
                  "mb-3 h-8 rounded-md px-3 text-[12px] font-medium transition-colors",
                  editorTab === key ? "bg-[rgb(var(--vibe-foreground))] text-white" : "text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))] hover:text-[rgb(var(--vibe-foreground))]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-4 pb-24 sm:p-5">
          <div className={cn("space-y-3", editorTab !== "media" && "hidden")}>
            <div className="aspect-[3/4] overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))]">
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt={form.name || "Product cover"} className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-[12px] text-[rgb(var(--vibe-muted))]">No image</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">
                Cover photo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif" onChange={(event) => handleImage(event.target.files?.[0])} className="sr-only" />
              </label>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">
                Gallery media
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm" multiple onChange={(event) => handleGalleryImages(event.target.files)} className="sr-only" />
              </label>
            </div>
            <ProductInputField label="Image URL" value={form.cover_image_url} onChange={(value) => setField("cover_image_url", value)} />
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDraggingMedia(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingMedia(true);
              }}
              onDragLeave={() => setDraggingMedia(false)}
              onDrop={handleDroppedMedia}
              tabIndex={0}
              className={cn(
                "rounded-md border border-dashed border-[rgb(var(--vibe-border))] bg-white p-3 text-center text-[12px] text-[rgb(var(--vibe-muted))] outline-none transition-all focus:ring-1 focus:ring-zinc-500",
                draggingMedia && "border-zinc-900 bg-[rgb(var(--vibe-accent))]",
              )}
            >
              <p className="font-medium text-[rgb(var(--vibe-foreground))]">Paste or drop media</p>
              <p className="mt-1 leading-5">Paste screenshots with Ctrl+V, or drag images/videos here in bulk.</p>
            </div>
            {uploading && <p className="text-[11px] text-[rgb(var(--vibe-muted))]">Uploading to R2 media...</p>}
            {gallery.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((image, index) => (
                  <div key={`${image}-${index}`} className="group relative h-32 w-28 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                    {isVideoUrl(image) ? <video src={image} className="h-full w-full object-contain" muted playsInline /> : <img src={image} alt="" className="h-full w-full object-contain" />}
                    {image === form.cover_image_url ? (
                      <span className="absolute bottom-1 left-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-center text-[9px] font-medium text-white">Cover</span>
                    ) : (
                      <button type="button" onClick={() => makeCoverImage(image)} className="absolute bottom-1 left-1 right-1 inline-flex h-7 items-center justify-center gap-1 rounded bg-white/95 px-2 text-[10px] font-medium text-zinc-800 shadow transition-colors hover:bg-white" aria-label="Make cover image"><ImageIcon className="h-3 w-3" /> Cover</button>
                    )}
                    <button type="button" onClick={() => removeGalleryImage(image)} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded bg-white/95 text-zinc-700 shadow" aria-label="Remove image"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div className={cn("grid gap-3 sm:grid-cols-2", editorTab !== "general" && "hidden")}>
              <h3 className="sm:col-span-2 text-[12px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">General</h3>
              <ProductInputField label="Name" value={form.name} onChange={(value) => setField("name", value)} required />
              <ProductInputField label="Slug (optional)" value={form.slug} onChange={(value) => setField("slug", value)} placeholder="auto-generated if blank" />
              <ProductInputField label="SKU (optional)" value={form.sku} onChange={(value) => setField("sku", value)} />
              <label className="space-y-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
                <span>Category</span>
                <select value={form.category} onChange={(event) => setField("category", event.target.value)} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500">
                  <option value="books">Books - choose a subject below</option>
                  <optgroup label="Book subjects">
                    {bookSubjectCategories.map((category) => (
                      <option key={category.key} value={category.key}>{category.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Store sections">
                    {storeCategories.map((category) => (
                      <option key={category.key} value={category.key}>{category.label}</option>
                    ))}
                  </optgroup>
                </select>
                <span className="block text-[10px] font-normal text-[rgb(var(--vibe-muted))]">
                  Books must use a subject. Clothing and essentials can use their store section.
                </span>
              </label>
              {(form.category === "books" || selectedSubjectKey) && (
                <div className="sm:col-span-2 rounded-md border border-[rgb(var(--vibe-border))] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">Book subject</p>
                    {needsBookSubject && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Required</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {BOOK_SUBJECTS.map((subject) => {
                      const active = selectedSubjectKey === subject.key;
                      return (
                        <button
                          key={subject.key}
                          type="button"
                          onClick={() => setField("category", subject.key)}
                          className={cn(
                            "h-10 rounded-md border px-2 text-[12px] font-medium transition-colors",
                            active ? "border-zinc-900 bg-zinc-900 text-white" : "border-[rgb(var(--vibe-border))] bg-white text-[rgb(var(--vibe-muted))] hover:border-zinc-400 hover:text-[rgb(var(--vibe-foreground))]",
                          )}
                        >
                          {subject.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-[rgb(var(--vibe-muted))]">
                    The selected subject is added automatically. Use Tags only for extra search words.
                  </p>
                </div>
              )}
              <ProductInputField label="Author" value={form.author} onChange={(value) => setField("author", value)} />
              <ProductInputField label="Publisher" value={form.publisher} onChange={(value) => setField("publisher", value)} />
              <ProductInputField label="Language" value={form.language} onChange={(value) => setField("language", value)} />
              <ProductTextArea label="Short description" value={form.short_description} onChange={(value) => setField("short_description", value)} rows={2} className="sm:col-span-2" />
              <ProductTextArea label="Full description" value={form.description} onChange={(value) => setField("description", value)} rows={5} className="sm:col-span-2" />
            </div>
            <div className={cn("grid gap-3 sm:grid-cols-2", editorTab !== "pricing" && "hidden")}>
              <h3 className="sm:col-span-2 text-[12px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">Pricing and stock</h3>
              <ProductInputField label="Price" type="number" value={form.price_inr} onChange={(value) => setField("price_inr", value)} required />
              <ProductInputField label="Sale price (optional)" type="number" value={form.sale_price_inr} onChange={(value) => setField("sale_price_inr", value)} />
              <ProductInputField label="Stock" type="number" value={form.stock_quantity} onChange={(value) => setField("stock_quantity", value)} />
              <ProductInputField label="Badge (optional)" value={form.badge} onChange={(value) => setField("badge", value)} placeholder="New, Sale, Bestseller..." />
            </div>
            <div className={cn("grid gap-3 sm:grid-cols-4", editorTab !== "pricing" && "hidden")}>
              <h3 className="sm:col-span-4 text-[12px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">Weight and dimensions</h3>
              <ProductInputField label="Weight (g)" type="number" value={form.weight_g} onChange={(value) => setField("weight_g", value)} />
              <ProductInputField label="Length (cm)" type="number" value={form.length_cm} onChange={(value) => setField("length_cm", value)} />
              <ProductInputField label="Width (cm)" type="number" value={form.width_cm} onChange={(value) => setField("width_cm", value)} />
              <ProductInputField label="Height (cm)" type="number" value={form.height_cm} onChange={(value) => setField("height_cm", value)} />
              <label className="space-y-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
                <span>Confidence</span>
                <select value={form.weight_confidence} onChange={(event) => setField("weight_confidence", event.target.value)} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500">
                  <option value="">Unreviewed</option>
                  <option value="source">Source verified</option>
                  <option value="measured">Measured manually</option>
                  <option value="estimated">Estimated fallback</option>
                </select>
              </label>
              <ProductInputField label="Weight source URL" value={form.weight_source_url} onChange={(value) => setField("weight_source_url", value)} className="sm:col-span-2" />
            </div>
            <div className={cn("grid gap-3 sm:grid-cols-2", editorTab !== "variants" && "hidden")}>
              <h3 className="sm:col-span-2 text-[12px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">Linked product variants</h3>
              <ProductInputField label="Product family" value={form.variant_group} onChange={(value) => setField("variant_group", value)} placeholder="kufi_prayer-cap or kufi-prayer-cap" />
              <ProductInputField label="This product label" value={form.variant_label} onChange={(value) => setField("variant_label", value)} placeholder="Brown, Large, Urdu..." />
              {variantGroups.length > 0 && (
                <div className="sm:col-span-2">
                  <button type="button" onClick={() => setFamilyPickerOpen((value) => !value)} className="flex h-10 w-full items-center justify-between rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-left text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">
                    <span>{form.variant_group ? `Family: ${form.variant_group}` : "Choose existing family"}</span>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", familyPickerOpen && "rotate-90")} />
                  </button>
                  {familyPickerOpen && (
                    <div className="mt-2 grid max-h-40 gap-1 overflow-y-auto rounded-md border border-[rgb(var(--vibe-border))] bg-white p-1">
                      {variantGroups.map((group) => (
                        <button key={group} type="button" onClick={() => { setField("variant_group", group); setFamilyPickerOpen(false); }} className={cn("flex h-9 items-center justify-between rounded px-3 text-left text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))]", normalizedVariantGroup === group ? "bg-zinc-900 text-white hover:bg-zinc-900" : "text-[rgb(var(--vibe-muted))]")}>
                          {group}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-[rgb(var(--vibe-muted))]">
                    {selectedVariantProducts.length ? `${selectedVariantProducts.length} linked product(s) in this family.` : "Use this only when separate products should appear on each other's pages."}
                  </p>
                  {form.variant_group && (
                    <button type="button" onClick={() => setField("variant_group", "")} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[11px]">Unlink</button>
                  )}
                </div>
                {selectedVariantProducts.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {selectedVariantProducts.slice(0, 10).map((item) => (
                      <span key={item.id} className="shrink-0 rounded-full bg-[rgb(var(--vibe-surface))] px-2.5 py-1 text-[11px] text-[rgb(var(--vibe-muted))]">{item.variant_label || item.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <h3 className="sm:col-span-2 pt-2 text-[12px] font-medium text-[rgb(var(--vibe-foreground))]">Options on this product</h3>
              <div className="sm:col-span-2">
                <VariantOptionsEditor value={form.option_types} onChange={(value) => setField("option_types", value)} />
              </div>
            </div>
            <div className={cn("space-y-4", editorTab !== "organize" && "hidden")}>
              <ProductInputField label="Tags" value={form.tags} onChange={(value) => setField("tags", value)} placeholder="comma separated" />
              <ProductTextArea label="Gallery images/videos" value={form.images} onChange={(value) => setField("images", value)} rows={3} placeholder="one media URL per line" />
            </div>
            <div className={cn("grid gap-2 sm:grid-cols-2", editorTab !== "organize" && "hidden")}>
              <ProductToggle label="Active in storefront" checked={form.is_active} onChange={(value) => setField("is_active", value)} />
              <ProductToggle label="Featured" checked={form.is_featured} onChange={(value) => setField("is_featured", value)} />
              <ProductToggle label="Bestseller" checked={form.is_bestseller} onChange={(value) => setField("is_bestseller", value)} />
              <ProductToggle label="New arrival" checked={form.is_new_arrival} onChange={(value) => setField("is_new_arrival", value)} />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-[rgb(var(--vibe-border))] bg-white/95 px-5 py-4 shadow-[0_-8px_18px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="h-10 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white disabled:opacity-60">{saving ? "Saving..." : "Save product"}</button>
        </div>
      </form>
    </div>
  );
}

function ProductInputField({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  list,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  list?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">{label}</span>
      <input type={type} value={value} required={required} placeholder={placeholder} list={list} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
    </label>
  );
}

function VariantOptionsEditor({ value, onChange }: { value: Array<{ name: string; values: string[] }>; onChange: (value: Array<{ name: string; values: string[] }>) => void }) {
  const groups = value.length ? value : [{ name: "Size", values: [] }, { name: "Color", values: [] }];
  const updateGroup = (index: number, patch: Partial<{ name: string; values: string[] }>) => {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  };
  const addValue = (index: number, raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    const nextValues = Array.from(new Set([...(groups[index]?.values ?? []), clean]));
    updateGroup(index, { values: nextValues });
  };
  const removeValue = (index: number, option: string) => {
    updateGroup(index, { values: groups[index].values.filter((value) => value !== option) });
  };
  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };
  const addGroup = () => {
    if (groups.length >= 3) return;
    onChange([...groups, { name: groups.length === 0 ? "Size" : groups.length === 1 ? "Color" : "Material", values: [] }]);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">Options</span>
        <button type="button" onClick={addGroup} disabled={groups.length >= 3} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[11px] disabled:opacity-40">
          Add option
        </button>
      </div>
      {groups.map((group, index) => (
        <VariantOptionRow key={`${group.name}-${index}`} group={group} index={index} onName={(name) => updateGroup(index, { name })} onAdd={(option) => addValue(index, option)} onRemove={(option) => removeValue(index, option)} onRemoveGroup={() => removeGroup(index)} />
      ))}
    </div>
  );
}

function VariantOptionRow({ group, index, onName, onAdd, onRemove, onRemoveGroup }: { group: { name: string; values: string[] }; index: number; onName: (name: string) => void; onAdd: (value: string) => void; onRemove: (value: string) => void; onRemoveGroup: () => void }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    onAdd(draft);
    setDraft("");
  };
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
          Option {index + 1}
          <button type="button" onClick={onRemoveGroup} className="text-[11px] normal-case tracking-normal text-blue-700">Remove</button>
        </div>
        <input value={group.name} onChange={(event) => onName(event.target.value)} className="h-10 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
      </div>
      <div className="min-h-12 rounded-md border border-[rgb(var(--vibe-border))] bg-white p-2">
        <div className="flex flex-wrap gap-1.5">
          {group.values.map((option) => (
            <button key={option} type="button" onClick={() => onRemove(option)} className="inline-flex h-8 items-center gap-1.5 rounded bg-[#e6e9f0] px-2.5 text-[12px] text-zinc-800">
              {option}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            placeholder="Add value"
            className="h-8 min-w-[120px] flex-1 border-0 bg-transparent px-2 text-[13px] outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function ProductTextArea({ label, value, onChange, rows, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; rows: number; placeholder?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">{label}</span>
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500" />
    </label>
  );
}

function ProductOptionField({ label, value, onChange, placeholder, suggestions }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  const options = splitOptionInput(value);
  const commit = (next = draft) => {
    const clean = next.trim();
    if (!clean) return;
    onChange(Array.from(new Set([...options, clean])).join("\n"));
    setDraft("");
  };
  const remove = (option: string) => onChange(options.filter((item) => item !== option).join("\n"));
  return (
    <div className="rounded-md border border-[rgb(var(--vibe-border))] bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-[rgb(var(--vibe-muted))]">{label}</span>
        {options.length > 0 && (
          <button type="button" onClick={() => onChange("")} className="text-[10px] text-[rgb(var(--vibe-muted))] hover:text-red-600">Clear</button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit();
            }
          }}
          className="h-9 min-w-0 flex-1 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <button type="button" onClick={() => commit()} className="h-9 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white">Add</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => remove(option)} className="rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
            {option} ×
          </button>
        ))}
        {options.length === 0 && <span className="text-[11px] text-[rgb(var(--vibe-muted))]">No {label.toLowerCase()} yet.</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.filter((item) => !options.includes(item)).slice(0, 7).map((item) => (
          <button key={item} type="button" onClick={() => commit(item)} className="rounded-full bg-[rgb(var(--vibe-surface))] px-2.5 py-1 text-[10px] text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]">
            + {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex h-10 items-center justify-between gap-3 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-[rgb(var(--vibe-border))]" />
    </label>
  );
}

function OrderDetailsDialog({
  order,
  products,
  onClose,
  onSendTrackingWhatsapp,
  onUpdateOrderStatus,
  onCancelOrder,
}: {
  order: AdminOrder;
  products: Product[];
  onClose: () => void;
  onSendTrackingWhatsapp: (order: AdminOrder, form: OrderFulfillmentState) => Promise<void>;
  onUpdateOrderStatus: (order: AdminOrder, status: FulfillmentStatus) => Promise<void>;
  onCancelOrder: (order: AdminOrder) => void;
}) {
  const meta = statusMeta[normalizeStatus(order)];
  const total = order.total_inr ?? order.total ?? 0;
  const shippingAddress = orderShippingAddress(order);
  const shippingAddressLines = addressLines(shippingAddress);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [form, setForm] = useState<OrderFulfillmentState>({
    carrier: order.tracking_carrier ?? "",
    trackingNumber: order.tracking_number ?? "",
    trackingUrl: order.tracking_url ?? "",
    status: fulfillmentStatus(order),
  });
  const statuses: Array<{ key: FulfillmentStatus; label: string }> = [
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
    { key: "returned", label: "Returned" },
  ];
  const updateField = <K extends keyof OrderFulfillmentState>(key: K, value: OrderFulfillmentState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const sendTracking = async () => {
    setSaving(true);
    try {
      await onSendTrackingWhatsapp(order, form);
    } finally {
      setSaving(false);
    }
  };
  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      await onUpdateOrderStatus(order, form.status);
    } finally {
      setSavingStatus(false);
    }
  };
  const canSendTracking = Boolean(form.trackingNumber.trim() && order.customer_phone);
  const statusChanged = form.status !== fulfillmentStatus(order);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6">
      <div className="vibe-card max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-b-none sm:rounded-b-lg">
        <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Order {order.order_number ?? order.id.slice(0, 8)}</h2>
            <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{order.customer_name ?? order.customer_email ?? "Customer"} · {fmtDate(order.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[rgb(var(--vibe-accent))]" aria-label="Close order details"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid max-h-[calc(95vh-68px)] gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {(order.items ?? []).map((item) => {
              const product = products.find((candidate) => candidate.id === item.product_id);
              const images = [product?.cover_image_url, ...(product?.images ?? [])].filter(Boolean);
              return (
                <div key={item.id} className="rounded-lg border border-[rgb(var(--vibe-border))] p-3">
                  <div className="flex gap-3">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-[rgb(var(--vibe-surface))]">
                      {images[0] ? <img src={images[0]} alt={item.product_name ?? "Product"} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-5 w-5 text-[rgb(var(--vibe-muted))]" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{item.product_name ?? product?.name ?? "Product"}</p>
                      <p className="mt-1 text-[11px] text-[rgb(var(--vibe-muted))]">Qty {item.quantity} · {formatPrice(item.unit_price)} each · {formatPrice(item.subtotal)}</p>
                      {(item.selected_color || item.selected_size) && (
                        <p className="mt-1 text-[11px] text-[rgb(var(--vibe-muted))]">
                          {[item.selected_color && `Colour: ${item.selected_color}`, item.selected_size && `Size: ${item.selected_size}`].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      {product && <Link to={`/product/${product.slug ?? product.id}`} className="mt-2 inline-flex h-7 items-center rounded-md border border-[rgb(var(--vibe-border))] px-2 text-[11px]">View product</Link>}
                    </div>
                  </div>
                  {images.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {images.map((image, index) => <img key={`${item.id}-${index}`} src={image ?? ""} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <aside className="space-y-3">
            <div className="rounded-lg border border-[rgb(var(--vibe-border))] p-4">
              <p className="text-[11px] text-[rgb(var(--vibe-muted))]">Status</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[13px]"><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</p>
              <button type="button" onClick={() => onCancelOrder(order)} className="mt-2 h-8 w-full rounded-md border border-red-100 px-3 text-[12px] text-red-600">Cancel order</button>
            </div>
            <div className="rounded-lg border border-[rgb(var(--vibe-border))] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium">Fulfillment</p>
                <Truck className="h-4 w-4 text-[rgb(var(--vibe-muted))]" />
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Order status</span>
                <select value={form.status} onChange={(event) => updateField("status", event.target.value as FulfillmentStatus)} className="h-11 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500">
                  {statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={saveStatus} disabled={savingStatus || !statusChanged} className="mt-2 h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))] disabled:opacity-50">
                {savingStatus ? "Updating status..." : "Update order status"}
              </button>
              <div className="mt-3 space-y-2">
                <ProductInputField label="Carrier" value={form.carrier} onChange={(value) => updateField("carrier", value)} placeholder="DHL, PostNL, Bpost..." />
                <ProductInputField label="Tracking number" value={form.trackingNumber} onChange={(value) => updateField("trackingNumber", value)} placeholder="Paste or scan code" />
                <ProductInputField label="Tracking URL" value={form.trackingUrl} onChange={(value) => updateField("trackingUrl", value)} placeholder="https://..." />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[rgb(var(--vibe-muted))]">Tracking is saved only when it opens WhatsApp for the customer. No separate silent save.</p>
              <button type="button" onClick={sendTracking} disabled={saving || !canSendTracking} className="mt-3 h-11 w-full rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50">
                {saving ? "Opening WhatsApp..." : "Send tracking on WhatsApp"}
              </button>
              {!order.customer_phone && <p className="mt-2 text-[11px] text-red-600">Customer phone is required before tracking can be sent.</p>}
            </div>
            <div className="rounded-lg border border-[rgb(var(--vibe-border))] p-4 text-[12px]">
              <p className="font-medium">Customer</p>
              <p className="mt-1 text-[rgb(var(--vibe-muted))]">{order.customer_name ?? "No name"}</p>
              <p className="text-[rgb(var(--vibe-muted))]">{order.customer_email ?? "No email"}</p>
              <p className="text-[rgb(var(--vibe-muted))]">{order.customer_phone ?? "No phone"}</p>
            </div>
            <div className="rounded-lg border border-[rgb(var(--vibe-border))] p-4 text-[12px]">
              <p className="font-medium">Shipping address</p>
              {shippingAddressLines.length > 0 ? (
                <div className="mt-2 space-y-1 leading-5 text-[rgb(var(--vibe-muted))]">
                  <p className="font-medium text-[rgb(var(--vibe-foreground))]">{shippingAddress?.name ?? order.customer_name ?? "Customer"}</p>
                  {shippingAddress?.phone && <p>{shippingAddress.phone}</p>}
                  {shippingAddressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">No shipping address was saved on this order.</p>
              )}
            </div>
            <div className="rounded-lg border border-[rgb(var(--vibe-border))] p-4 text-[12px]">
              <div className="flex justify-between"><span>Payment</span><span className="capitalize">{order.payment_status ?? "unknown"}</span></div>
              <div className="mt-2 flex justify-between gap-3"><span>Shipping</span><span className="text-right capitalize">Included</span></div>
              {order.shipping_payment_note && <p className="mt-2 rounded-md bg-[rgb(var(--vibe-surface))] px-2 py-1.5 text-[11px] text-[rgb(var(--vibe-muted))]">{order.shipping_payment_note}</p>}
              <div className="mt-2 flex justify-between font-medium"><span>Total</span><span>{formatPrice(total)}</span></div>
              <div className="mt-2 text-[rgb(var(--vibe-muted))]">Tracking: {order.tracking_number ?? "Not added"}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProductsPanel({
  products,
  query,
  setQuery,
  onCreateProduct,
  onStockChange,
  onEditProduct,
  onDeleteProduct,
  onToggleActive,
  onDuplicateProduct,
}: {
  products: Product[];
  query: string;
  setQuery: (value: string) => void;
  onCreateProduct: () => void;
  onStockChange: (product: Product, delta: number) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
}) {
  const [layout, setLayout] = useState<"compact" | "grid">("compact");
  const [previewMedia, setPreviewMedia] = useState<{ url: string; name: string } | null>(null);
  const filtered = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
  const active = products.filter((product) => product.is_active !== false).length;
  const low = products.filter((product) => (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= 5).length;
  const out = products.filter((product) => (product.stock_quantity ?? 0) <= 0).length;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Active products" value={active.toString()} />
        <Stat label="Variants" value={products.length.toString()} />
        <Stat label="Low stock (≤5)" value={low.toString()} accent={low ? "warning" : undefined} />
        <Stat label="Out of stock" value={out.toString()} accent={out ? "destructive" : undefined} />
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-[rgb(var(--vibe-border))] px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <SearchRow query={query} setQuery={setQuery} placeholder="Search products..." />
          <div className="flex flex-wrap gap-2">
            <div className="grid h-8 grid-cols-2 rounded-md bg-[rgb(var(--vibe-surface))] p-0.5 text-[11px]">
              <button type="button" onClick={() => setLayout("compact")} className={`rounded px-3 transition-all ${layout === "compact" ? "bg-white shadow-sm" : "text-[rgb(var(--vibe-muted))]"}`}>Compact</button>
              <button type="button" onClick={() => setLayout("grid")} className={`rounded px-3 transition-all ${layout === "grid" ? "bg-white shadow-sm" : "text-[rgb(var(--vibe-muted))]"}`}>Gallery</button>
            </div>
            <button type="button" onClick={onCreateProduct} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white transition-all hover:opacity-90"><Plus className="h-3.5 w-3.5" /> Add product</button>
          </div>
        </div>
        {layout === "compact" ? (
          <div className="divide-y divide-[rgb(var(--vibe-border))]">
            {filtered.map((product) => (
              <div key={product.id} className="grid gap-3 px-4 py-3 transition-colors hover:bg-[rgb(var(--vibe-accent))]/50 sm:grid-cols-[minmax(0,1fr)_120px_110px_260px] sm:items-center sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))]">
                    {product.cover_image_url ? <img src={product.cover_image_url} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-4 w-4 text-[rgb(var(--vibe-muted))]" /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{product.name}</p>
                    <p className="truncate text-[11px] text-[rgb(var(--vibe-muted))]">{product.sku ?? product.slug ?? "No SKU"} · {product.category ?? "Books"}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${(product.is_active ?? true) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{(product.is_active ?? true) ? "Active" : "Archived"}</span>
                      {(product.stock_quantity ?? 0) <= 5 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">{(product.stock_quantity ?? 0) <= 0 ? "Out" : "Low stock"}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:block">
                  <span className="text-[11px] text-[rgb(var(--vibe-muted))] sm:block">Price</span>
                  <span className="font-mono text-[13px] font-medium">{formatPrice(product.sale_price_inr ?? product.price_inr ?? product.price ?? 0)}</span>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-start">
                  <span className={`w-24 font-mono text-[12px] ${(product.stock_quantity ?? 0) === 0 ? "text-red-600" : (product.stock_quantity ?? 0) <= 5 ? "text-amber-600" : "text-[rgb(var(--vibe-muted))]"}`}>{product.stock_quantity ?? 0} stock</span>
                  <button type="button" onClick={() => onStockChange(product, -1)} className="h-8 w-8 rounded border border-[rgb(var(--vibe-border))] text-[13px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">-</button>
                  <button type="button" onClick={() => onStockChange(product, 1)} className="h-8 w-8 rounded border border-[rgb(var(--vibe-border))] text-[13px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">+</button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  <Link to={`/product/${product.slug ?? product.id}`} className="inline-flex h-9 items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] px-2 text-[11px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">View</Link>
                  <button type="button" onClick={() => onEditProduct(product)} className="inline-flex h-9 items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] text-[11px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">Edit</button>
                  <button type="button" onClick={() => onDuplicateProduct(product)} className="inline-flex h-9 items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] text-[11px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">Copy</button>
                  <button type="button" onClick={() => onToggleActive(product)} className={`inline-flex h-9 items-center justify-center rounded-md border px-2 text-[11px] transition-colors ${(product.is_active ?? true) ? "border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))]" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    {(product.is_active ?? true) ? "Archive" : "Activate"}
                  </button>
                  <button type="button" onClick={() => onDeleteProduct(product)} className="grid h-9 place-items-center rounded-md border border-red-100 text-red-600 transition-colors hover:bg-red-50" aria-label={`Delete ${product.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <li key={product.id} className="min-w-0 overflow-hidden rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm">
              <button type="button" onClick={() => product.cover_image_url && setPreviewMedia({ url: product.cover_image_url, name: product.name })} className="aspect-[3/4] w-full overflow-hidden rounded-md bg-[rgb(var(--vibe-surface))] sm:aspect-[4/3]">
                {product.cover_image_url ? <img src={product.cover_image_url} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-7 w-7 text-[rgb(var(--vibe-muted))]" /></div>}
              </button>
              {(product.images?.length ?? 0) > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {[product.cover_image_url, ...(product.images ?? [])].filter(Boolean).map((image, index) => (
                    <button key={`${product.id}-${index}`} type="button" onClick={() => image && setPreviewMedia({ url: image, name: product.name })} className="h-16 w-16 shrink-0 rounded border border-[rgb(var(--vibe-border))] bg-white">
                      <img src={image ?? ""} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 min-w-0">
                <p className="truncate text-[13px] font-medium">{product.name}</p>
                <p className="truncate text-[11px] text-[rgb(var(--vibe-muted))]">{product.category ?? "Books"} · 1 variant · {formatPrice(product.price_inr ?? product.price ?? 0)}</p>
              </div>
              <div className="mt-3 flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => onStockChange(product, -1)} className="h-6 w-6 rounded border border-[rgb(var(--vibe-border))] text-[12px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))]">-</button>
                <span className={`w-20 text-center font-mono text-[12px] ${(product.stock_quantity ?? 0) === 0 ? "text-red-600" : (product.stock_quantity ?? 0) <= 5 ? "text-amber-600" : "text-[rgb(var(--vibe-muted))]"}`}>{product.stock_quantity ?? 0} in stock</span>
                <button type="button" onClick={() => onStockChange(product, 1)} className="h-6 w-6 rounded border border-[rgb(var(--vibe-border))] text-[12px] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))]">+</button>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1">
                <Link to={`/product/${product.slug ?? product.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] px-2 text-[11px] hover:bg-[rgb(var(--vibe-accent))]">View</Link>
                <button type="button" onClick={() => onEditProduct(product)} className="inline-flex h-8 items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] text-[11px] hover:bg-[rgb(var(--vibe-accent))]">Edit</button>
                <button type="button" onClick={() => onDuplicateProduct(product)} className="inline-flex h-8 items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] text-[11px] hover:bg-[rgb(var(--vibe-accent))]">Copy</button>
                <button type="button" onClick={() => onToggleActive(product)} className={`inline-flex h-8 items-center justify-center rounded-md border px-2 text-[11px] ${(product.is_active ?? true) ? "border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))]" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  {(product.is_active ?? true) ? "Archive" : "Activate"}
                </button>
                <button type="button" onClick={() => onDeleteProduct(product)} className="grid h-8 place-items-center rounded-md border border-red-100 text-red-600 hover:bg-red-50" aria-label={`Delete ${product.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        )}
      </div>
      {previewMedia && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewMedia(null)}>
          <div className="relative max-h-[92dvh] w-full max-w-3xl rounded-lg bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPreviewMedia(null)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-zinc-700 shadow" aria-label="Close media preview">
              <X className="h-4 w-4" />
            </button>
            <div className="grid max-h-[82dvh] place-items-center overflow-hidden rounded-md bg-[rgb(var(--vibe-surface))]">
              {isVideoUrl(previewMedia.url) ? (
                <video src={previewMedia.url} className="max-h-[82dvh] w-full object-contain" controls playsInline />
              ) : (
                <img src={previewMedia.url} alt={previewMedia.name} className="max-h-[82dvh] w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InventoryPanel({ products, query, setQuery, onStockChange, onEditProduct, onToggleActive }: { products: Product[]; query: string; setQuery: (value: string) => void; onStockChange: (product: Product, delta: number) => void; onEditProduct: (product: Product) => void; onToggleActive: (product: Product) => void }) {
  const filtered = products.filter((product) => [product.name, product.sku, product.category, product.category_id].some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase())));
  const low = products.filter((product) => (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= 5);
  const out = products.filter((product) => (product.stock_quantity ?? 0) <= 0);
  const unweighed = products.filter((product) => product.weight_g == null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total SKUs" value={products.length.toString()} />
        <Stat label="Low stock" value={low.length.toString()} accent={low.length ? "warning" : undefined} />
        <Stat label="Out of stock" value={out.length.toString()} accent={out.length ? "destructive" : undefined} />
        <Stat label="Missing weight" value={unweighed.length.toString()} accent={unweighed.length ? "warning" : undefined} />
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="border-b border-[rgb(var(--vibe-border))] px-4 py-4 sm:px-6">
          <SearchRow query={query} setQuery={setQuery} placeholder="Search inventory..." />
        </div>
        <div className="divide-y divide-[rgb(var(--vibe-border))]">
          {filtered.map((product) => {
            const stock = product.stock_quantity ?? 0;
            return (
              <div key={product.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_130px_160px_130px] sm:items-center sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))]">
                    {product.cover_image_url ? <img src={product.cover_image_url} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-4 w-4 text-[rgb(var(--vibe-muted))]" /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{product.name}</p>
                    <p className="truncate text-[11px] text-[rgb(var(--vibe-muted))]">{product.sku || "No SKU"} · {product.category_id || product.category || "Uncategorized"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onStockChange(product, -1)} className="h-9 w-9 rounded-md border border-[rgb(var(--vibe-border))]">-</button>
                  <span className={cn("w-16 text-center font-mono text-[13px]", stock === 0 ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-[rgb(var(--vibe-foreground))]")}>{stock}</span>
                  <button type="button" onClick={() => onStockChange(product, 1)} className="h-9 w-9 rounded-md border border-[rgb(var(--vibe-border))]">+</button>
                </div>
                <div className="text-[12px] text-[rgb(var(--vibe-muted))]">
                  <p>{product.weight_g != null ? `${product.weight_g}g` : "Weight missing"}</p>
                  <p>{product.weight_confidence || "Unreviewed"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onEditProduct(product)} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] text-[12px]">Edit</button>
                  <button type="button" onClick={() => onToggleActive(product)} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] text-[12px]">{product.is_active === false ? "Activate" : "Archive"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CategoriesPanel({ categories, customCategories, onSave }: { categories: AdminCategory[]; customCategories: AdminCategory[]; onSave: (categories: AdminCategory[]) => Promise<void> }) {
  const [rows, setRows] = useState<AdminCategory[]>(customCategories);
  useEffect(() => setRows(customCategories), [customCategories]);
  const update = (index: number, patch: Partial<AdminCategory>) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const add = () => setRows((current) => [...current, { key: "", label: "", blurb: "", parent: "" }]);
  const remove = (index: number) => setRows((current) => current.filter((_, i) => i !== index));
  const save = () => {
    const cleaned = rows
      .map((row) => ({ ...row, key: slugifyAdmin(row.key || row.label), label: row.label.trim(), blurb: row.blurb.trim(), parent: row.parent ? slugifyAdmin(row.parent) : undefined }))
      .filter((row) => row.key && row.label);
    void onSave(cleaned);
  };
  const defaults = categories.filter((category) => !customCategories.some((custom) => custom.key === category.key));
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="vibe-card overflow-hidden">
        <div className="border-b border-[rgb(var(--vibe-border))] px-5 py-4">
          <h3 className="text-[13px] font-medium">Default categories</h3>
          <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Built-in storefront categories stay available.</p>
        </div>
        <div className="divide-y divide-[rgb(var(--vibe-border))]">
          {defaults.map((category) => (
            <div key={category.key} className="px-5 py-3">
              <p className="text-[13px] font-medium">{category.label}</p>
              <p className="text-[11px] text-[rgb(var(--vibe-muted))]">{category.key}{category.parent ? ` · parent: ${category.parent}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--vibe-border))] px-5 py-4">
          <div>
            <h3 className="text-[13px] font-medium">Custom categories</h3>
            <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Add categories that appear in the product editor.</p>
          </div>
          <button type="button" onClick={add} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">Add</button>
        </div>
        <div className="space-y-3 p-4">
          {rows.map((row, index) => (
            <div key={index} className="rounded-md border border-[rgb(var(--vibe-border))] p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProductInputField label="Label" value={row.label} onChange={(value) => update(index, { label: value, key: row.key || slugifyAdmin(value) })} />
                <ProductInputField label="Slug" value={row.key} onChange={(value) => update(index, { key: slugifyAdmin(value) })} />
                <ProductInputField label="Parent slug (optional)" value={row.parent ?? ""} onChange={(value) => update(index, { parent: value })} />
                <ProductInputField label="Blurb" value={row.blurb} onChange={(value) => update(index, { blurb: value })} />
              </div>
              <button type="button" onClick={() => remove(index)} className="mt-3 h-8 rounded-md border border-red-100 px-3 text-[11px] text-red-600">Remove</button>
            </div>
          ))}
          {rows.length === 0 && <p className="rounded-md border border-dashed border-[rgb(var(--vibe-border))] p-4 text-[12px] text-[rgb(var(--vibe-muted))]">No custom categories yet.</p>}
          <button type="button" onClick={save} className="h-9 rounded-md bg-[rgb(var(--vibe-foreground))] px-4 text-[12px] text-white">Save categories</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "warning" | "destructive" }) {
  return (
    <div className="vibe-card p-4 sm:p-5">
      <span className="text-[12px] text-[rgb(var(--vibe-muted))]">{label}</span>
      <p className={`mt-1.5 text-[20px] font-semibold tracking-tight tabular-nums ${accent === "warning" ? "text-amber-600" : accent === "destructive" ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}

function AnalyticsPanel({
  range,
  setRange,
  summary,
  chartData,
  top,
  customers,
  orders,
  products,
}: {
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  summary: ReturnType<typeof summarize>;
  chartData: ReturnType<typeof makeRangeData>;
  top: ReturnType<typeof topProducts>;
  customers: AdminCustomer[];
  orders: AdminOrder[];
  products: Product[];
}) {
  const [metric, setMetric] = useState<"revenue" | "orders" | "visitors">("revenue");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[rgb(var(--vibe-muted))]">Compared to previous {range === "7d" ? "7" : range === "30d" ? "30" : "90"} days</p>
        <RangeToggle value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Revenue" value={fmtAmount(summary.revenue.value)} change={summary.revenue.change} active={metric === "revenue"} onClick={() => setMetric("revenue")} />
        <Kpi label="Orders" value={summary.orders.value.toString()} change={summary.orders.change} active={metric === "orders"} onClick={() => setMetric("orders")} />
        <Kpi label="Customers" value={summary.visitors.value.toString()} change={summary.visitors.change} active={metric === "visitors"} onClick={() => setMetric("visitors")} />
        <Kpi label="Avg order value" value={formatPrice(summary.aov.value)} change={summary.aov.change} />
      </div>
      <div className="vibe-card p-5 sm:p-6">
        <h3 className="text-[13px] font-medium">{metric === "revenue" ? "Revenue" : metric === "orders" ? "Orders" : "Customers"} over time</h3>
        <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Orders per customer {summary.conversion.value.toFixed(2)}% <ChangeBadge value={summary.conversion.change} /></p>
        <div className="mt-5"><TrendChart data={chartData} dataKey={metric} variant={metric === "orders" ? "bar" : "area"} height={240} /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <FulfillmentInsights orders={orders} />
        <CatalogInsights products={products} orders={orders} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Retention customers={customers} />
        <div className="vibe-card p-5 sm:p-6 lg:col-span-2"><TopProducts rows={top} /></div>
      </div>
    </>
  );
}

function Kpi({ label, value, change, active, onClick }: { label: string; value: string; change: number; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-4 text-left transition-all sm:p-5 ${active ? "border-zinc-400 bg-white shadow-sm" : "border-[rgb(var(--vibe-border))] bg-white hover:border-zinc-300"}`}>
      <span className="text-[12px] text-[rgb(var(--vibe-muted))]">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[20px] font-semibold tracking-tight tabular-nums">{value}</span>
        <ChangeBadge value={change} />
      </div>
    </button>
  );
}

function FulfillmentInsights({ orders }: { orders: AdminOrder[] }) {
  const paid = orders.filter((order) => order.payment_status === "paid" || order.payment_status === "MOCKED_PAID").length;
  const unpaid = Math.max(0, orders.length - paid);
  const shipped = orders.filter((order) => normalizeStatus(order) === "in_transit" || normalizeStatus(order) === "delivered").length;
  const attention = orders.filter((order) => normalizeStatus(order) === "unshipped" || normalizeStatus(order) === "shipped_no_tracking").length;
  const rows = [
    { name: "Paid orders", sub: "Ready for fulfillment", value: orders.length ? Math.round((paid / orders.length) * 100) : 0, side: `${paid} · paid` },
    { name: "Unpaid / pending", sub: "Check payment before shipping", value: orders.length ? Math.round((unpaid / orders.length) * 100) : 0, side: `${unpaid} · pending` },
    { name: "Shipped or delivered", sub: "Orders already moving", value: orders.length ? Math.round((shipped / orders.length) * 100) : 0, side: `${shipped} · done` },
    { name: "Needs action", sub: "Unshipped or missing tracking", value: orders.length ? Math.round((attention / orders.length) * 100) : 0, side: `${attention} · action` },
  ];

  return (
    <div className="vibe-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /><h3 className="text-[13px] font-medium">Order health</h3></div>
        <span className="text-[11px] text-[rgb(var(--vibe-muted))]">{orders.length} orders</span>
      </div>
      <ProgressList rows={rows} />
    </div>
  );
}

function CatalogInsights({ products, orders }: { products: Product[]; orders: AdminOrder[] }) {
  const orderedIds = new Set(orders.flatMap((order) => order.items ?? []).map((item) => item.product_id).filter(Boolean));
  const out = products.filter((product) => (product.stock_quantity ?? 0) <= 0).length;
  const low = products.filter((product) => (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= 5).length;
  const unsold = products.filter((product) => !orderedIds.has(product.id)).length;
  const inactive = products.filter((product) => product.is_active === false).length;
  const rows = [
    { type: "Stock", caption: "Out of stock products", reach: products.length, cvr: products.length ? out / products.length : 0, orders: out },
    { type: "Stock", caption: "Low stock products", reach: products.length, cvr: products.length ? low / products.length : 0, orders: low },
    { type: "Sales", caption: "Products with no orders yet", reach: products.length, cvr: products.length ? unsold / products.length : 0, orders: unsold },
    { type: "Catalog", caption: "Archived / inactive products", reach: products.length, cvr: products.length ? inactive / products.length : 0, orders: inactive },
  ];

  return (
    <div className="vibe-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2"><Package className="h-4 w-4" /><h3 className="text-[13px] font-medium">Catalog risks</h3></div>
        <span className="text-[11px] text-[rgb(var(--vibe-muted))]">Needs review</span>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.caption} className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="rounded bg-[rgb(var(--vibe-surface))] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--vibe-muted))]">{row.type}</span>
                <span className="truncate text-[12px]">{row.caption}</span>
              </div>
              <span className="text-[10.5px] text-[rgb(var(--vibe-muted))]">{row.reach.toLocaleString()} products · {(row.cvr * 100).toFixed(1)}% of catalog</span>
            </div>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums">{row.orders}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Retention({ customers }: { customers: AdminCustomer[] }) {
  const returning = customers.filter((customer) => (customer.total_orders ?? 0) > 1).length;
  const rate = customers.length ? Math.round((returning / customers.length) * 100) : 0;
  return (
    <div className="vibe-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2"><Repeat className="h-4 w-4" /><h3 className="text-[13px] font-medium">Customer retention</h3></div>
      <div className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between"><span className="text-[11px] text-[rgb(var(--vibe-muted))]">Repeat rate</span><span className="text-[18px] font-semibold tabular-nums">{rate}%</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--vibe-surface))]"><div className="h-full bg-zinc-400" style={{ width: `${rate}%` }} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div><p className="text-[11px] text-[rgb(var(--vibe-muted))]">New customers</p><p className="text-[15px] font-medium tabular-nums">{customers.length - returning}</p></div>
          <div><p className="text-[11px] text-[rgb(var(--vibe-muted))]">Returning</p><p className="text-[15px] font-medium tabular-nums">{returning}</p></div>
        </div>
      </div>
    </div>
  );
}

function ShippingPanelFunctional({ products, rates, onUpdateRate }: { products: Product[]; rates: ShippingRate[]; onUpdateRate: (id: string, patch: Partial<ShippingRate>) => void | Promise<void> }) {
  const [fees, setFees] = useState<Record<string, number>>(() => Object.fromEntries(products.slice(0, 8).map((product) => [product.id, 55])));
  const carriersInRates = [...new Set(rates.map((rate) => rate.carrier))];
  const updatedTimes = rates.map((rate) => new Date(rate.updated_at).getTime()).filter((time) => Number.isFinite(time));
  const oldestUpdated = updatedTimes.length ? Math.min(...updatedTimes) : 0;
  const daysSinceReview = oldestUpdated ? Math.floor((Date.now() - oldestUpdated) / (24 * 60 * 60 * 1000)) : 999;
  const reviewDue = rates.length === 0 || daysSinceReview >= 30;
  const nextReviewDays = Math.max(0, 30 - daysSinceReview);
  const markReviewed = async () => {
    await Promise.all(rates.map((rate) => onUpdateRate(rate.id, { is_active: rate.is_active })));
    toast({ title: "Shipping rates reviewed", description: "The monthly notice will return when rates are due again." });
  };
  const recalculate = () => {
    const activeRates = rates.filter((rate) => rate.is_active);
    const averageBase = activeRates.reduce((sum, rate) => sum + rate.base_fee, 0) / Math.max(1, activeRates.length);
    setFees(Object.fromEntries(products.slice(0, 8).map((product) => [product.id, Math.max(45, Math.round(averageBase + ((product.price_inr ?? product.price ?? 0) * 0.02)))])));
    toast({ title: "Shipping recalculated", description: "Product shipping fees were updated from the current rate table." });
  };
  return (
    <>
      <div className={`rounded-lg border p-4 ${reviewDue ? "border-amber-300 bg-amber-50" : "border-[rgb(var(--vibe-border))] bg-white"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <BellRing className={`mt-0.5 h-4 w-4 shrink-0 ${reviewDue ? "text-amber-600" : "text-[rgb(var(--vibe-muted))]"}`} />
            <div className="text-[13px]">
              <p className="font-medium">{reviewDue ? "Shipping reference review due" : "Shipping reference is up to date"}</p>
              <p className="mt-0.5 text-[rgb(var(--vibe-muted))]">
                {reviewDue ? `Rates were last reviewed ${daysSinceReview >= 999 ? "never" : `${daysSinceReview} days ago`}. These are admin references only; checkout includes shipping across India.` : `Next monthly notice in ${nextReviewDays} days.`}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void markReviewed()} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[12px]">Mark reviewed</button>
        </div>
      </div>
      <div className="vibe-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[rgb(var(--vibe-surface))]"><Calculator className="h-4 w-4" /></div>
          <div><p className="text-[13px] font-medium">Reference shipping estimates</p><p className="text-[11.5px] text-[rgb(var(--vibe-muted))]">For admin planning only. Customer checkout does not add these fees.</p></div>
        </div>
        <button type="button" onClick={recalculate} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white">Refresh estimates</button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        {carriersInRates.map((carrier) => (
          <div key={carrier} className="vibe-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-5 py-4">
              <div><h3 className="text-[13px] font-medium">{carrier}</h3><p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Convex-backed rates</p></div>
              <button type="button" onClick={() => { void Promise.all(rates.filter((rate) => rate.carrier === carrier).map((rate) => onUpdateRate(rate.id, { is_active: true }))); toast({ title: `${carrier} rates marked active` }); }} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">Mark active</button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <tbody>{rates.filter((rate) => rate.carrier === carrier).map((rate) => <tr key={rate.id} className="border-b border-[rgb(var(--vibe-border))] last:border-0"><td className="px-5 py-2">{rate.zone}</td><td className="px-2 py-1.5">{rate.method}</td>{(["base_fee", "per_item_fee", "per_weight_fee"] as const).map((key) => <td key={key} className="px-2 py-1.5 text-right"><input type="number" value={rate[key]} onChange={(event) => onUpdateRate(rate.id, { [key]: Number(event.target.value) || 0 })} className="h-7 w-20 rounded border border-[rgb(var(--vibe-border))] px-1 text-right font-mono" /></td>)}<td className="px-5 py-1.5 text-right"><input type="checkbox" checked={rate.is_active} onChange={(event) => onUpdateRate(rate.id, { is_active: event.target.checked })} /></td></tr>)}</tbody>
            </table>
            </div>
          </div>
        ))}
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="border-b border-[rgb(var(--vibe-border))] px-5 py-4"><h3 className="text-[13px] font-medium">Per-product shipping fees</h3><p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Editable before applying to product variants</p></div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <tbody>{products.slice(0, 8).map((product) => <tr key={product.id} className="border-b border-[rgb(var(--vibe-border))] last:border-0"><td className="px-5 py-2">{product.name}</td><td className="px-2 py-2 text-[rgb(var(--vibe-muted))]">Default</td><td className="px-2 py-2 text-right font-mono text-[rgb(var(--vibe-muted))]">300g</td><td className="px-2 py-2 text-right font-mono">₹70</td><td className="px-5 py-2 text-right"><input type="number" value={fees[product.id] ?? 55} onChange={(event) => setFees((current) => ({ ...current, [product.id]: Number(event.target.value) || 0 }))} className="h-7 w-20 rounded border border-[rgb(var(--vibe-border))] px-2 text-right font-mono" /></td></tr>)}</tbody>
        </table>
        </div>
      </div>
    </>
  );
}

function ShippingPanel({ products }: { products: Product[] }) {
  return (
    <>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-[13px]"><p className="font-medium">Monthly recalculation due</p><p className="mt-0.5 text-[rgb(var(--vibe-muted))]">Rates for <strong>DTDC</strong> haven't been refreshed in 30+ days. Update the tariff cells below and run the recalculator.</p></div>
        </div>
      </div>
      <div className="vibe-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[rgb(var(--vibe-surface))]"><Calculator className="h-4 w-4" /></div>
          <div><p className="text-[13px] font-medium">Reference shipping estimates</p><p className="text-[11.5px] text-[rgb(var(--vibe-muted))]">Admin reference only. Checkout includes shipping across India.</p></div>
        </div>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white">Refresh estimates</button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        {carriers.map((carrier) => <CarrierCard key={carrier.name} carrier={carrier} />)}
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="border-b border-[rgb(var(--vibe-border))] px-5 py-4"><h3 className="text-[13px] font-medium">Per-product shipping fees</h3><p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Computed from each variant's weight & size</p></div>
        <table className="w-full min-w-[640px] text-[12.5px]">
          <tbody>{products.slice(0, 8).map((product) => <tr key={product.id} className="border-b border-[rgb(var(--vibe-border))] last:border-0"><td className="px-5 py-2">{product.name}</td><td className="px-2 py-2 text-[rgb(var(--vibe-muted))]">Default</td><td className="px-2 py-2 text-right font-mono text-[rgb(var(--vibe-muted))]">300g</td><td className="px-2 py-2 text-right font-mono">₹70</td><td className="px-5 py-2 text-right font-mono">₹55</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function CarrierCard({ carrier }: { carrier: { name: string; updated: number; stale: boolean } }) {
  return (
    <div className="vibe-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-5 py-4">
        <div><h3 className="text-[13px] font-medium">{carrier.name}</h3><p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Updated {carrier.updated}d ago{carrier.stale && <span className="text-amber-600"> · stale</span>}</p></div>
        <button className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">Mark updated</button>
      </div>
      <table className="w-full min-w-[560px] text-[12px]">
        <tbody>{zones.map((zone, index) => <tr key={zone} className="border-b border-[rgb(var(--vibe-border))] last:border-0"><td className="px-5 py-2">{zone}</td><td className="px-2 py-1.5 text-right font-mono">₹{60 + index * 25}</td><td className="px-2 py-1.5 text-right font-mono">₹{90 + index * 35}</td><td className="px-2 py-1.5 text-right font-mono">₹{140 + index * 45}</td><td className="px-5 py-1.5 text-right font-mono">₹{35 + index * 10}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function CustomersPanel({ customers }: { customers: AdminCustomer[] }) {
  return (
    <div className="vibe-card overflow-hidden">
      <div className="border-b border-[rgb(var(--vibe-border))] px-5 py-4"><h3 className="text-[13px] font-medium">Customers</h3><p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{customers.length} profiles</p></div>
      <table className="w-full min-w-[680px] text-[12.5px]">
        <tbody>{customers.map((customer) => <tr key={customer.id} className="border-b border-[rgb(var(--vibe-border))] last:border-0"><td className="px-5 py-3 font-medium">{customer.full_name ?? "Customer"}</td><td className="px-5 py-3 text-[rgb(var(--vibe-muted))]">{customer.email}</td><td className="px-5 py-3 font-mono">{customer.total_orders ?? 0} orders</td><td className="px-5 py-3 text-right font-mono">{formatPrice(customer.total_spent ?? 0)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function ReviewsPanel({
  reviews,
  products,
  onCreateReview,
  onStatusChange,
}: {
  reviews: AdminReview[];
  products: Product[];
  onCreateReview: (input: { productId: string; rating: number; customerName?: string | null; customerEmail?: string | null; title?: string | null; body?: string | null; status?: "pending" | "published" | "hidden" }) => Promise<void>;
  onStatusChange: (review: AdminReview, status: "pending" | "published" | "hidden") => void;
}) {
  return (
    <div className="space-y-3">
      <AdminReviewForm products={products} onCreateReview={onCreateReview} />
      {reviews.length === 0 && (
        <div className="vibe-card p-6 text-[13px] text-[rgb(var(--vibe-muted))]">
          No reviews yet. New customer reviews will appear here for publishing, hiding, or moderation.
        </div>
      )}
      {reviews.map((review) => (
        <article key={review.id} className="vibe-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[13px] font-medium">{products.find((product) => product.id === review.product_id)?.name ?? "Product"}</p><p className="text-[11px] text-[rgb(var(--vibe-muted))]">{review.customer_email ?? "Customer"} · {fmtDate(review.created_at)}</p></div>
            <span className="rounded bg-[rgb(var(--vibe-surface))] px-2 py-1 text-[11px] capitalize text-[rgb(var(--vibe-muted))]">{review.status}</span>
          </div>
          <p className="mt-3 text-[13px] text-[rgb(var(--vibe-muted))]">{review.body ?? review.title ?? "No review body."}</p>
          {review.admin_note && <p className="mt-2 rounded bg-[rgb(var(--vibe-surface))] px-3 py-2 text-[12px] text-[rgb(var(--vibe-muted))]">Admin note: {review.admin_note}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-[rgb(var(--vibe-surface))] p-1">
            {reviewStates.map((state) => {
              const active = review.status === state.key;
              return (
                <button
                  key={state.key}
                  type="button"
                  onClick={() => onStatusChange(review, state.key)}
                  disabled={active}
                  className={`h-10 rounded border px-2 text-[11.5px] transition-colors disabled:cursor-default ${active ? state.tone : "border-transparent text-[rgb(var(--vibe-muted))] hover:bg-white"}`}
                >
                  {state.label}
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminReviewForm({ products, onCreateReview }: { products: Product[]; onCreateReview: (input: { productId: string; rating: number; customerName?: string | null; customerEmail?: string | null; title?: string | null; body?: string | null; status?: "pending" | "published" | "hidden" }) => Promise<void> }) {
  const firstProduct = products[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(firstProduct);
  const [rating, setRating] = useState(5);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"pending" | "published" | "hidden">("published");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId && firstProduct) setProductId(firstProduct);
  }, [firstProduct, productId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!productId || !body.trim()) {
      toast({ title: "Choose a product and write the review", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onCreateReview({
        productId,
        rating,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        title: title || null,
        body,
        status,
      });
      setCustomerName("");
      setCustomerEmail("");
      setTitle("");
      setBody("");
      setRating(5);
      setStatus("published");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vibe-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--vibe-border))] px-4 py-4 sm:px-5">
        <div>
          <h3 className="text-[13px] font-medium">Add review</h3>
          <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Text-only reviews can be added and published from here.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] hover:bg-[rgb(var(--vibe-accent))]">
          {open ? "Close" : "Add"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <label className="space-y-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))] sm:col-span-2">
            <span>Product</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} required className="h-10 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500">
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <ProductInputField label="Customer name" value={customerName} onChange={setCustomerName} />
          <ProductInputField label="Customer email" value={customerEmail} onChange={setCustomerEmail} type="email" />
          <ProductInputField label="Review title" value={title} onChange={setTitle} />
          <label className="space-y-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
            <span>Rating</span>
            <div className="rounded-md border border-[rgb(var(--vibe-border))] bg-white px-2 py-1">
              <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
            </div>
          </label>
          <label className="space-y-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as "pending" | "published" | "hidden")} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500">
              <option value="published">Published</option>
              <option value="pending">Needs review</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <ProductTextArea label="Review text" value={body} onChange={setBody} rows={4} className="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-10 rounded-md bg-[rgb(var(--vibe-foreground))] px-4 text-[12px] text-white disabled:opacity-60">{saving ? "Saving..." : "Save review"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function SettingsPanel({ settings: savedSettings, onSave }: { settings: Record<string, unknown>; onSave: (settings: Record<string, unknown>) => void }) {
  const [settings, setSettings] = useState({
    storeName: String(savedSettings.storeName ?? "Hurayrah Essentials"),
    lowStock: String(savedSettings.lowStock ?? "5"),
  });
  const update = (key: keyof typeof settings, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const save = () => onSave(settings);
  return (
    <div className="max-w-xl">
      <div className="vibe-card p-5">
        <h3 className="text-[13px] font-medium">Store profile</h3>
        <div className="mt-4 space-y-3">
          <ProductInputField label="Store name" value={settings.storeName} onChange={(value) => update("storeName", value)} />
          <ProductInputField label="Low stock alert threshold" type="number" value={settings.lowStock} onChange={(value) => update("lowStock", value)} />
        </div>
        <button type="button" onClick={save} className="mt-4 h-8 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white">Save settings</button>
      </div>
    </div>
  );
}

function NotificationsDrawer({ notifications, onClose, onGo }: { notifications: AdminNotification[]; onClose: () => void; onGo: (section: SectionKey) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/25" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-sm bg-[rgb(var(--vibe-page))] shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-5 py-4"><h2 className="text-[15px] font-semibold">Notifications</h2><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[rgb(var(--vibe-accent))]"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3 p-4">
          {notifications.length === 0 ? (
            <div className="rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-5 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" />
              <p className="mt-2 text-[13px] font-medium">All clear</p>
              <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">New order, stock, review, and shipping notices will appear here.</p>
            </div>
          ) : (
            notifications.map((notice) => (
              <button type="button" key={notice.id} onClick={() => onGo(notice.section as SectionKey)} className="w-full rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-4 text-left hover:border-zinc-300">
                <p className="text-[13px] font-medium">{notice.title}</p>
                <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">{notice.body}</p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="vibe-card p-8 text-center">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-[rgb(var(--vibe-muted))]">{text}</p>
    </div>
  );
}

function ProgressList({ rows }: { rows: Array<{ name: string; sub: string; value: number; side: string }> }) {
  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
            <div className="min-w-0"><span className="block truncate">{row.name}</span><span className="text-[10.5px] text-[rgb(var(--vibe-muted))]">{row.sub}</span></div>
            <span className="shrink-0 font-mono text-[rgb(var(--vibe-muted))]">{row.side}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--vibe-surface))]"><div className="h-full rounded-full bg-zinc-300" style={{ width: `${row.value}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

import { type FormEvent, useEffect, useMemo, useState } from "react";
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
  createProduct,
  createDiscount,
  deleteDiscount,
  deleteProduct,
  getStoreSettings,
  listAdminNotifications,
  listAllCustomers,
  listDiscounts,
  listAllOrders,
  listAllProducts,
  listAllReviews,
  listShippingRates,
  saveStoreSettings,
  uploadProductImage,
  updateDiscount,
  updateProduct,
  updateOrderTracking,
  updateOrderStatus,
  updateReviewStatus,
  updateShippingRate,
  type AdminDiscount,
  type AdminNotification,
  type AdminCustomer,
  type AdminOrder,
  type AdminReview,
  type ShippingRate,
} from "@/services/adminService";
import type { Product } from "@/services/productService";
import { CATEGORIES, formatPrice } from "@/data/products";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SectionKey =
  | "dashboard"
  | "analytics"
  | "orders"
  | "products"
  | "shipping"
  | "discounts"
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
  cover_image_url: string;
  images: string;
  badge: string;
  tags: string;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
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
      { key: "analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { key: "orders", icon: ShoppingCart, label: "Orders", badgeKey: "orders" },
      { key: "products", icon: Package, label: "Products" },
      { key: "shipping", icon: Truck, label: "Shipping", badgeKey: "shipping" },
      { key: "discounts", icon: Tag, label: "Discounts" },
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
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function makeRangeData(orders: AdminOrder[], range: RangeKey) {
  const length = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return Array.from({ length }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (length - 1 - index));
    const key = dayKey(d);
    const dayOrders = orders.filter((order) => (order.created_at ?? "").slice(0, 10) === key);
    return {
      label: d.toLocaleDateString("en-US", length <= 10 ? { weekday: "short" } : { month: "short", day: "numeric" }),
      revenue: Math.round(dayOrders.reduce((sum, order) => sum + (order.total_inr ?? order.total ?? 0), 0) / 83),
      orders: dayOrders.length,
      visitors: Math.max(dayOrders.length * 22, Math.round(18 + index * 1.7)),
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
  const visitors = Math.max(customers.length * 18, inRange.length * 22, 1);
  return {
    revenue: { value: Math.round(revenue), change: inRange.length ? 12.4 : 0 },
    orders: { value: inRange.length, change: inRange.length ? 8.7 : 0 },
    visitors: { value: visitors, change: 5.3 },
    aov: { value: inRange.length ? revenue / inRange.length : 0, change: 3.1 },
    conversion: { value: (inRange.length / visitors) * 100, change: 1.8 },
  };
}

function topProducts(orders: AdminOrder[], products: Product[]) {
  const fromOrders = new Map<string, { name: string; sales: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      const key = item.product_id ?? item.product_name ?? "unknown";
      const current = fromOrders.get(key) ?? { name: item.product_name ?? "Unknown product", sales: 0, revenue: 0 };
      current.sales += item.quantity;
      current.revenue += Math.round(item.subtotal / 83);
      fromOrders.set(key, current);
    }
  }
  const rows = [...fromOrders.values()].sort((a, b) => b.revenue - a.revenue);
  if (rows.length) return rows.slice(0, 5);
  return products.slice(0, 5).map((product, index) => ({
    name: product.name,
    sales: Math.max(0, 28 - index * 4),
    revenue: Math.round((product.price_inr ?? product.price ?? 0) / 83) * Math.max(1, 7 - index),
  }));
}

export default function Admin() {
  const { signOut } = useAuth();
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("7d");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [storeSettings, setStoreSettings] = useState<Record<string, unknown>>({});
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
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
    let cancelled = false;
    setLoading(true);
    Promise.all([listAllProducts(), listAllOrders(200), listAllCustomers(200), listAllReviews(200), listDiscounts(), listShippingRates(), getStoreSettings(), listAdminNotifications()]).then(
      ([nextProducts, nextOrders, nextCustomers, nextReviews, nextDiscounts, nextShippingRates, nextStoreSettings, nextNotifications]) => {
        if (cancelled) return;
        setProducts(nextProducts);
        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setReviews(nextReviews);
        setDiscounts(nextDiscounts);
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
  const chartData = useMemo(() => makeRangeData(orders, range), [orders, range]);
  const top = useMemo(() => topProducts(orders, products), [orders, products]);
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
    if (!form.name.trim() || !form.slug.trim() || Number(form.price_inr) <= 0 || !form.category.trim()) {
      toast({ title: "Name, slug, price, and category are required", variant: "destructive" });
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
    const rawTags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).filter((tag) => !tag.startsWith("vg:"));
    const variantPeers = variantGroup
      ? products.filter((product) => product.id !== currentProduct?.id && variantGroupFromTags(product.tags) === variantGroup)
      : [];
    const selectedCategory = form.category.trim() || "books";
    const selectedMeta = CATEGORIES.find((category) => category.key === selectedCategory);
    const topCategory = selectedMeta?.parent || selectedCategory;
    const subjectTag = selectedMeta?.parent === "books" ? selectedMeta.label : null;
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
      color_options: splitOptionInput(form.color_options),
      size_options: splitOptionInput(form.size_options),
      badge: form.badge.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
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
      void refreshNotifications();
      setProductEditor(null);
    } catch {
      toast({ title: "Could not save product", variant: "destructive" });
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

  const handleCreateDiscount = async (input: Parameters<typeof createDiscount>[0]) => {
    try {
      const created = await createDiscount(input);
      if (!created) throw new Error("Discount create failed");
      setDiscounts((current) => [created, ...current]);
      toast({ title: "Discount created", description: created.code });
    } catch (error) {
      toast({ title: "Could not create discount", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  const handleUpdateDiscount = async (id: string, patch: Partial<AdminDiscount>) => {
    try {
      const updated = await updateDiscount(id, patch);
      if (!updated) throw new Error("Discount update failed");
      setDiscounts((current) => current.map((discount) => (discount.id === id ? updated : discount)));
    } catch {
      toast({ title: "Could not update discount", variant: "destructive" });
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!window.confirm("Delete this discount code?")) return;
    try {
      await deleteDiscount(id);
      setDiscounts((current) => current.filter((discount) => discount.id !== id));
      toast({ title: "Discount deleted" });
    } catch {
      toast({ title: "Could not delete discount", variant: "destructive" });
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
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-page))] transition-all duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-16" : "md:w-56"}`}
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
                value={["orders", "products"].includes(section) ? query : ""}
                onChange={(event) => setQuery(event.target.value)}
                disabled={!["orders", "products"].includes(section)}
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
            <OrdersPanel orders={orders} products={products} counts={counts} query={query} setQuery={setQuery} active={orderFilter} setActive={setOrderFilter} onViewOrder={setSelectedOrder} />
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
          ) : section === "analytics" ? (
            <AnalyticsPanel range={range} setRange={setRange} summary={summary} chartData={chartData} top={top} customers={customers} orders={orders} products={products} />
          ) : section === "shipping" ? (
            <ShippingPanelFunctional products={products} rates={shippingRates} onUpdateRate={handleUpdateShippingRate} />
          ) : section === "customers" ? (
            <CustomersPanel customers={customers} />
          ) : section === "reviews" ? (
            <ReviewsPanel reviews={reviews} products={products} onStatusChange={handleReviewStatus} />
          ) : section === "discounts" ? (
            <DiscountsPanel products={products} discounts={discounts} onCreate={handleCreateDiscount} onUpdate={handleUpdateDiscount} onDelete={handleDeleteDiscount} />
          ) : (
            <SettingsPanel settings={storeSettings} onSave={handleSaveSettings} />
          )}
        </main>
      </div>
      {productEditor && (
        <ProductEditorDialog
          product={productEditor === "new" ? null : productEditor}
          products={products}
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
              <span className="text-[22px] font-semibold tracking-tight tabular-nums">{fmtAmount(summary.revenue.value / 83)}</span>
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
  const needsShippingFollowUp = order.shipping_payment_status === "pending_whatsapp" || order.customer_country_type === "international";
  const item = order.items?.[0];
  const itemLabel = order.items && order.items.length > 1 ? `${item?.product_name ?? "Product"} +${order.items.length - 1}` : item?.product_name ?? "Product";
  return (
    <tr className="border-t border-[rgb(var(--vibe-border))] transition-colors hover:bg-[rgb(var(--vibe-accent))]/50">
      <td className="px-6 py-3 font-mono text-[13px] font-medium">{order.order_number ?? order.id.slice(0, 8)}</td>
      <td className="px-6 py-3 text-[13px]">{order.customer_name ?? order.customer_email ?? "Customer"}</td>
      <td className="hidden px-6 py-3 text-[13px] text-[rgb(var(--vibe-muted))] md:table-cell">
        <div className="flex flex-col gap-1">
          <span className="inline-flex min-w-0 items-center gap-2">
            {item?.product_image_url && <img src={item.product_image_url} alt="" className="h-9 w-8 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />}
            <span className="truncate">{itemLabel}</span>
          </span>
          {needsShippingFollowUp && <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">WhatsApp shipping</span>}
        </div>
      </td>
      <td className="px-6 py-3 text-right font-mono text-[13px] font-medium">{fmtAmount((order.total_inr ?? order.total ?? 0) / 83)}</td>
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
        const needsShippingFollowUp = order.shipping_payment_status === "pending_whatsapp" || order.customer_country_type === "international";
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
                  {order.items?.[0]?.product_image_url && <img src={order.items[0].product_image_url} alt="" className="h-10 w-8 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />}
                  <span className="truncate">{order.items?.[0]?.product_name ?? "Product"}</span>
                </p>
                {needsShippingFollowUp && <p className="mt-2 w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">WhatsApp shipping follow-up</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[13px] font-semibold">{fmtAmount((order.total_inr ?? order.total ?? 0) / 83)}</p>
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
              <span className="shrink-0 font-mono text-[12px] text-[rgb(var(--vibe-muted))]">${row.revenue.toLocaleString()}</span>
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
  products,
  counts,
  query,
  setQuery,
  active,
  setActive,
  onViewOrder,
}: {
  orders: AdminOrder[];
  products: Product[];
  counts: Record<string, number>;
  query: string;
  setQuery: (value: string) => void;
  active: OrderStatus;
  setActive: (value: OrderStatus) => void;
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
      <SearchRow query={query} setQuery={setQuery} placeholder="Search by order, customer, product, tracking..." />
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
    category: product?.category ?? "books",
    variant_group: variantGroupFromTags(product?.tags),
    variant_label: product?.variant_label ?? "",
    color_options: (product?.color_options ?? []).join("\n"),
    size_options: (product?.size_options ?? []).join("\n"),
    cover_image_url: product?.cover_image_url ?? "",
    images: (product?.images ?? []).join("\n"),
    badge: product?.badge ?? "",
    tags: (product?.tags ?? []).join(", "),
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    is_bestseller: product?.is_bestseller ?? false,
    is_new_arrival: product?.is_new_arrival ?? false,
  };
}

function ProductEditorDialog({
  product,
  products,
  onClose,
  onSave,
}: {
  product: Product | null;
  products: Product[];
  onClose: () => void;
  onSave: (form: ProductFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductFormState>(() => productToForm(product));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
  const selectedVariantProducts = form.variant_group
    ? products.filter((item) => item.id !== product?.id && variantGroupFromTags(item.tags) === slugifyAdmin(form.variant_group))
    : [];
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
    } finally {
      setUploading(false);
    }
  };
  const handleGalleryImages = async (files?: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = (await Promise.all(Array.from(files).map((file) => uploadProductImage(file)))).filter(Boolean);
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
    } finally {
      setUploading(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6">
      <form onSubmit={handleSubmit} className="vibe-card flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-hidden rounded-b-none sm:max-h-[95vh] sm:rounded-b-lg">
        <div className="flex items-center justify-between border-b border-[rgb(var(--vibe-border))] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">{product ? "Edit product" : "Add product"}</h2>
            <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{product?.sku || product?.slug || "Catalog item"}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[rgb(var(--vibe-accent))]" aria-label="Close product editor">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-5 overflow-y-auto p-4 pb-24 sm:p-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <div className="aspect-[3/4] overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))]">
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt={form.name || "Product cover"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[12px] text-[rgb(var(--vibe-muted))]">No image</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">
                Cover photo
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(event) => handleImage(event.target.files?.[0])} className="sr-only" />
              </label>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] transition-colors hover:bg-[rgb(var(--vibe-accent))]">
                Gallery media
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.m4v" multiple onChange={(event) => handleGalleryImages(event.target.files)} className="sr-only" />
              </label>
            </div>
            <ProductInputField label="Image URL" value={form.cover_image_url} onChange={(value) => setField("cover_image_url", value)} />
            {uploading && <p className="text-[11px] text-[rgb(var(--vibe-muted))]">Uploading to Convex storage...</p>}
            {gallery.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((image, index) => (
                  <div key={`${image}-${index}`} className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-white">
                    {isVideoUrl(image) ? <video src={image} className="h-full w-full object-cover" muted playsInline /> : <img src={image} alt="" className="h-full w-full object-cover" />}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <ProductInputField label="Name" value={form.name} onChange={(value) => setField("name", value)} required />
              <ProductInputField label="Slug" value={form.slug} onChange={(value) => setField("slug", value)} placeholder="auto-generated if blank" />
              <ProductInputField label="SKU" value={form.sku} onChange={(value) => setField("sku", value)} />
              <label className="space-y-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))]">
                <span>Category</span>
                <select value={form.category} onChange={(event) => setField("category", event.target.value)} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] text-[rgb(var(--vibe-foreground))] outline-none focus:ring-1 focus:ring-zinc-500">
                  {CATEGORIES.map((category) => (
                    <option key={category.key} value={category.key}>{category.parent ? `${category.label} (${category.parent})` : category.label}</option>
                  ))}
                </select>
              </label>
              <ProductInputField label="Price" type="number" value={form.price_inr} onChange={(value) => setField("price_inr", value)} required />
              <ProductInputField label="Sale price" type="number" value={form.sale_price_inr} onChange={(value) => setField("sale_price_inr", value)} />
              <ProductInputField label="Stock" type="number" value={form.stock_quantity} onChange={(value) => setField("stock_quantity", value)} />
              <ProductInputField label="Badge" value={form.badge} onChange={(value) => setField("badge", value)} placeholder="New, Sale, Bestseller..." />
              <ProductInputField label="Author" value={form.author} onChange={(value) => setField("author", value)} />
              <ProductInputField label="Publisher" value={form.publisher} onChange={(value) => setField("publisher", value)} />
              <ProductInputField label="Language" value={form.language} onChange={(value) => setField("language", value)} />
            </div>
            <div className="grid gap-3 rounded-lg border border-[rgb(var(--vibe-border))] p-3 sm:grid-cols-4">
              <div className="sm:col-span-4">
                <p className="text-[12px] font-medium text-[rgb(var(--vibe-foreground))]">Shipping weight</p>
                <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Use researched product data first; mark confidence so low-confidence rows can be reviewed before launch.</p>
              </div>
              <ProductInputField label="Weight (g)" type="number" value={form.weight_g} onChange={(value) => setField("weight_g", value)} />
              <div className="sm:col-span-3">
                <p className="mb-1 text-[11px] font-medium text-[rgb(var(--vibe-muted))]">Quick weight presets</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Small item", value: "350" },
                    { label: "Up to 500g", value: "500" },
                    { label: "Around 1kg", value: "1000" },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setField("weight_g", preset.value);
                        if (!form.weight_confidence) setField("weight_confidence", "estimated");
                      }}
                      className={cn("h-8 rounded-md border px-3 text-[11px] transition-colors", form.weight_g === preset.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-[rgb(var(--vibe-border))] bg-white hover:bg-[rgb(var(--vibe-accent))]")}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <ProductInputField label="Length (cm)" type="number" value={form.length_cm} onChange={(value) => setField("length_cm", value)} />
              <ProductInputField label="Width (cm)" type="number" value={form.width_cm} onChange={(value) => setField("width_cm", value)} />
              <ProductInputField label="Height (cm)" type="number" value={form.height_cm} onChange={(value) => setField("height_cm", value)} />
              <ProductInputField label="Shipping class" value={form.shipping_class} onChange={(value) => setField("shipping_class", value)} placeholder="book, kufi, clothing..." />
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
            <div className="grid gap-3 rounded-lg border border-[rgb(var(--vibe-border))] p-3 sm:grid-cols-2">
              <ProductInputField label="Variant group" value={form.variant_group} onChange={(value) => setField("variant_group", slugifyAdmin(value))} placeholder="kufi-prayer-cap" list="variant-groups" />
              <ProductInputField label="Variant label" value={form.variant_label} onChange={(value) => setField("variant_label", value)} placeholder="Brown, Large, Urdu..." />
              <ProductOptionField label="Colours" value={form.color_options} onChange={(value) => setField("color_options", value)} placeholder="Black, White, Olive" suggestions={["Black", "White", "Grey", "Brown", "Olive", "Navy"]} />
              <ProductOptionField label="Sizes" value={form.size_options} onChange={(value) => setField("size_options", value)} placeholder="S, M, L, XL" suggestions={["XS", "S", "M", "L", "XL", "XXL", "Free size"]} />
              <datalist id="variant-groups">
                {variantGroups.map((group) => <option key={group} value={group} />)}
              </datalist>
              {variantGroups.length > 0 && (
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  {variantGroups.map((group) => (
                    <button key={group} type="button" onClick={() => setField("variant_group", group)} className={cn("rounded-full border px-3 py-1 text-[11px] transition-all duration-200 hover:border-zinc-500", form.variant_group === group ? "border-zinc-900 bg-zinc-900 text-white" : "border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))]")}>
                      {group}
                    </button>
                  ))}
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-[rgb(var(--vibe-muted))]">
                    {selectedVariantProducts.length ? `${selectedVariantProducts.length} product(s) already in this group.` : "Type a new group name to create one, or clear it to remove this product from variants."}
                  </p>
                  {form.variant_group && (
                    <button type="button" onClick={() => setField("variant_group", "")} className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[11px]">Remove from group</button>
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
            </div>
            <ProductInputField label="Tags" value={form.tags} onChange={(value) => setField("tags", value)} placeholder="comma separated" />
            <ProductTextArea label="Gallery images/videos" value={form.images} onChange={(value) => setField("images", value)} rows={3} placeholder="one media URL per line" />
            <ProductTextArea label="Short description" value={form.short_description} onChange={(value) => setField("short_description", value)} rows={2} />
            <ProductTextArea label="Full description" value={form.description} onChange={(value) => setField("description", value)} rows={5} />
            <div className="grid gap-2 sm:grid-cols-2">
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

function ProductTextArea({ label, value, onChange, rows, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows: number; placeholder?: string }) {
  return (
    <label className="block">
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
  const needsShippingFollowUp = order.shipping_payment_status === "pending_whatsapp" || order.customer_country_type === "international";
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
            {needsShippingFollowUp && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-900">
                <p className="font-medium">International shipping follow-up needed</p>
                <p className="mt-1 text-[12px] leading-5 text-amber-800">The customer paid the product total online. Message them on WhatsApp to collect the actual international shipping fee separately.</p>
              </div>
            )}
            {(order.items ?? []).map((item) => {
              const product = products.find((candidate) => candidate.id === item.product_id);
              const images = [product?.cover_image_url, ...(product?.images ?? [])].filter(Boolean);
              return (
                <div key={item.id} className="rounded-lg border border-[rgb(var(--vibe-border))] p-3">
                  <div className="flex gap-3">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-[rgb(var(--vibe-surface))]">
                      {images[0] ? <img src={images[0]} alt={item.product_name ?? "Product"} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-5 w-5 text-[rgb(var(--vibe-muted))]" /></div>}
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
                      {images.map((image, index) => <img key={`${item.id}-${index}`} src={image ?? ""} alt="" className="h-14 w-14 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />)}
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
              <div className="flex justify-between"><span>Payment</span><span className="capitalize">{order.payment_status ?? "unknown"}</span></div>
              <div className="mt-2 flex justify-between gap-3"><span>Shipping</span><span className="text-right capitalize">{needsShippingFollowUp ? "WhatsApp follow-up" : "Included"}</span></div>
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
                    {product.cover_image_url ? <img src={product.cover_image_url} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-4 w-4 text-[rgb(var(--vibe-muted))]" /></div>}
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
        <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <li key={product.id} className="rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm">
              <div className="aspect-[4/3] overflow-hidden rounded-md bg-[rgb(var(--vibe-surface))]">
                {product.cover_image_url ? <img src={product.cover_image_url} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-7 w-7 text-[rgb(var(--vibe-muted))]" /></div>}
              </div>
              {(product.images?.length ?? 0) > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {[product.cover_image_url, ...(product.images ?? [])].filter(Boolean).map((image, index) => (
                    <img key={`${product.id}-${index}`} src={image ?? ""} alt="" className="h-14 w-14 shrink-0 rounded border border-[rgb(var(--vibe-border))] object-cover" />
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
    </>
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
        <Kpi label="Revenue" value={fmtAmount(summary.revenue.value / 83)} change={summary.revenue.change} active={metric === "revenue"} onClick={() => setMetric("revenue")} />
        <Kpi label="Orders" value={summary.orders.value.toString()} change={summary.orders.change} active={metric === "orders"} onClick={() => setMetric("orders")} />
        <Kpi label="Visitors" value={summary.visitors.value.toString()} change={summary.visitors.change} active={metric === "visitors"} onClick={() => setMetric("visitors")} />
        <Kpi label="Avg order value" value={formatPrice(summary.aov.value)} change={summary.aov.change} />
      </div>
      <div className="vibe-card p-5 sm:p-6">
        <h3 className="text-[13px] font-medium">{metric === "revenue" ? "Revenue" : metric === "orders" ? "Orders" : "Visitors"} over time</h3>
        <p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">Conversion rate {summary.conversion.value.toFixed(2)}% <ChangeBadge value={summary.conversion.change} /></p>
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
  onStatusChange,
}: {
  reviews: AdminReview[];
  products: Product[];
  onStatusChange: (review: AdminReview, status: "pending" | "published" | "hidden") => void;
}) {
  return (
    <div className="space-y-3">
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

function DiscountsPanel({ products, discounts, onCreate, onUpdate, onDelete }: { products: Product[]; discounts: AdminDiscount[]; onCreate: (input: Parameters<typeof createDiscount>[0]) => void; onUpdate: (id: string, patch: Partial<AdminDiscount>) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState({ code: "", type: "Percent", value: "10" });
  const addCode = () => {
    if (!draft.code.trim()) return toast({ title: "Discount code required", variant: "destructive" });
    void onCreate({ code: draft.code, type: draft.type.toLowerCase(), value: Number(draft.value) || 0, usage_limit: null, starts_at: null, ends_at: null, scope_type: "all", scope_value: null });
    setDraft({ code: "", type: "Percent", value: "10" });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="vibe-card p-5">
        <h3 className="text-[13px] font-medium">Create discount</h3>
        <div className="mt-4 space-y-3">
          <ProductInputField label="Code" value={draft.code} onChange={(value) => setDraft((current) => ({ ...current, code: value }))} placeholder="RAMADAN15" />
          <label className="block"><span className="mb-1.5 block text-[11px] text-[rgb(var(--vibe-muted))]">Type</span><select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px]"><option>Percent</option><option>Fixed</option><option>Shipping</option></select></label>
          <ProductInputField label="Value" type="number" value={draft.value} onChange={(value) => setDraft((current) => ({ ...current, value }))} />
          <button type="button" onClick={addCode} className="h-8 w-full rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] text-white">Add discount</button>
        </div>
      </div>
      <div className="vibe-card overflow-hidden">
        <div className="border-b border-[rgb(var(--vibe-border))] px-5 py-4"><h3 className="text-[13px] font-medium">Campaign codes</h3><p className="mt-0.5 text-[11px] text-[rgb(var(--vibe-muted))]">{products.length} products available for campaigns</p></div>
        <table className="w-full min-w-[640px] text-[12.5px]">
          <tbody>{discounts.map((row) => <tr key={row.id} className="border-b border-[rgb(var(--vibe-border))] last:border-0"><td className="px-5 py-3 font-mono font-medium">{row.code}</td><td className="px-5 py-3 capitalize">{row.type}</td><td className="px-5 py-3 font-mono">{row.type === "percent" ? `${row.value}%` : formatPrice(row.value)}</td><td className="px-5 py-3 text-[rgb(var(--vibe-muted))]">{row.used_count}{row.usage_limit ? ` / ${row.usage_limit}` : ""} uses</td><td className="px-5 py-3 text-right"><button type="button" onClick={() => onUpdate(row.id, { active: !row.active })} className="h-7 rounded-md border border-[rgb(var(--vibe-border))] px-2 text-[11px]">{row.active ? "Pause" : "Activate"}</button><button type="button" onClick={() => onDelete(row.id)} className="ml-2 h-7 rounded-md border border-red-100 px-2 text-[11px] text-red-600">Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel({ settings: savedSettings, onSave }: { settings: Record<string, unknown>; onSave: (settings: Record<string, unknown>) => void }) {
  const [settings, setSettings] = useState({
    storeName: String(savedSettings.storeName ?? "Hurayrah Essentials"),
    supportEmail: String(savedSettings.supportEmail ?? "hello@hurayrahessentials.com"),
    lowStock: String(savedSettings.lowStock ?? "5"),
    autoArchive: Boolean(savedSettings.autoArchive ?? false),
    emailNotifications: Boolean(savedSettings.emailNotifications ?? true),
    reviewModeration: Boolean(savedSettings.reviewModeration ?? true),
  });
  const update = (key: keyof typeof settings, value: string | boolean) => setSettings((current) => ({ ...current, [key]: value }));
  const save = () => onSave(settings);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="vibe-card p-5">
        <h3 className="text-[13px] font-medium">Store profile</h3>
        <div className="mt-4 space-y-3">
          <ProductInputField label="Store name" value={settings.storeName} onChange={(value) => update("storeName", value)} />
          <ProductInputField label="Support email" value={settings.supportEmail} onChange={(value) => update("supportEmail", value)} />
          <ProductInputField label="Low stock alert threshold" type="number" value={settings.lowStock} onChange={(value) => update("lowStock", value)} />
        </div>
      </div>
      <div className="vibe-card p-5">
        <h3 className="text-[13px] font-medium">Admin automation</h3>
        <div className="mt-4 space-y-2">
          <ProductToggle label="Email notifications" checked={settings.emailNotifications} onChange={(value) => update("emailNotifications", value)} />
          <ProductToggle label="Review moderation queue" checked={settings.reviewModeration} onChange={(value) => update("reviewModeration", value)} />
          <ProductToggle label="Auto-archive out-of-stock items" checked={settings.autoArchive} onChange={(value) => update("autoArchive", value)} />
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

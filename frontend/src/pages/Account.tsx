import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  User,
  Package,
  Heart,
  MapPin,
  LogOut,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/store/shop";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  type Profile,
  type Address,
  type Order,
  getProfile,
  upsertProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  listUserOrders,
} from "@/services/accountService";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Tab = "overview" | "orders" | "wishlist" | "addresses" | "profile";

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", Icon: User },
  { key: "orders", label: "Orders", Icon: Package },
  { key: "wishlist", label: "Wishlist", Icon: Heart },
  { key: "addresses", label: "Addresses", Icon: MapPin },
  { key: "profile", label: "Profile", Icon: User },
];

const Account = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { wishlist } = useShop();
  const { format } = useCurrency();
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProfile(user.id),
      listUserOrders(user.id),
      listAddresses(user.id),
    ]).then(([p, o, a]) => {
      if (cancelled) return;
      setProfile(p);
      setOrders(o);
      setAddresses(a);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!authLoading && !user) return <Navigate to="/login?redirect=/account" replace />;
  if (authLoading || !user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-[1200px] px-4 py-12 text-foreground/60 text-sm">
          Loading…
        </div>
      </SiteLayout>
    );
  }

  const onSaveProfile = async (patch: Partial<Profile>) => {
    const updated = await upsertProfile(user.id, user.email ?? null, patch);
    if (updated) {
      setProfile(updated);
      toast({ title: "Profile updated" });
    } else {
      toast({ title: "Could not update profile", variant: "destructive" });
    }
  };

  const refreshAddresses = async () => {
    const next = await listAddresses(user.id);
    setAddresses(next);
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "friend";
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 md:mb-10">
          <div>
            <h1 className="text-foreground italic font-bold tracking-tight text-2xl md:text-4xl">
              My account
            </h1>
            <p className="text-foreground/60 text-sm mt-1">Welcome back, {displayName}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
            }}
            className="text-sm text-foreground/60 hover:text-brand inline-flex items-center gap-1 self-start"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-8">
          <aside className="rounded-2xl border border-border bg-background p-2 h-fit md:sticky md:top-4">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                  tab === key
                    ? "bg-brand text-brand-foreground"
                    : "text-foreground/75 hover:bg-foreground/5",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </aside>

          <div className="space-y-6 min-w-0">
            {loading && <div className="text-foreground/55 text-sm">Loading…</div>}

            {!loading && tab === "overview" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Card title="Profile">
                  <p className="text-sm">
                    <span className="text-foreground/60">Name: </span>
                    {profile?.full_name || "—"}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="text-foreground/60">Email: </span>
                    {user.email}
                  </p>
                  {profile?.phone && (
                    <p className="text-sm mt-1">
                      <span className="text-foreground/60">Phone: </span>
                      {profile.phone}
                    </p>
                  )}
                  <button
                    onClick={() => setTab("profile")}
                    className="mt-3 text-sm text-brand font-medium hover:underline"
                  >
                    Edit profile
                  </button>
                </Card>
                <Card title="Default address">
                  {defaultAddress ? (
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      {defaultAddress.full_name}
                      <br />
                      {defaultAddress.address_line_1}
                      {defaultAddress.address_line_2 ? `, ${defaultAddress.address_line_2}` : ""}
                      <br />
                      {defaultAddress.city}
                      {defaultAddress.state ? `, ${defaultAddress.state}` : ""} {defaultAddress.postal_code}
                      <br />
                      {defaultAddress.country}
                    </p>
                  ) : (
                    <p className="text-sm text-foreground/60">No address yet.</p>
                  )}
                  <button
                    onClick={() => setTab("addresses")}
                    className="mt-3 text-sm text-brand font-medium hover:underline"
                  >
                    {defaultAddress ? "Manage addresses" : "Add an address"}
                  </button>
                </Card>
                <Card title="Recent orders" className="sm:col-span-2">
                  {orders.length === 0 ? (
                    <p className="text-sm text-foreground/60">
                      No orders yet —{" "}
                      <Link to="/shop" className="text-brand hover:underline">
                        browse the shop
                      </Link>
                      .
                    </p>
                  ) : (
                  <OrdersTable orders={orders.slice(0, 5)} formatPrice={format} />
                  )}
                </Card>
              </div>
            )}

            {!loading && tab === "orders" && (
              <Card title="All orders">
                {orders.length === 0 ? (
                  <p className="text-sm text-foreground/60">
                    You haven't placed any orders yet.
                  </p>
                ) : (
                  <OrdersTable orders={orders} formatPrice={format} />
                )}
              </Card>
            )}

            {!loading && tab === "wishlist" && (
              <Card title="Wishlist">
                <p className="text-sm text-foreground/65">
                  {wishlist.length} saved {wishlist.length === 1 ? "item" : "items"}
                </p>
                <Link
                  to="/wishlist"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline font-medium"
                >
                  Open full wishlist →
                </Link>
              </Card>
            )}

            {!loading && tab === "addresses" && (
              <AddressesPanel
                userId={user.id}
                addresses={addresses}
                onChange={refreshAddresses}
              />
            )}

            {!loading && tab === "profile" && (
              <ProfilePanel
                user={{ email: user.email ?? "" }}
                profile={profile}
                onSave={onSaveProfile}
              />
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
};

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-background p-5 md:p-6", className)}>
      <h2 className="font-semibold text-foreground text-base mb-3">{title}</h2>
      {children}
    </section>
  );
}

function OrdersTable({ orders, formatPrice }: { orders: Order[]; formatPrice: (amount: number | null | undefined) => string }) {
  const labelForStatus = (status: string | null | undefined) => {
    if (status === "shipped" || status === "delivered" || status === "cancelled" || status === "returned") {
      return status[0].toUpperCase() + status.slice(1);
    }
    return "Processing";
  };
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-foreground/55 border-b border-border">
            <th className="font-medium py-2 px-2">Order</th>
            <th className="font-medium py-2 px-2">Date</th>
            <th className="font-medium py-2 px-2">Items</th>
            <th className="font-medium py-2 px-2">Total</th>
            <th className="font-medium py-2 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-border last:border-0">
              <td className="py-3 px-2 font-mono text-xs">
                {o.order_number ?? o.id.slice(0, 8)}
              </td>
              <td className="py-3 px-2 text-foreground/70">
                {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
              </td>
              <td className="py-3 px-2 text-foreground/70">{o.items?.length ?? 0}</td>
              <td className="py-3 px-2 font-medium">
                {formatPrice(o.total_inr ?? o.total)}
              </td>
              <td className="py-3 px-2">
                <span className="inline-block rounded-full bg-brand/10 text-brand px-2.5 py-0.5 text-xs font-medium capitalize">
                  {labelForStatus(o.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfilePanel({
  user,
  profile,
  onSave,
}: {
  user: { email: string };
  profile: Profile | null;
  onSave: (p: Partial<Profile>) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [marketing, setMarketing] = useState(profile?.marketing_consent ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setMarketing(profile?.marketing_consent ?? false);
  }, [profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      full_name: fullName || null,
      phone: phone || null,
      marketing_consent: marketing,
    });
    setSaving(false);
  };

  return (
    <Card title="Profile details">
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
        <Field label="Full name" value={fullName} onChange={setFullName} />
        <Field label="Email" value={user.email} disabled />
        <Field label="Phone" value={phone} onChange={setPhone} className="sm:col-span-2" />
        <label className="text-sm sm:col-span-2 mt-1 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="accent-brand"
          />
          <span className="text-foreground/75">Email me about new arrivals and offers</span>
        </label>
        <div className="sm:col-span-2 flex justify-end mt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand text-brand-foreground text-sm font-semibold px-5 py-2.5 hover:opacity-95 disabled:opacity-60 transition-opacity"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function AddressesPanel({
  userId,
  addresses,
  onChange,
}: {
  userId: string;
  addresses: Address[];
  onChange: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Address | null>(null);
  const [adding, setAdding] = useState(false);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    if (await deleteAddress(id)) {
      toast({ title: "Address removed" });
      await onChange();
    }
  };

  const onMakeDefault = async (id: string) => {
    if (await setDefaultAddress(userId, id)) {
      toast({ title: "Default address set" });
      await onChange();
    }
  };

  return (
    <Card title="Saved addresses">
      {addresses.length === 0 && !adding && (
        <p className="text-sm text-foreground/60">No addresses saved yet.</p>
      )}
      <div className="space-y-3">
        {addresses.map((a) => (
          <div
            key={a.id}
            className="rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
          >
            <div className="text-sm leading-relaxed min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{a.full_name}</span>
                {a.is_default && (
                  <span className="inline-flex items-center gap-1 text-xs rounded-full bg-brand/10 text-brand px-2 py-0.5">
                    <Star className="h-3 w-3 fill-current" />
                    Default
                  </span>
                )}
              </div>
              <p className="text-foreground/75">
                {a.address_line_1}
                {a.address_line_2 ? `, ${a.address_line_2}` : ""}
                <br />
                {a.city}
                {a.state ? `, ${a.state}` : ""} {a.postal_code}
                <br />
                {a.country}
                {a.phone ? ` · ${a.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs shrink-0">
              {!a.is_default && (
                <button
                  onClick={() => onMakeDefault(a.id)}
                  className="rounded-md border border-border px-3 py-1.5 hover:border-brand hover:text-brand transition-colors"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => setEditing(a)}
                className="rounded-md border border-border px-3 py-1.5 hover:border-brand hover:text-brand transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(a.id)}
                className="rounded-md border border-border px-3 py-1.5 text-foreground/65 hover:border-destructive hover:text-destructive transition-colors inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding || editing ? (
        <AddressForm
          userId={userId}
          address={editing ?? undefined}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSaved={async () => {
            setEditing(null);
            setAdding(false);
            await onChange();
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-foreground/70 hover:border-brand hover:text-brand transition-colors"
        >
          <Plus className="h-4 w-4" /> Add new address
        </button>
      )}
    </Card>
  );
}

function AddressForm({
  userId,
  address,
  onCancel,
  onSaved,
}: {
  userId: string;
  address?: Address;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: address?.full_name ?? "",
    phone: address?.phone ?? "",
    address_line_1: address?.address_line_1 ?? "",
    address_line_2: address?.address_line_2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postal_code: address?.postal_code ?? "",
    country: address?.country ?? "India",
    type: address?.type ?? "shipping",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = address
      ? await updateAddress(address.id, form)
      : await createAddress(userId, { ...form, is_default: false });
    setSaving(false);
    if (result) {
      toast({ title: address ? "Address updated" : "Address added" });
      onSaved();
    } else {
      toast({ title: "Could not save address", variant: "destructive" });
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 grid sm:grid-cols-2 gap-3 rounded-lg border border-border bg-hero/30 p-4"
    >
      <h3 className="sm:col-span-2 font-semibold text-foreground">
        {address ? "Edit address" : "New address"}
      </h3>
      <Field
        label="Full name"
        value={form.full_name}
        onChange={(v) => setForm({ ...form, full_name: v })}
        required
      />
      <Field
        label="Phone"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />
      <Field
        label="Address line 1"
        value={form.address_line_1}
        onChange={(v) => setForm({ ...form, address_line_1: v })}
        required
        className="sm:col-span-2"
      />
      <Field
        label="Address line 2"
        value={form.address_line_2}
        onChange={(v) => setForm({ ...form, address_line_2: v })}
        className="sm:col-span-2"
      />
      <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
      <Field
        label="State / Region"
        value={form.state}
        onChange={(v) => setForm({ ...form, state: v })}
      />
      <Field
        label="Postal code"
        value={form.postal_code}
        onChange={(v) => setForm({ ...form, postal_code: v })}
        required
      />
      <Field
        label="Country"
        value={form.country}
        onChange={(v) => setForm({ ...form, country: v })}
        required
      />
      <div className="sm:col-span-2 flex gap-2 justify-end mt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-foreground/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand text-brand-foreground text-sm font-semibold px-5 py-2 hover:opacity-95 disabled:opacity-60 transition-opacity"
        >
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  ...props
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="block text-foreground/70 mb-1.5">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-brand transition-colors disabled:bg-foreground/5 disabled:text-foreground/60"
      />
    </label>
  );
}

export default Account;

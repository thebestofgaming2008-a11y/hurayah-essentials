import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Heart, Info, LogOut, Package, Plus, Star, Trash2, User } from "lucide-react";
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

type Tab = "orders" | "wishlist" | "profile";

const Account = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { wishlist } = useShop();
  const { format } = useCurrency();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getProfile(user.id), listUserOrders(user.id), listAddresses(user.id)]).then(([p, o, a]) => {
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
        <div className="commerce-shell mx-auto max-w-[1128px] px-4 py-12 text-[13px] text-[rgb(var(--vibe-muted))]">Loading...</div>
      </SiteLayout>
    );
  }

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Account";

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
    setAddresses(await listAddresses(user.id));
  };

  return (
    <SiteLayout>
      <div className="commerce-shell min-h-[calc(100vh-220px)] bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
        <div className="mx-auto max-w-[1128px] px-4 py-8 md:px-8 md:py-12">
          <header className="mb-8 flex flex-wrap items-center gap-x-7 gap-y-4 border-b border-[rgb(var(--vibe-border))] pb-5 md:mb-12">
            <Link to="/" className="inline-flex items-center gap-2 text-[13px] font-medium text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]">
              <ArrowLeft className="h-4 w-4" />
              Back to store
            </Link>
            <h1 className="text-[22px] font-semibold tracking-tight">Hurayrah Essentials</h1>
            <nav className="order-last flex w-full items-center gap-6 overflow-x-auto text-[13px] sm:order-none sm:w-auto">
              <button onClick={() => setTab("orders")} className={tabClass(tab === "orders")}>Orders</button>
              <button onClick={() => setTab("profile")} className={tabClass(tab === "profile")}>Profile</button>
              <button onClick={() => setTab("wishlist")} className={tabClass(tab === "wishlist")}>Wishlist</button>
            </nav>
            <div className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--vibe-surface))] text-[13px] font-semibold text-[rgb(var(--vibe-muted))]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          </header>

          {loading && <p className="text-[13px] text-[rgb(var(--vibe-muted))]">Loading...</p>}

          {!loading && tab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-[22px] font-semibold">Profile</h2>
              <Card>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold">{displayName}</p>
                      <User className="h-3.5 w-3.5 text-brand" />
                    </div>
                    <p className="mt-5 text-[12px] text-[rgb(var(--vibe-muted))]">Email</p>
                    <p className="mt-1 text-[13px]">{user.email}</p>
                    {profile?.phone && (
                      <>
                        <p className="mt-4 text-[12px] text-[rgb(var(--vibe-muted))]">Phone</p>
                        <p className="mt-1 text-[13px]">{profile.phone}</p>
                      </>
                    )}
                  </div>
                  <ProfileDialogButton user={{ email: user.email ?? "" }} profile={profile} onSave={onSaveProfile} />
                </div>
              </Card>

              <AddressesPanel userId={user.id} addresses={addresses} onChange={refreshAddresses} />

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button onClick={signOut} className="h-12 rounded-md border border-[rgb(var(--vibe-border))] bg-white px-4 text-[13px] font-medium text-brand hover:bg-[rgb(var(--vibe-accent))]">
                  Sign out
                </button>
                <button onClick={signOut} className="text-[13px] font-medium text-brand hover:underline">
                  Sign out of all devices
                </button>
              </div>
            </div>
          )}

          {!loading && tab === "orders" && (
            <div className="space-y-6">
              <h2 className="text-[22px] font-semibold">Orders</h2>
              <Card>
                {orders.length === 0 ? (
                  <p className="text-[13px] text-[rgb(var(--vibe-muted))]">No orders yet. <Link to="/shop" className="text-brand hover:underline">Browse the shop</Link>.</p>
                ) : (
                  <OrdersTable orders={orders} formatPrice={format} />
                )}
              </Card>
            </div>
          )}

          {!loading && tab === "wishlist" && (
            <div className="space-y-6">
              <h2 className="text-[22px] font-semibold">Wishlist</h2>
              <Card>
                <p className="text-[13px] text-[rgb(var(--vibe-muted))]">{wishlist.length} saved {wishlist.length === 1 ? "item" : "items"}</p>
                <Link to="/wishlist" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] font-medium text-brand hover:bg-[rgb(var(--vibe-accent))]">
                  <Heart className="h-4 w-4" />
                  Open wishlist
                </Link>
              </Card>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
};

function tabClass(active: boolean) {
  return cn(
    "border-b border-transparent pb-1 transition-colors hover:text-[rgb(var(--vibe-foreground))]",
    active ? "border-[rgb(var(--vibe-foreground))] text-[rgb(var(--vibe-foreground))]" : "text-[rgb(var(--vibe-muted))]",
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("vibe-card p-5 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.45)] md:p-6", className)}>{children}</section>;
}

function OrdersTable({ orders, formatPrice }: { orders: Order[]; formatPrice: (amount: number | null | undefined) => string }) {
  const labelForStatus = (status: string | null | undefined) => {
    if (status === "shipped" || status === "delivered" || status === "cancelled" || status === "returned") return status[0].toUpperCase() + status.slice(1);
    return "Processing";
  };
  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {orders.map((o) => (
          <article key={o.id} className="rounded-md border border-[rgb(var(--vibe-border))] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[12px]">{o.order_number ?? o.id.slice(0, 8)}</p>
                <p className="mt-1 text-[12px] text-[rgb(var(--vibe-muted))]">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</p>
              </div>
              <span className="inline-flex rounded-full bg-[rgb(var(--vibe-surface))] px-2.5 py-0.5 text-[11px] font-medium">{labelForStatus(o.status)}</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-[rgb(var(--vibe-border))] pt-3 text-[12px]">
              <span className="text-[rgb(var(--vibe-muted))]">{o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"}</span>
              <span className="font-medium">{formatPrice(o.total_inr ?? o.total)}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[rgb(var(--vibe-border))] text-left text-[rgb(var(--vibe-muted))]">
            <th className="py-2 pr-3 font-medium">Order</th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Items</th>
            <th className="py-2 pr-3 font-medium">Total</th>
            <th className="py-2 pr-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-[rgb(var(--vibe-border))] last:border-0">
              <td className="py-3 pr-3 font-mono text-[12px]">{o.order_number ?? o.id.slice(0, 8)}</td>
              <td className="py-3 pr-3 text-[rgb(var(--vibe-muted))]">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
              <td className="py-3 pr-3 text-[rgb(var(--vibe-muted))]">{o.items?.length ?? 0}</td>
              <td className="py-3 pr-3 font-medium">{formatPrice(o.total_inr ?? o.total)}</td>
              <td className="py-3 pr-3">
                <span className="inline-flex rounded-full bg-[rgb(var(--vibe-surface))] px-2.5 py-0.5 text-[12px] font-medium">{labelForStatus(o.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

function ProfileDialogButton({ user, profile, onSave }: { user: { email: string }; profile: Profile | null; onSave: (p: Partial<Profile>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button onClick={() => setEditing(true)} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px] hover:bg-[rgb(var(--vibe-accent))]">Edit details</button>
      {editing && <ProfileModal user={user} profile={profile} onClose={() => setEditing(false)} onSave={onSave} />}
    </>
  );
}

function ProfileModal({ user, profile, onClose, onSave }: { user: { email: string }; profile: Profile | null; onClose: () => void; onSave: (p: Partial<Profile>) => Promise<void> }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [marketing, setMarketing] = useState(profile?.marketing_consent ?? false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ full_name: fullName || null, phone: phone || null, marketing_consent: marketing });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4">
      <form onSubmit={submit} className="vibe-card w-full max-w-[520px] p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Edit profile</h3>
          <button type="button" onClick={onClose} className="text-[12px] text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]">Close</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={fullName} onChange={setFullName} />
          <Field label="Email" value={user.email} disabled />
          <Field label="Phone" value={phone} onChange={setPhone} className="sm:col-span-2" />
          <label className="sm:col-span-2 mt-1 inline-flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-brand" />
            <span className="text-[rgb(var(--vibe-muted))]">Email me about new arrivals and offers</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">Cancel</button>
          <button type="submit" disabled={saving} className="h-9 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

function AddressesPanel({ userId, addresses, onChange }: { userId: string; addresses: Address[]; onChange: () => Promise<void> }) {
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
    <Card>
      <div className="mb-5 flex items-center gap-5">
        <h3 className="text-[14px] font-semibold">Addresses</h3>
        {!adding && !editing && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {addresses.length === 0 && !adding && (
        <div className="flex items-center gap-3 rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))] px-4 py-4 text-[13px] text-[rgb(var(--vibe-muted))]">
          <Info className="h-4 w-4" />
          No addresses added
        </div>
      )}

      <div className="space-y-3">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-md border border-[rgb(var(--vibe-border))] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="text-[13px] leading-relaxed">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.full_name}</span>
                  {a.is_default && <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--vibe-surface))] px-2 py-0.5 text-[11px]"><Star className="h-3 w-3 fill-current" /> Default</span>}
                </div>
                <p className="mt-1 text-[rgb(var(--vibe-muted))]">
                  {a.address_line_1}
                  {a.address_line_2 ? `, ${a.address_line_2}` : ""}
                  <br />
                  {a.city}{a.state ? `, ${a.state}` : ""} {a.postal_code}
                  <br />
                  {a.country}{a.phone ? ` · ${a.phone}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {!a.is_default && <button onClick={() => onMakeDefault(a.id)} className="rounded-md border border-[rgb(var(--vibe-border))] px-3 py-1.5 hover:bg-[rgb(var(--vibe-accent))]">Set default</button>}
                <button onClick={() => setEditing(a)} className="rounded-md border border-[rgb(var(--vibe-border))] px-3 py-1.5 hover:bg-[rgb(var(--vibe-accent))]">Edit</button>
                <button onClick={() => onDelete(a.id)} className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--vibe-border))] px-3 py-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(adding || editing) && (
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
      )}
    </Card>
  );
}

function AddressForm({ userId, address, onCancel, onSaved }: { userId: string; address?: Address; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: address?.full_name ?? "",
    phone: address?.phone ?? "",
    address_line_1: address?.address_line_1 ?? "",
    address_line_2: address?.address_line_2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postal_code: address?.postal_code ?? "",
    country: "India",
    type: address?.type ?? "shipping",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = address ? await updateAddress(address.id, form) : await createAddress(userId, { ...form, is_default: false });
    setSaving(false);
    if (result) {
      toast({ title: address ? "Address updated" : "Address added" });
      onSaved();
    } else {
      toast({ title: "Could not save address", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))] p-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 text-[13px] font-semibold">{address ? "Edit address" : "New address"}</h3>
      <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
      <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <Field label="Address line 1" value={form.address_line_1} onChange={(v) => setForm({ ...form, address_line_1: v })} required className="sm:col-span-2" />
      <Field label="Address line 2" value={form.address_line_2} onChange={(v) => setForm({ ...form, address_line_2: v })} className="sm:col-span-2" />
      <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
      <Field label="State / union territory" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required />
      <Field label="PIN code" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} required />
      <Field label="Country" value={form.country} disabled required />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-[12px]">Cancel</button>
        <button type="submit" disabled={saving} className="h-9 rounded-md bg-[rgb(var(--vibe-foreground))] px-3 text-[12px] font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save address"}</button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, className, ...props }: { label: string; value: string; onChange?: (v: string) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className={cn("block text-[12px]", className)}>
      <span className="mb-1.5 block text-[rgb(var(--vibe-muted))]">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-md border border-[rgb(var(--vibe-border))] bg-white px-3 text-[13px] outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-[rgb(var(--vibe-surface))] disabled:text-[rgb(var(--vibe-muted))]"
      />
    </label>
  );
}

export default Account;

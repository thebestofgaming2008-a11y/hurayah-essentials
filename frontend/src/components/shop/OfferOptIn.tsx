import { useEffect, useState } from "react";
import { Bell, CheckCircle2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { upsertProfile } from "@/services/accountService";

export function OfferOptIn({ className = "" }: { className?: string }) {
  const { user, profile } = useAuth();
  const [enabled, setEnabled] = useState(Boolean(profile?.marketing_consent));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(profile?.marketing_consent));
  }, [profile?.marketing_consent]);

  const openWhatsappOffers = async () => {
    if (user && !enabled && !saving) {
      setSaving(true);
      try {
        const next = await upsertProfile(user.id, user.email ?? null, { marketing_consent: true });
        if (next) setEnabled(true);
      } catch (error) {
        console.error("offer opt-in", error);
        toast({ title: "Could not save your account preference", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
    const message = encodeURIComponent("Assalamu alaikum, I would like to receive Hurayrah Essentials offers and updates on WhatsApp.");
    window.open(`https://wa.me/918491943437?text=${message}`, "_blank", "noopener,noreferrer");
  };

  return (
    <aside className={`rounded-md border border-brand/20 bg-hero/45 p-4 text-left sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
          {enabled ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-foreground">
            {enabled ? "WhatsApp offer preference saved" : "Get special offers on WhatsApp"}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-foreground/65">
            Send us a WhatsApp message to receive occasional price-drop alerts, limited offers, and store updates.
          </p>
          <button
            type="button"
            onClick={openWhatsappOffers}
            disabled={saving}
            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-green-600 px-4 text-[12px] font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />
            {saving ? "Saving..." : "Open WhatsApp"}
          </button>
        </div>
      </div>
    </aside>
  );
}

import { useEffect, useState } from "react";
import { Bell, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { upsertProfile } from "@/services/accountService";

const WHATSAPP_COMMUNITIES = {
  brothers: "https://chat.whatsapp.com/ItGQ3rtedokE2FRVna0seJ?mode=gi_t",
  sisters: "https://chat.whatsapp.com/DqHKsd7ALCV1pn4CXu5Lc3?mode=gi_t",
};
const OFFER_OPT_IN_IGNORED_KEY = "hurayah_offer_opt_in_ignored";

export function OfferOptIn({ className = "" }: { className?: string }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(OFFER_OPT_IN_IGNORED_KEY) === "true") return;
    const timer = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const ignoreForever = () => {
    window.localStorage.setItem(OFFER_OPT_IN_IGNORED_KEY, "true");
    setOpen(false);
  };

  const joinCommunity = async (community: keyof typeof WHATSAPP_COMMUNITIES) => {
    if (user && !profile?.marketing_consent && !saving) {
      setSaving(true);
      try {
        await upsertProfile(user.id, user.email ?? null, { marketing_consent: true });
      } catch (error) {
        console.error("offer opt-in", error);
        toast({ title: "Could not save your account preference", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
    window.open(WHATSAPP_COMMUNITIES[community], "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand/20 bg-white px-4 text-[12px] font-semibold text-brand shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        <Bell className="h-4 w-4" />
        Join offers groups
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="commerce-card-in w-full max-w-[390px] rounded-lg border border-brand/15 bg-white p-5 text-left shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-600 text-white">
                <MessageCircle className="h-5 w-5" />
              </span>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-foreground/55 hover:bg-hero/60" aria-label="Close offers popup">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-4 text-[19px] font-semibold text-foreground">Get offers and announcements</h2>
            <p className="mt-2 text-[13px] leading-6 text-foreground/65">
              Choose the right Hurayrah Essentials WhatsApp group for restocks, offers, and store announcements.
            </p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => joinCommunity("brothers")} disabled={saving} className="h-11 rounded-md bg-green-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60">
                {saving ? "Saving..." : "Join brothers group"}
              </button>
              <button type="button" onClick={() => joinCommunity("sisters")} disabled={saving} className="h-11 rounded-md border border-green-600 bg-white px-4 text-[13px] font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60">
                {saving ? "Saving..." : "Join sisters group"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-border px-4 text-[12px] font-medium text-foreground/70 hover:bg-hero/50">
                  Maybe later
                </button>
                <button type="button" onClick={ignoreForever} className="h-10 rounded-md px-4 text-[12px] font-medium text-foreground/60 underline decoration-foreground/35 underline-offset-4 transition-colors hover:bg-hero/40 hover:text-foreground">
                  Ignore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

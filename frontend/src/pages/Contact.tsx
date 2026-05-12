import { Mail, Phone, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { toast } from "@/hooks/use-toast";

const Contact = () => (
  <SiteLayout>
    <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-12 md:py-20">
      <h1 className="text-foreground italic font-bold tracking-tight text-3xl md:text-5xl">Get in touch</h1>
      <p className="mt-2 text-foreground/65 max-w-xl">We typically reply within one business day.</p>

      <div className="mt-10 grid md:grid-cols-[1fr_320px] gap-8">
        <form
          onSubmit={(e) => { e.preventDefault(); toast({ title: "Message sent", description: "We'll be in touch soon." }); }}
          className="rounded-2xl border border-border bg-background p-5 md:p-6 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name" required />
            <Field label="Email" type="email" required />
          </div>
          <Field label="Subject" required />
          <label className="block text-sm">
            <span className="block text-foreground/70 mb-1.5">Message</span>
            <textarea required rows={5} className="w-full rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-brand" />
          </label>
          <button className="inline-flex items-center justify-center rounded-md bg-brand text-brand-foreground font-semibold px-6 py-3 hover:opacity-95">
            Send message
          </button>
        </form>

        <aside className="space-y-3">
          <Info Icon={Mail} label="Email" value="hello@hurayrahessentials.com" />
          <Info Icon={Phone} label="Phone" value="+91 22 0000 0000" />
          <Info Icon={MapPin} label="Office" value="Mumbai, India" />
        </aside>
      </div>
    </div>
  </SiteLayout>
);

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5">{label}</span>
      <input {...props} className="w-full rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-brand" />
    </label>
  );
}

function Info({ Icon, label, value }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-hero/30 p-4 flex items-start gap-3">
      <span className="h-10 w-10 grid place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="text-xs text-foreground/55">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default Contact;
import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";

const WHATSAPP_NUMBER = "918491943437";

const Contact = () => (
  <SiteLayout>
    <main className="bg-hero">
      <div className="mx-auto max-w-[1120px] px-4 py-10 md:px-8 md:py-14">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-hero-foreground md:text-4xl">Contact Us</h1>
          <p className="mt-4 text-sm text-hero-foreground/70 md:text-base">
            Have questions about your order or need assistance? We're here to help!
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-[1fr_1.05fr] md:items-center">
          <section className="rounded-md border border-hero-foreground/15 bg-white/45 px-8 py-10 text-center md:px-10">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
              <Phone className="h-8 w-8" />
            </div>
            <h2 className="mt-7 text-xl font-semibold text-hero-foreground">Chat with us on WhatsApp</h2>
            <p className="mx-auto mt-6 max-w-[360px] text-sm leading-relaxed text-hero-foreground/70">
              Fastest way to reach us. Get instant replies about orders, products, or any questions.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mt-6 inline-flex h-11 w-full max-w-[366px] items-center justify-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
            >
              <Phone className="h-4 w-4" />
              Open WhatsApp
            </a>
            <p className="mt-6 text-xs text-hero-foreground/65">+91 84919 43437</p>
          </section>

          <section className="space-y-6">
            <Info Icon={Mail} label="Email" value="abuhurayrahessentials@gmail.com" />
            <Info Icon={Phone} label="Phone" value="+91 84919 43437" />
            <Info Icon={Instagram} label="Instagram" value="@hurayrah_essentials" />
            <Info Icon={MapPin} label="Location" value="Kursoo Bund Road, Srinagar, Kashmir" />
            <Info Icon={Clock} label="Business Hours" value={"Monday - Saturday: 10:00 AM - 7:00 PM\nSunday: Closed"} />
          </section>
        </div>
      </div>
    </main>
  </SiteLayout>
);

function Info({ Icon, label, value }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-200/80 text-hero-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="pt-0.5">
        <p className="font-semibold text-hero-foreground">{label}</p>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-hero-foreground/70">{value}</p>
      </div>
    </div>
  );
}

export default Contact;

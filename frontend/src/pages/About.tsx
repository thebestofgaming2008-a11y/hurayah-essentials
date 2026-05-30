import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";

const About = () => (
  <SiteLayout>
    <section className="bg-hero">
      <div className="mx-auto max-w-[900px] px-4 md:px-8 py-16 md:py-24 text-center">
        <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-brand">Our story</p>
        <h1 className="mt-2 text-foreground italic font-bold tracking-tight text-3xl md:text-5xl lg:text-6xl">
          Seeking knowledge, made affordable.
        </h1>
        <p className="mt-4 text-foreground/65 text-base md:text-lg">
          Hurayrah Essentials began with a simple promise: bring authentic Islamic books, modest clothing
          and everyday essentials to seekers across India — at honest prices and with a touch of care.
        </p>
      </div>
    </section>

    <section className="bg-background border-t border-border">
      <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-14 md:py-20 grid md:grid-cols-3 gap-6">
        {[
          { title: "Authenticity", desc: "Every title we stock is reviewed for authenticity and accuracy of source." },
          { title: "Affordability", desc: "Fair prices that respect both the seeker and the craft." },
          { title: "Care", desc: "Thoughtful packaging, friendly humans, and a commitment to your experience." },
        ].map((v) => (
          <div key={v.title} className="rounded-2xl border border-border bg-hero/30 p-6">
            <h3 className="font-semibold text-lg text-foreground">{v.title}</h3>
            <p className="mt-2 text-sm text-foreground/65 leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center pb-16">
        <Link to="/shop" className="inline-flex items-center gap-2 rounded-md bg-brand text-brand-foreground font-semibold px-6 py-3 hover:opacity-95">
          Browse products <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  </SiteLayout>
);

export default About;

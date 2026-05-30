import { Navigate, useParams } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";

const PAGES: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping",
    body: [
      "We currently deliver within India only.",
      "Shipping across India is included in product prices.",
      "Tracking is shared after dispatch.",
    ],
  },
  returns: {
    title: "Returns",
    body: [
      "Return unused items within 7 days of delivery after contacting support.",
      "Original packaging is required. Custom or final-sale items are excluded.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We collect only what is needed to fulfil orders and support customers.",
      "We never sell your data. You can request deletion at any time.",
    ],
  },
  terms: {
    title: "Terms",
    body: [
      "By using this site you agree to our terms of sale and acceptable-use policy.",
      "Product details are checked before launch, but availability and pricing may change.",
    ],
  },
};

const Static = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? PAGES[slug] : undefined;
  if (!page) return <Navigate to="/" replace />;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-[760px] px-4 py-12 md:px-8 md:py-20">
        <h1 className="text-3xl font-bold italic tracking-tight text-foreground md:text-5xl">{page.title}</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-foreground/75">
          {page.body.map((p) => <p key={p}>{p}</p>)}
        </div>
      </div>
    </SiteLayout>
  );
};

export default Static;

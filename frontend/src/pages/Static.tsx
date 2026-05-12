import { useParams, Navigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";

const PAGES: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping",
    body: [
      "We ship to over 30 countries via tracked services.",
      "Free standard shipping on orders over ₹999. Express options available at checkout.",
      "Most orders are dispatched within 1–2 business days.",
    ],
  },
  returns: {
    title: "Returns",
    body: [
      "Not in love with your order? Return any unused item within 7 days of delivery for a full refund.",
      "Original packaging required. Custom or final-sale items are excluded.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We collect only what's needed to fulfil your orders and improve your experience.",
      "We never sell your data. You can request deletion at any time.",
    ],
  },
  terms: {
    title: "Terms",
    body: [
      "By using this site you agree to our terms of sale and acceptable-use policy.",
      "All content © Hurayrah Essentials. Product images are for illustration.",
    ],
  },
  reviews: {
    title: "Reviews",
    body: [
      "Read honest reviews from our growing community of seekers.",
      "Tag us @hurayrahessentials on Instagram to be featured.",
    ],
  },
};

const Static = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? PAGES[slug] : undefined;
  if (!page) return <Navigate to="/" replace />;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-[760px] px-4 md:px-8 py-12 md:py-20">
        <h1 className="text-foreground italic font-bold tracking-tight text-3xl md:text-5xl">{page.title}</h1>
        <div className="mt-6 space-y-4 text-foreground/75 leading-relaxed">
          {page.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </SiteLayout>
  );
};

export default Static;
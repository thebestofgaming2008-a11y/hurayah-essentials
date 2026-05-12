import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import logo from "@/assets/logo-header.png";

const COLS = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/shop" },
      { label: "Books", to: "/category/books" },
      { label: "Clothing", to: "/category/clothes" },
      { label: "Kufi", to: "/category/kufi" },
      { label: "Women", to: "/category/women" },
      { label: "Essentials", to: "/category/essentials" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Track order", to: "/track" },
      { label: "Shipping", to: "/shipping" },
      { label: "Returns", to: "/returns" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Reviews", to: "/reviews" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-12 md:py-16 grid gap-10 md:grid-cols-4">
        <div>
          <img src={logo} alt="Hurayrah Essentials" className="h-10 w-auto object-contain mb-3" />
          <p className="text-foreground/60 text-sm max-w-xs">
            Seeking knowledge, made affordable. Authentic books, clothing and essentials shipped worldwide.
          </p>
          <a
            href="https://instagram.com/hurayrahessentials"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-brand transition-colors"
          >
            <Instagram className="h-4 w-4" />
            @hurayrahessentials
          </a>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-foreground mb-3 text-sm">{col.title}</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-brand transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-foreground/55">
          <p>© {new Date().getFullYear()} Hurayrah Essentials. All rights reserved.</p>
          <p>Made with care for the seekers of knowledge.</p>
        </div>
      </div>
    </footer>
  );
}
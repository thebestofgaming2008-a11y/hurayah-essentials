import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import logo from "@/assets/logo-header.png";
import { PaymentMethods } from "@/components/shop/PaymentMethods";

const COLS = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/shop" },
      { label: "Books", to: "/shop?category=books" },
      { label: "Clothing", to: "/shop?category=clothing" },
      { label: "Women", to: "/shop?category=women" },
      { label: "Essentials", to: "/shop?category=children" },
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
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer data-site-footer className="border-t border-border bg-background">
      {!compact && (
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 md:grid-cols-4 md:px-8 md:py-16">
          <div>
            <img src={logo} alt="Hurayrah Essentials" className="mb-3 h-10 w-auto object-contain" />
            <p className="max-w-xs text-sm text-foreground/60">
              Seeking knowledge, made affordable. Authentic books, clothing and essentials delivered across India.
            </p>
            <a
              href="https://instagram.com/hurayrah_essentials"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-brand"
            >
              <Instagram className="h-4 w-4" />
              @hurayrah_essentials
            </a>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="transition-colors hover:text-brand">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-border">
        <div className="commerce-shell mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 text-[12px] text-[rgb(var(--vibe-muted))] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>© {new Date().getFullYear()} Hurayrah Essentials. All rights reserved.</p>
          <PaymentMethods compact />
        </div>
      </div>
    </footer>
  );
}

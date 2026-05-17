import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { CartDrawer } from "@/components/shop/CommerceDrawers";

export function SiteLayout({
  children,
  hideHeader = false,
  compactFooter = false,
}: {
  children: React.ReactNode;
  hideHeader?: boolean;
  compactFooter?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!hideHeader && <SiteHeader />}
      <main className="page-enter flex-1">{children}</main>
      <SiteFooter compact={compactFooter} />
      <CartDrawer />
    </div>
  );
}

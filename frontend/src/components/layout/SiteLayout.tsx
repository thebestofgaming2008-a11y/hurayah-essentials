import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { DeferredCartDrawer } from "@/components/shop/DeferredCartDrawer";

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
      <main className="flex-1">{children}</main>
      <SiteFooter compact={compactFooter} />
      <DeferredCartDrawer />
    </div>
  );
}

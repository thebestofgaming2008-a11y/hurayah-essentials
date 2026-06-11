import { lazy, Suspense, useEffect, useState } from "react";
import { useShop } from "@/store/shop";

const LazyCartDrawer = lazy(() =>
  import("@/components/shop/CommerceDrawers").then((module) => ({
    default: module.CartDrawer,
  })),
);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function DeferredCartDrawer() {
  const { cartOpen, cartLines } = useShop();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (cartOpen || cartLines.length > 0) setShouldLoad(true);
  }, [cartLines.length, cartOpen]);

  useEffect(() => {
    if (shouldLoad || typeof window === "undefined") return;

    const idleWindow = window as IdleWindow;
    const load = () => setShouldLoad(true);
    const idleHandle = idleWindow.requestIdleCallback?.(load, { timeout: 7000 });
    const timer = idleHandle == null ? window.setTimeout(load, 5500) : null;

    return () => {
      if (idleHandle != null) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [shouldLoad]);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <LazyCartDrawer />
    </Suspense>
  );
}

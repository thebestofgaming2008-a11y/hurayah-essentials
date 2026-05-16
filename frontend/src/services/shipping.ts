export const FREE_SHIPPING_THRESHOLD_INR = 999;
export const STANDARD_SHIPPING_INR = 79;
export const DEFAULT_PRODUCT_WEIGHT_G = 350;

export type ShippingLine = {
  qty: number;
  weightG?: number | null;
  shippingClass?: string | null;
};

function lineWeight(line: ShippingLine) {
  const qty = Math.max(1, Math.floor(line.qty || 1));
  const baseWeight = Number.isFinite(line.weightG ?? NaN) && (line.weightG ?? 0) > 0 ? Number(line.weightG) : DEFAULT_PRODUCT_WEIGHT_G;
  return baseWeight * qty;
}

export function calculateShippingInr(subtotal: number, lines: ShippingLine[] = []): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD_INR) return 0;
  const totalWeight = lines.reduce((sum, line) => sum + lineWeight(line), 0);
  if (totalWeight <= 500) return STANDARD_SHIPPING_INR;
  return STANDARD_SHIPPING_INR + Math.ceil((totalWeight - 500) / 500) * 45;
}

export function shippingLabel(subtotal: number, lines: ShippingLine[] = []): string {
  const shipping = calculateShippingInr(subtotal, lines);
  return shipping === 0 ? "Free" : `₹${shipping}`;
}

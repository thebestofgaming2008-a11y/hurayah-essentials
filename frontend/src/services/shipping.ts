export const FREE_SHIPPING_THRESHOLD_INR = 999;
export const STANDARD_SHIPPING_INR = 79;

export function calculateShippingInr(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD_INR ? 0 : STANDARD_SHIPPING_INR;
}

export function shippingLabel(subtotal: number): string {
  return calculateShippingInr(subtotal) === 0 ? "Free" : `₹${STANDARD_SHIPPING_INR}`;
}

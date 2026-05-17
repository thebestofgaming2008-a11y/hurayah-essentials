import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import type { CartLine } from "@/store/shop";
import { checkoutShippingForCountry } from "./shipping";

export interface CheckoutCustomer {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export const shippingRate = (_subtotal: number, _cart: CartLine[] = [], country = "India") => checkoutShippingForCountry(country).amount;

export async function createMockedRazorpayOrder(args: {
  cart: CartLine[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return await convex.mutation(api.orders.createMockCheckoutOrder, args);
}

export async function createRazorpayCheckoutOrder(args: {
  cart: CartLine[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return await convex.action(api.orders.createRazorpayCheckoutOrder, args);
}

export async function verifyRazorpayPayment(args: {
  cart: CartLine[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return await convex.action(api.orders.verifyRazorpayPayment, args);
}

export async function trackOrder(orderNumber: string, email: string) {
  return await convex.query(api.orders.getByNumber, { orderNumber, email });
}

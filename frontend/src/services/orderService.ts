import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import type { CartLine } from "@/store/shop";
import { calculateShippingInr } from "./shipping";

export interface CheckoutCustomer {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code: string;
  country: string;
}

export const shippingRate = calculateShippingInr;

export async function createMockedRazorpayOrder(args: {
  cart: CartLine[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return await convex.mutation(api.orders.createMockCheckoutOrder, args);
}

export async function trackOrder(orderNumber: string, email: string) {
  return await convex.query(api.orders.getByNumber, { orderNumber, email });
}

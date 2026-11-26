import { z } from "zod";

/**
 * Checkout "Your details" step. Mirrors the server-side re-validation in
 * supabase/functions/create-order (field codes fullName/email/phone/city), so a
 * server 422 maps straight back onto the same form fields.
 */
export const checkoutDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name as it should appear on the receipt."),
  email: z.string().trim().email("Enter a valid email address, for example name@example.com."),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9."),
  city: z.string().trim().min(2, "Enter your city."),
});

export type CheckoutDetailsInput = z.input<typeof checkoutDetailsSchema>;
export type CheckoutDetails = z.output<typeof checkoutDetailsSchema>;

export const CHECKOUT_FIELDS = ["fullName", "email", "phone", "city"] as const;
export type CheckoutField = (typeof CHECKOUT_FIELDS)[number];

export function isCheckoutField(value: string): value is CheckoutField {
  return (CHECKOUT_FIELDS as readonly string[]).includes(value);
}

export type PaymentMethod = "upi" | "card" | "netbanking";

/** Fictional UPI handle check for the simulated UPI option (never a real VPA lookup). */
export const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

/** Effective price a course is sold at: a valid discount below list price wins (same rule as create-order). */
export function effectiveCoursePrice(price: number | null, discountPrice: number | null): number {
  const list = price ?? 0;
  if (discountPrice != null && discountPrice >= 0 && discountPrice < list) return discountPrice;
  return list;
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

const METHOD_LABELS: Record<string, string> = { upi: "UPI", card: "Card", netbanking: "Net banking" };

/** Display label for a stored payment method code ("upi" -> "UPI"). */
export function paymentMethodLabel(method: string | null | undefined): string | null {
  if (!method) return null;
  return METHOD_LABELS[method] ?? method;
}

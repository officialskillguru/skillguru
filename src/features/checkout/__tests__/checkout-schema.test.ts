import { describe, expect, it } from "vitest";
import { checkoutDetailsSchema, effectiveCoursePrice, formatInr, isCheckoutField, UPI_ID_PATTERN } from "../checkout-schema";

const valid = { fullName: "Riya Sharma", email: "riya@example.com", phone: "98765 43210", city: "Pune" };

describe("checkoutDetailsSchema", () => {
  it("accepts valid details and normalises the phone number", () => {
    const parsed = checkoutDetailsSchema.parse({ ...valid, phone: "+91 98765-43210" });
    expect(parsed.phone).toBe("9876543210");
    expect(parsed.fullName).toBe("Riya Sharma");
  });

  it("reports every invalid field by name", () => {
    const result = checkoutDetailsSchema.safeParse({ fullName: "R", email: "riya@", phone: "12345", city: " " });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["fullName", "email", "phone", "city"]));
  });

  it("rejects mobile numbers that do not start with 6-9", () => {
    expect(checkoutDetailsSchema.safeParse({ ...valid, phone: "5876543210" }).success).toBe(false);
  });

  it("maps server field codes back onto form fields", () => {
    expect(isCheckoutField("phone")).toBe(true);
    expect(isCheckoutField("already_enrolled")).toBe(false);
  });
});

describe("pricing helpers", () => {
  it("uses a valid discount below list price, otherwise the list price", () => {
    expect(effectiveCoursePrice(14999, null)).toBe(14999);
    expect(effectiveCoursePrice(14999, 11999)).toBe(11999);
    expect(effectiveCoursePrice(14999, 14999)).toBe(14999);
    expect(effectiveCoursePrice(null, null)).toBe(0);
  });

  it("formats INR with Indian digit grouping", () => {
    expect(formatInr(124999)).toBe("₹1,24,999");
  });

  it("validates the fictional UPI handle shape", () => {
    expect(UPI_ID_PATTERN.test("riya.sharma@okdemo")).toBe(true);
    expect(UPI_ID_PATTERN.test("not-a-upi")).toBe(false);
  });
});

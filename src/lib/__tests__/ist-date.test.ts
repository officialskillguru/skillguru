import { describe, expect, it } from "vitest";
import { formatIstSession, formatIstTime, relativeIstDay, todayInIst } from "../date";

describe("IST helpers", () => {
  it("computes today's IST date independent of the viewer's zone", () => {
    // 20:00 UTC on 25 Nov is already 01:30 on 26 Nov in India.
    expect(todayInIst(new Date("2026-11-25T20:00:00Z"))).toBe("2026-11-26");
    expect(todayInIst(new Date("2026-11-25T10:00:00Z"))).toBe("2026-11-25");
  });

  it("formats stored IST wall-clock times without shifting them", () => {
    expect(formatIstTime("20:15:00")).toBe("8:15 PM");
    expect(formatIstSession("2026-11-25", "19:00:00", "20:30:00")).toBe("Wed, 25 Nov 2026 · 7:00 PM – 8:30 PM IST");
  });

  it("labels today and tomorrow relative to IST", () => {
    const now = new Date("2026-11-25T10:00:00Z");
    expect(relativeIstDay("2026-11-25", now)).toBe("Today");
    expect(relativeIstDay("2026-11-26", now)).toBe("Tomorrow");
    expect(relativeIstDay("2026-11-28", now)).toBe("Sat, 28 Nov 2026");
  });
});

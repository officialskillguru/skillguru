import { describe, expect, it } from "vitest";

import { submitLead } from "@/services/leads";

describe("submitLead", () => {
  it("rejects invalid contact payloads before persistence", async () => {
    await expect(submitLead("contact", { email: "bad" })).rejects.toThrow("Please check the form details");
  });
});

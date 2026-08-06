import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as SharedModule from "../_shared";

// ─── Chainable Supabase query-builder mock (same pattern as courses.service.test.ts) ───
type QueryResult = { data: unknown; error: unknown };

function makeQueryResult(result: QueryResult) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        const promise = Promise.resolve(result);
        return promise.then.bind(promise);
      }
      if (prop === "catch" || prop === "finally") {
        const promise = Promise.resolve(result);
        return (promise as unknown as Record<string, unknown>)[prop];
      }
      return () => proxy;
    },
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

describe("announcements.service", () => {
  let fromResults: Record<string, QueryResult>;
  let rpcResults: Record<string, { data: unknown; error: unknown }>;
  let authUser: { id: string } | null;
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    auth: { getUser: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.resetModules();
    fromResults = {};
    rpcResults = {};
    authUser = { id: "mentor-1" };

    mockSupabase = {
      from: vi.fn((table: string) => makeQueryResult(fromResults[table] ?? { data: null, error: null })),
      rpc: vi.fn((fn: string) => Promise.resolve(rpcResults[fn] ?? { data: null, error: null })),
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: authUser } })) },
    };
  });

  async function loadService() {
    vi.doMock("../_shared", async () => {
      const actual = await vi.importActual<typeof SharedModule>("../_shared");
      return { ...actual, getSupabaseClientOrThrow: () => mockSupabase };
    });
    return import("../announcements.service");
  }

  const baseCampaign = {
    id: "camp-1",
    name: "Welcome back",
    type: "announcement",
    body: "Hello students",
    subject: null,
    sender_id: "mentor-1",
    audience_type: "my_students",
    course_id: null,
    status: "draft",
    scheduled_at: null,
    sent_at: null,
    target_role: null,
    total_recipients: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("createAnnouncement throws when there is no authenticated user", async () => {
    authUser = null;
    const { createAnnouncement } = await loadService();
    await expect(createAnnouncement({ name: "x", body: "y", audienceType: "my_students" })).rejects.toThrow(
      "You must be signed in to create an announcement."
    );
  });

  it("createAnnouncement always inserts type='announcement' and the caller as sender", async () => {
    fromResults.campaigns = { data: { ...baseCampaign }, error: null };
    const { createAnnouncement } = await loadService();
    const result = await createAnnouncement({ name: "Welcome back", body: "Hello students", audienceType: "my_students" });

    expect(mockSupabase.from).toHaveBeenCalledWith("campaigns");
    expect(result.type).toBe("announcement");
    expect(result.sender_id).toBe("mentor-1");
  });

  it("listMyAnnouncements returns [] when there is no authenticated user", async () => {
    authUser = null;
    const { listMyAnnouncements } = await loadService();
    const result = await listMyAnnouncements();
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalledWith("campaigns");
  });

  it("listMyAnnouncements fetches the caller's own campaigns", async () => {
    fromResults.campaigns = { data: [{ ...baseCampaign }], error: null };
    const { listMyAnnouncements } = await loadService();
    const result = await listMyAnnouncements();
    expect(result).toHaveLength(1);
  });

  it("resolveAnnouncementAudience calls the server-side RPC and returns the resolved count", async () => {
    rpcResults.resolve_campaign_audience = { data: 3, error: null };
    const { resolveAnnouncementAudience } = await loadService();
    const count = await resolveAnnouncementAudience("camp-1");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("resolve_campaign_audience", {
      p_campaign_id: "camp-1",
      p_selected_recipient_ids: undefined,
    });
    expect(count).toBe(3);
  });

  it("resolveAnnouncementAudience surfaces an RPC error (e.g. addressing an audience the caller isn't allowed to reach)", async () => {
    rpcResults.resolve_campaign_audience = { data: null, error: { message: "Only an admin may address all students" } };
    const { resolveAnnouncementAudience } = await loadService();
    await expect(resolveAnnouncementAudience("camp-1")).rejects.toThrow("Only an admin may address all students");
  });

  it("listAnnouncementRecipients fetches recipients for a campaign", async () => {
    fromResults.campaign_recipients = {
      data: [{ id: "r1", campaign_id: "camp-1", recipient_id: "student-1", status: "pending", sent_at: null, opened_at: null }],
      error: null,
    };
    const { listAnnouncementRecipients } = await loadService();
    const result = await listAnnouncementRecipients("camp-1");
    expect(result).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith("campaign_recipients");
  });
});

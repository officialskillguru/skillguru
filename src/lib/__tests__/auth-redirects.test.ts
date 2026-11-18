import { describe, expect, it, vi } from "vitest";
import {
  getAuthRedirectOrigin,
  getEmailConfirmationRedirectUrl,
  getPasswordResetRedirectUrl,
  parseAuthUrl,
} from "@/lib/auth/redirects";

describe("auth redirect URLs", () => {
  it("uses the origin actually serving the app, never a hardcoded host", () => {
    expect(getAuthRedirectOrigin()).toBe(window.location.origin);
    expect(getEmailConfirmationRedirectUrl()).toBe(`${window.location.origin}/auth/callback`);
    expect(getPasswordResetRedirectUrl()).toBe(`${window.location.origin}/reset-password`);
  });

  it.each([
    ["https://skillguru-india.vercel.app/signup", "https://skillguru-india.vercel.app"],
    ["http://localhost:5173/signup", "http://localhost:5173"],
  ])("on %s links point back to %s", (href, expected) => {
    vi.stubGlobal("window", { location: new URL(href) });
    try {
      expect(getEmailConfirmationRedirectUrl()).toBe(`${expected}/auth/callback`);
      expect(getPasswordResetRedirectUrl()).toBe(`${expected}/reset-password`);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("parseAuthUrl", () => {
  it("detects a successful implicit-flow signup confirmation", () => {
    const r = parseAuthUrl(
      "https://skillguru-india.vercel.app/auth/callback#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer&type=signup",
    );
    expect(r.error).toBeNull();
    expect(r.type).toBe("signup");
    expect(r.hasAccessToken).toBe(true);
  });

  it("flags an expired / already-used link from the hash", () => {
    const r = parseAuthUrl(
      "https://skillguru-india.vercel.app/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect(r.error).toEqual({
      code: "otp_expired",
      description: "Email link is invalid or has expired",
      expired: true,
    });
    expect(r.hasAccessToken).toBe(false);
  });

  it("reads errors from the query string too", () => {
    const r = parseAuthUrl("http://localhost:5173/reset-password?error=access_denied&error_code=otp_expired");
    expect(r.error?.expired).toBe(true);
  });

  it("reads PKCE code and token_hash params", () => {
    expect(parseAuthUrl("https://x.test/auth/callback?code=123").code).toBe("123");
    const t = parseAuthUrl("https://x.test/auth/callback?token_hash=th&type=signup");
    expect(t.tokenHash).toBe("th");
    expect(t.type).toBe("signup");
  });

  it("returns empty params for a plain URL or garbage input", () => {
    expect(parseAuthUrl("https://x.test/auth/callback")).toEqual({
      error: null,
      type: null,
      hasAccessToken: false,
      code: null,
      tokenHash: null,
    });
    expect(parseAuthUrl("not a url").error).toBeNull();
    expect(parseAuthUrl(null).error).toBeNull();
  });
});

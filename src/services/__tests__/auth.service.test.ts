import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from "vitest";
import type { User } from "@supabase/supabase-js";
import { SingleFlight } from "../auth/SingleFlight";
import { AuthCooldownStore } from "../auth/AuthCooldownStore";
import { normalizeSignupInput, normalizeEmail } from "../auth/normalizeAuthInput";
import { AuthService } from "../auth.service";
import type { IAuthRepository } from "../../repositories/interfaces/IAuthRepository";
import { ok, fail, RateLimitError } from "../../utils/result";
import { authTelemetry } from "../auth/AuthTelemetry";

const mockUser = {} as User;

describe("SingleFlight", () => {
  it("allows independent locks by key", () => {
    const lock = new SingleFlight();
    expect(lock.acquire("signup")).toBe(true);
    expect(lock.acquire("signin")).toBe(true);
    expect(lock.isRunning("signup")).toBe(true);
    expect(lock.isRunning("signin")).toBe(true);
  });

  it("blocks concurrent identical operations", () => {
    const lock = new SingleFlight();
    expect(lock.acquire("signup")).toBe(true);
    expect(lock.acquire("signup")).toBe(false);
  });

  it("allows re-acquisition after release", () => {
    const lock = new SingleFlight();
    expect(lock.acquire("signup")).toBe(true);
    lock.release("signup");
    expect(lock.acquire("signup")).toBe(true);
  });
});

describe("AuthCooldownStore", () => {
  let store: AuthCooldownStore;

  beforeEach(() => {
    store = new AuthCooldownStore();
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets and enforces cooldown", () => {
    store.setCooldown("signup", 60000);
    expect(store.isCoolingDown("signup")).toBe(true);
    expect(store.getRemainingMs("signup")).toBe(60000);
  });

  it("expires cooldown over time", () => {
    store.setCooldown("signup", 60000);
    vi.advanceTimersByTime(30000);
    expect(store.getRemainingMs("signup")).toBe(30000);
    expect(store.isCoolingDown("signup")).toBe(true);

    vi.advanceTimersByTime(30000);
    expect(store.getRemainingMs("signup")).toBe(0);
    expect(store.isCoolingDown("signup")).toBe(false);
  });
});

describe("normalizeAuthInput", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  TEST@example.com  ")).toBe("test@example.com");
    // Strip zero-width characters
    expect(normalizeEmail("te\u200Bst@example.com")).toBe("test@example.com");
  });

  it("normalizes signup input without altering password", () => {
    const input = {
      email: " User@EXAMPLE.com ",
      fullName: "  John   Doe  ",
      password: "  Password123  ",
      role: "student",
    };
    const expected = {
      email: "user@example.com",
      fullName: "John Doe",
      password: "  Password123  ", // Not mutated
      role: "student",
    };
    expect(normalizeSignupInput(input)).toEqual(expected);
  });
});

describe("AuthService", () => {
  let mockRepo: Mocked<IAuthRepository>;
  let service: AuthService;

  beforeEach(() => {
    mockRepo = {
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      resendVerificationEmail: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    };
    service = new AuthService(mockRepo);
    sessionStorage.clear();
    vi.spyOn(authTelemetry, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes and validates input before passing to repository", async () => {
    mockRepo.signUp.mockResolvedValue(ok({ user: mockUser, session: null }));
    
    await service.signup({
      email: " TEST@example.com ",
      fullName: "Test User",
      password: "password123",
      role: "student",
    });

    expect(mockRepo.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      fullName: "Test User",
      password: "password123",
      role: "student",
    });
  });

  it("blocks duplicate submissions via SingleFlight", async () => {
    // Make repo call hang slightly to test concurrency
    mockRepo.signUp.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(ok({ user: mockUser, session: null })), 10)));

    const promise1 = service.signup({ email: "test@example.com", fullName: "Test", password: "password123", role: "student" });
    const promise2 = service.signup({ email: "test@example.com", fullName: "Test", password: "password123", role: "student" });

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error.developerMessage).toBe("DUPLICATE_SUBMIT");
    }
    
    expect(mockRepo.signUp).toHaveBeenCalledTimes(1);
  });

  it("applies cooldown on RateLimitError", async () => {
    mockRepo.signUp.mockResolvedValue(
      fail(new RateLimitError("Rate limited", "OVER_EMAIL_SEND_RATE_LIMIT", 60000))
    );

    const result1 = await service.signup({ email: "test@example.com", fullName: "Test", password: "password123", role: "student" });
    expect(result1.success).toBe(false);

    // Second call should be blocked by cooldown without hitting repo
    const result2 = await service.signup({ email: "test@example.com", fullName: "Test", password: "password123", role: "student" });
    
    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error.developerMessage).toBe("COOLDOWN_ACTIVE");
    }

    expect(mockRepo.signUp).toHaveBeenCalledTimes(1);
  });
});

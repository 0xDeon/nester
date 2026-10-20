import { describe, it, expect, beforeEach, vi } from "vitest";

describe("token-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("keeps the access token in memory and never writes it to localStorage", async () => {
    const { setAccessToken, getAccessToken } = await import("@/lib/auth/token-store");

    setAccessToken("jwt-secret");

    expect(getAccessToken()).toBe("jwt-secret");
    expect(Object.values(window.localStorage)).not.toContain("jwt-secret");
    expect(window.localStorage.getItem("nester_auth_token")).toBeNull();
  });

  it("removes the legacy localStorage access token on first load", async () => {
    window.localStorage.setItem("nester_auth_token", "legacy-jwt");

    const { getAccessToken } = await import("@/lib/auth/token-store");

    expect(window.localStorage.getItem("nester_auth_token")).toBeNull();
    expect(getAccessToken()).toBe("");
  });

  it("clearTokens drops the in-memory token", async () => {
    const { setAccessToken, getAccessToken, clearTokens } = await import("@/lib/auth/token-store");

    setAccessToken("jwt");
    clearTokens();

    expect(getAccessToken()).toBe("");
  });

  it("notifies subscribers when the token changes", async () => {
    const { setAccessToken, clearTokens, subscribeAccessToken } = await import("@/lib/auth/token-store");
    const listener = vi.fn();
    const unsubscribe = subscribeAccessToken(listener);

    setAccessToken("a");
    clearTokens();
    unsubscribe();
    setAccessToken("b");

    expect(listener.mock.calls).toEqual([["a"], [""]]);
  });
});

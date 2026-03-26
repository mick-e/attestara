import { describe, it, expect, beforeEach } from "vitest";
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
} from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should store and retrieve access token", () => {
    setTokens("access-123", "refresh-456");
    expect(getAccessToken()).toBe("access-123");
  });

  it("should store and retrieve refresh token", () => {
    setTokens("access-123", "refresh-456");
    expect(getRefreshToken()).toBe("refresh-456");
  });

  it("should return null when no access token is stored", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("should return null when no refresh token is stored", () => {
    expect(getRefreshToken()).toBeNull();
  });

  it("should clear both tokens", () => {
    setTokens("access-123", "refresh-456");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("should report authenticated when access token exists", () => {
    setTokens("access-123", "refresh-456");
    expect(isAuthenticated()).toBe(true);
  });

  it("should report not authenticated when no access token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("should report not authenticated after clearing tokens", () => {
    setTokens("access-123", "refresh-456");
    clearTokens();
    expect(isAuthenticated()).toBe(false);
  });

  it("should overwrite existing tokens", () => {
    setTokens("old-access", "old-refresh");
    setTokens("new-access", "new-refresh");
    expect(getAccessToken()).toBe("new-access");
    expect(getRefreshToken()).toBe("new-refresh");
  });
});

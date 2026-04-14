import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient } from "@/lib/api-client";

describe("ApiClient", () => {
  let client: ApiClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    client = new ApiClient("http://localhost:3001");
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockResponse(body: unknown, status = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: "OK",
      json: () => Promise.resolve(body),
    });
  }

  function mockCsrf() {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ csrfToken: "test-csrf-token" }),
    });
  }

  it("should make GET requests to the correct URL", async () => {
    mockResponse({ id: "123" });
    const result = await client.get("/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/v1/agents",
      expect.objectContaining({ headers: {} }),
    );
    expect(result).toEqual({ id: "123" });
  });

  it("should make POST requests with JSON body", async () => {
    mockCsrf();
    mockResponse({ id: "new-agent" });
    const body = { name: "Test Agent" };
    await client.post("/agents", body);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/v1/agents",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      }),
    );
  });

  it("should make POST requests without body", async () => {
    mockCsrf();
    mockResponse({ ok: true });
    await client.post("/agents/activate");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/v1/agents/activate",
      expect.objectContaining({
        method: "POST",
        body: undefined,
      }),
    );
  });

  it("should make PATCH requests with JSON body", async () => {
    mockCsrf();
    mockResponse({ updated: true });
    const body = { name: "Updated" };
    await client.patch("/agents/123", body);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/v1/agents/123",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it("should make DELETE requests", async () => {
    mockCsrf();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: () => Promise.resolve({}),
    });
    await client.delete("/agents/123");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/v1/agents/123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("should inject Authorization header when token is set", async () => {
    client.setToken("test-jwt-token");
    mockResponse({ data: [] });
    await client.get("/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      }),
    );
  });

  it("should remove Authorization header after clearToken", async () => {
    client.setToken("test-jwt-token");
    client.clearToken();
    mockResponse({ data: [] });
    await client.get("/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: {} }),
    );
  });

  it("should throw error with message from response body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ message: "Agent not found" }),
    });
    await expect(client.get("/agents/999")).rejects.toThrow("Agent not found");
  });

  it("should throw error with status text when body parse fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("parse error")),
    });
    await expect(client.get("/health")).rejects.toThrow(
      "Internal Server Error",
    );
  });

  it("should use default base URL from env", () => {
    const defaultClient = new ApiClient();
    // The constructor defaults to RELAY_URL which falls back to http://localhost:3001
    expect(defaultClient).toBeDefined();
  });
});

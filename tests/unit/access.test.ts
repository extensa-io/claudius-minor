import { afterEach, describe, expect, it, vi } from "vitest";
import { accessError } from "@/lib/access";

const code = "a-long-private-presenter-code";
const request = (value?: string) => new Request("http://localhost/api/users", { headers: value === undefined ? {} : { "x-access-code": value } });

afterEach(() => vi.unstubAllEnvs());

describe("presenter access", () => {
  it("fails closed in production without a configured code", () => {
    expect(accessError(request(), { NODE_ENV: "production" })?.status).toBe(503);
    expect(accessError(request(), { NODE_ENV: "production", APP_ACCESS_CODE: "" })?.status).toBe(503);
    expect(accessError(request(), { APP_ACCESS_CODE: "short" })?.status).toBe(503);
  });

  it("allows local development without a code", () => {
    expect(accessError(request(), { NODE_ENV: "development" })).toBeNull();
  });

  it("requires the exact code in a header, not a cookie or URL", () => {
    const source = { APP_ACCESS_CODE: code };
    expect(accessError(request(), source)?.status).toBe(401);
    expect(accessError(request("wrong"), source)?.status).toBe(401);
    expect(accessError(request(code.toUpperCase()), source)?.status).toBe(401);
    expect(accessError(new Request(`http://localhost/api/users?accessCode=${code}`, { headers: { cookie: `accessCode=${code}` } }), source)?.status).toBe(401);
    expect(accessError(request(code), source)).toBeNull();
  });

  it("guards every API handler before database or inference work", async () => {
    vi.stubEnv("APP_ACCESS_CODE", code);
    const handlers = [
      (await import("@/app/api/users/route")).GET,
      (await import("@/app/api/users/switch/route")).POST,
      (await import("@/app/api/chat/route")).POST,
      (await import("@/app/api/reset/route")).POST,
      (await import("@/app/api/conversations/route")).GET,
      (await import("@/app/api/conversations/[id]/route")).GET,
      (await import("@/app/api/memories/route")).GET,
      (await import("@/app/api/memories/[id]/route")).DELETE,
    ];
    for (const handler of handlers) {
      const response = await handler(request(), { params: Promise.resolve({ id: "invalid" }) });
      expect(response.status).toBe(401);
    }
  });
});

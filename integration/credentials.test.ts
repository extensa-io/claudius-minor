import { describe, expect, it } from "vitest";

describe.skipIf(!process.env.MONGODB_URI || !process.env.DO_MODEL_ACCESS_KEY || !process.env.TAVILY_API_KEY)("external service integration", () => {
  it("requires Atlas, DigitalOcean, and Tavily credentials for live checks", () => {
    expect(process.env.MONGODB_URI).toBeTruthy();
    expect(/^(sk-do-|dop_v1_|doo_v1_)/.test(process.env.DO_MODEL_ACCESS_KEY ?? "")).toBe(true);
    expect(process.env.TAVILY_API_KEY).toBeTruthy();
  });
});

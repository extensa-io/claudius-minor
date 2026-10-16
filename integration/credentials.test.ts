import { describe, expect, it } from "vitest";

describe.skipIf(!process.env.MONGODB_URI || !process.env.DO_MODEL_ACCESS_KEY || !process.env.TAVILY_API_KEY)("external service integration", () => {
  it("requires Atlas, DigitalOcean, and Tavily credentials for live checks", () => {
    expect(process.env.MONGODB_URI).toBeTruthy();
    expect(process.env.DO_MODEL_ACCESS_KEY).toMatch(/^sk-do-/);
    expect(process.env.TAVILY_API_KEY).toBeTruthy();
  });
});

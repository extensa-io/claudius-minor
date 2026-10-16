import { describe, expect, it } from "vitest";

describe("search result contract", () => {
  it("uses the canonical title, URL, and snippet fields", () => {
    const map = (result: { title: string; url: string; content: string }) => ({ title: result.title, url: result.url, snippet: result.content });
    expect(map({ title: "MongoDB", url: "https://mongodb.com", content: "Database" })).toEqual({ title: "MongoDB", url: "https://mongodb.com", snippet: "Database" });
  });
});

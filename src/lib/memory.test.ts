import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { assembleMemoryBlock, decideMemoryAction, extractUserText } from "@/lib/memory";
import type { Candidate } from "@/lib/schemas";

const candidate: Candidate = { content: "Prefers TypeScript", category: "preference", confidence: 0.9, importance: 0.6 };

describe("memory action", () => {
  it("skips same-category duplicates", () => {
    expect(decideMemoryAction(candidate, [{ _id: new ObjectId(), content: "Prefers TypeScript", category: "preference", score: 0.97 }]).action).toBe("skip");
  });
  it("supersedes a near neighbor and inserts for unrelated categories", () => {
    expect(decideMemoryAction(candidate, [{ _id: new ObjectId(), content: "Uses JavaScript", category: "preference", score: 0.9 }]).action).toBe("supersede");
    expect(decideMemoryAction(candidate, [{ _id: new ObjectId(), content: "Uses TypeScript", category: "fact", score: 0.99 }]).action).toBe("insert");
  });
  it("inserts unrelated memories", () => expect(decideMemoryAction(candidate, []).action).toBe("insert"));
});

describe("extraction filtering", () => {
  it("respects the watermark and excludes tool messages", () => {
    expect(extractUserText([{ type: "human", content: "old" }, { type: "human", content: "new" }, { type: "tool", content: "search result" }, { type: "ai", content: "reply" }], 1)).toBe("new\nreply");
  });
});

describe("memory block", () => {
  it("deduplicates across profile and relevant results", () => {
    const memory = { _id: new ObjectId(), content: "Lives in Toronto", category: "fact" as const, importance: 0.9 };
    const result = assembleMemoryBlock([memory], [memory]);
    expect(result.memories).toHaveLength(1);
    expect(result.text).toContain("Lives in Toronto");
  });
});

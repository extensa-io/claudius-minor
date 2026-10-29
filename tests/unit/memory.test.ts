import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  assembleMemoryBlock,
  decideMemoryAction,
  extractUserText,
} from "@/lib/memory";
import type { Candidate } from "@/lib/schemas";

const candidate: Candidate = {
  content: "Prefers TypeScript",
  category: "preference",
  confidence: 0.9,
  importance: 0.6,
};

describe("memory action", () => {
  it.skip("skips same-category duplicates", () => {
    expect(
      decideMemoryAction(candidate, [
        {
          _id: new ObjectId(),
          content: "Prefers TypeScript",
          category: "preference",
          score: 0.97,
        },
      ]).action,
    ).toBe("skip");
  });
  it.skip("requires a confirmed replacement even when extraction changes categories", () => {
    const previous = {
      _id: new ObjectId(),
      content: "Uses JavaScript",
      category: "preference" as const,
      score: 0.9,
    };
    expect(
      decideMemoryAction(candidate, [previous], {
        previousId: previous._id.toString(),
        relation: "replacement",
      }).action,
    ).toBe("supersede");
    expect(decideMemoryAction(candidate, [previous]).action).toBe("insert");
    const changedCategory = { ...previous, category: "context" as const };
    expect(
      decideMemoryAction(candidate, [changedCategory], {
        previousId: previous._id.toString(),
        relation: "replacement",
      }).action,
    ).toBe("supersede");
    expect(
      decideMemoryAction(candidate, [
        {
          _id: new ObjectId(),
          content: "Uses TypeScript",
          category: "fact",
          score: 0.99,
        },
      ]).action,
    ).toBe("insert");
  });
  it("does not replace a compatible fact even at high similarity", () => {
    const previous = {
      _id: new ObjectId(),
      content: "Enjoys TypeScript conferences",
      category: "preference" as const,
      score: 0.99,
    };
    expect(
      decideMemoryAction(candidate, [previous], {
        previousId: previous._id.toString(),
        relation: "compatible",
      }).action,
    ).toBe("insert");
    expect(
      decideMemoryAction(candidate, [previous], {
        previousId: new ObjectId().toString(),
        relation: "replacement",
      }).action,
    ).toBe("insert");
  });
  it("inserts unrelated memories", () =>
    expect(decideMemoryAction(candidate, []).action).toBe("insert"));
  it.skip("skips identical text even if the query score is lower", () => {
    expect(
      decideMemoryAction(candidate, [
        {
          _id: new ObjectId(),
          content: "Prefers TypeScript!",
          category: "preference",
          score: 0.8,
        },
      ]).action,
    ).toBe("skip");
  });
});

describe("extraction filtering", () => {
  it("respects the watermark and excludes tool messages", () => {
    expect(
      extractUserText(
        [
          { type: "human", content: "old" },
          { type: "human", content: "new" },
          { type: "tool", content: "search result" },
          { type: "ai", content: "reply" },
        ],
        1,
      ),
    ).toBe("new\nreply");
  });
});

describe("memory block", () => {
  it("deduplicates across profile and relevant results", () => {
    const memory = {
      _id: new ObjectId(),
      content: "Lives in Toronto",
      category: "fact" as const,
      importance: 0.9,
    };
    const result = assembleMemoryBlock([memory], [memory]);
    expect(result.memories).toHaveLength(1);
    expect(result.text).toContain("Lives in Toronto");
  });
});

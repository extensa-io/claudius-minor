import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type { Candidate } from "@/lib/schemas";
import { decideMemoryAction } from "@/lib/memory";

const candidate: Candidate = {
  content: "Lives in Montreal",
  category: "fact",
  confidence: 0.9,
  importance: 0.8,
};

describe("supersession lineage", () => {
  it("creates a new version that can point to the prior memory", () => {
    const previous = {
      _id: new ObjectId(),
      content: "Lives in Toronto",
      category: "fact" as const,
      score: 0.91,
    };
    const decision = decideMemoryAction(candidate, [previous], {
      previousId: previous._id.toString(),
      relation: "replacement",
    });
    expect(decision.action).toBe("supersede");
    if (decision.action === "supersede")
      expect(decision.previous._id).toEqual(previous._id);
  });
});

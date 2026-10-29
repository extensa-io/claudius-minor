import { ObjectId } from "mongodb";
import { describe, it, expect } from "vitest";
import { env } from "@/lib/env";
import { collections, getClient, getDb } from "@/lib/db";
import { persistCandidate } from "@/lib/persistence";
import { ensureVectorIndex } from "../../scripts/spikes/atlas-common";

const enabled =
  env.MONGODB_URI && env.DO_MODEL_ACCESS_KEY && env.EXTRACTION_MODEL;
describe.skipIf(!enabled)("memory persistence flow", () => {
  it("deduplicates paraphrases, replaces changed cities, and preserves compatible facts", async () => {
    const userId = new ObjectId();
    const conversationId = new ObjectId();
    const memories = await collections.memories();
    await ensureVectorIndex(
      (await getDb()).collection("memories"),
      "memories_vector",
    );
    const save = (content: string) =>
      persistCandidate(
        { content, category: "fact", importance: 0.8, confidence: 0.95 },
        userId,
        conversationId,
      );
    try {
      await save("The user currently lives in Toronto.");
      await save("Toronto is the user's current home city.");
      expect(await memories.countDocuments({ userId, status: "active" })).toBe(
        1,
      );
      await save("The user now lives in Montreal.");
      const active = await memories
        .find({ userId, status: "active" })
        .toArray();
      expect(active).toHaveLength(1);
      expect(active[0].content).toContain("Montreal");
      const previous = await memories.findOne({ userId, status: "superseded" });
      expect(previous?.supersededBy?.equals(active[0]._id)).toBe(true);
      expect(active[0].supersedes?.equals(previous!._id)).toBe(true);
      await save("The user enjoys visiting Toronto art galleries.");
      expect(await memories.countDocuments({ userId, status: "active" })).toBe(
        2,
      );
      expect(await memories.countDocuments({ userId: new ObjectId() })).toBe(0);
    } finally {
      await memories.deleteMany({ userId });
      await (await getClient()).close();
    }
  }, 750_000);
});

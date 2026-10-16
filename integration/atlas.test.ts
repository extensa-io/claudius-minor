import { ObjectId } from "mongodb";
import { afterAll, describe, expect, it } from "vitest";
import { getClient, getDb } from "@/lib/db";
import { env } from "@/lib/env";

const enabled = Boolean(env.MONGODB_URI);
const inserted: ObjectId[] = [];

describe.skipIf(!enabled)("Atlas vector integration", () => {
  it("has a ready index and isolates persona filters", async () => {
    const memories = (await getDb()).collection("integration_memories");
    await memories.createSearchIndex({ name: "integration_vector", type: "vectorSearch", definition: { fields: [
      { type: "autoEmbed", path: "content", model: "voyage-4", similarity: "cosine" },
      { type: "filter", path: "userId" }, { type: "filter", path: "status" },
    ] } });
    const userA = new ObjectId();
    const userB = new ObjectId();
    const a = await memories.insertOne({ content: "Angela is learning pottery", userId: userA, status: "active" });
    inserted.push(a.insertedId);
    const deadline = Date.now() + 180_000;
    let hits: unknown[] = [];
    while (Date.now() < deadline) {
      const indexes = await memories.listSearchIndexes().toArray() as Array<{ name: string; status?: string }>;
      if (indexes.some((index) => index.name === "integration_vector" && index.status === "READY")) {
        hits = await memories.aggregate([{ $vectorSearch: { index: "integration_vector", path: "content", query: { text: "Angela pottery", model: "voyage-4" }, numCandidates: 10, limit: 5, filter: { userId: { $eq: userB }, status: { $eq: "active" } } } }]).toArray();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    expect(hits).toHaveLength(0);
  }, 240_000);
  afterAll(async () => { if (env.MONGODB_URI) { await (await getDb()).collection("integration_memories").deleteMany({ _id: { $in: inserted } }); await (await getDb()).collection("integration_memories").dropSearchIndex("integration_vector").catch(() => undefined); await (await getClient()).close(); } });
});

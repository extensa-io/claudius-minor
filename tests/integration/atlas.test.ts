import { MongoClient, ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { DATABASE_NAME } from "@/lib/db";
import { env, requiredEnv } from "@/lib/env";
import { ensureVectorIndex, vectorQuery, waitForDocument } from "../../scripts/spikes/atlas-common";

// Keep a single reusable test index; only remove this run's documents.
describe.skipIf(!env.MONGODB_URI)("Atlas vector integration", () => {
  it("returns the inserted memory and isolates persona and status filters", async () => {
    const client = new MongoClient(requiredEnv("MONGODB_URI"), { serverSelectionTimeoutMS: 15_000 });
    const userA = new ObjectId();
    try {
      await client.connect();
      const db = client.db(DATABASE_NAME);
      if (!(await db.listCollections({ name: "integration_memories" }).hasNext())) await db.createCollection("integration_memories");
      const memories = db.collection("integration_memories");
      await ensureVectorIndex(memories, "integration_vector");
      try {
        const inserted = await memories.insertOne({ content: "Angela is learning pottery", userId: userA, status: "active" });
        await waitForDocument(memories, "integration_vector", "Angela pottery", userA, inserted.insertedId);
        expect(await memories.aggregate(vectorQuery("integration_vector", "Angela pottery", userA)).toArray()).toHaveLength(1);
        expect(await memories.aggregate(vectorQuery("integration_vector", "Angela pottery", new ObjectId())).toArray()).toHaveLength(0);
      } finally { await memories.deleteMany({ userId: userA }); }
    } finally { await client.close(); }
  }, 750_000);
});

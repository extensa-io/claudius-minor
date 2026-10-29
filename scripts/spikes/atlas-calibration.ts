import { MongoClient, ObjectId } from "mongodb";
import { DATABASE_NAME } from "../../src/lib/db";
import { requiredEnv } from "../../src/lib/env";
import { vectorQuery, waitForDocument } from "./atlas-common";

async function main() {
  const client = new MongoClient(requiredEnv("MONGODB_URI"), {
    serverSelectionTimeoutMS: 15_000,
  });
  try {
    await client.connect();
    const collection = client.db(DATABASE_NAME).collection("spike_memories");
    const results = [];
    for (const right of [
      "Lives in Toronto",
      "Now based in Montreal",
      "Lives in Montreal",
      "Owns a dog",
    ]) {
      const userId = new ObjectId();
      const left = "Lives in Toronto";
      try {
        const inserted = await collection.insertOne({
          content: left,
          userId,
          status: "active",
        });
        await waitForDocument(
          collection,
          "memories_vector_spike",
          left,
          userId,
          inserted.insertedId,
        );
        const hits = await collection
          .aggregate(vectorQuery("memories_vector_spike", right, userId))
          .toArray();
        if (
          typeof hits[0]?.score !== "number" ||
          !Number.isFinite(hits[0].score)
        )
          throw new Error("No finite calibration score returned.");
        results.push({ left, right, score: hits[0].score });
      } finally {
        await collection.deleteMany({ userId });
      }
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await client.close();
  }
}
main().catch(() => {
  console.error(
    "Atlas calibration failed; completed scores not available. Check permissions and index readiness.",
  );
  process.exitCode = 1;
});

import { MongoClient, ObjectId } from "mongodb";
import { DATABASE_NAME } from "../../src/lib/db";
import { requiredEnv } from "../../src/lib/env";
import { waitForDocument } from "./atlas-common";

async function main() {
  const client = new MongoClient(requiredEnv("MONGODB_URI"), {
    serverSelectionTimeoutMS: 15_000,
  });
  const userId = new ObjectId();
  try {
    await client.connect();
    const collection = client.db(DATABASE_NAME).collection("spike_memories");
    const samples: number[] = [];
    try {
      for (let index = 0; index < 10; index += 1) {
        const content = `Lag sample ${index} ${new ObjectId()}`;
        const started = Date.now();
        const inserted = await collection.insertOne({
          content,
          userId,
          status: "active",
        });
        await waitForDocument(
          collection,
          "memories_vector_spike",
          content,
          userId,
          inserted.insertedId,
        );
        samples.push(Date.now() - started);
      }
      const sorted = samples.toSorted((a, b) => a - b);
      console.log({
        samplesMs: samples,
        minMs: sorted[0],
        medianMs: (sorted[4] + sorted[5]) / 2,
        maxMs: sorted.at(-1),
      });
    } finally {
      await collection.deleteMany({ userId });
    }
  } finally {
    await client.close();
  }
}
main().catch(() => {
  console.error(
    "Atlas lag spike failed; no completed measurement reported. Check index readiness and permissions.",
  );
  process.exitCode = 1;
});

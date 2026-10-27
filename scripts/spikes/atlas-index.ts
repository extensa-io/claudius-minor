import { MongoClient } from "mongodb";
import { DATABASE_NAME } from "../../src/lib/db";
import { requiredEnv } from "../../src/lib/env";
import { ensureVectorIndex } from "./atlas-common";

async function main() {
  const client = new MongoClient(requiredEnv("MONGODB_URI"), { serverSelectionTimeoutMS: 15_000 });
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    if (!(await db.listCollections({ name: "spike_memories" }).hasNext())) await db.createCollection("spike_memories");
    await ensureVectorIndex(db.collection("spike_memories"), "memories_vector_spike");
    console.log("Atlas Automated Embedding index is READY and queryable.");
  } finally { await client.close(); }
}
main().catch((error: unknown) => {
  const detail = error as { name?: string; code?: number; codeName?: string };
  console.error("Atlas index spike failed:", { name: detail.name, code: detail.code, codeName: detail.codeName });
  process.exitCode = 1;
});

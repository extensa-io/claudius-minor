import { MongoClient, ObjectId } from "mongodb";
import { DATABASE_NAME } from "../src/lib/db";
import { requiredEnv } from "../src/lib/env";
import { ensureVectorIndex } from "./spikes/atlas-common";

async function main() {
  const client = new MongoClient(requiredEnv("MONGODB_URI"), { serverSelectionTimeoutMS: 15_000 });
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    for (const name of ["users", "conversations", "memories", "checkpoints", "checkpoint_writes"]) {
      if (!(await db.listCollections({ name }, { nameOnly: true }).hasNext())) await db.createCollection(name);
    }
    await db.collection("conversations").createIndex({ userId: 1, updatedAt: -1 }, { name: "userId_updatedAt" });
    await db.collection("memories").createIndex({ userId: 1, status: 1, importance: -1 }, { name: "userId_status_importance" });
    await db.collection("checkpoint_writes").createIndex({ checkpoint_ns: 1, thread_id: 1, checkpoint_id: 1 }, { name: "checkpoint_ns_thread_id_checkpoint_id" });
    await db.collection("checkpoint_writes").createIndex({ checkpoint_id: 1, checkpoint_ns: 1, thread_id: 1 }, { name: "checkpoint_id_checkpoint_ns_thread_id" });
    await db.collection("checkpoints").createIndex({ thread_id: 1, checkpoint_ns: 1, checkpoint_id: -1 }, { name: "thread_id_checkpoint_ns_checkpoint_id" });
    await ensureVectorIndex(db.collection("memories"), "memories_vector");
    for (const name of ["Angela", "Betty", "Caroline"]) {
      await db.collection("users").updateOne({ name }, { $setOnInsert: { _id: new ObjectId(), name } }, { upsert: true });
    }
    console.log("Claudius Minor database is ready.");
  } finally { await client.close(); }
}
main().catch((error: unknown) => {
  const detail = error as { name?: string; code?: number; codeName?: string };
  console.error("Database setup failed:", { name: detail.name, code: detail.code, codeName: detail.codeName });
  process.exitCode = 1;
});

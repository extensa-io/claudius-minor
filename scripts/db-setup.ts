import { ObjectId } from "mongodb";
import { requiredEnv } from "../src/lib/env";
import { getDb } from "../src/lib/db";

requiredEnv("MONGODB_URI");
const db = await getDb();
const users = db.collection("users");
const conversations = db.collection("conversations");
const memories = db.collection("memories");
const checkpoints = db.collection("checkpoints");
const checkpointWrites = db.collection("checkpoint_writes");
for (const name of ["users", "conversations", "memories", "checkpoints", "checkpoint_writes"]) {
  if (!(await db.listCollections({ name }, { nameOnly: true }).hasNext())) await db.createCollection(name);
}
await conversations.createIndex({ userId: 1, updatedAt: -1 }, { name: "userId_updatedAt" });
await memories.createIndex({ userId: 1, status: 1, importance: -1 }, { name: "userId_status_importance" });
await checkpointWrites.createIndex({ checkpoint_ns: 1, thread_id: 1, checkpoint_id: 1 }, { name: "checkpoint_ns_thread_id_checkpoint_id" });
await checkpointWrites.createIndex({ checkpoint_id: 1, checkpoint_ns: 1, thread_id: 1 }, { name: "checkpoint_id_checkpoint_ns_thread_id" });
await checkpoints.createIndex({ thread_id: 1, checkpoint_ns: 1, checkpoint_id: -1 }, { name: "thread_id_checkpoint_ns_checkpoint_id" });
const present = await memories.listSearchIndexes().toArray();
if (!present.some((index) => index.name === "memories_vector")) {
  await memories.createSearchIndex({ name: "memories_vector", type: "vectorSearch", definition: { fields: [
    { type: "autoEmbed", path: "content", model: "voyage-4", similarity: "cosine" },
    { type: "filter", path: "userId" }, { type: "filter", path: "status" },
  ] } });
}
let ready = false;
for (let attempt = 0; attempt < 120; attempt += 1) {
  const index = (await memories.listSearchIndexes().toArray()).find((entry) => entry.name === "memories_vector") as { status?: string } | undefined;
  if (index?.status === "READY") { ready = true; break; }
  if (index?.status === "FAILED") throw new Error("Atlas failed to build memories_vector.");
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!ready) throw new Error("Timed out waiting for memories_vector to become READY.");
for (const name of ["Angela", "Betty", "Caroline"] as const) {
  await users.updateOne({ name }, { $setOnInsert: { _id: new ObjectId(), name } }, { upsert: true });
}
console.log("Claudius Minor database is ready.");

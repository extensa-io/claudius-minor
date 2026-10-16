import { requiredEnv } from "../../src/lib/env";
import { getDb } from "../../src/lib/db";

requiredEnv("MONGODB_URI");
const db = await getDb();
const collection = db.collection("spike_memories");
await collection.createSearchIndex({ name: "memories_vector_spike", type: "vectorSearch", definition: { fields: [
  { type: "autoEmbed", path: "content", model: "voyage-4", similarity: "cosine" },
  { type: "filter", path: "userId" }, { type: "filter", path: "status" },
] } });
console.log(await collection.listSearchIndexes().toArray());

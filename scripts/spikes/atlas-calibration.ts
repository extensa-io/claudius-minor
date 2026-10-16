import { ObjectId } from "mongodb";
import { getDb } from "../../src/lib/db";
import { requiredEnv } from "../../src/lib/env";

requiredEnv("MONGODB_URI");
const collection = (await getDb()).collection("spike_memories");
const userId = new ObjectId();
const pairs = [
  ["Lives in Toronto", "Lives in Toronto"],
  ["Lives in Toronto", "Now based in Montreal"],
  ["Lives in Toronto", "Lives in Montreal"],
  ["Lives in Toronto", "Owns a dog"],
];
for (const [left, right] of pairs) {
  await collection.insertOne({ content: left, userId, status: "active" });
  const result = await collection.aggregate([{ $vectorSearch: { index: "memories_vector_spike", path: "content", query: { text: right }, numCandidates: 20, limit: 1, filter: { userId: { $eq: userId }, status: { $eq: "active" } } } }, { $addFields: { score: { $meta: "vectorSearchScore" } } }, { $project: { score: 1 } }]).toArray();
  console.log(JSON.stringify({ left, right, score: result[0]?.score }));
}

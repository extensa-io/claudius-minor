import { ObjectId } from "mongodb";
import { getDb } from "../../src/lib/db";
import { requiredEnv } from "../../src/lib/env";

requiredEnv("MONGODB_URI");
const collection = (await getDb()).collection("spike_memories");
const userId = new ObjectId();
const samples: number[] = [];
for (let index = 0; index < 10; index += 1) {
  const content = `Lag sample ${index} ${new ObjectId().toString()}`;
  const started = Date.now();
  await collection.insertOne({ content, userId, status: "active" });
  while (Date.now() - started < 120_000) {
    const found = await collection.aggregate([{ $vectorSearch: { index: "memories_vector_spike", path: "content", query: { text: content }, numCandidates: 10, limit: 1, filter: { userId: { $eq: userId }, status: { $eq: "active" } } } }]).toArray();
    if (found.length) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  samples.push(Date.now() - started);
}
console.log({ samples, min: Math.min(...samples), median: samples.toSorted((a,b) => a-b)[Math.floor(samples.length / 2)], max: Math.max(...samples) });

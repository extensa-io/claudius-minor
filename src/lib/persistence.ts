import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import type { Candidate } from "@/lib/schemas";
import { classifyMemoryRelation } from "@/lib/memory-relation";
import { decideMemoryAction, type MemoryHit } from "@/lib/memory";

export async function persistCandidate(candidate: Candidate, userId: ObjectId, conversationId: ObjectId): Promise<void> {
  const memories = await collections.memories();
  const neighbors = await memories.aggregate<MemoryHit & { score: number }>([
    { $vectorSearch: {
      index: "memories_vector",
      path: "content",
      query: { text: candidate.content },
      numCandidates: 100,
      limit: 10,
      filter: { userId: { $eq: userId }, status: { $eq: "active" } },
    } },
    { $addFields: { score: { $meta: "vectorSearchScore" } } },
    { $project: { _id: 1, content: 1, category: 1, score: 1 } },
  ]).toArray();
  // Include unindexed recent writes so one extraction batch can deduplicate itself.
  const recent = await memories.find({ userId, status: "active" }).sort({ createdAt: -1 }).limit(20).toArray();
  const hits = [...neighbors];
  for (const memory of recent) if (!hits.some((hit) => hit._id.equals(memory._id))) hits.push({ ...memory, score: 0 });
  const exact = decideMemoryAction(candidate, hits);
  if (exact.action === "skip") return;
  const decision = decideMemoryAction(candidate, hits, await classifyMemoryRelation(candidate, hits));
  if (decision.action === "skip") return;

  const inserted = await memories.insertOne({
    userId,
    content: candidate.content,
    category: candidate.category,
    importance: candidate.importance,
    sourceConversationId: conversationId,
    createdAt: new Date(),
    status: "active",
    ...(decision.action === "supersede" ? { supersedes: decision.previous._id } : {}),
  });
  if (decision.action === "supersede") {
    await memories.updateOne(
      { _id: decision.previous._id, userId, status: "active" },
      { $set: { status: "superseded", supersededBy: inserted.insertedId } },
    );
  }
}

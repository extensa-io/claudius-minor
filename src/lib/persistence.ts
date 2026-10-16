import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import type { Candidate } from "@/lib/schemas";
import { decideMemoryAction, type MemoryHit } from "@/lib/memory";

export async function persistCandidate(candidate: Candidate, userId: ObjectId, conversationId: ObjectId): Promise<void> {
  const memories = await collections.memories();
  const neighbors = await memories.aggregate<MemoryHit & { score: number }>([
    { $vectorSearch: {
      index: "memories_vector",
      path: "content",
      query: { text: candidate.content, model: "voyage-4" },
      numCandidates: 100,
      limit: 10,
      filter: { userId: { $eq: userId }, status: { $eq: "active" } },
    } },
    { $addFields: { score: { $meta: "vectorSearchScore" } } },
    { $project: { _id: 1, content: 1, category: 1, score: 1 } },
  ]).toArray();
  const decision = decideMemoryAction(candidate, neighbors);
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

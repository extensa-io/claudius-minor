import { collections } from "@/lib/db";
import type { Candidate } from "@/lib/schemas";
import type { ObjectId } from "mongodb";

export async function persistCandidate(candidate: Candidate, userId: ObjectId, conversationId: ObjectId): Promise<void> {
  // TODO(step-2)
  await (await collections.memories()).insertOne({
    userId,
    content: candidate.content,
    category: candidate.category,
    importance: candidate.importance,
    sourceConversationId: conversationId,
    createdAt: new Date(),
    status: "active",
  });
}

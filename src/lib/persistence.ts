import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import type { Candidate } from "@/lib/schemas";

export async function persistCandidate(
  candidate: Candidate,
  userId: ObjectId,
  conversationId: ObjectId,
): Promise<void> {
  const memories = await collections.memories();
  // TODO step 4: compare existing facts before inserting or superseding.
  await memories.insertOne({
    userId,
    content: candidate.content,
    category: candidate.category,
    importance: candidate.importance,
    sourceConversationId: conversationId,
    createdAt: new Date(),
    status: "active",
  });
}

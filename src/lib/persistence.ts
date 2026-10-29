import { ObjectId } from "mongodb";
import type { Candidate } from "@/lib/schemas";

export async function persistCandidate(
  candidate: Candidate,
  userId: ObjectId,
  conversationId: ObjectId,
): Promise<void> {
  // TODO step 3: store extracted memories with owner and source metadata.
  void candidate;
  void userId;
  void conversationId;
}

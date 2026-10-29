import { collections } from "@/lib/db";

// Step 2 persists conversation headers alongside durable graph checkpoints.
export const getConversationStore = collections.conversations;

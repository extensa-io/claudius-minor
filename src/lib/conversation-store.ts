import { getTransientConversationStore } from "@/lib/transient-conversations";

// TODO step 2: persist headers alongside durable graph checkpoints.
export const getConversationStore = getTransientConversationStore;

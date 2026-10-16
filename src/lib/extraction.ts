import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { env, requiredEnv } from "@/lib/env";
import { ExtractionOutputSchema } from "@/lib/schemas";
import { parseCandidates, extractUserText } from "@/lib/memory";
import { persistCandidate } from "@/lib/persistence";
import { collections } from "@/lib/db";
import type { ObjectId } from "mongodb";

export async function extractConversation(userId: ObjectId, conversationId: ObjectId): Promise<void> {
  const conversations = await collections.conversations();
  const conversation = await conversations.findOne({ _id: conversationId, userId });
  if (!conversation) return;
  const { getChatGraph } = await import("@/lib/agent");
  const graph = await getChatGraph();
  const state = await graph.getState({ configurable: { thread_id: conversationId.toString() } });
  const messages = (state.values.messages ?? []) as Array<{ getType(): string; content: unknown }>;
  const text = extractUserText(messages.map((message) => ({ type: message.getType(), content: message.content })), conversation.extractionWatermark);
  const watermark = messages.length;
  if (text.trim()) {
    const model = new ChatOpenAI({ model: requiredEnv("EXTRACTION_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0 });
    const extractor = model.withStructuredOutput(ExtractionOutputSchema, { method: "jsonSchema" });
    const response = await extractor.invoke([new SystemMessage("Extract durable facts, preferences, and context about the user. Exclude small talk and assistant content. Return only useful memories. Use confidence and importance from 0 to 1."), new HumanMessage(text)]);
    // TODO(step-2)
    for (const candidate of parseCandidates(response)) await persistCandidate(candidate, userId, conversationId);
  }
  await conversations.updateOne({ _id: conversationId, userId }, { $set: { extractionWatermark: watermark } });
}

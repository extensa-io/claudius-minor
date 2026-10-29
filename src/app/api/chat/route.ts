import { accessError } from "@/lib/access";
import { HumanMessage } from "@langchain/core/messages";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { ObjectId } from "mongodb";
import { getConversationStore } from "@/lib/conversation-store";
import { databaseErrorResponse } from "@/lib/database-error";
import { ChatInputSchema } from "@/lib/schemas";
import { resolveCurrentUser, UserError } from "@/lib/user";
import { extractUserText, parseCandidates } from "@/lib/memory";
import { persistCandidate } from "@/lib/persistence";
import { extractMemories } from "@/lib/extraction";
import { bridgeEvents } from "@/lib/stream";
import { acquireOperation, chatEnabled, enforceChatBudget, OperationError, operationResponse } from "@/lib/operations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  if (!chatEnabled()) return Response.json({ error: "Demo chat is disabled." }, { status: 503 });
  const parsed = ChatInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });
  let release: (() => Promise<void>) | undefined;
  try {
    const user = await resolveCurrentUser();
    const { message, conversationId } = parsed.data;
    const conversations = await getConversationStore();
    let conversation = conversationId ? await conversations.findOne({ _id: new ObjectId(conversationId), userId: user._id }) : null;
    if (conversationId && !conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
    release = await acquireOperation(user._id);
    if (conversationId) {
      conversation = await conversations.findOne({ _id: new ObjectId(conversationId), userId: user._id });
      if (!conversation) throw new OperationError("Conversation was reset. Start a new conversation.", 404);
    }
    await enforceChatBudget();
    if (!conversation) {
      const now = new Date();
      const inserted = await conversations.insertOne({ userId: user._id, title: message.slice(0, 80), createdAt: now, updatedAt: now, extractionWatermark: 0 });
      conversation = await conversations.findOne({ _id: inserted.insertedId, userId: user._id });
    }
    if (!conversation) throw new Error("Could not create conversation.");
    const current = conversation;
    const threadId = current._id.toString();
    const unlock = release;
    const stream = createUIMessageStream({
      onError: (error) => { console.error("Chat stream failed.", error instanceof Error ? error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[redacted]") : "unknown"); return "Chat failed. Try again or check the server logs."; },
      execute: async ({ writer }) => {
        try {
          writer.write({ type: "start" });
          writer.write({ type: "data-conversation", data: { id: threadId, title: current.title }, transient: true });
          const graph = await (await import("@/lib/agent")).getChatGraph();
          const config = { configurable: { thread_id: threadId, userId: user._id.toString() } };
          await bridgeEvents(graph.streamEvents({ messages: [new HumanMessage(message)] }, { ...config, version: "v2", recursionLimit: 12, signal: AbortSignal.timeout(120_000) }), writer);
          await conversations.updateOne({ _id: current._id, userId: user._id }, { $set: { updatedAt: new Date() } });
          // Keep the shared lock through extraction. The next turn cannot reuse an old watermark.
          writer.write({ type: "data-extraction", data: { status: "running" }, transient: true });
          try {
            const latest = await conversations.findOne({ _id: current._id, userId: user._id });
            if (!latest) throw new Error("Conversation disappeared during extraction.");
            const state = await graph.getState(config);
            const checkpointMessages = (state.values.messages ?? []) as Array<{ getType(): string; content: unknown }>;
            const text = extractUserText(checkpointMessages.map((item) => ({ type: item.getType(), content: item.content })), latest.extractionWatermark);
            if (text.trim()) {
              const candidates = parseCandidates(await extractMemories(text));
              for (const candidate of candidates) await persistCandidate(candidate, user._id, current._id);
            }
            await conversations.updateOne({ _id: current._id, userId: user._id, extractionWatermark: latest.extractionWatermark }, { $set: { extractionWatermark: checkpointMessages.length } });
            writer.write({ type: "data-extraction", data: { status: "complete" }, transient: true });
          } catch (error) {
            console.error("Memory extraction failed.", error instanceof Error ? error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[redacted]") : "unknown");
            writer.write({ type: "data-extraction", data: { status: "failed" }, transient: true });
          }
          writer.write({ type: "finish" });
        } finally {
          await unlock();
        }
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (release) await release();
    if (error instanceof OperationError) return operationResponse(error);
    if (error instanceof UserError) return Response.json({ error: error.message }, { status: 400 });
    return databaseErrorResponse(error, "start chat");
  }
}

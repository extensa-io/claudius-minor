import { HumanMessage } from "@langchain/core/messages";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { ObjectId } from "mongodb";
import { after } from "next/server";
import { collections } from "@/lib/db";
import { ChatInputSchema } from "@/lib/schemas";
import { resolveCurrentUser } from "@/lib/user";

import { bridgeEvents } from "@/lib/stream";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await resolveCurrentUser();
    const parsed = ChatInputSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });
    const { message, conversationId } = parsed.data;
    const conversations = await collections.conversations();
    let conversation = conversationId ? await conversations.findOne({ _id: new ObjectId(conversationId), userId: user._id }) : null;
    if (conversationId && !conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
    if (!conversation) {
      const now = new Date();
      const inserted = await conversations.insertOne({ userId: user._id, title: message.slice(0, 80), createdAt: now, updatedAt: now, extractionWatermark: 0 });
      conversation = await conversations.findOne({ _id: inserted.insertedId });
    }
    if (!conversation) throw new Error("Could not create conversation.");
    const threadId = conversation._id.toString();
    const stream = createUIMessageStream({ execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "data-conversation", data: { id: threadId, title: conversation.title }, transient: true });
      const graph = await (await import("@/lib/agent")).getChatGraph();
      const events = graph.streamEvents({ messages: [new HumanMessage(message)] }, { version: "v2", configurable: { thread_id: threadId, userId: user._id.toString() } });
      const fullText = await bridgeEvents(events, writer);
      await conversations.updateOne({ _id: conversation._id, userId: user._id }, { $set: { updatedAt: new Date() } });
      after(async () => {
        try {
          const { extractConversation } = await import("@/lib/extraction");
          await extractConversation(user._id, conversation._id);
        } catch (error) {
          console.error("Memory extraction failed.", error instanceof Error ? error.message : "unknown error");
        }
      });
      writer.write({ type: "finish" });
      void fullText;
    } });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The chat request failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}

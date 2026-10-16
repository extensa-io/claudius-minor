import { ObjectId } from "mongodb";
import { resolveCurrentUser } from "@/lib/user";
import { collections } from "@/lib/db";
import { getChatGraph } from "@/lib/agent";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await resolveCurrentUser();
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const conversation = await (await collections.conversations()).findOne({ _id: new ObjectId(id), userId: user._id });
    if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const graph = await getChatGraph();
    const state = await graph.getState({ configurable: { thread_id: id } });
    const messages = (state.values.messages ?? []) as Array<{ getType(): string; text: string }>;
    return Response.json({ messages: messages.map((message) => ({ role: message.getType() === "human" ? "user" : "assistant", content: message.text })) });
  } catch { return Response.json({ error: "Conversation not found." }, { status: 404 }); }
}

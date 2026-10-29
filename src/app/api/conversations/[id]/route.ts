import { accessError } from "@/lib/access";
import { ObjectId } from "mongodb";
import { databaseErrorResponse } from "@/lib/database-error";
import { resolveCurrentUser, UserError } from "@/lib/user";
import { getConversationStore } from "@/lib/conversation-store";
import { getChatGraph } from "@/lib/agent";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = accessError(request);
  if (denied) return denied;
  try {
    const user = await resolveCurrentUser();
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const conversation = await (await getConversationStore()).findOne({ _id: new ObjectId(id), userId: user._id });
    if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const graph = await getChatGraph();
    const state = await graph.getState({ configurable: { thread_id: id } });
    const messages = (state.values.messages ?? []) as Array<{ getType(): string; text: string }>;
    return Response.json({ messages: messages.filter((message) => message.getType() === "human" || message.getType() === "ai").filter((message) => message.text.length > 0).map((message) => ({ role: message.getType() === "human" ? "user" : "assistant", content: message.text })) });
  } catch (error) {
    if (error instanceof UserError) return Response.json({ error: error.message }, { status: 400 });
    return databaseErrorResponse(error, "load conversation");
  }
}

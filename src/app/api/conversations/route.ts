import { accessError } from "@/lib/access";
import { databaseErrorResponse } from "@/lib/database-error";
import { resolveCurrentUser, UserError } from "@/lib/user";
import { getConversationStore } from "@/lib/conversation-store";

export async function GET(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  try {
    const user = await resolveCurrentUser();
    const conversations = await (await getConversationStore()).find({ userId: user._id }).sort({ updatedAt: -1 }).toArray();
    return Response.json({ conversations: conversations.map((conversation) => ({ id: conversation._id.toString(), title: conversation.title, updatedAt: conversation.updatedAt })) });
  } catch (error) {
    if (error instanceof UserError) return Response.json({ error: error.message }, { status: 400 });
    return databaseErrorResponse(error, "list conversations");
  }
}

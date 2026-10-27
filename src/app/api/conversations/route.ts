import { accessError } from "@/lib/access";
import { resolveCurrentUser } from "@/lib/user";
import { collections } from "@/lib/db";

export async function GET(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  try {
    const user = await resolveCurrentUser();
    const conversations = await (await collections.conversations()).find({ userId: user._id }).sort({ updatedAt: -1 }).toArray();
    return Response.json({ conversations: conversations.map((conversation) => ({ id: conversation._id.toString(), title: conversation.title, updatedAt: conversation.updatedAt })) });
  } catch { return Response.json({ conversations: [] }); }
}

import { accessError } from "@/lib/access";
import { getCheckpointer } from "@/lib/checkpointer";
import { databaseErrorResponse } from "@/lib/database-error";
import { collections } from "@/lib/db";
import { resolveCurrentUser } from "@/lib/user";

export async function POST(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("confirmation" in body) || body.confirmation !== "RESET") {
    return Response.json({ error: "Confirm the reset first." }, { status: 400 });
  }
  let user;
  try {
    user = await resolveCurrentUser();
  } catch {
    return Response.json({ error: "Choose a persona before resetting." }, { status: 400 });
  }
  try {
    const conversations = await collections.conversations();
    const owned = await conversations.find({ userId: user._id }).toArray();
    const saver = await getCheckpointer();
    for (const conversation of owned) await saver.deleteThread(conversation._id.toString());
    const deleted = await conversations.deleteMany({ userId: user._id, _id: { $in: owned.map((conversation) => conversation._id) } });
    const memories = await collections.memories();
    const removed = await memories.deleteMany({ userId: user._id });
    return Response.json({ conversationsDeleted: deleted.deletedCount, memoriesDeleted: removed.deletedCount });
  } catch (error) {
    return databaseErrorResponse(error, "reset persona");
  }
}

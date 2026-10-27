import { accessError } from "@/lib/access";
import { resolveCurrentUser } from "@/lib/user";
import { collections } from "@/lib/db";

export async function GET(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  try {
    const user = await resolveCurrentUser();
    const memories = await (await collections.memories()).find({ userId: user._id }).sort({ status: 1, importance: -1, createdAt: -1 }).toArray();
    return Response.json({ memories: memories.map((memory) => ({ id: memory._id.toString(), content: memory.content, category: memory.category, importance: memory.importance, status: memory.status, supersededBy: memory.supersededBy?.toString(), supersedes: memory.supersedes?.toString() })) });
  } catch { return Response.json({ memories: [] }); }
}

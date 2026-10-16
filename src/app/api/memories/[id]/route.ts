import { ObjectId } from "mongodb";
import { resolveCurrentUser } from "@/lib/user";
import { collections } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await resolveCurrentUser();
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Memory not found." }, { status: 404 });
    const result = await (await collections.memories()).deleteOne({ _id: new ObjectId(id), userId: user._id });
    return result.deletedCount ? Response.json({ ok: true }) : Response.json({ error: "Memory not found." }, { status: 404 });
  } catch { return Response.json({ error: "Memory not found." }, { status: 404 }); }
}

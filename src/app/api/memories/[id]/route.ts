import { accessError } from "@/lib/access";
import { ObjectId } from "mongodb";
import { databaseErrorResponse } from "@/lib/database-error";
import { resolveCurrentUser, UserError } from "@/lib/user";
import { acquireOperation, OperationError, operationResponse } from "@/lib/operations";
import { collections } from "@/lib/db";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = accessError(request);
  if (denied) return denied;
  let release: (() => Promise<void>) | undefined;
  try {
    const user = await resolveCurrentUser();
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Memory not found." }, { status: 404 });
    release = await acquireOperation(user._id);
    const result = await (await collections.memories()).deleteOne({ _id: new ObjectId(id), userId: user._id });
    return result.deletedCount ? Response.json({ ok: true }) : Response.json({ error: "Memory not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof OperationError) return operationResponse(error);
    if (error instanceof UserError) return Response.json({ error: error.message }, { status: 400 });
    return databaseErrorResponse(error, "delete memory");
  } finally {
    if (release) await release();
  }
}

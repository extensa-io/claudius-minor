import { databaseErrorResponse } from "@/lib/database-error";
import { accessError } from "@/lib/access";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { USER_COOKIE } from "@/lib/user";

export async function POST(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== "object" ||
    body === null ||
    !("userId" in body) ||
    typeof body.userId !== "string" ||
    !ObjectId.isValid(body.userId)
  )
    return Response.json({ error: "Choose a valid persona." }, { status: 400 });
  try {
    const user = await (
      await collections.users()
    ).findOne({ _id: new ObjectId(body.userId) });
    if (!user)
      return Response.json(
        { error: "Choose a valid persona." },
        { status: 400 },
      );
    (await cookies()).set(USER_COOKIE, user._id.toString(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return Response.json({ ok: true });
  } catch (error) {
    return databaseErrorResponse(error, "switch persona");
  }
}

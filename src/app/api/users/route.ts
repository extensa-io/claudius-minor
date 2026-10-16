import { cookies } from "next/headers";
import { collections } from "@/lib/db";
import { USER_COOKIE } from "@/lib/user";

export async function GET() {
  try {
    const users = await collections.users();
    const personas = await users.find().sort({ name: 1 }).toArray();
    const cookie = (await cookies()).get(USER_COOKIE)?.value;
    return Response.json({ users: personas.map((user) => ({ id: user._id.toString(), name: user.name })), currentUserId: cookie ?? null });
  } catch { return Response.json({ error: "Set up the database first." }, { status: 503 }); }
}

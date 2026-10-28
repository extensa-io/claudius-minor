import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { collections, type UserRecord } from "@/lib/db";

export class UserError extends Error {}

export const USER_COOKIE = "claudius_minor_user";

export function parseUserId(value: string | undefined): ObjectId | null {
  return value && ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function resolveCurrentUser(): Promise<UserRecord> {
  const id = parseUserId((await cookies()).get(USER_COOKIE)?.value);
  if (!id) throw new UserError("Choose a persona before continuing.");
  const user = await (await collections.users()).findOne({ _id: id });
  if (!user) throw new UserError("Choose a persona before continuing.");
  return user;
}

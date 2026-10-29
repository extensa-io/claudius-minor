import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";

export const DEMO_RESET_COLLECTIONS = ["conversations", "memories", "checkpoints", "checkpoint_writes", "demo_usage"] as const;

export class DemoResetBusyError extends Error {
  constructor() {
    super("A chat, extraction, or reset is running. Wait for it to finish, then retry pnpm db:reset.");
  }
}

export async function clearDemoData(db: Pick<Db, "collection">): Promise<Record<string, number>> {
  const token = randomUUID();
  const locks = db.collection<{ _id: string; token: string; userId: ObjectId; startedAt: Date }>("demo_operations");
  try {
    // Share the app's exclusive lock rather than deleting an active worker's lock.
    await locks.insertOne({ _id: "exclusive", token, userId: new ObjectId(), startedAt: new Date() });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new DemoResetBusyError();
    throw error;
  }
  const deleted: Record<string, number> = {};
  try {
    for (const name of DEMO_RESET_COLLECTIONS) {
      deleted[name] = (await db.collection(name).deleteMany({})).deletedCount;
    }
    return deleted;
  } finally {
    await locks.deleteOne({ _id: "exclusive", token });
  }
}

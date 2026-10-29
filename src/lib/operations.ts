import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export class OperationError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function operationResponse(error: OperationError) {
  return Response.json(
    { error: error.message },
    {
      status: error.status,
      headers: error.retryAfter
        ? { "Retry-After": String(error.retryAfter) }
        : {},
    },
  );
}

export async function acquireOperation(
  userId: ObjectId,
): Promise<() => Promise<void>> {
  const token = randomUUID();
  const collection = (await getDb()).collection<{
    _id: string;
    token: string;
    userId: ObjectId;
    startedAt: Date;
  }>("demo_operations");
  try {
    // No expiring lease: an expired worker could still write after a reset.
    await collection.insertOne({
      _id: "exclusive",
      token,
      userId,
      startedAt: new Date(),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new OperationError(
        "Another chat, extraction, or reset is running. Try again shortly.",
        409,
        5,
      );
    throw error;
  }
  return async () => {
    await collection.deleteOne({ _id: "exclusive", token, userId });
  };
}

export function chatEnabled(
  source: { DEMO_CHAT_ENABLED?: string | undefined } = {
    DEMO_CHAT_ENABLED: process.env.DEMO_CHAT_ENABLED,
  },
) {
  return source.DEMO_CHAT_ENABLED !== "false";
}

export async function enforceChatBudget(now = new Date()) {
  const collection = (await getDb()).collection<{
    _id: string;
    count: number;
    expiresAt: Date;
  }>("demo_usage");
  for (const [period, limit, retry] of [
    [now.toISOString().slice(0, 16), 10, 60],
    [now.toISOString().slice(0, 10), 200, 86400],
  ] as const) {
    const record = await collection.findOneAndUpdate(
      { _id: period },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(now.getTime() + 2 * 86400_000) },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (record && record.count > limit)
      throw new OperationError(
        "The shared demo chat budget is exhausted. Try again later.",
        429,
        retry,
      );
  }
}

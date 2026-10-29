import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { collections, getClient } from "../src/lib/db";
import { getCheckpointer } from "../src/lib/checkpointer";

async function main() {
  const base = process.env.APP_URL;
  const code = process.env.APP_ACCESS_CODE;
  assert(
    base && code,
    "Set APP_URL and APP_ACCESS_CODE to verify a deployment.",
  );
  const headers = { "x-access-code": code, "content-type": "application/json" };
  const usersResponse = await fetch(`${base}/api/users`, { headers });
  assert.equal(usersResponse.status, 200);
  const { users } = (await usersResponse.json()) as {
    users: Array<{ id: string }>;
  };
  const userId = new ObjectId(users[0].id);
  const cookieHeaders = { ...headers, cookie: `claudius_minor_user=${userId}` };
  const threads: ObjectId[] = [];
  const marker = `verification-${randomUUID()}`;
  const memories = await collections.memories();
  async function chat(message: string) {
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: cookieHeaders,
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(240_000),
    });
    assert.equal(response.status, 200);
    const text = await response.text();
    const chunks = text
      .split("\n")
      .filter((line) => line.startsWith("data: {"))
      .map((line) => JSON.parse(line.slice(6)));
    const info = chunks.find((chunk) => chunk.type === "data-conversation");
    if (info) threads.push(new ObjectId(info.data.id));
    assert(
      !chunks.some((chunk) => chunk.type === "error"),
      "Chat stream reported an error.",
    );
    return chunks
      .filter((chunk) => chunk.type === "text-delta")
      .map((chunk) => chunk.delta)
      .join("") as string;
  }
  async function waitFor(check: () => Promise<boolean>) {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error(
      "Timed out waiting for memory persistence or vector indexing.",
    );
  }
  try {
    await chat(
      `Please remember this personal project detail: for my temporary project ${marker}, my assigned mascot is Silver Otter. Reply briefly.`,
    );
    await waitFor(
      async () =>
        !!(await memories.findOne({
          userId,
          sourceConversationId: { $in: threads },
          content: /Silver Otter/i,
        })),
    );
    console.log("PASS live extraction persisted a memory.");
    await waitFor(async () => {
      const hits = await memories
        .aggregate([
          {
            $vectorSearch: {
              index: "memories_vector",
              path: "content",
              query: {
                text: `What mascot is assigned to my project ${marker}?`,
              },
              numCandidates: 100,
              limit: 10,
              filter: { userId: { $eq: userId }, status: { $eq: "active" } },
            },
          },
        ])
        .toArray();
      return hits.some(
        (memory) =>
          threads.some((id) => id.equals(memory.sourceConversationId)) &&
          /Silver Otter/i.test(memory.content),
      );
    });
    console.log("PASS deployed database vector recall indexed the memory.");
    assert.match(
      await chat(
        `What mascot is assigned to my project ${marker}? Answer briefly.`,
      ),
      /Silver\s+Otter/i,
    );
    console.log("PASS live agent recalled the memory in a fresh conversation.");
    await chat(
      `Update my project ${marker}: my assigned mascot has changed from Silver Otter to Golden Fox. Remember Golden Fox as the current mascot. Reply briefly.`,
    );
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    await waitFor(async () => {
      const active = await memories.findOne({
        userId,
        sourceConversationId: { $in: threads },
        status: "active",
        content: /Golden Fox/i,
      });
      if (!active?.supersedes) return false;
      const previous = await memories.findOne({
        _id: active.supersedes,
        userId,
        status: "superseded",
      });
      return !!previous?.supersededBy?.equals(active._id);
    });
    console.log(
      "PASS live contradiction handling persisted supersession lineage.",
    );
  } finally {
    // Remove only records created by these requests, never reset a shared persona.
    const conversations = await collections.conversations();
    const owned = await conversations
      .find({ userId, _id: { $in: threads } })
      .toArray();
    const saver = await getCheckpointer();
    for (const conversation of owned)
      await saver.deleteThread(conversation._id.toString());
    await memories.deleteMany({
      userId,
      sourceConversationId: { $in: threads },
    });
    await conversations.deleteMany({ userId, _id: { $in: threads } });
    await (await getClient()).close();
    console.log("Removed verification conversations and memories.");
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Verification failed.",
  );
  process.exitCode = 1;
});

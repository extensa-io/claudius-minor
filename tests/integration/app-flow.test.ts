import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { collections, getClient, getDb } from "@/lib/db";

const enabled =
  env.MONGODB_URI &&
  env.DO_MODEL_ACCESS_KEY &&
  env.CHAT_MODEL &&
  env.EXTRACTION_MODEL &&
  env.TAVILY_API_KEY;
describe.skipIf(!enabled)("application HTTP flow", () => {
  it("streams chat, extracts and recalls memory, isolates personas, and deletes memory", async () => {
    const port = 3197;
    const base = `http://127.0.0.1:${port}`;
    const accessCode = randomBytes(24).toString("hex");
    const accessHeaders = { "x-access-code": accessCode };
    const server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
      { stdio: "ignore", env: { ...process.env, APP_ACCESS_CODE: accessCode } },
    );
    const conversationIds: ObjectId[] = [];
    const memoryIds: ObjectId[] = [];
    let userId: ObjectId | undefined;
    async function waitUntil(check: () => Promise<boolean>, timeout = 120_000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (await check()) return;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error("Timed out waiting for application state.");
    }
    const cookie = (id: string) => ({
      ...accessHeaders,
      cookie: `claudius_minor_user=${id}`,
      "content-type": "application/json",
    });
    async function chat(id: string, message: string, conversationId?: string) {
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: cookie(id),
        body: JSON.stringify({ message, conversationId }),
      });
      expect(response.status).toBe(200);
      const text = await response.text();
      const chunks = text
        .split("\n")
        .filter((line) => line.startsWith("data: {"))
        .map((line) => JSON.parse(line.slice(6)));
      expect(chunks.some((chunk) => chunk.type === "error")).toBe(false);
      const info = chunks.find((chunk) => chunk.type === "data-conversation");
      expect(info).toBeDefined();
      const oid = new ObjectId(info.data.id);
      if (!conversationIds.some((id) => id.equals(oid)))
        conversationIds.push(oid);
      const answer = chunks
        .filter((chunk) => chunk.type === "text-delta")
        .map((chunk) => chunk.delta)
        .join("");
      expect(answer.length).toBeGreaterThan(0);
      return { id: info.data.id as string, answer };
    }
    try {
      await waitUntil(async () => {
        try {
          return (await fetch(`${base}/api/users`, { headers: accessHeaders }))
            .ok;
        } catch {
          return false;
        }
      }, 30_000);
      const users = (
        await (
          await fetch(`${base}/api/users`, { headers: accessHeaders })
        ).json()
      ).users as Array<{ id: string; name: string }>;
      expect(users.map((user) => user.name)).toEqual([
        "Angela",
        "Betty",
        "Caroline",
      ]);
      userId = new ObjectId(users[0].id);
      const first = await chat(
        users[0].id,
        "Please remember: my favorite hiking trail is Silver Fern Ridge. Reply briefly.",
      );
      const memories = await collections.memories();
      await waitUntil(async () => {
        const found = await memories
          .find({
            userId: new ObjectId(users[0].id),
            sourceConversationId: new ObjectId(first.id),
          })
          .toArray();
        for (const memory of found)
          if (!memoryIds.some((id) => id.equals(memory._id)))
            memoryIds.push(memory._id);
        return found.some((memory) =>
          /Silver\s+Fern\s+Ridge/i.test(memory.content),
        );
      });
      const transcript = await fetch(`${base}/api/conversations/${first.id}`, {
        headers: cookie(users[0].id),
      });
      expect(transcript.status).toBe(200);
      expect((await transcript.json()).messages.length).toBeGreaterThanOrEqual(
        2,
      );
      const foreign = await fetch(`${base}/api/conversations/${first.id}`, {
        headers: cookie(users[1].id),
      });
      expect(foreign.status).toBe(404);
      const recall = await chat(
        users[0].id,
        "What is my favorite hiking trail? Answer briefly.",
      );
      expect(recall.answer).toMatch(/Silver\s+Fern\s+Ridge/i);
      const tool = await chat(
        users[0].id,
        "Use web_search to find MongoDB Atlas documentation, then summarize the result in one sentence.",
        first.id,
      );
      expect(tool.id).toBe(first.id);
      await waitUntil(async () => {
        const conversation = await (
          await collections.conversations()
        ).findOne({
          _id: new ObjectId(first.id),
          userId: new ObjectId(users[0].id),
        });
        return (conversation?.extractionWatermark ?? 0) >= 4;
      });
      const foreignDelete = await fetch(
        `${base}/api/memories/${memoryIds[0]}`,
        { method: "DELETE", headers: cookie(users[1].id) },
      );
      expect(foreignDelete.status).toBe(404);
      const deleted = await fetch(`${base}/api/memories/${memoryIds[0]}`, {
        method: "DELETE",
        headers: cookie(users[0].id),
      });
      expect(deleted.status).toBe(200);
    } finally {
      // Wait for background extraction before removing only this test's records.
      server.kill("SIGTERM");
      await Promise.race([
        once(server, "exit"),
        new Promise((resolve) => setTimeout(resolve, 10_000)),
      ]);
      if (server.exitCode === null) server.kill("SIGKILL");
      const db = await getDb();
      if (userId) {
        await db.collection("memories").deleteMany({
          userId,
          sourceConversationId: { $in: conversationIds },
        });
        await db
          .collection("conversations")
          .deleteMany({ userId, _id: { $in: conversationIds } });
      }
      const threads = conversationIds.map((id) => id.toString());
      await db
        .collection("checkpoints")
        .deleteMany({ thread_id: { $in: threads } });
      await db
        .collection("checkpoint_writes")
        .deleteMany({ thread_id: { $in: threads } });
      await (await getClient()).close();
    }
  }, 300_000);
});

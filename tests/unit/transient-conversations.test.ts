import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { createTransientConversationStore } from "@/lib/transient-conversations";

async function insert(store: ReturnType<typeof createTransientConversationStore>, userId: ObjectId) {
  return (await store.insertOne({ userId, title: "Hello", createdAt: new Date(), updatedAt: new Date(), extractionWatermark: 0 })).insertedId;
}

describe("transient conversation headers", () => {
  it("keeps headers in the same process, not a newly started store", async () => {
    const store = createTransientConversationStore();
    const userId = new ObjectId();
    const _id = await insert(store, userId);
    expect(await store.findOne({ _id, userId })).toMatchObject({ title: "Hello" });
    expect(await createTransientConversationStore().find({ userId }).toArray()).toEqual([]);
  });

  it("filters reads, updates, and deletes by owner", async () => {
    const store = createTransientConversationStore();
    const angela = new ObjectId();
    const betty = new ObjectId();
    const _id = await insert(store, angela);
    await insert(store, betty);
    expect(await store.findOne({ _id, userId: betty })).toBeNull();
    expect((await store.updateOne({ _id, userId: betty }, { $set: { title: "Wrong owner" } })).matchedCount).toBe(0);
    expect((await store.deleteMany({ userId: betty, _id: { $in: [_id] } })).deletedCount).toBe(0);
    expect(await store.find({ userId: angela }).sort({ updatedAt: -1 }).toArray()).toHaveLength(1);
    expect((await store.deleteMany({ userId: angela, _id: { $in: [_id] } })).deletedCount).toBe(1);
    expect(await store.find({ userId: betty }).toArray()).toHaveLength(1);
  });

  it("advances the watermark only when its previous value matches", async () => {
    const store = createTransientConversationStore();
    const userId = new ObjectId();
    const _id = await insert(store, userId);
    await store.updateOne({ _id, userId, extractionWatermark: 0 }, { $set: { extractionWatermark: 2 } });
    expect((await store.updateOne({ _id, userId, extractionWatermark: 0 }, { $set: { extractionWatermark: 5 } })).matchedCount).toBe(0);
    expect(await store.findOne({ _id, userId })).toMatchObject({ extractionWatermark: 2 });
  });
});

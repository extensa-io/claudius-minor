import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ collection: vi.fn() }));
vi.mock("@/lib/db", () => ({
  collections: { conversations: mocks.collection },
}));
const durable = true;

describe("checkpoint conversation storage", () => {
  it("uses MongoDB only from the durable-conversation checkpoint onward", async () => {
    const mongoStore = { marker: "MongoDB" };
    mocks.collection.mockResolvedValue(mongoStore);
    const { getConversationStore } = await import("@/lib/conversation-store");
    const store = await getConversationStore();
    if (durable) {
      expect(store).toBe(mongoStore);
      expect(mocks.collection).toHaveBeenCalledOnce();
    } else {
      const userId = new ObjectId();
      const { insertedId } = await store.insertOne({
        userId,
        title: "Transient",
        createdAt: new Date(),
        updatedAt: new Date(),
        extractionWatermark: 0,
      });
      expect(await store.findOne({ _id: insertedId, userId })).toMatchObject({
        title: "Transient",
      });
      expect(mocks.collection).not.toHaveBeenCalled();
    }
  });
});

import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  insertOne: vi.fn(),
  deleteOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({ collection: () => mocks }),
}));
import {
  acquireOperation,
  chatEnabled,
  enforceChatBudget,
  OperationError,
} from "@/lib/operations";
afterEach(() => vi.resetAllMocks());

describe("shared demo protection", () => {
  it("holds a non-expiring lock and releases only its own token and owner", async () => {
    const owner = new ObjectId();
    const release = await acquireOperation(owner);
    const record = mocks.insertOne.mock.calls[0][0];
    expect(record.userId).toEqual(owner);
    expect(record).not.toHaveProperty("expiresAt");
    await release();
    expect(mocks.deleteOne).toHaveBeenCalledWith({
      _id: "exclusive",
      token: record.token,
      userId: owner,
    });
  });
  it("rejects overlap and propagates database failures", async () => {
    mocks.insertOne.mockRejectedValue({ code: 11000 });
    await expect(acquireOperation(new ObjectId())).rejects.toMatchObject({
      status: 409,
    });
    mocks.insertOne.mockRejectedValue(new Error("offline"));
    await expect(acquireOperation(new ObjectId())).rejects.toThrow("offline");
  });
  it("enforces shared minute and daily limits", async () => {
    mocks.findOneAndUpdate
      .mockResolvedValueOnce({ count: 10 })
      .mockResolvedValueOnce({ count: 200 });
    await enforceChatBudget(new Date("2026-10-28T10:01:00Z"));
    expect(mocks.findOneAndUpdate.mock.calls[0][0]).toEqual({
      _id: "2026-10-28T10:01",
    });
    mocks.findOneAndUpdate.mockResolvedValue({ count: 11 });
    await expect(enforceChatBudget()).rejects.toBeInstanceOf(OperationError);
    mocks.findOneAndUpdate
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 201 });
    await expect(enforceChatBudget()).rejects.toMatchObject({ status: 429 });
  });
  it("provides a kill switch", () => {
    expect(chatEnabled({})).toBe(true);
    expect(chatEnabled({ DEMO_CHAT_ENABLED: "false" })).toBe(false);
  });
});

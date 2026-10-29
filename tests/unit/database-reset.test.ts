import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { clearDemoData, DEMO_RESET_COLLECTIONS } from "@/lib/database-reset";

function mockDb() {
  const insertOne = vi.fn().mockResolvedValue({});
  const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
  const deleteMany = vi.fn().mockResolvedValue({ deletedCount: 2 });
  const collection = vi.fn((name: string) => name === "demo_operations" ? { insertOne, deleteOne } : { deleteMany });
  return { db: { collection } as unknown as Pick<Db, "collection">, collection, insertOne, deleteOne, deleteMany };
}

describe("live demo database reset", () => {
  it("clears demo records while preserving users, indexes, and unrelated locks", async () => {
    const mocks = mockDb();
    const result = await clearDemoData(mocks.db);
    expect(mocks.collection.mock.calls.map(([name]) => name)).toEqual(["demo_operations", ...DEMO_RESET_COLLECTIONS]);
    expect(mocks.collection).not.toHaveBeenCalledWith("users");
    expect(mocks.deleteMany).toHaveBeenCalledTimes(5);
    for (const args of mocks.deleteMany.mock.calls) expect(args).toEqual([{}]);
    expect(result.memories).toBe(2);
    const lock = mocks.insertOne.mock.calls[0]![0];
    expect(lock._id).toBe("exclusive");
    expect(mocks.deleteOne).toHaveBeenCalledWith({ _id: "exclusive", token: lock.token });
    expect(mocks.insertOne.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteMany.mock.invocationCallOrder[0]!);
  });
  it("refuses an active operation without clearing data or its lock", async () => {
    const mocks = mockDb();
    mocks.insertOne.mockRejectedValue({ code: 11000 });
    await expect(clearDemoData(mocks.db)).rejects.toThrow("Wait for it to finish");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });
  it("releases its own lock if a deletion fails", async () => {
    const mocks = mockDb();
    mocks.deleteMany.mockRejectedValue(new Error("unavailable"));
    await expect(clearDemoData(mocks.db)).rejects.toThrow("unavailable");
    expect(mocks.deleteOne).toHaveBeenCalledOnce();
  });
});

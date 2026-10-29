import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveCurrentUser: vi.fn(), find: vi.fn(), deleteConversations: vi.fn(), deleteMemories: vi.fn(), deleteThread: vi.fn(),
}));
vi.mock("@/lib/user", () => ({ resolveCurrentUser: mocks.resolveCurrentUser, UserError: class extends Error {} }));
vi.mock("@/lib/operations", () => ({ acquireOperation: async () => async () => {}, OperationError: class extends Error {}, operationResponse: vi.fn() }));
vi.mock("@/lib/conversation-store", () => ({ getConversationStore: async () => ({ find: mocks.find, deleteMany: mocks.deleteConversations }) }));
vi.mock("@/lib/db", () => ({ collections: {
  memories: async () => ({ deleteMany: mocks.deleteMemories }),
} }));
vi.mock("@/lib/checkpointer", () => ({ getCheckpointer: async () => ({ deleteThread: mocks.deleteThread }) }));

import { UserError } from "@/lib/user";
import { POST } from "@/app/api/reset/route";

const userId = new ObjectId();
const conversationId = new ObjectId();
const code = "a-private-presenter-access-code";
function request(confirmation: string, authorized = true) {
  return new Request("http://localhost/api/reset", { method: "POST", headers: { "content-type": "application/json", ...(authorized ? { "x-access-code": code } : {}) }, body: JSON.stringify({ confirmation }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ACCESS_CODE", code);
  mocks.resolveCurrentUser.mockResolvedValue({ _id: userId });
  mocks.find.mockReturnValue({ toArray: async () => [{ _id: conversationId, userId }] });
  mocks.deleteConversations.mockResolvedValue({ deletedCount: 1 });
  mocks.deleteMemories.mockResolvedValue({ deletedCount: 2 });
});

describe("reset persona", () => {
  it("rejects unauthenticated and unconfirmed requests before accessing data", async () => {
    expect((await POST(request("RESET", false))).status).toBe(401);
    expect((await POST(request("reset"))).status).toBe(400);
    expect(mocks.resolveCurrentUser).not.toHaveBeenCalled();
  });

  it("deletes only the cookie-resolved persona's conversations, checkpoints, and memories", async () => {
    const response = await POST(request("RESET"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ conversationsDeleted: 1, memoriesDeleted: 2 });
    expect(mocks.find).toHaveBeenCalledWith({ userId });
    expect(mocks.deleteThread).toHaveBeenCalledExactlyOnceWith(conversationId.toString());
    expect(mocks.deleteConversations).toHaveBeenCalledWith({ userId, _id: { $in: [conversationId] } });
    expect(mocks.deleteMemories).toHaveBeenCalledWith({ userId });
  });

  it("requires a selected persona", async () => {
    mocks.resolveCurrentUser.mockRejectedValue(new UserError("Choose a persona"));
    expect((await POST(request("RESET"))).status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("keeps ownership records if checkpoint deletion fails so reset can be retried", async () => {
    mocks.deleteThread.mockRejectedValue(new Error("Unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(request("RESET"))).status).toBe(503);
    expect(mocks.deleteConversations).not.toHaveBeenCalled();
    expect(mocks.deleteMemories).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

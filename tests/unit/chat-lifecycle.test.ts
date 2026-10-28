import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ release: vi.fn(), acquire: vi.fn(), budget: vi.fn(), find: vi.fn(), update: vi.fn(), bridge: vi.fn(), extract: vi.fn(), persist: vi.fn(), state: vi.fn(), execute: undefined as undefined | ((options: { writer: { write: ReturnType<typeof vi.fn> } }) => Promise<void>) }));
vi.mock("ai", () => ({ createUIMessageStream: (options: { execute: typeof mocks.execute }) => { mocks.execute = options.execute; return {}; }, createUIMessageStreamResponse: () => new Response("stream") }));
vi.mock("@/lib/user", () => ({ resolveCurrentUser: async () => ({ _id: new ObjectId("000000000000000000000001") }), UserError: class extends Error {} }));
vi.mock("@/lib/db", () => ({ collections: { conversations: async () => ({ findOne: mocks.find, updateOne: mocks.update }) } }));
vi.mock("@/lib/operations", () => ({ acquireOperation: mocks.acquire, enforceChatBudget: mocks.budget, chatEnabled: () => true, OperationError: class extends Error {}, operationResponse: vi.fn() }));
vi.mock("@/lib/agent", () => ({ getChatGraph: async () => ({ streamEvents: () => [], getState: mocks.state }) }));
vi.mock("@/lib/stream", () => ({ bridgeEvents: mocks.bridge }));
vi.mock("@/lib/extraction", () => ({ extractMemories: mocks.extract }));
vi.mock("@/lib/persistence", () => ({ persistCandidate: mocks.persist }));
import { POST } from "@/app/api/chat/route";
const conversation = { _id: new ObjectId(), userId: new ObjectId("000000000000000000000001"), title: "test", extractionWatermark: 0 };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("APP_ACCESS_CODE", "long-presenter-code-for-tests");
  mocks.acquire.mockResolvedValue(mocks.release); mocks.find.mockResolvedValue(conversation);
  mocks.state.mockResolvedValue({ values: { messages: [{ getType: () => "human", content: "My favorite color is green." }] } });
  mocks.extract.mockResolvedValue({ memories: [] });
});
const request = () => new Request("http://localhost/api/chat", { method: "POST", headers: { "x-access-code": "long-presenter-code-for-tests", "content-type": "application/json" }, body: JSON.stringify({ conversationId: conversation._id.toString(), message: "hello" }) });
describe("serialized chat lifecycle", () => {
  it("retains the operation lock until extraction and watermark advancement finish", async () => {
    let finish: ((value: { memories: [] }) => void) | undefined;
    mocks.extract.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    expect((await POST(request())).status).toBe(200);
    const work = mocks.execute!({ writer: { write: vi.fn() } });
    await vi.waitFor(() => expect(mocks.extract).toHaveBeenCalled());
    expect(mocks.release).not.toHaveBeenCalled();
    finish!({ memories: [] }); await work;
    expect(mocks.update).toHaveBeenLastCalledWith({ _id: conversation._id, userId: conversation.userId, extractionWatermark: 0 }, { $set: { extractionWatermark: 1 } });
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("releases on graph failure and keeps the watermark unchanged", async () => {
    mocks.bridge.mockRejectedValue(new Error("graph failed"));
    await POST(request());
    await expect(mocks.execute!({ writer: { write: vi.fn() } })).rejects.toThrow("graph failed");
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("leaves failed extraction retryable and still releases the lock", async () => {
    mocks.extract.mockRejectedValue(new Error("extraction failed"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await POST(request());
    const writer = { write: vi.fn() }; await mocks.execute!({ writer });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(writer.write).toHaveBeenCalledWith({ type: "data-extraction", data: { status: "failed" }, transient: true });
    expect(mocks.release).toHaveBeenCalledOnce(); log.mockRestore();
  });
});

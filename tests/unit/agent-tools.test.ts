import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ bind: vi.fn(), invoke: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/checkpointer", () => ({ getCheckpointer: async () => new MemorySaver() }));
vi.mock("@/lib/env", () => ({ env: { DO_INFERENCE_BASE_URL: "http://unused" }, requiredEnv: () => "test-only" }));
vi.mock("@/lib/search", () => ({ webSearch: mocks.search }));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    bindTools(...args: unknown[]) { mocks.bind(...args); return this; }
    invoke = mocks.invoke;
  },
}));

const toolsEnabled = true;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockResolvedValue([{ title: "Verified event", url: "https://example.com/event", content: "Current evidence" }]);
  mocks.invoke.mockImplementation(async (messages) => {
    if (!toolsEnabled || messages.some((message: { getType(): string }) => message.getType() === "tool")) return new AIMessage("Answer");
    return new AIMessage({ content: "", tool_calls: [{ id: "search-1", name: "web_search", args: { query: "recent event" }, type: "tool_call" }] });
  });
});

describe("checkpoint tool capability", () => {
  it("matches the checkpoint's binding, routing, and actual search execution", async () => {
    const { getChatGraph } = await import("@/lib/agent");
    const graph = await getChatGraph();
    const state = await graph.invoke({ messages: [new HumanMessage("What happened recently?")] }, { configurable: { thread_id: crypto.randomUUID() } });
    expect(state.messages.at(-1)?.text).toBe("Answer");
    if (toolsEnabled) {
      expect(mocks.bind).toHaveBeenCalled();
      const tool = mocks.bind.mock.calls[0][0][0];
      expect(tool.description).toContain("today's date");
      expect(tool.description).toContain("exact URLs with Markdown links");
      const system = mocks.invoke.mock.calls[0][0][0].text;
      expect(system).toContain(new Date().toISOString().slice(0, 10));
      expect(system).toContain("verify the latest completed event");
      expect(system).toContain("only exact URLs returned by web_search");
      expect(system).toContain("Never emit cursor/id objects");
      expect(mocks.search).toHaveBeenCalledExactlyOnceWith("recent event");
      expect(state.messages.some((message) => message.getType() === "tool")).toBe(true);
      expect(mocks.invoke).toHaveBeenCalledTimes(2);
    } else {
      expect(mocks.bind).not.toHaveBeenCalled();
      expect(mocks.search).not.toHaveBeenCalled();
      expect(state.messages.some((message) => message.getType() === "tool")).toBe(false);
      expect(mocks.invoke).toHaveBeenCalledTimes(1);
    }
  });
});

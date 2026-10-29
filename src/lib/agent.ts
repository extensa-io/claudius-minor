import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { tool } from "@langchain/core/tools";
import { Annotation, END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { boundedContext } from "@/lib/context";
import { env, requiredEnv } from "@/lib/env";
import { webSearch } from "@/lib/search";
import { memoryNote, SYSTEM_PROMPT } from "@/lib/prompt";
import { getCheckpointer } from "@/lib/checkpointer";
import { assembleMemoryBlock, type RetrievedMemory } from "@/lib/memory";

const webSearchTool = tool(async ({ query }) => JSON.stringify(await webSearch(query)), {
  name: "web_search", description: "Search the web for current evidence. Include today's date and the relevant year for time-sensitive questions. Returns titles, URLs, and snippets; cite only these exact URLs with Markdown links.", schema: z.object({ query: z.string() }),
});
const tools = [webSearchTool];
const State = Annotation.Root({ ...MessagesAnnotation.spec, memoryContext: Annotation<string>({ reducer: (_previous, next) => next, default: () => "" }), usedMemories: Annotation<RetrievedMemory[]>({ reducer: (_previous, next) => next, default: () => [] }) });

async function loadContext(state: typeof State.State, config: { configurable?: Record<string, unknown> }) {
  const userId = config.configurable?.userId;
  if (typeof userId !== "string") return { memoryContext: "", usedMemories: [] };
  try {
    const { collections } = await import("@/lib/db");
    const owner = new (await import("mongodb")).ObjectId(userId);
    const collection = await collections.memories();
    const profile = await collection.find({ userId: owner, status: "active" }).sort({ importance: -1 }).limit(5).toArray();
    const human = state.messages.filter((message) => message.getType() === "human").slice(-3).map((message) => message.text).join("\n");
    let relevant: typeof profile = [];
    if (human) {
      const results = await collection.aggregate([{
        $vectorSearch: { index: "memories_vector", path: "content", query: { text: human }, numCandidates: 100, limit: 10, filter: { userId: { $eq: owner }, status: { $eq: "active" } } },
      }, { $addFields: { score: { $meta: "vectorSearchScore" } } }, { $match: { score: { $gte: 0.65 } } }]).toArray();
      relevant = results as typeof profile;
    }
    const assembled = assembleMemoryBlock(profile, relevant);
    if (assembled.memories.length > 0) await dispatchCustomEvent("memories_used", { memories: assembled.memories.map((memory) => ({ id: memory._id.toString(), content: memory.content, category: memory.category })) }, config);
    return { memoryContext: assembled.text, usedMemories: assembled.memories };
  } catch (error) {
    console.error("Memory retrieval failed.", error instanceof Error ? error.message : "unknown error");
    return { memoryContext: "", usedMemories: [] };
  }
}

async function agent(state: typeof State.State) {
  const lastHuman = state.messages.findLastIndex((message) => message.getType() === "human");
  const toolTurns = state.messages.slice(lastHuman + 1).filter((message) => message.getType() === "tool").length;
  // Bound repeated searches and still produce a final answer from completed results.
  const model = new ChatOpenAI({ model: requiredEnv("CHAT_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0, streaming: true, maxTokens: 1024, maxRetries: 0, timeout: 60_000 }).bindTools(tools, { tool_choice: toolTurns >= 4 ? "none" : "auto" });
  const system = [SYSTEM_PROMPT.replace("{{date}}", new Date().toISOString().slice(0, 10)), state.memoryContext].filter(Boolean).join("\n\n");
  const response = await model.invoke([new SystemMessage(system), ...boundedContext(state.messages)]);
  return { messages: [response] };
}

const builder = new StateGraph(State)
  .addNode("load_context", loadContext)
  .addNode("agent", agent)
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "load_context")
  .addEdge("load_context", "agent")
  .addConditionalEdges("agent", toolsCondition, ["tools", END])
  .addEdge("tools", "agent");

let graphPromise: Promise<ReturnType<typeof builder.compile>> | undefined;
export async function getChatGraph() {
  graphPromise ??= getCheckpointer().then((checkpointer) => builder.compile({ checkpointer }));
  return graphPromise;
}

export { HumanMessage };
export type AgentState = typeof State.State;
export function renderMemoryNote(profile: RetrievedMemory[], relevant: RetrievedMemory[]) {
  return memoryNote(profile, relevant);
}

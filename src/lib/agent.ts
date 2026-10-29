import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
  Annotation,
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { boundedContext } from "@/lib/context";
import { env, requiredEnv } from "@/lib/env";
import { webSearch } from "@/lib/search";
import { memoryNote, SYSTEM_PROMPT } from "@/lib/prompt";
import { type RetrievedMemory } from "@/lib/memory";

const webSearchTool = tool(
  async ({ query }) => JSON.stringify(await webSearch(query)),
  {
    name: "web_search",
    description:
      "Search the web for current evidence. " +
      "Include today's date and the relevant year for time-sensitive questions. " +
      "Returns titles, URLs, and snippets; " +
      "cite only these exact URLs with Markdown links.",
    schema: z.object({ query: z.string() }),
  },
);
const tools = [webSearchTool];
const State = Annotation.Root({
  ...MessagesAnnotation.spec,
  memoryContext: Annotation<string>({
    reducer: (_previous, next) => next,
    default: () => "",
  }),
  usedMemories: Annotation<RetrievedMemory[]>({
    reducer: (_previous, next) => next,
    default: () => [],
  }),
});

async function loadContext() {
  // TODO step 4: retrieve owner-filtered profile and relevant memories.
  return { memoryContext: "", usedMemories: [] };
}

async function agent(state: typeof State.State) {
  const lastHuman = state.messages.findLastIndex(
    (message) => message.getType() === "human",
  );
  const toolTurns = state.messages
    .slice(lastHuman + 1)
    .filter((message) => message.getType() === "tool").length;
  // Bound repeated searches and still produce a final answer from completed results.
  const model = new ChatOpenAI({
    model: requiredEnv("CHAT_MODEL"),
    apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"),
    configuration: { baseURL: env.DO_INFERENCE_BASE_URL },
    temperature: 0,
    streaming: true,
    maxTokens: 1024,
    maxRetries: 0,
    timeout: 60_000,
  }).bindTools(tools, { tool_choice: toolTurns >= 4 ? "none" : "auto" });
  const system = [
    SYSTEM_PROMPT.replace("{{date}}", new Date().toISOString().slice(0, 10)),
    state.memoryContext,
  ]
    .filter(Boolean)
    .join("\n\n");
  const response = await model.invoke([
    new SystemMessage(system),
    ...boundedContext(state.messages),
  ]);
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
  // TODO step 2: persist the same thread state with MongoDBSaver.
  graphPromise ??= Promise.resolve(
    builder.compile({ checkpointer: new MemorySaver() }),
  );
  return graphPromise;
}

export { HumanMessage };
export type AgentState = typeof State.State;
export function renderMemoryNote(
  profile: RetrievedMemory[],
  relevant: RetrievedMemory[],
) {
  return memoryNote(profile, relevant);
}

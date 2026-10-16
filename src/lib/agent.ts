import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { tool } from "@langchain/core/tools";
import { Annotation, END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env, requiredEnv } from "@/lib/env";
import { webSearch } from "@/lib/search";
import { SYSTEM_PROMPT, memoryNote } from "@/lib/prompt";
import { assembleMemoryBlock, type RetrievedMemory } from "@/lib/memory";
import { ObjectId } from "mongodb";
import { getCheckpointer } from "@/lib/checkpointer";

const webSearchTool = tool(async ({ query }) => JSON.stringify(await webSearch(query)), {
  name: "web_search", description: "Search the web for current information", schema: z.object({ query: z.string() }),
});
const tools = [webSearchTool];
const State = Annotation.Root({ ...MessagesAnnotation.spec, memoryContext: Annotation<string>({ reducer: (_previous, next) => next, default: () => "" }), usedMemories: Annotation<RetrievedMemory[]>({ reducer: (_previous, next) => next, default: () => [] }) });

async function loadContext(state: typeof State.State, config: { configurable?: Record<string, unknown> }) {
  const userId = config.configurable?.userId;
  if (typeof userId !== "string") return { memoryContext: "", usedMemories: [] };
  // TODO(step-3)
  return { memoryContext: "", usedMemories: [] };
}

async function agent(state: typeof State.State) {
  const model = new ChatOpenAI({ model: requiredEnv("CHAT_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0 }).bindTools(tools);
  const system = [SYSTEM_PROMPT.replace("{{date}}", new Date().toISOString().slice(0, 10)), state.memoryContext].filter(Boolean).join("\n\n");
  const response = await model.invoke([new SystemMessage(system), ...state.messages]);
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

export { HumanMessage, dispatchCustomEvent };

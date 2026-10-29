import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  Annotation,
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { boundedContext } from "@/lib/context";
import { env, requiredEnv } from "@/lib/env";
import { memoryNote, SYSTEM_PROMPT } from "@/lib/prompt";
import { type RetrievedMemory } from "@/lib/memory";

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
  // TODO step 1: bind web search and route tool results back to the agent.
  const model = new ChatOpenAI({
    model: requiredEnv("CHAT_MODEL"),
    apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"),
    configuration: { baseURL: env.DO_INFERENCE_BASE_URL },
    temperature: 0,
    streaming: true,
    maxTokens: 1024,
    maxRetries: 0,
    timeout: 60_000,
  });
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
  .addEdge(START, "load_context")
  .addEdge("load_context", "agent")
  .addEdge("agent", END);

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

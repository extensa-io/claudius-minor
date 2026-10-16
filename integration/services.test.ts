import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { afterAll, describe, expect, it } from "vitest";
import { env, requiredEnv } from "@/lib/env";
import { getClient } from "@/lib/db";
import { webSearch } from "@/lib/search";

const doReady = Boolean(env.DO_MODEL_ACCESS_KEY && env.CHAT_MODEL && env.EXTRACTION_MODEL);
const mongoReady = Boolean(env.MONGODB_URI);
const tavilyReady = Boolean(env.TAVILY_API_KEY);
const model = () => new ChatOpenAI({ model: requiredEnv("CHAT_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0 });

describe.skipIf(!doReady)("DigitalOcean inference integration", () => {
  it("returns extraction output through structured output", async () => {
    const schema = z.object({ memories: z.array(z.object({ content: z.string(), category: z.enum(["fact", "preference", "context"]), confidence: z.number(), importance: z.number() })) });
    const extractor = new ChatOpenAI({ model: requiredEnv("EXTRACTION_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0 }).withStructuredOutput(schema, { method: "jsonSchema" });
    const result = await extractor.invoke("Remember that I prefer TypeScript. Return one preference memory.");
    expect(result.memories.length).toBeGreaterThan(0);
  }, 60_000);

  it("calls a tool and handles its result on the next turn", async () => {
    const lookup = tool(async ({ query }) => `Found current information about ${query}.`, { name: "web_search", description: "Search for current information", schema: z.object({ query: z.string() }) });
    const response = await model().bindTools([lookup]).invoke("Use web_search to find MongoDB Atlas.");
    const call = response.tool_calls?.[0];
    expect(call?.name).toBe("web_search");
    if (!call) return;
    const result = await lookup.invoke(call.args as { query: string });
    const followup = await model().invoke([new HumanMessage("Use web_search to find MongoDB Atlas."), response, new ToolMessage({ tool_call_id: call.id ?? "call-1", content: result })]);
    expect(followup.text.length).toBeGreaterThan(0);
  }, 60_000);
});

describe.skipIf(!tavilyReady)("Tavily integration", () => {
  it("returns mapped search results", async () => {
    const results = await webSearch("MongoDB Atlas vector search");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ title: expect.any(String), url: expect.stringMatching(/^https?:/), snippet: expect.any(String) });
  }, 60_000);
});

describe.skipIf(!mongoReady)("MongoDBSaver integration", () => {
  it("round-trips a thread using two graph instances", async () => {
    const client = await getClient();
    const checkpointer = new MongoDBSaver({ client, dbName: "claudius_minor" });
    const State = Annotation.Root({ value: Annotation<string>({ reducer: (_previous, next) => next, default: () => "" }) });
    const builder = new StateGraph(State).addNode("save", async (state) => ({ value: state.value })).addEdge(START, "save").addEdge("save", END);
    const threadId = `integration-${new ObjectId().toString()}`;
    const firstGraph = builder.compile({ checkpointer });
    await firstGraph.invoke({ value: "persistent thread" }, { configurable: { thread_id: threadId } });
    const secondGraph = builder.compile({ checkpointer });
    const state = await secondGraph.getState({ configurable: { thread_id: threadId } });
    expect(state.values.value).toBe("persistent thread");
  }, 60_000);
});

afterAll(async () => {
  if (mongoReady) await (await getClient()).close();
});

import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { env, requiredEnv } from "../../src/lib/env";

const webSearch = tool(async ({ query }) => `Search result for ${query}`, { name: "web_search", description: "Search the web", schema: z.object({ query: z.string() }) });
const model = new ChatOpenAI({ model: requiredEnv("CHAT_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL } });
const response = await model.bindTools([webSearch]).invoke("Search the web for MongoDB Atlas");
console.log(JSON.stringify(response.tool_calls));
if (response.tool_calls?.[0]) console.log(await webSearch.invoke(response.tool_calls[0].args as { query: string }));

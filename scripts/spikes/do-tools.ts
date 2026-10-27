import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { env, requiredEnv } from "../../src/lib/env";

async function main() {
  const webSearch = tool(async ({ query }) => `Search result for ${query}`, { name: "web_search", description: "Search the web", schema: z.object({ query: z.string() }) });
  const model = new ChatOpenAI({ model: requiredEnv("CHAT_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL } });
  const response = await model.bindTools([webSearch]).invoke("Search the web for MongoDB Atlas");
  console.log(JSON.stringify(response.tool_calls));
  const call = response.tool_calls?.[0];
  if (call?.name !== "web_search") throw new Error("Expected web_search tool call was not returned.");
  console.log(await webSearch.invoke(z.object({ query: z.string().min(1) }).parse(call.args)));
}

main().catch((error: unknown) => {
  console.error("DigitalOcean tool-calling spike failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});

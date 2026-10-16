import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env, requiredEnv } from "../../src/lib/env";

const Output = z.object({ memories: z.array(z.object({ content: z.string(), category: z.enum(["fact", "preference", "context"]), confidence: z.number().min(0).max(1), importance: z.number().min(0).max(1) })) });
const model = new ChatOpenAI({ model: requiredEnv("EXTRACTION_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0 });
for (const method of ["jsonSchema", "functionCalling"] as const) {
  try { console.log(method, await model.withStructuredOutput(Output, { method }).invoke("I am a software developer who prefers TypeScript.")); } catch (error) { console.error(method, error); }
}

import { ChatOpenAI } from "@langchain/openai";
import { requiredEnv, env } from "../../src/lib/env";

const model = new ChatOpenAI({ model: requiredEnv("CHAT_MODEL"), apiKey: requiredEnv("DO_MODEL_ACCESS_KEY"), configuration: { baseURL: env.DO_INFERENCE_BASE_URL }, temperature: 0 });
for await (const chunk of await model.stream("Say hello in three words.")) process.stdout.write(chunk.content.toString());
process.stdout.write("\n");

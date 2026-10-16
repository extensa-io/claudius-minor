import { z } from "zod";

const EnvSchema = z.object({
  MONGODB_URI: z.string().url().optional(),
  DO_MODEL_ACCESS_KEY: z.string().startsWith("sk-do-").optional(),
  DO_INFERENCE_BASE_URL: z.string().url().default("https://inference.do-ai.run/v1"),
  CHAT_MODEL: z.string().min(1).default("openai-gpt-oss-120b"),
  EXTRACTION_MODEL: z.string().min(1).default("openai-gpt-oss-20b"),
  TAVILY_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration. Check these variables: ${names}`);
  }
  return parsed.data;
}

export const env = parseEnv();

export function requiredEnv<K extends "MONGODB_URI" | "DO_MODEL_ACCESS_KEY" | "CHAT_MODEL" | "EXTRACTION_MODEL" | "TAVILY_API_KEY">(name: K): NonNullable<Env[K]> {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value as NonNullable<Env[K]>;
}

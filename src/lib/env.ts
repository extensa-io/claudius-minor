import { z } from "zod";

const EnvSchema = z.object({
  MONGODB_URI: z.string().url().optional(),
  DO_MODEL_ACCESS_KEY: z
    .string()
    .refine(
      (value) => /^(sk-do-|dop_v1_|doo_v1_)/.test(value),
      "Expected a DigitalOcean model access key or API access token.",
    )
    .optional(),
  DO_INFERENCE_BASE_URL: z
    .string()
    .url()
    .default("https://inference.do-ai.run/v1"),
  CHAT_MODEL: z.string().min(1).optional(),
  EXTRACTION_MODEL: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const values = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      value?.trim() === "" ? undefined : value,
    ]),
  );
  const parsed = EnvSchema.safeParse(values);
  if (!parsed.success) {
    const names = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid environment configuration. Check these variables: ${names}`,
    );
  }
  return parsed.data;
}

export const env = parseEnv();

export function requiredEnv<
  K extends
    | "MONGODB_URI"
    | "DO_MODEL_ACCESS_KEY"
    | "CHAT_MODEL"
    | "EXTRACTION_MODEL"
    | "TAVILY_API_KEY",
>(name: K): NonNullable<Env[K]> {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value as NonNullable<Env[K]>;
}

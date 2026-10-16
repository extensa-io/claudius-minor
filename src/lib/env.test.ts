import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("environment schema", () => {
  it("validates required credentials while allowing scaffolding without them", () => {
    expect(parseEnv({} as NodeJS.ProcessEnv).DO_INFERENCE_BASE_URL).toBe("https://inference.do-ai.run/v1");
    expect(parseEnv({} as NodeJS.ProcessEnv).CHAT_MODEL).toBe("openai-gpt-oss-120b");
    expect(parseEnv({} as NodeJS.ProcessEnv).EXTRACTION_MODEL).toBe("openai-gpt-oss-20b");
    expect(() => parseEnv({ DO_MODEL_ACCESS_KEY: "invalid" } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});

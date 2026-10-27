import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("environment schema", () => {
  it("validates required credentials while allowing scaffolding without them", () => {
    expect(parseEnv({} as NodeJS.ProcessEnv).DO_INFERENCE_BASE_URL).toBe("https://inference.do-ai.run/v1");
    expect(parseEnv({} as NodeJS.ProcessEnv).CHAT_MODEL).toBeUndefined();
    expect(parseEnv({ CHAT_MODEL: "", DO_MODEL_ACCESS_KEY: "" } as unknown as NodeJS.ProcessEnv).CHAT_MODEL).toBeUndefined();
    expect(parseEnv({} as NodeJS.ProcessEnv).EXTRACTION_MODEL).toBeUndefined();
    expect(parseEnv({ DO_MODEL_ACCESS_KEY: "sk-do-test" } as unknown as NodeJS.ProcessEnv).DO_MODEL_ACCESS_KEY).toBe("sk-do-test");
    expect(parseEnv({ DO_MODEL_ACCESS_KEY: "dop_v1_test" } as unknown as NodeJS.ProcessEnv).DO_MODEL_ACCESS_KEY).toBe("dop_v1_test");
    expect(parseEnv({ DO_MODEL_ACCESS_KEY: "doo_v1_test" } as unknown as NodeJS.ProcessEnv).DO_MODEL_ACCESS_KEY).toBe("doo_v1_test");
    expect(() => parseEnv({ DO_MODEL_ACCESS_KEY: "invalid" } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});

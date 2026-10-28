import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { boundedContext, MAX_CONTEXT_CHARACTERS, MAX_CONTEXT_MESSAGES } from "@/lib/context";

describe("bounded model context", () => {
  it("keeps recent complete turns without orphaning tools", () => {
    const messages = Array.from({ length: 30 }, (_, index) => [new HumanMessage(`Question ${index}`), new AIMessage("Answer")]).flat();
    const selected = boundedContext(messages);
    expect(selected.length).toBeLessThanOrEqual(MAX_CONTEXT_MESSAGES);
    expect(selected[0].getType()).toBe("human");
    expect(selected.at(-2)?.text).toBe("Question 29");
  });
  it("drops oversized turns and never sends an unbounded tool result", () => {
    const selected = boundedContext([new HumanMessage("Search"), new AIMessage(""), new ToolMessage({ content: "x".repeat(40_000), tool_call_id: "tool" })]);
    expect(selected).toHaveLength(1);
    expect(selected[0].getType()).toBe("human");
    expect(JSON.stringify(selected).length).toBeLessThan(MAX_CONTEXT_CHARACTERS);
  });
});

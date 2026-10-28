import { type BaseMessage, HumanMessage } from "@langchain/core/messages";

export const MAX_CONTEXT_CHARACTERS = 24_000;
export const MAX_CONTEXT_MESSAGES = 24;

export function boundedContext(messages: BaseMessage[]): BaseMessage[] {
  const starts = messages.flatMap((message, index) => message.getType() === "human" ? [index] : []);
  const selected: BaseMessage[] = [];
  let characters = 0;
  for (let index = starts.length - 1; index >= 0; index--) {
    const turn = messages.slice(starts[index], starts[index + 1] ?? messages.length);
    const size = turn.reduce((sum, message) => sum + JSON.stringify(message.content).length, 0);
    if (characters + size > MAX_CONTEXT_CHARACTERS || selected.length + turn.length > MAX_CONTEXT_MESSAGES) break;
    selected.unshift(...turn);
    characters += size;
  }
  // Oversized tool output must not force an unbounded request or an orphan tool message.
  return selected.length ? selected : [new HumanMessage(messages.findLast((message) => message.getType() === "human")?.text.slice(0, 4000) ?? "Please give a concise answer.")];
}

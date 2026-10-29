import type { BaseMessage } from "@langchain/core/messages";
import type { UIMessageStreamWriter } from "ai";

interface Event {
  event: string;
  name: string;
  run_id: string;
  data?: {
    chunk?: unknown;
    input?: unknown;
    output?: unknown;
    memories?: unknown;
  };
}

export async function bridgeEvents(
  events: AsyncIterable<Event>,
  writer: UIMessageStreamWriter,
): Promise<string> {
  let text = "";
  const id = "text-0";
  let open = false;
  for await (const event of events) {
    if (event.event === "on_chat_model_stream") {
      const chunk = event.data?.chunk as BaseMessage | undefined;
      const delta = chunk?.text ?? "";
      if (delta) {
        if (!open) {
          writer.write({ type: "text-start", id });
          open = true;
        }
        writer.write({ type: "text-delta", id, delta });
        text += delta;
      }
    } else if (event.event === "on_tool_start") {
      writer.write({
        type: "tool-input-start",
        toolCallId: event.run_id,
        toolName: event.name,
        dynamic: true,
      });
      writer.write({
        type: "tool-input-available",
        toolCallId: event.run_id,
        toolName: event.name,
        input: event.data?.input ?? {},
        dynamic: true,
      });
    } else if (event.event === "on_tool_end") {
      const raw =
        (event.data?.output as BaseMessage | undefined)?.text ??
        event.data?.output;
      let output = raw;
      if (typeof raw === "string") {
        try {
          output = JSON.parse(raw);
        } catch {
          output = raw;
        }
      }
      writer.write({
        type: "tool-output-available",
        toolCallId: event.run_id,
        output,
        dynamic: true,
      });
    } else if (
      event.event === "on_custom_event" &&
      event.name === "memories_used" &&
      Array.isArray(event.data?.memories)
    ) {
      writer.write({
        type: "data-memories",
        id: "memories",
        data: { memories: event.data.memories },
      });
    }
  }
  if (open) writer.write({ type: "text-end", id });
  return text;
}

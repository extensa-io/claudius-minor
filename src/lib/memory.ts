import { ObjectId } from "mongodb";
import {
  ExtractionOutputSchema,
  type Candidate,
  type MemoryCategory,
} from "@/lib/schemas";

export const CONFIDENCE_THRESHOLD = 0.6;

export interface MemoryHit {
  _id: ObjectId;
  content: string;
  category: MemoryCategory;
  score: number;
}
export type MemoryAction =
  | { action: "skip" }
  | { action: "supersede"; previous: MemoryHit }
  | { action: "insert" };

export type MemoryRelation = {
  previousId: string;
  relation: "duplicate" | "replacement" | "compatible";
};

export function decideMemoryAction(
  candidate: Candidate,
  hits: MemoryHit[],
  relation?: MemoryRelation,
): MemoryAction {
  if (
    hits.some((hit) => normalize(hit.content) === normalize(candidate.content))
  )
    return { action: "skip" };
  const previous = hits.find(
    (hit) => hit._id.toString() === relation?.previousId,
  );
  if (previous && relation?.relation === "duplicate") return { action: "skip" };
  if (previous && relation?.relation === "replacement")
    return { action: "supersede", previous };
  return { action: "insert" };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterExtractionMessages(
  messages: Array<{ type: string; content: unknown }>,
  watermark: number,
): string {
  return messages
    .slice(watermark)
    .filter((message) => message.type === "human" || message.type === "ai")
    .map((message) =>
      typeof message.content === "string" ? message.content : "",
    )
    .filter(Boolean)
    .join("\n");
}

export function parseCandidates(value: unknown): Candidate[] {
  const parsed = ExtractionOutputSchema.safeParse(value);
  return parsed.success
    ? parsed.data.memories.filter(
        (candidate) => candidate.confidence >= CONFIDENCE_THRESHOLD,
      )
    : [];
}

export interface RetrievedMemory {
  _id: ObjectId;
  content: string;
  category: MemoryCategory;
  importance: number;
}
export function assembleMemoryBlock(
  profile: RetrievedMemory[],
  relevant: RetrievedMemory[],
): { text: string; memories: RetrievedMemory[] } {
  const seen = new Set<string>();
  const memories = [...profile, ...relevant].filter((memory) => {
    const id = memory._id.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (memories.length === 0) return { text: "", memories };
  const lines = memories
    .map((memory) => `- (${memory.category}) ${memory.content}`)
    .join("\n");
  return {
    text: `The following are things you know about this user. Use relevant details naturally.
<user_memory>
${lines}
</user_memory>`,
    memories,
  };
}

export function extractUserText(
  messages: Array<{ type: string; content: unknown }>,
  watermark: number,
): string {
  return filterExtractionMessages(messages, watermark);
}

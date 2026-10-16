import { ObjectId } from "mongodb";
import { ExtractionOutputSchema, type Candidate, type MemoryCategory } from "@/lib/schemas";

export const CONFIDENCE_THRESHOLD = 0.6;
export const DUPLICATE_THRESHOLD = 0.94;
export const SUPERSEDE_THRESHOLD = 0.88;

export interface MemoryHit { _id: ObjectId; content: string; category: MemoryCategory; score: number }
export type MemoryAction = { action: "skip" } | { action: "supersede"; previous: MemoryHit } | { action: "insert" };

export function decideMemoryAction(candidate: Candidate, hits: MemoryHit[], thresholds = { duplicate: DUPLICATE_THRESHOLD, supersede: SUPERSEDE_THRESHOLD }): MemoryAction {
  const nearest = hits.filter((hit) => hit.category === candidate.category).sort((a, b) => b.score - a.score)[0];
  if (!nearest || nearest.score < thresholds.supersede) return { action: "insert" };
  if (nearest.score >= thresholds.duplicate && normalize(nearest.content) === normalize(candidate.content)) return { action: "skip" };
  return { action: "supersede", previous: nearest };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export function filterExtractionMessages(messages: Array<{ type: string; content: unknown }>, watermark: number): string {
  return messages.slice(watermark).filter((message) => message.type === "human" || message.type === "ai")
    .map((message) => typeof message.content === "string" ? message.content : "")
    .filter(Boolean).join("\n");
}

export function parseCandidates(value: unknown): Candidate[] {
  const parsed = ExtractionOutputSchema.safeParse(value);
  return parsed.success ? parsed.data.memories.filter((candidate) => candidate.confidence >= CONFIDENCE_THRESHOLD) : [];
}

export interface RetrievedMemory { _id: ObjectId; content: string; category: MemoryCategory; importance: number }
export function assembleMemoryBlock(profile: RetrievedMemory[], relevant: RetrievedMemory[]): { text: string; memories: RetrievedMemory[] } {
  const seen = new Set<string>();
  const memories = [...profile, ...relevant].filter((memory) => {
    const id = memory._id.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (memories.length === 0) return { text: "", memories };
  const lines = memories.map((memory) => `- (${memory.category}) ${memory.content}`).join("\n");
  return { text: `The following are things you know about this user. Use relevant details naturally.\n<user_memory>\n${lines}\n</user_memory>`, memories };
}

export function extractUserText(messages: Array<{ type: string; content: unknown }>, watermark: number): string {
  return filterExtractionMessages(messages, watermark);
}

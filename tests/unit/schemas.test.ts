import { describe, expect, it } from "vitest";
import { ExtractionOutputSchema, MemorySchema, PersonaSchema } from "@/lib/schemas";

describe("record schemas", () => {
  it("accepts the three seeded personas and rejects invalid memory values", () => {
    expect(PersonaSchema.safeParse({ _id: "012345678901234567890123", name: "Angela" }).success).toBe(true);
    expect(MemorySchema.safeParse({}).success).toBe(false);
    expect(ExtractionOutputSchema.safeParse({ memories: [{ content: "Uses TypeScript", category: "preference", confidence: 0.9 }] }).success).toBe(true);
  });
});

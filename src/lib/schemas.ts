import { z } from "zod";

export const PersonaSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i),
  name: z.enum(["Angela", "Betty", "Caroline"]),
});
export const ConversationSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i),
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  extractionWatermark: z.number().int().nonnegative(),
});
export const MemoryCategorySchema = z.enum(["fact", "preference", "context"]);
export const MemorySchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i),
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  content: z.string().min(3),
  category: MemoryCategorySchema,
  importance: z.number().min(0).max(1),
  sourceConversationId: z.string().regex(/^[a-f\d]{24}$/i),
  createdAt: z.date(),
  status: z.enum(["active", "superseded"]),
  supersededBy: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  supersedes: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
});
export const ExtractionOutputSchema = z.object({
  memories: z
    .array(
      z.object({
        content: z.string().trim().min(3).max(500),
        category: MemoryCategorySchema,
        confidence: z.number().min(0).max(1),
        importance: z.number().min(0).max(1).default(0.5),
      }),
    )
    .max(5),
});
export const ChatInputSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
});
export type MemoryCategory = z.infer<typeof MemoryCategorySchema>;
export type Candidate = z.infer<
  typeof ExtractionOutputSchema
>["memories"][number];

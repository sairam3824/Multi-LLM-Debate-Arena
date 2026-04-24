import { z } from "zod";

const modelSelectionSchema = z.object({
  provider: z.enum(["anthropic", "openai", "openrouter"]),
  label: z.string().min(1),
  modelId: z.string().min(1),
  source: z.enum(["preset", "custom"])
});

export const debateSetupSchema = z.object({
  claim: z.string().min(3).max(500),
  rounds: z.number().int().min(1).max(5),
  maxWordsPerTurn: z.number().int().min(40).max(500),
  debaterA: modelSelectionSchema,
  debaterB: modelSelectionSchema,
  judge: modelSelectionSchema
});

export type DebateSetupSchema = z.infer<typeof debateSetupSchema>;

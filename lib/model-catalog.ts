import type { ModelSelection } from "@/lib/types";

export const PRESET_MODEL_OPTIONS: ModelSelection[] = [
  {
    provider: "anthropic",
    label: "Claude Opus 4.7",
    modelId: process.env.DEFAULT_ANTHROPIC_OPUS_MODEL ?? "claude-opus-4-1-20250805",
    source: "preset"
  },
  {
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    modelId: process.env.DEFAULT_ANTHROPIC_SONNET_MODEL ?? "claude-sonnet-4-20250514",
    source: "preset"
  },
  {
    provider: "openai",
    label: "GPT-4o",
    modelId: "gpt-4o",
    source: "preset"
  },
  {
    provider: "openai",
    label: "GPT-4o-mini",
    modelId: "gpt-4o-mini",
    source: "preset"
  }
];

export const CUSTOM_OPENROUTER_OPTION = {
  provider: "openrouter" as const,
  label: "Custom OpenRouter model",
  modelId: "",
  source: "custom" as const
};

export function serializeModelSelection(model: ModelSelection) {
  return JSON.stringify(model);
}

export function parseModelSelection(serialized: string) {
  return JSON.parse(serialized) as ModelSelection;
}

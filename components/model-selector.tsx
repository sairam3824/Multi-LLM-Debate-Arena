"use client";

import { useId } from "react";

import { CUSTOM_OPENROUTER_OPTION, PRESET_MODEL_OPTIONS } from "@/lib/model-catalog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModelSelection } from "@/lib/types";

type ModelSelectorProps = {
  label: string;
  value: ModelSelection;
  onChange: (model: ModelSelection) => void;
};

export function ModelSelector({ label, value, onChange }: ModelSelectorProps) {
  const customId = useId();
  const selectedValue = value.source === "custom" ? "custom" : `${value.provider}:${value.modelId}`;

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <Select
        value={selectedValue}
        onValueChange={(nextValue) => {
          if (nextValue === "custom") {
            onChange({
              ...CUSTOM_OPENROUTER_OPTION,
              modelId: value.source === "custom" ? value.modelId : "openai/gpt-4o-mini"
            });
            return;
          }

          const nextModel = PRESET_MODEL_OPTIONS.find(
            (option) => `${option.provider}:${option.modelId}` === nextValue
          );

          if (nextModel) {
            onChange(nextModel);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a model" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_MODEL_OPTIONS.map((option) => (
            <SelectItem key={`${option.provider}:${option.modelId}`} value={`${option.provider}:${option.modelId}`}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">{CUSTOM_OPENROUTER_OPTION.label}</SelectItem>
        </SelectContent>
      </Select>

      {value.source === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor={customId}>OpenRouter model ID</Label>
          <Input
            id={customId}
            placeholder="anthropic/claude-sonnet-4 or openai/gpt-4o-mini"
            value={value.modelId}
            onChange={(event) =>
              onChange({
                provider: "openrouter",
                source: "custom",
                label: "Custom OpenRouter model",
                modelId: event.target.value
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

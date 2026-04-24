import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { OpenRouter } from "@openrouter/sdk";

import type { ModelSelection } from "@/lib/types";

type StreamTextParams = {
  model: ModelSelection;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  temperature?: number;
  onToken: (token: string) => Promise<void> | void;
};

export async function streamModelText({
  model,
  systemPrompt,
  userPrompt,
  maxOutputTokens,
  temperature = 0.7,
  onToken
}: StreamTextParams) {
  if (model.provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY for Anthropic model.");
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model: model.modelId,
      max_tokens: maxOutputTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });

    let fullText = "";

    stream.on("text", (text) => {
      fullText += text;
      void onToken(text);
    });

    await stream.finalMessage();
    return fullText.trim();
  }

  if (model.provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY for OpenAI model.");
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await client.chat.completions.create({
      model: model.modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxOutputTokens,
      temperature,
      stream: true
    });

    let fullText = "";

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (!token) {
        continue;
      }

      fullText += token;
      await onToken(token);
    }

    return fullText.trim();
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY for OpenRouter model.");
  }

  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const stream = await client.chat.send({
    appTitle: "Multi-LLM Debate Arena",
    chatRequest: {
      model: model.modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      maxTokens: maxOutputTokens,
      temperature,
      stream: true
    }
  });

  let fullText = "";

  for await (const chunk of stream) {
    if ("error" in chunk && chunk.error) {
      throw new Error(chunk.error.message);
    }

    const token = chunk.choices?.[0]?.delta?.content ?? "";
    if (!token) {
      continue;
    }

    fullText += token;
    await onToken(token);
  }

  return fullText.trim();
}

import { GoogleGenAI } from "@google/genai";

import type { ModelClient } from "./model-client";

export type GeminiClientOptions = {
  apiKey: string;
  model: string;
};

export function createGeminiClient({
  apiKey,
  model,
}: GeminiClientOptions): ModelClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateJson({ system, user, jsonSchema }) {
      const response = await ai.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }
      return text;
    },
  };
}

export function createGeminiClientFromEnv(): ModelClient {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.EXTRACTION_MODEL;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  if (!model) {
    throw new Error("EXTRACTION_MODEL is not set.");
  }

  return createGeminiClient({ apiKey, model });
}
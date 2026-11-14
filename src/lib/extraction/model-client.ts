/**
 * Any JSON Schema object. Typed loosely on purpose: each provider adapter
 * decides how to pass it on.
 */
export type JsonSchema = object;

export type ModelRequest = {
  system: string;
  user: string;
  jsonSchema: JsonSchema;
};

/**
 * The only thing the rest of the app knows about an AI provider.
 * Returns the model's raw response text (expected to be JSON).
 * Throws if the call fails.
 */
export interface ModelClient {
  generateJson(request: ModelRequest): Promise<string>;
}
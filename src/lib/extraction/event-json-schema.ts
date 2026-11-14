import { z } from "zod";

import { eventFieldsSchema } from "./event-schema";

/**
 * JSON Schema for the model's response: {"events": [ ...event fields... ]}.
 * Built from the plain field schema only. The cross-field rules (dates that
 * exist, end after start, ...) are enforced afterwards by eventSchema.
 */
export const EVENTS_JSON_SCHEMA = z.toJSONSchema(
  z.object({ events: z.array(eventFieldsSchema) }),
);
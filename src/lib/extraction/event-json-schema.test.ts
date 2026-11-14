import { describe, expect, it } from "vitest";

import { EVENTS_JSON_SCHEMA } from "./event-json-schema";
import { EVENT_TYPES, eventFieldsSchema } from "./event-schema";

describe("EVENTS_JSON_SCHEMA", () => {
  it("mentions every event field", () => {
    const text = JSON.stringify(EVENTS_JSON_SCHEMA);

    for (const field of Object.keys(eventFieldsSchema.shape)) {
      expect(text).toContain(`"${field}"`);
    }
  });

  it("mentions every event type", () => {
    const text = JSON.stringify(EVENTS_JSON_SCHEMA);

    for (const type of EVENT_TYPES) {
      expect(text).toContain(`"${type}"`);
    }
  });

  it("survives a JSON round trip", () => {
    expect(JSON.parse(JSON.stringify(EVENTS_JSON_SCHEMA))).toEqual(
      EVENTS_JSON_SCHEMA,
    );
  });
});
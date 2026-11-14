import { describe, expect, it, vi } from "vitest";

import { extractEvents, snippetAppearsInSource } from "./extract-events";
import type { ModelClient, ModelRequest } from "./model-client";
import { buildExtractionPrompt } from "./prompt";

const RAW = [
  "SATURDAY 14 NOV 2026",
  "20:00 - 21:00 | Theatre | Starlight - Production Show | Production Theatre",
  "22:00 - 23:00 | Theatre | Cast rehearsal | Production Cast",
].join("\n");

const DEPARTMENTS = ["Production Theatre", "Production Cast"];

function show(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event_date: "2026-11-14",
    start_time: "20:00",
    end_time: "21:00",
    ends_next_day: false,
    venue: "Theatre",
    type: "show",
    title: "Starlight - Production Show",
    department: "Production Theatre",
    notes: null,
    source_snippet:
      "20:00 - 21:00 | Theatre | Starlight - Production Show | Production Theatre",
    ...overrides,
  };
}

function rehearsal(): Record<string, unknown> {
  return show({
    start_time: "22:00",
    end_time: "23:00",
    type: "rehearsal",
    title: "Cast rehearsal",
    department: "Production Cast",
    source_snippet: "22:00 - 23:00 | Theatre | Cast rehearsal | Production Cast",
  });
}

// A fake provider: records every request and answers with canned text.
function fakeClient(respond: () => string): {
  client: ModelClient;
  calls: ModelRequest[];
} {
  const calls: ModelRequest[] = [];
  return {
    calls,
    client: {
      async generateJson(request) {
        calls.push(request);
        return respond();
      },
    },
  };
}

function reply(events: unknown[]): string {
  return JSON.stringify({ events });
}

describe("extractEvents", () => {
  it("sends the built prompt and the JSON schema to the client", async () => {
    const { client, calls } = fakeClient(() => reply([]));

    await extractEvents({ rawText: RAW, departmentNames: DEPARTMENTS, client });

    const [call] = calls;
    expect(calls).toHaveLength(1);
    expect(call?.system).toBe(
      buildExtractionPrompt({ rawText: RAW, departmentNames: DEPARTMENTS }).system,
    );
    expect(call?.user).toContain(RAW);
    expect(call?.jsonSchema).toBeDefined();
  });

  it("returns validated events whose snippets are in the source", async () => {
    const { client } = fakeClient(() => reply([show(), rehearsal()]));

    const result = await extractEvents({
      rawText: RAW,
      departmentNames: DEPARTMENTS,
      client,
    });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.events).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects an event whose snippet is not in the source", async () => {
    const { client } = fakeClient(() =>
      reply([show(), show({ source_snippet: "an invented line" }), rehearsal()]),
    );

    const result = await extractEvents({
      rawText: RAW,
      departmentNames: DEPARTMENTS,
      client,
    });

    if (!result.ok) throw new Error(result.message);
    expect(result.events).toHaveLength(2);
    expect(result.rejected.map((r) => r.index)).toEqual([1]);
    expect(result.rejected[0]?.problems.join("\n")).toContain("source_snippet");
  });

  it("tolerates whitespace differences in the snippet", async () => {
    const { client } = fakeClient(() =>
      reply([
        show({
          source_snippet:
            "20:00 - 21:00  |  Theatre | Starlight - Production Show | Production Theatre",
        }),
      ]),
    );

    const result = await extractEvents({
      rawText: RAW,
      departmentNames: DEPARTMENTS,
      client,
    });

    if (!result.ok) throw new Error(result.message);
    expect(result.events).toHaveLength(1);
  });

  it("reports schema and snippet rejections together, in the model's order", async () => {
    const { client } = fakeClient(() =>
      reply([
        show({ type: "nope" }),
        show({ source_snippet: "99:99 | made up row" }),
        rehearsal(),
      ]),
    );

    const result = await extractEvents({
      rawText: RAW,
      departmentNames: DEPARTMENTS,
      client,
    });

    if (!result.ok) throw new Error(result.message);
    expect(result.events).toHaveLength(1);
    expect(result.rejected.map((r) => r.index)).toEqual([0, 1]);
  });

  it("fails cleanly when the response is not JSON", async () => {
    const { client } = fakeClient(() => "Sorry, I cannot do that.");

    const result = await extractEvents({
      rawText: RAW,
      departmentNames: DEPARTMENTS,
      client,
    });

    expect(result.ok).toBe(false);
  });

  it("fails cleanly when the client throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client: ModelClient = {
      async generateJson() {
        throw new Error("network down");
      },
    };

    const result = await extractEvents({
      rawText: RAW,
      departmentNames: DEPARTMENTS,
      client,
    });

    expect(result.ok).toBe(false);
    spy.mockRestore();
  });
});

describe("snippetAppearsInSource", () => {
  it("accepts text that occurs in the source", () => {
    expect(snippetAppearsInSource("Cast rehearsal | Production Cast", RAW)).toBe(true);
  });

  it("ignores whitespace differences, including line breaks", () => {
    expect(
      snippetAppearsInSource("SATURDAY 14 NOV 2026 20:00 - 21:00", RAW),
    ).toBe(true);
  });

  it("rejects altered wording and blank snippets", () => {
    expect(snippetAppearsInSource("Cast rehearsal | Production Crew", RAW)).toBe(false);
    expect(snippetAppearsInSource("   ", RAW)).toBe(false);
  });
});
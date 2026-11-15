import { EVENTS_JSON_SCHEMA } from "../src/lib/extraction/event-json-schema";
import { createGeminiClientFromEnv } from "../src/lib/extraction/gemini-client";

const system =
  "You extract events from a schedule. Return only JSON matching the schema.";

const user = [
  "Extract every event from this invented schedule.",
  "<schedule>",
  "Monday the 2nd of March 2026",
  "From 19:30 to 20:30 And the Main Theatre | Production Theatre | Show: Under the sea",
  "</schedule>",
].join("\n");

async function main() {
  const client = createGeminiClientFromEnv();
  const raw = await client.generateJson({
    system,
    user,
    jsonSchema: EVENTS_JSON_SCHEMA,
  });

  console.log("RAW RESPONSE:\n" + raw);
  console.log("\nPARSED OK:", JSON.parse(raw));
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED:", error);
  process.exit(1);
});
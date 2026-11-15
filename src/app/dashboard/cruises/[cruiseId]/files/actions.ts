"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { describeParseError } from "@/lib/ingest/parse-error-message";
import { parseSource } from "@/lib/ingest/parse-source";
import { preparePastedText } from "@/lib/ingest/prepare-pasted-text";
import { extractEvents } from "@/lib/extraction/extract-events";
import { createGeminiClientFromEnv } from "@/lib/extraction/gemini-client";
import { DEPARTMENT_NAMES } from "@/lib/extraction/department-names";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function filesPath(cruiseId: string): string {
  return `/dashboard/cruises/${cruiseId}/files`;
}

export type ParseSourceFileResult =
  | { ok: true; needsOcr: boolean; warnings: string[]; characters: number }
  | { ok: false; message: string };

export async function parseSourceFile(
  sourceFileId: string,
  cruiseId: string,
): Promise<ParseSourceFileResult> {
  // 1. Validate input. A server action argument is untrusted.
  if (typeof sourceFileId !== "string" || !UUID_PATTERN.test(sourceFileId)) {
    return { ok: false, message: "Invalid file id." };
  }
  if (typeof cruiseId !== "string" || !UUID_PATTERN.test(cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }

  // 2. Authenticate. requireUser() handles the redirect for signed-out
  //    users; getUser() re-verifies the session with the auth server
  //    because this action writes.
  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  // 3. Load the row. RLS means another user's id returns null here.
  const { data: row, error: loadError } = await supabase
    .from("source_files")
    .select("id, file_name, file_type, storage_path")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (loadError) {
    console.error("parseSourceFile: load failed", { sourceFileId, loadError });
    return { ok: false, message: "Could not load this file. Please try again." };
  }
  if (!row) {
    return { ok: false, message: "File not found." };
  }
  if (!row.storage_path) {
    return {
      ok: false,
      message: "This item has no uploaded file to parse. Pasted text is stored as-is.",
    };
  }

  // 4. Download the object as the signed-in user (Storage RLS applies).
  const { data: blob, error: downloadError } = await supabase.storage
    .from("source-files")
    .download(row.storage_path);

  if (downloadError || !blob) {
    console.error("parseSourceFile: download failed", {
      sourceFileId,
      downloadError,
    });
    return {
      ok: false,
      message: "Could not download this file from storage. Please try again.",
    };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());

  // 5. Parse. Both expected error classes are mapped to friendly messages;
  //    the technical cause goes to the server log only.
  let parsed: Awaited<ReturnType<typeof parseSource>>;
  try {
    parsed = await parseSource(bytes, row.file_name);
  } catch (error) {
    console.error("parseSourceFile: parse failed", {
      sourceFileId,
      error,
      cause: error instanceof Error ? error.cause : undefined,
    });
    return { ok: false, message: describeParseError(error) };
  }

  // 6. Save. A scanned PDF has empty text: store null, not "".
  const hasText = parsed.text.trim() !== "";

  const { data: updated, error: updateError } = await supabase
    .from("source_files")
    .update({
      raw_text: hasText ? parsed.text : null,
      parse_warnings: parsed.warnings,
      needs_ocr: parsed.needsOcr,
      parsed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("id");

  if (updateError) {
    console.error("parseSourceFile: update failed", { sourceFileId, updateError });
    return { ok: false, message: "Could not save the parsed text. Please try again." };
  }
  if (!updated || updated.length === 0) {
    // RLS hides rows silently: an update that matches nothing is not an error.
    return { ok: false, message: "File not found." };
  }

  revalidatePath(filesPath(cruiseId));

  return {
    ok: true,
    needsOcr: parsed.needsOcr,
    warnings: parsed.warnings,
    characters: parsed.text.length,
  };
}

export type CreateTextSourceResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export async function createTextSource(input: {
  title: string;
  text: string;
  cruiseId: string;
}): Promise<CreateTextSourceResult> {
  if (typeof input?.cruiseId !== "string" || !UUID_PATTERN.test(input.cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }

  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const prepared = preparePastedText(input?.text, input?.title);
  if (!prepared.ok) {
    return prepared;
  }

  const { data, error } = await supabase
    .from("source_files")
    .insert({
      file_name: prepared.title,
      file_type: "text",
      raw_text: prepared.text,
      parsed_at: new Date().toISOString(),
      cruise_id: input.cruiseId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createTextSource: insert failed", { error });

    // 23503 = foreign_key_violation: the cruise id doesn't belong to you.
    if (error?.code === "23503") {
      return { ok: false, message: "That cruise could not be found." };
    }

    return { ok: false, message: "Could not save the text. Please try again." };
  }

  revalidatePath(filesPath(input.cruiseId));

  return { ok: true, id: data.id };
}

export type DeleteSourceFileResult =
  | { ok: true }
  | { ok: false; message: string };

export async function deleteSourceFile(
  sourceFileId: string,
  cruiseId: string,
): Promise<DeleteSourceFileResult> {
  if (typeof sourceFileId !== "string" || !UUID_PATTERN.test(sourceFileId)) {
    return { ok: false, message: "Invalid file id." };
  }
  if (typeof cruiseId !== "string" || !UUID_PATTERN.test(cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }

  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const { data: row, error: loadError } = await supabase
    .from("source_files")
    .select("id, storage_path")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (loadError) {
    console.error("deleteSourceFile: load failed", { sourceFileId, loadError });
    return { ok: false, message: "Could not load this file. Please try again." };
  }

  if (!row) {
    // Already deleted (double click, stale tab) or not visible to this user.
    // Either way the requested end state is true; refresh the list.
    revalidatePath(filesPath(cruiseId));
    return { ok: true };
  }

  // Cheap precondition first: a source with events cannot be deleted
  // (the foreign key forbids it). Checking before touching Storage avoids
  // removing the object and then failing on the row.
  const { count, error: countError } = await supabase
    .from("extracted_events")
    .select("id", { count: "exact", head: true })
    .eq("source_file_id", row.id);

  if (countError) {
    console.error("deleteSourceFile: event count failed", {
      sourceFileId,
      countError,
    });
    return { ok: false, message: "Could not delete this file. Please try again." };
  }

  if (count !== null && count > 0) {
    return { ok: false, message: blockedByEventsMessage(count) };
  }

  // Object first, row second: a failure between the two leaves a visible,
  // retryable row instead of an invisible orphaned object.
  if (row.storage_path) {
    const { error: removeError } = await supabase.storage
      .from("source-files")
      .remove([row.storage_path]);

    if (removeError) {
      console.error("deleteSourceFile: storage remove failed", {
        sourceFileId,
        removeError,
      });
      return {
        ok: false,
        message: "Could not delete the stored file. Please try again.",
      };
    }
  }

  const { error: deleteError } = await supabase
    .from("source_files")
    .delete()
    .eq("id", row.id);

  if (deleteError) {
    console.error("deleteSourceFile: row delete failed", {
      sourceFileId,
      deleteError,
    });

    // 23503 = foreign_key_violation: events appeared after the count above.
    if (deleteError.code === "23503") {
      return { ok: false, message: blockedByEventsMessage(null) };
    }

    return { ok: false, message: "Could not delete this file. Please try again." };
  }

  revalidatePath(filesPath(cruiseId));
  return { ok: true };
}

function blockedByEventsMessage(count: number | null): string {
  const subject =
    count === null
      ? "This file now has extracted events"
      : count === 1
        ? "This file has 1 extracted event"
        : `This file has ${count} extracted events`;

  return `${subject}. Delete the events first, then delete the file.`;
}

const MAX_DAILY_EXTRACTIONS = Number(process.env.MAX_DAILY_EXTRACTIONS ?? "20");

export type ExtractSourceEventsResult =
  | { ok: true; kept: number; rejected: number }
  | { ok: false; message: string };

export async function extractSourceEvents(
  sourceFileId: string,
  cruiseId: string,
): Promise<ExtractSourceEventsResult> {
  if (typeof sourceFileId !== "string" || !UUID_PATTERN.test(sourceFileId)) {
    return { ok: false, message: "Invalid file id." };
  }
  if (typeof cruiseId !== "string" || !UUID_PATTERN.test(cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }

  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const { data: source, error: loadError } = await supabase
    .from("source_files")
    .select("id, raw_text, parsed_at")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (loadError) {
    console.error("extractSourceEvents: load failed", { sourceFileId, loadError });
    return { ok: false, message: "Could not load this file. Please try again." };
  }

  if (!source) {
    return { ok: false, message: "That file could not be found." };
  }

  if (!source.parsed_at || !source.raw_text) {
    return { ok: false, message: "This file has not been parsed yet." };
  }

  const { count: existingEventCount, error: countError } = await supabase
    .from("extracted_events")
    .select("id", { count: "exact", head: true })
    .eq("source_file_id", source.id);

  if (countError) {
    console.error("extractSourceEvents: event count failed", {
      sourceFileId,
      countError,
    });
    return { ok: false, message: "Could not check for existing events. Please try again." };
  }

  if (existingEventCount !== null && existingEventCount > 0) {
    return {
      ok: false,
      message:
        "This file already has extracted events. Delete them before extracting again.",
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCallCount, error: recentCallError } = await supabase
    .from("ai_extraction_calls")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (recentCallError) {
    console.error("extractSourceEvents: rate limit check failed", {
      sourceFileId,
      recentCallError,
    });
    return { ok: false, message: "Could not check your extraction limit. Please try again." };
  }

  if (recentCallCount !== null && recentCallCount >= MAX_DAILY_EXTRACTIONS) {
    return {
      ok: false,
      message: `You've reached the limit of ${MAX_DAILY_EXTRACTIONS} extractions per day. Try again later.`,
    };
  }

  const { error: logError } = await supabase.from("ai_extraction_calls").insert({});

  if (logError) {
    console.error("extractSourceEvents: call log insert failed", {
      sourceFileId,
      logError,
    });
    return { ok: false, message: "Could not record this extraction attempt." };
  }

  const client = createGeminiClientFromEnv();
  const result = await extractEvents({
    rawText: source.raw_text,
    departmentNames: DEPARTMENT_NAMES,
    client,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  if (result.events.length > 0) {
    const { error: insertError } = await supabase.from("extracted_events").insert(
      result.events.map((event) => ({
        source_file_id: source.id,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        ends_next_day: event.ends_next_day,
        venue: event.venue,
        type: event.type,
        title: event.title,
        department: event.department,
        notes: event.notes,
        source_snippet: event.source_snippet,
      })),
    );

    if (insertError) {
      console.error("extractSourceEvents: events insert failed", {
        sourceFileId,
        insertError,
      });
      return {
        ok: false,
        message: "Extraction succeeded but saving the events failed.",
      };
    }
  }

  revalidatePath(filesPath(cruiseId));
  return { ok: true, kept: result.events.length, rejected: result.rejected.length };
}

export type FileEventSummary = { total: number; reviewed: number };

export type GetFileEventSummaryResult =
  | { ok: true; summary: FileEventSummary }
  | { ok: false; message: string };

export async function getFileEventSummary(
  sourceFileId: string,
): Promise<GetFileEventSummaryResult> {
  if (typeof sourceFileId !== "string" || !UUID_PATTERN.test(sourceFileId)) {
    return { ok: false, message: "Invalid file id." };
  }

  // Read-only: no auth.getUser() re-check, since nothing here writes.
  const { supabase } = await requireUser();

  const { count: total, error: totalError } = await supabase
    .from("extracted_events")
    .select("id", { count: "exact", head: true })
    .eq("source_file_id", sourceFileId);

  if (totalError) {
    console.error("getFileEventSummary: total count failed", {
      sourceFileId,
      totalError,
    });
    return { ok: false, message: "Could not check this file's events. Please try again." };
  }

  const { count: reviewed, error: reviewedError } = await supabase
    .from("extracted_events")
    .select("id", { count: "exact", head: true })
    .eq("source_file_id", sourceFileId)
    .eq("reviewed", true);

  if (reviewedError) {
    console.error("getFileEventSummary: reviewed count failed", {
      sourceFileId,
      reviewedError,
    });
    return { ok: false, message: "Could not check this file's events. Please try again." };
  }

  return { ok: true, summary: { total: total ?? 0, reviewed: reviewed ?? 0 } };
}

export type DeleteFileEventsResult =
  | { ok: true; deleted: number }
  | { ok: false; message: string };

export async function deleteFileEvents(
  sourceFileId: string,
  cruiseId: string,
): Promise<DeleteFileEventsResult> {
  if (typeof sourceFileId !== "string" || !UUID_PATTERN.test(sourceFileId)) {
    return { ok: false, message: "Invalid file id." };
  }
  if (typeof cruiseId !== "string" || !UUID_PATTERN.test(cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }

  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("extracted_events")
    .delete()
    .eq("source_file_id", sourceFileId)
    .select("id");

  if (deleteError) {
    console.error("deleteFileEvents: delete failed", { sourceFileId, deleteError });
    return { ok: false, message: "Could not delete these events. Please try again." };
  }

  revalidatePath(filesPath(cruiseId));
  return { ok: true, deleted: deleted?.length ?? 0 };
}
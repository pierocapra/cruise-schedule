"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import {
  prepareEventUpdate,
  type EventEdits,
} from "@/lib/extraction/event-edits";
import {
  MANUAL_FILE_TYPE,
  MANUAL_SNIPPET,
  MANUAL_SOURCE_NAME,
} from "@/lib/extraction/manual-source";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reviewPath(cruiseId: string): string {
  return `/dashboard/cruises/${cruiseId}/review`;
}

export type UpdateEventResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateEvent(
  eventId: string,
  cruiseId: string,
  edits: EventEdits,
): Promise<UpdateEventResult> {
  if (typeof eventId !== "string" || !UUID_PATTERN.test(eventId)) {
    return { ok: false, message: "Invalid event id." };
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

  // Load the stored row: its department and snippet are not editable, so
  // they come from here. RLS means another user's id returns null.
  const { data: existing, error: loadError } = await supabase
    .from("extracted_events")
    .select("id, department, source_snippet")
    .eq("id", eventId)
    .maybeSingle();

  if (loadError) {
    console.error("updateEvent: load failed", { eventId, loadError });
    return { ok: false, message: "Could not load this event. Please try again." };
  }
  if (!existing) {
    return { ok: false, message: "That event could not be found." };
  }

  const prepared = prepareEventUpdate(edits, {
    department: existing.department,
    source_snippet: existing.source_snippet,
  });
  if (!prepared.ok) {
    return prepared;
  }

  // Any edit resets reviewed: a changed row has to be looked at again.
  const { data: updated, error: updateError } = await supabase
    .from("extracted_events")
    .update({ ...prepared.fields, reviewed: false })
    .eq("id", existing.id)
    .select("id");

  if (updateError) {
    console.error("updateEvent: update failed", { eventId, updateError });

    // 23514 = check_violation: the database's own rules rejected the values.
    if (updateError.code === "23514") {
      return {
        ok: false,
        message: "The database rejected these values. Check the date and times.",
      };
    }

    return { ok: false, message: "Could not save this event. Please try again." };
  }

  if (!updated || updated.length === 0) {
    // Deleted between the load and the update, or hidden by RLS.
    return { ok: false, message: "That event could not be found." };
  }

  revalidatePath(reviewPath(cruiseId));
  return { ok: true };
}

export type DeleteEventResult =
  | { ok: true }
  | { ok: false; message: string };

export async function deleteEvent(
  eventId: string,
  cruiseId: string,
): Promise<DeleteEventResult> {
  if (typeof eventId !== "string" || !UUID_PATTERN.test(eventId)) {
    return { ok: false, message: "Invalid event id." };
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

  const { error: deleteError } = await supabase
    .from("extracted_events")
    .delete()
    .eq("id", eventId);

  if (deleteError) {
    console.error("deleteEvent: delete failed", { eventId, deleteError });
    return { ok: false, message: "Could not delete this event. Please try again." };
  }

  // Zero rows deleted (double click, stale tab, or not visible to this
  // user) is not an error: the requested end state is already true.
  revalidatePath(reviewPath(cruiseId));
  // The Sources page shows "Extract" or "Delete events" depending on
  // whether a file still has events, so it needs refreshing too.
  revalidatePath(`/dashboard/cruises/${cruiseId}/files`);
  return { ok: true };
}

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

type ManualSourceResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

// Finds the cruise's "Manual entries" source, creating it the first time.
async function getOrCreateManualSource(
  supabase: Supabase,
  cruiseId: string,
): Promise<ManualSourceResult> {
  const find = () =>
    supabase
      .from("source_files")
      .select("id")
      .eq("cruise_id", cruiseId)
      .eq("file_type", MANUAL_FILE_TYPE)
      .maybeSingle();

  const { data: found, error: findError } = await find();

  if (findError) {
    console.error("getOrCreateManualSource: lookup failed", {
      cruiseId,
      findError,
    });
    return { ok: false, message: "Could not add this event. Please try again." };
  }
  if (found) {
    return { ok: true, id: found.id };
  }

  // No storage_path: a manual source has no file. raw_text is "" (not null)
  // because the has_content check wants one of the two to be non-null.
  const { data: created, error: createError } = await supabase
    .from("source_files")
    .insert({
      cruise_id: cruiseId,
      file_name: MANUAL_SOURCE_NAME,
      file_type: MANUAL_FILE_TYPE,
      raw_text: "",
    })
    .select("id")
    .single();

  if (createError || !created) {
    // 23505 = unique_violation: a concurrent request created it first.
    if (createError?.code === "23505") {
      const { data: winner, error: winnerError } = await find();
      if (!winnerError && winner) {
        return { ok: true, id: winner.id };
      }
    }

    // 23503 = foreign_key_violation: the cruise id isn't yours.
    if (createError?.code === "23503") {
      return { ok: false, message: "That cruise could not be found." };
    }

    console.error("getOrCreateManualSource: create failed", {
      cruiseId,
      createError,
    });
    return { ok: false, message: "Could not add this event. Please try again." };
  }

  return { ok: true, id: created.id };
}

export type AddManualEventResult =
  | { ok: true }
  | { ok: false; message: string };

export async function addManualEvent(
  cruiseId: string,
  edits: EventEdits,
): Promise<AddManualEventResult> {
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

  // Validate before touching the database, so a bad form never creates the
  // Manual entries source. Same rules as an edit; the fixed fields are the
  // placeholder snippet and no department.
  const prepared = prepareEventUpdate(edits, {
    department: null,
    source_snippet: MANUAL_SNIPPET,
  });
  if (!prepared.ok) {
    return prepared;
  }

  const source = await getOrCreateManualSource(supabase, cruiseId);
  if (!source.ok) {
    return source;
  }

  // reviewed = true: a person typed this, so it has already been checked.
  const { error: insertError } = await supabase.from("extracted_events").insert({
    source_file_id: source.id,
    ...prepared.fields,
    department: null,
    source_snippet: MANUAL_SNIPPET,
    reviewed: true,
  });

  if (insertError) {
    console.error("addManualEvent: insert failed", { cruiseId, insertError });

    // 23514 = check_violation: the database's own rules rejected the values.
    if (insertError.code === "23514") {
      return {
        ok: false,
        message: "The database rejected these values. Check the date and times.",
      };
    }

    return { ok: false, message: "Could not add this event. Please try again." };
  }

  revalidatePath(reviewPath(cruiseId));
  return { ok: true };
}

export type SetEventReviewedResult =
  | { ok: true }
  | { ok: false; message: string };

export async function setEventReviewed(
  eventId: string,
  cruiseId: string,
  reviewed: boolean,
): Promise<SetEventReviewedResult> {
  if (typeof eventId !== "string" || !UUID_PATTERN.test(eventId)) {
    return { ok: false, message: "Invalid event id." };
  }
  if (typeof cruiseId !== "string" || !UUID_PATTERN.test(cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }
  if (typeof reviewed !== "boolean") {
    return { ok: false, message: "Invalid review status." };
  }

  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("extracted_events")
    .update({ reviewed })
    .eq("id", eventId)
    .select("id");

  if (updateError) {
    console.error("setEventReviewed: update failed", { eventId, updateError });
    return { ok: false, message: "Could not update this event. Please try again." };
  }

  if (!updated || updated.length === 0) {
    // Deleted elsewhere (stale tab), or hidden by RLS.
    return { ok: false, message: "That event could not be found." };
  }

  revalidatePath(reviewPath(cruiseId));
  return { ok: true };
}

export type ApproveRemainingResult =
  | { ok: true; approved: number }
  | { ok: false; message: string };

export async function approveRemainingEvents(
  cruiseId: string,
): Promise<ApproveRemainingResult> {
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

  // Events have no cruise_id of their own, so scope the update through the
  // cruise's sources. This is a real filter, not just RLS: without it every
  // cruise's pending events would be approved.
  const { data: sources, error: sourcesError } = await supabase
    .from("source_files")
    .select("id")
    .eq("cruise_id", cruiseId);

  if (sourcesError) {
    console.error("approveRemainingEvents: sources lookup failed", {
      cruiseId,
      sourcesError,
    });
    return { ok: false, message: "Could not approve these events. Please try again." };
  }

  const sourceIds = (sources ?? []).map((source) => source.id);
  if (sourceIds.length === 0) {
    return { ok: true, approved: 0 };
  }

  const { data: updated, error: updateError } = await supabase
    .from("extracted_events")
    .update({ reviewed: true })
    .in("source_file_id", sourceIds)
    .eq("reviewed", false)
    .select("id");

  if (updateError) {
    console.error("approveRemainingEvents: update failed", {
      cruiseId,
      updateError,
    });
    return { ok: false, message: "Could not approve these events. Please try again." };
  }

  revalidatePath(reviewPath(cruiseId));
  return { ok: true, approved: updated?.length ?? 0 };
}
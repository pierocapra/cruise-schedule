"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { cruiseSchema, normalizeCruise } from "@/lib/cruises/cruise-schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateCruiseInput = {
  ship: string;
  start_date: string;
  end_date: string;
  itinerary_notes: string | null;
};

export type CreateCruiseResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export async function createCruise(
  input: CreateCruiseInput,
): Promise<CreateCruiseResult> {
  // 1. Validate. A server action argument is untrusted, same as any form post.
  const parsed = cruiseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const cruise = normalizeCruise(parsed.data);

  // 2. Authenticate. requireUser() handles the redirect for signed-out
  //    users; getUser() re-verifies the session because this action writes.
  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  // 3. Insert. user_id defaults to auth.uid(), and RLS checks it on the way in.
  const { data, error } = await supabase
    .from("cruises")
    .insert({
      ship: cruise.ship,
      start_date: cruise.start_date,
      end_date: cruise.end_date,
      itinerary_notes: cruise.itinerary_notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createCruise: insert failed", { error });
    return { ok: false, message: "Could not save the cruise. Please try again." };
  }

  revalidatePath("/dashboard/cruises");

  return { ok: true, id: data.id };
}

export type UpdateCruiseResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateCruise(
  cruiseId: string,
  input: CreateCruiseInput,
): Promise<UpdateCruiseResult> {
  if (typeof cruiseId !== "string" || !UUID_PATTERN.test(cruiseId)) {
    return { ok: false, message: "Invalid cruise id." };
  }

  // Same rules as creating a cruise.
  const parsed = cruiseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const cruise = normalizeCruise(parsed.data);

  const { supabase } = await requireUser();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("cruises")
    .update({
      ship: cruise.ship,
      start_date: cruise.start_date,
      end_date: cruise.end_date,
      itinerary_notes: cruise.itinerary_notes,
    })
    .eq("id", cruiseId)
    .select("id");

  if (updateError) {
    console.error("updateCruise: update failed", { cruiseId, updateError });

    // 23514 = check_violation: the database's own rules rejected the values.
    if (updateError.code === "23514") {
      return {
        ok: false,
        message: "The database rejected these values. Check the dates and text lengths.",
      };
    }

    return { ok: false, message: "Could not save the cruise. Please try again." };
  }

  if (!updated || updated.length === 0) {
    // RLS hides rows silently: an update that matches nothing is not an error.
    return { ok: false, message: "That cruise could not be found." };
  }

  revalidatePath("/dashboard/cruises");
  // "layout" also refreshes everything under this cruise: the hub, Sources
  // and the review page (its date range and outside-dates warnings).
  revalidatePath(`/dashboard/cruises/${cruiseId}`, "layout");
  return { ok: true };
}

export type SetArchivedResult =
  | { ok: true }
  | { ok: false; message: string };

async function setCruiseArchived(
  cruiseId: string,
  archived: boolean,
): Promise<SetArchivedResult> {
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

  let query = supabase
    .from("cruises")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", cruiseId);

  // Only touch rows that are not already in the target state, so archiving
  // twice keeps the original timestamp. A cruise that is already there (or
  // not visible to this user) matches nothing, and the requested end state
  // is true either way, so that is success, not an error.
  query = archived
    ? query.is("archived_at", null)
    : query.not("archived_at", "is", null);

  const { error } = await query;

  if (error) {
    console.error("setCruiseArchived: update failed", {
      cruiseId,
      archived,
      error,
    });
    return {
      ok: false,
      message: archived
        ? "Could not archive this cruise. Please try again."
        : "Could not restore this cruise. Please try again.",
    };
  }

  revalidatePath("/dashboard/cruises");
  revalidatePath(`/dashboard/cruises/${cruiseId}`, "layout");
  return { ok: true };
}

export async function archiveCruise(cruiseId: string): Promise<SetArchivedResult> {
  return setCruiseArchived(cruiseId, true);
}

export async function restoreCruise(cruiseId: string): Promise<SetArchivedResult> {
  return setCruiseArchived(cruiseId, false);
}
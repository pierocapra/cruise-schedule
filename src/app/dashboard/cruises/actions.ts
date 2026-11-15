"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { cruiseSchema, normalizeCruise } from "@/lib/cruises/cruise-schema";

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
import { requireUser } from "@/lib/auth";
import {
  MAX_DAILY_EXTRACTIONS,
  extractionWindowStart,
} from "@/lib/extraction/extraction-limit";

export async function UsageSection() {
  const { supabase } = await requireUser();

  const { count, error } = await supabase
    .from("ai_extraction_calls")
    .select("id", { count: "exact", head: true })
    .gte("created_at", extractionWindowStart());

  if (error) {
    console.error("UsageSection: usage count failed", { error });
    return <p className="text-sm text-red-600">Could not load your usage.</p>;
  }

  const used = count ?? 0;
  const remaining = Math.max(0, MAX_DAILY_EXTRACTIONS - used);

  return (
    <div className="space-y-1 text-sm">
      <p>
        {used} of {MAX_DAILY_EXTRACTIONS} extractions used in the last 24 hours
        ({remaining} left).
      </p>
      <p className="text-xs text-muted-foreground">
        Each time you run Extract on a source counts as one extraction,
        even if no events come back.
      </p>
    </div>
  );
}
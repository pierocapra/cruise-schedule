import type { CruiseFormValues } from "@/lib/cruises/cruise-form-values";
import {
  MAX_ITINERARY_NOTES_CHARS,
  MAX_SHIP_CHARS,
} from "@/lib/cruises/cruise-form-constants";

type CruiseFormFieldsProps = {
  values: CruiseFormValues;
  onChange: (key: keyof CruiseFormValues, value: string) => void;
};

// The inputs shared by the create form and the edit form.
export function CruiseFormFields({ values, onChange }: CruiseFormFieldsProps) {
  return (
    <>
      <input
        type="text"
        value={values.ship}
        onChange={(event) => onChange("ship", event.target.value)}
        maxLength={MAX_SHIP_CHARS}
        placeholder="Ship name"
        aria-label="Ship name"
        className="block w-full rounded-md border px-3 py-2"
      />

      <div className="flex gap-3">
        <label className="flex-1 text-sm">
          Start date
          <input
            type="date"
            value={values.start_date}
            onChange={(event) => onChange("start_date", event.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex-1 text-sm">
          End date
          <input
            type="date"
            value={values.end_date}
            onChange={(event) => onChange("end_date", event.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>

      <textarea
        value={values.itinerary_notes}
        onChange={(event) => onChange("itinerary_notes", event.target.value)}
        maxLength={MAX_ITINERARY_NOTES_CHARS}
        rows={3}
        placeholder="Itinerary notes (optional)"
        aria-label="Itinerary notes"
        className="block w-full rounded-md border px-3 py-2 text-sm"
      />
    </>
  );
}
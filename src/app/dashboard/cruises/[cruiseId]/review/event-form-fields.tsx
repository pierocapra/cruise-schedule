import type { FormValues } from "@/lib/extraction/event-form-values";
import { labelForEventType } from "@/lib/extraction/event-labels";
import {
  EVENT_TYPES,
  MAX_NOTES_CHARS,
  MAX_TITLE_CHARS,
  MAX_VENUE_CHARS,
} from "@/lib/extraction/event-schema";

type EventFormFieldsProps = {
  values: FormValues;
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
};

const inputClass =
  "mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm";
const labelClass = "block text-xs text-muted-foreground";

// The inputs shared by the edit form (EventRow) and the add form.
export function EventFormFields({ values, onChange }: EventFormFieldsProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className={labelClass}>
          Date
          <input
            type="date"
            value={values.event_date}
            onChange={(e) => onChange("event_date", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Start time
          <input
            type="time"
            value={values.start_time}
            onChange={(e) => onChange("start_time", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          End time
          <input
            type="time"
            value={values.end_time}
            onChange={(e) => onChange("end_time", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={values.ends_next_day}
            onChange={(e) => onChange("ends_next_day", e.target.checked)}
          />
          Ends next day
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={`${labelClass} sm:col-span-2`}>
          Title
          <input
            type="text"
            value={values.title}
            onChange={(e) => onChange("title", e.target.value)}
            maxLength={MAX_TITLE_CHARS}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Type
          <select
            value={values.type}
            onChange={(e) => onChange("type", e.target.value)}
            className={inputClass}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {labelForEventType(type)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Venue
          <input
            type="text"
            value={values.venue}
            onChange={(e) => onChange("venue", e.target.value)}
            maxLength={MAX_VENUE_CHARS}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Notes
          <textarea
            value={values.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            maxLength={MAX_NOTES_CHARS}
            rows={2}
            className={inputClass}
          />
        </label>
      </div>
    </>
  );
}
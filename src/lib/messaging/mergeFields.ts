export type MergeFieldValues = Record<string, string | number | null | undefined>;

export const MERGE_FIELDS = [
  "client_name",
  "client_email",
  "event_date",
  "event_start_date",
  "event_end_date",
  "booking_id",
  "invoice_amount",
  "payment_amount",
  "payment_due_date",
  "tour_date",
  "tour_time",
  "venue_name",
] as const;

export function applyMergeFields(template: string, values: MergeFieldValues) {
  return MERGE_FIELDS.reduce((acc, field) => {
    const value = values[field] ?? "";
    const regex = new RegExp(`{{\\s*${field}\\s*}}`, "gi");
    return acc.replace(regex, String(value));
  }, template);
}

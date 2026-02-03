import { supabase } from "@/lib/supabase/client";
import { applyMergeFields, type MergeFieldValues } from "@/lib/messaging/mergeFields";
import type { Tables } from "@/types/supabase";

type TemplateRow = Tables<"templates">;

type TemplateKey =
  | "contract_sent"
  | "tour_confirmation"
  | "payment_reminder"
  | "payment_overdue"
  | "booking_confirmation"
  | "general";

export async function getTemplateByKey(key: TemplateKey) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("template_key", key)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as TemplateRow | null;
}

export function renderTemplate(template: TemplateRow, values: MergeFieldValues) {
  const subject = applyMergeFields(template.subject ?? "", values);
  const body = applyMergeFields(template.body ?? "", values);
  return { subject, body };
}

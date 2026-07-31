import {
  contactFormSchema,
  counsellingFormSchema,
  demoBookingFormSchema,
  enquiryFormSchema,
} from "@/lib/validation/forms";
import { supabase } from "@/lib/supabase/client";

export type LeadType = "contact" | "enquiry" | "counselling" | "demo";

const schemas = {
  contact: contactFormSchema,
  enquiry: enquiryFormSchema,
  counselling: counsellingFormSchema,
  demo: demoBookingFormSchema,
} as const;

export type SubmitLeadResult = { id: string };

export async function submitLead(type: LeadType, payload: unknown): Promise<SubmitLeadResult> {
  const parsed = schemas[type].safeParse(payload);

  if (!parsed.success) {
    throw new Error("Please check the form details and try again.");
  }

  const response = await supabase.functions.invoke<{ ok: boolean; data?: SubmitLeadResult; error?: { message: string } }>("leads", {
    body: { type, payload: parsed.data },
  });
  const data = response.data;

  if (response.error) {
    throw new Error("Unable to submit request.");
  }

  if (!data?.ok || !data.data) {
    throw new Error(data?.error?.message ?? "Unable to submit request.");
  }

  return data.data;
}

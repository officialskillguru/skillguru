import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const leadBaseSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

const contactFormSchema = leadBaseSchema.extend({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
});

const enquiryFormSchema = leadBaseSchema.extend({
  courseSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  message: z.string().trim().min(10).max(2000).optional(),
  preferredMode: z.enum(["online", "classroom", "hybrid"]).optional(),
});

const counsellingFormSchema = leadBaseSchema.extend({
  careerStage: z.enum(["student", "fresher", "final_year_student", "working_professional", "career_switcher", "hr_professional"]),
  currentRole: z.string().trim().max(120).optional(),
  goals: z.string().trim().min(10).max(2000),
  preferredDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const demoBookingFormSchema = leadBaseSchema.extend({
  courseSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  preferredDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  learningMode: z.enum(["online", "classroom", "hybrid"]),
});

const schemas = {
  contact: contactFormSchema,
  enquiry: enquiryFormSchema,
  counselling: counsellingFormSchema,
  demo: demoBookingFormSchema,
} as const;

type LeadType = keyof typeof schemas;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

// Builds the free-text `notes` blob for the `leads` table, since the live schema
// has no per-form-type child tables (enquiries/counselling_bookings/demo_bookings
// do not exist) and no JSON metadata column to preserve structured fields in.
function buildNotes(type: LeadType, payload: Record<string, unknown>): string {
  const lines: string[] = [`Form: ${type}`];
  if (type === "contact") {
    lines.push(`Subject: ${payload.subject as string}`, "", payload.message as string);
  } else if (type === "enquiry") {
    lines.push(`Course: ${payload.courseSlug as string}`);
    if (payload.preferredMode) lines.push(`Preferred mode: ${payload.preferredMode as string}`);
    if (payload.message) lines.push("", payload.message as string);
  } else if (type === "counselling") {
    lines.push(
      `Career stage: ${payload.careerStage as string}`,
      payload.currentRole ? `Current role: ${payload.currentRole as string}` : "",
      `Preferred slot: ${payload.preferredDate as string} ${payload.preferredTime as string}`,
      "",
      `Goals: ${payload.goals as string}`
    );
  } else if (type === "demo") {
    lines.push(
      `Course: ${payload.courseSlug as string}`,
      `Learning mode: ${payload.learningMode as string}`,
      `Preferred slot: ${payload.preferredDate as string} ${payload.preferredTime as string}`
    );
  }
  return lines.filter(Boolean).join("\n");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: { message: "Method not allowed." } }, 405);
  }

  try {
    const body = await request.json();
    const type = body?.type as LeadType | undefined;

    if (!type || !(type in schemas)) {
      return json({ ok: false, error: { message: "Invalid lead type." } }, 400);
    }

    const parsed = schemas[type].safeParse(body.payload);

    if (!parsed.success) {
      return json({ ok: false, error: { message: "Invalid lead payload.", fields: parsed.error.flatten().fieldErrors } }, 422);
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: { message: "Supabase function secrets are not configured." } }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = parsed.data as Record<string, unknown>;

    // All web-form submissions share the "website" lead source; the specific
    // form type is preserved via `tags` since there is no per-type source row.
    const { data: source } = await supabase
      .from("lead_sources")
      .select("id")
      .eq("slug", "website")
      .maybeSingle();

    let courseInterestId: string | null = null;
    if ("courseSlug" in payload) {
      const { data: course } = await supabase
        .from("courses")
        .select("id")
        .eq("slug", payload.courseSlug as string)
        .maybeSingle();
      courseInterestId = (course as { id: string } | null)?.id ?? null;
    }

    const leadInsert = {
      name: payload.fullName as string,
      email: (payload.email as string).toLowerCase(),
      phone: payload.phone as string,
      source_id: (source as { id: string } | null)?.id ?? null,
      course_interest_id: courseInterestId,
      notes: buildNotes(type, payload),
      tags: [`form:${type}`],
    };

    const { data: lead, error: leadError } = await supabase.from("leads").insert(leadInsert).select("id").single();

    if (leadError) {
      throw leadError;
    }

    await supabase.from("audit_logs").insert({
      action: "lead.created",
      entity_type: "lead",
      entity_id: lead.id,
      new_values: { source: type },
    });

    const webhookUrl = Deno.env.get("LEAD_NOTIFICATION_WEBHOOK_URL");
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, leadId: lead.id, fullName: payload.fullName, email: payload.email, phone: payload.phone }),
      }).catch(() => undefined);
    }

    return json({ ok: true, data: { id: lead.id } }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected lead submission error.";
    return json({ ok: false, error: { message } }, 500);
  }
});

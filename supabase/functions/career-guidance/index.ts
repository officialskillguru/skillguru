import { createClient } from "@supabase/supabase-js";
import { createAIProvider } from "../_shared/ai-provider-factory.ts";
import type { ChatMessage } from "../_shared/ai-provider-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const createResponse = (
  success: boolean,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
  status: number = 200,
  requestId: string = crypto.randomUUID()
) =>
  new Response(
    JSON.stringify({ success, message, data, errors, meta: { requestId, timestamp: new Date().toISOString(), version: "v1" } }),
    { status, headers: corsHeaders }
  );

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-4 sentence honest assessment of the student's current readiness for the target role." },
    skillGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          why: { type: "string", description: "Why this skill matters for the target role, grounded in the student's actual profile." },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["skill", "why", "priority"],
      },
    },
    recommendedCourseIds: {
      type: "array",
      items: { type: "string" },
      description: "Only IDs copied exactly from the provided course catalog list. Never invent an ID. Empty array if nothing in the catalog is relevant.",
    },
    actionItems: {
      type: "array",
      items: { type: "string" },
      description: "3-6 concrete, near-term action items (not generic advice).",
    },
  },
  required: ["summary", "skillGaps", "recommendedCourseIds", "actionItems"],
};

// Real AI Career Guidance - reuses the AIProvider/GeminiProvider abstraction
// built for the AI Voice Agent (supabase/functions/_shared) and the same
// GEMINI_API_KEY secret already configured for `converse`, rather than
// duplicating LLM wiring. Grounds every recommendation in server-fetched real
// data (the student's own resume content, real enrollments, and a real course
// catalog) and cross-checks recommended course IDs against that catalog
// after generation - any ID the model invents is dropped, never shown.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error("Missing Supabase configuration");
    if (!geminiApiKey) {
      return createResponse(false, "GEMINI_API_KEY is not configured as an Edge Function secret.", null, [], 500, requestId);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return createResponse(false, "Unauthorized", null, ["Missing authorization header"], 401, requestId);
    }

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) {
      return createResponse(false, "Unauthorized", null, [userError?.message], 401, requestId);
    }
    const studentId = userResp.user.id;

    const payload = (await req.json().catch(() => ({}))) as { targetRole?: string };
    const targetRole = payload.targetRole?.trim();
    if (!targetRole || targetRole.length < 2 || targetRole.length > 200) {
      return createResponse(false, "Validation failed", null, ["targetRole is required (2-200 characters)"], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // ------------------------------------------------------------------
    // Gather real, server-verified context - never trust the client for
    // any of this, and never let the model see or invent anything outside it.
    // ------------------------------------------------------------------
    const [profileRes, studentProfileRes, experienceRes, projectsRes, certificationsRes, achievementsRes, enrollmentsRes, catalogRes] = await Promise.all([
      serviceClient.from("profiles").select("full_name, bio").eq("id", studentId).maybeSingle(),
      serviceClient.from("student_profiles").select("education, college, graduation_year, skills").eq("id", studentId).maybeSingle(),
      serviceClient.from("resume_experience").select("title, company, description").eq("student_id", studentId).is("deleted_at", null),
      serviceClient.from("resume_projects").select("title, description, tech_stack").eq("student_id", studentId).is("deleted_at", null),
      serviceClient.from("resume_certifications").select("name, issuer").eq("student_id", studentId).is("deleted_at", null),
      serviceClient.from("resume_achievements").select("title, description").eq("student_id", studentId).is("deleted_at", null),
      serviceClient.from("enrollments").select("courses(title)").eq("student_id", studentId).eq("status", "active"),
      serviceClient.from("courses").select("id, title").eq("status", "published").is("deleted_at", null).limit(60),
    ]);

    const profile = profileRes.data;
    const studentProfile = studentProfileRes.data;
    const catalog = (catalogRes.data ?? []) as { id: string; title: string }[];
    const catalogIds = new Set(catalog.map((c) => c.id));

    const resumeContext = {
      name: profile?.full_name ?? "Student",
      summary: profile?.bio ?? null,
      education: studentProfile?.education ?? null,
      college: studentProfile?.college ?? null,
      graduationYear: studentProfile?.graduation_year ?? null,
      skills: studentProfile?.skills ?? [],
      experience: (experienceRes.data ?? []).map((e) => ({ title: e.title, company: e.company, description: e.description })),
      projects: (projectsRes.data ?? []).map((p) => ({ title: p.title, description: p.description, techStack: p.tech_stack })),
      certifications: (certificationsRes.data ?? []).map((c) => ({ name: c.name, issuer: c.issuer })),
      achievements: (achievementsRes.data ?? []).map((a) => ({ title: a.title, description: a.description })),
      currentlyEnrolledIn: (enrollmentsRes.data ?? []).map((e) => (e as unknown as { courses: { title: string } | null }).courses?.title).filter(Boolean),
    };

    const catalogContext = catalog.map((c) => ({ id: c.id, title: c.title }));

    const hasAnyResumeContent =
      resumeContext.skills.length > 0 ||
      resumeContext.experience.length > 0 ||
      resumeContext.projects.length > 0 ||
      resumeContext.education;

    const systemPrompt = [
      "You are a career guidance assistant for SkillGuru, an EdTech platform.",
      "Given a student's real profile/resume data and a target career role, produce an honest, grounded assessment.",
      "Rules:",
      "- Base every claim strictly on the provided student data. Do not invent experience, credentials, or skills the student does not have.",
      "- If the student's profile has little or no real content, say so plainly in the summary and keep skill gaps generic to the target role rather than fabricating personalized detail.",
      "- recommendedCourseIds must ONLY contain IDs copied exactly from the provided course catalog. If nothing in the catalog fits, return an empty array - never invent a course or an ID.",
      "- Be constructive but honest; do not inflate readiness.",
    ].join("\n");

    const userPrompt = JSON.stringify({
      targetRole,
      hasAnyResumeContent,
      student: resumeContext,
      availableCourseCatalog: catalogContext,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const provider = createAIProvider("gemini", geminiApiKey, geminiModel);
    const result = await provider.generateStructured({ messages, responseSchema: RESPONSE_SCHEMA, temperature: 0.3, maxOutputTokens: 1536 });

    if (result.safetyBlock) {
      return createResponse(false, "The response was withheld by safety filters. Please try a different target role.", null, [result.safetyBlock], 500, requestId);
    }

    let parsed: { summary: string; skillGaps: { skill: string; why: string; priority: string }[]; recommendedCourseIds: string[]; actionItems: string[] };
    try {
      parsed = JSON.parse(result.text);
    } catch {
      return createResponse(false, "The AI response could not be parsed. Please try again.", null, [], 500, requestId);
    }

    // Anti-hallucination guard: drop any recommended course ID that isn't a
    // real, currently published course - never show a fabricated course.
    const verifiedCourseIds = (parsed.recommendedCourseIds ?? []).filter((id) => catalogIds.has(id));

    const { data: report, error: insertError } = await serviceClient
      .from("career_guidance_reports")
      .insert({
        student_id: studentId,
        target_role: targetRole,
        summary: parsed.summary,
        skill_gaps: parsed.skillGaps ?? [],
        recommended_course_ids: verifiedCourseIds,
        action_items: parsed.actionItems ?? [],
        model_name: `gemini:${geminiModel}`,
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
      })
      .select("*")
      .single();

    if (insertError || !report) {
      throw new Error(insertError?.message || "Failed to save guidance report");
    }

    return createResponse(true, "OK", report, [], 201, requestId);
  } catch (error) {
    console.error("Error in career-guidance function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});

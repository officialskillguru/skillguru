// ============================================================================
// resume-ai — Gemini-powered resume editing for authenticated students.
// ============================================================================
// Reuses the existing AIProvider/GeminiProvider (supabase/functions/_shared)
// and the platform GEMINI_API_KEY secret. The key never leaves this function.
//
// Flow: authenticate JWT -> validate input (size, shape) -> load the resume
// through the STUDENT's RLS-bound client when one is referenced -> atomic
// per-student quota -> centralised prompt -> Gemini structured output ->
// strict validation + anti-fabrication checks (one retry) -> response.
//
// Nothing is written to the resume here: the student must explicitly accept
// a suggestion in the UI, which then saves through the normal autosave path.
// ============================================================================
import { createAIProvider } from "../_shared/ai-provider-factory.ts";
import type { StructuredGenerationResult } from "../_shared/ai-provider-types.ts";
import { detectPossibleInjection } from "../_shared/pii-safe-logging.ts";
import { authenticate, corsHeaders, fail, logEvent, ok, readJsonBody } from "../_shared/resume-http.ts";
import {
  InvalidAiOutputError,
  LIMITS,
  ValidationError,
  extractEditableFields,
  extractResumeFacts,
  findUnsupportedDetails,
  parseResumeAiRequest,
  resumePlainText,
  validateAnalysis,
  validateJobMatch,
  validateKeywords,
  validateResumeSuggestions,
  validateTextImprovement,
  type ResumeAiRequest,
} from "../_shared/resume-ai-guards.ts";
import {
  RETRY_REMINDER,
  buildAnalysisPrompt,
  buildJobMatchPrompt,
  buildKeywordPrompt,
  buildResumeImprovementPrompt,
  buildTextImprovementPrompt,
  type PromptPlan,
} from "../_shared/resume-ai-prompts.ts";

const FN = "resume-ai";
const DEFAULT_MODEL = "gemini-flash-latest";

class UnsupportedClaimsError extends Error {}

function intEnv(name: string, fallback: number): number {
  const n = Number(Deno.env.get(name));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "Method not allowed", requestId);

  const startedAt = Date.now();
  let operation = "unknown";
  try {
    const auth = await authenticate(req);
    if (!auth) return fail(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.", requestId);

    let request: ResumeAiRequest;
    try {
      request = parseResumeAiRequest(await readJsonBody(req, LIMITS.bodyBytes));
    } catch (error) {
      if (error instanceof ValidationError) return fail(400, "VALIDATION", error.message, requestId);
      if (error instanceof RangeError) return fail(413, "TOO_LARGE", "That text is too long for AI improvement. Shorten it and try again.", requestId);
      return fail(400, "VALIDATION", "Invalid request", requestId);
    }
    operation = request.operation;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return fail(503, "AI_NOT_CONFIGURED", "AI improvement is not available right now. You can continue editing manually.", requestId);
    const model = Deno.env.get("GEMINI_RESUME_MODEL") || Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;

    // Load the referenced resume as the student (RLS): another student's id simply returns nothing.
    let resume: { resume_data: unknown; target_role: string | null } | null = null;
    if ("resumeId" in request && request.resumeId) {
      const { data, error } = await auth.userClient.from("resumes").select("resume_data, target_role").eq("id", request.resumeId).maybeSingle();
      if (error) throw new Error(`resume lookup failed: ${error.code ?? ""}`);
      if (!data) return fail(404, "NOT_FOUND", "This resume could not be found. Save it and try again.", requestId);
      resume = data;
    }

    const { data: quota, error: quotaError } = await auth.serviceClient.rpc("consume_resume_ai_quota", {
      p_user_id: auth.userId,
      p_operation: request.operation,
      p_per_minute: intEnv("RESUME_AI_PER_MINUTE", 8),
      p_per_day: intEnv("RESUME_AI_PER_DAY", 80),
    });
    if (quotaError) throw new Error(`quota check failed: ${quotaError.code ?? ""}`);
    const q = (quota as { allowed: boolean; retry_after_seconds: number }[] | null)?.[0];
    if (!q?.allowed) {
      const wait = q?.retry_after_seconds ?? 60;
      return fail(429, "RATE_LIMITED", `You've used AI a lot in a short time. Please try again in ${wait > 90 ? Math.ceil(wait / 60) + " minutes" : wait + " seconds"}.`, requestId, wait);
    }

    const userText = "text" in request ? request.text : "jobDescription" in request ? request.jobDescription : "";
    if (userText && detectPossibleInjection(userText)) logEvent(FN, requestId, "possible_prompt_injection", { operation });

    const provider = createAIProvider("gemini", apiKey, model);
    const facts = resume ? extractResumeFacts(resume.resume_data, resume.target_role) : null;

    /** Calls Gemini, validates; on invalid/fabricated output retries once with a reminder. */
    const generate = async <T>(plan: PromptPlan, validate: (raw: string) => T): Promise<T> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const messages = attempt === 0 ? plan.messages : [...plan.messages, RETRY_REMINDER];
        const result: StructuredGenerationResult = await provider.generateStructured({
          messages,
          responseSchema: plan.schema,
          temperature: plan.temperature,
          maxOutputTokens: plan.maxOutputTokens,
        });
        logEvent(FN, requestId, "gemini_call", { operation, attempt, model, finishReason: result.finishReason, tokens: result.usage.totalTokens });
        if (result.safetyBlock) throw new Error("SAFETY_BLOCK");
        try {
          return validate(result.text);
        } catch (error) {
          if (!(error instanceof InvalidAiOutputError || error instanceof UnsupportedClaimsError) || attempt === 1) throw error;
        }
      }
      throw new InvalidAiOutputError("unreachable");
    };

    let data: unknown;
    switch (request.operation) {
      case "suggest_keywords": {
        const role = request.targetRole || resume?.target_role;
        if (!role) return fail(400, "VALIDATION", "Set a target job role first to get keyword suggestions.", requestId);
        const text = resumePlainText(resume?.resume_data);
        data = { keywords: await generate(buildKeywordPrompt(facts!, role), (raw) => validateKeywords(raw, text)) };
        break;
      }
      case "improve_resume": {
        const fields = extractEditableFields(resume?.resume_data);
        if (fields.length === 0) return fail(400, "VALIDATION", "Add a summary, experience or project descriptions first.", requestId);
        data = await generate(buildResumeImprovementPrompt(facts!, fields), (raw) => validateResumeSuggestions(raw, fields));
        break;
      }
      case "analyze_resume": {
        const text = resumePlainText(resume?.resume_data);
        data = await generate(buildAnalysisPrompt(facts!), (raw) => validateAnalysis(raw, text));
        break;
      }
      case "match_job": {
        const text = resumePlainText(resume?.resume_data);
        const jd = request.jobDescription;
        data = await generate(buildJobMatchPrompt(facts!, jd), (raw) => validateJobMatch(raw, text, jd));
        break;
      }
      default: {
        // Text operations. Source of truth for the fabrication check = the student's own text
        // (+ the verified resume facts when generating an objective from scratch).
        const textReq = request;
        const source = [textReq.text, JSON.stringify(textReq.context), facts ? JSON.stringify(facts) : ""].join("\n");
        data = await generate(buildTextImprovementPrompt(textReq, textReq.operation === "improve_objective" ? facts : null), (raw) => {
          const improvement = validateTextImprovement(raw);
          if (findUnsupportedDetails(source, improvement.improvedText).length > 0) throw new UnsupportedClaimsError();
          if (textReq.operation === "shorten" && improvement.improvedText.length >= textReq.text.length) throw new InvalidAiOutputError("not shorter");
          return { ...improvement, original: textReq.text };
        });
      }
    }

    logEvent(FN, requestId, "success", { operation, latencyMs: Date.now() - startedAt });
    return ok(data, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logEvent(FN, requestId, "error", { operation, latencyMs: Date.now() - startedAt, errorType: error instanceof Error ? error.name : "unknown", message });

    if (error instanceof UnsupportedClaimsError) {
      return fail(422, "AI_UNSUPPORTED_CLAIMS", "The AI suggestion added details you didn't provide, so it was discarded. Please try again or edit manually.", requestId);
    }
    if (error instanceof InvalidAiOutputError) {
      return fail(502, "AI_INVALID_OUTPUT", "The AI returned an unusable answer. Please try again.", requestId);
    }
    if (message === "SAFETY_BLOCK") {
      return fail(422, "AI_BLOCKED", "The AI could not process this text. Please rephrase it and try again.", requestId);
    }
    if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|\(40[13]\)/i.test(message)) {
      return fail(503, "AI_NOT_CONFIGURED", "AI improvement is not configured correctly. Please contact support; you can continue editing manually.", requestId);
    }
    if (/Gemini returned 429|RESOURCE_EXHAUSTED/i.test(message)) {
      return fail(503, "AI_BUSY", "AI improvement is busy right now. Please try again in a minute.", requestId, 60);
    }
    if (/Gemini|timed out|fetch/i.test(message)) {
      return fail(502, "AI_UNAVAILABLE", "AI improvement is temporarily unavailable. You can continue editing manually.", requestId);
    }
    return fail(500, "INTERNAL", "Something went wrong. Your resume is safe; please try again.", requestId);
  }
});

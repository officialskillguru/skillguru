// ============================================================================
// Contract parity: browser mirror vs. Deno edge source of truth
// ============================================================================
// `src/types/ai-agent.ts` re-declares the intent/state/entity vocabulary that
// actually lives in the Deno edge modules, because those cannot be imported from
// the Vite app. A silent drift between the two would not fail typecheck — the
// browser would just quietly stop recognising a state or intent the agent really
// returns (falling through to a default branch in the widget) with no error
// anywhere. These tests parse the real edge sources and fail loudly instead.
// ============================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AGENT_CONVERSATION_STATES, AGENT_INTENTS, type ExtractedEntities } from "@/types/ai-agent";

// `import.meta.url` is not a file: URL under the jsdom environment this suite runs
// in, so the repo root comes from vitest's cwd (its config root) instead.
const EDGE_SHARED_DIR = path.join(process.cwd(), "supabase", "functions", "_shared");

function readEdgeSource(relativePath: string): string {
  return readFileSync(path.join(EDGE_SHARED_DIR, relativePath), "utf8");
}

/** Collects capture group 1 of every match, dropping any that did not participate. */
function captureAll(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
}

/** Extracts the string literals from a `export const NAME = [ ... ] as const;` declaration. */
function parseConstStringArray(source: string, constName: string): string[] {
  const declaration = new RegExp(`export const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`).exec(source);
  const body = declaration?.[1];
  if (body === undefined) throw new Error(`Could not find "export const ${constName} = [...] as const" in the edge source`);

  return captureAll(body, /"([^"]+)"/g);
}

/** Extracts the property names from an `export interface Name { ... }` declaration. */
function parseInterfaceKeys(source: string, interfaceName: string): string[] {
  const declaration = new RegExp(`export interface ${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(source);
  const body = declaration?.[1];
  if (body === undefined) throw new Error(`Could not find "export interface ${interfaceName} { ... }" in the edge source`);

  return captureAll(body, /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/gm);
}

describe("agent contract parity", () => {
  it("mirrors the edge INTENTS list exactly, in order", () => {
    const edgeIntents = parseConstStringArray(readEdgeSource("intent-schema.ts"), "INTENTS");

    expect(edgeIntents.length).toBeGreaterThan(0);
    expect([...AGENT_INTENTS]).toEqual(edgeIntents);
  });

  it("mirrors the edge CONVERSATION_STATES list exactly, in order", () => {
    const edgeStates = parseConstStringArray(readEdgeSource("conversation-state.ts"), "CONVERSATION_STATES");

    expect(edgeStates.length).toBeGreaterThan(0);
    expect([...AGENT_CONVERSATION_STATES]).toEqual(edgeStates);
  });

  it("mirrors every ExtractedEntities field", () => {
    const edgeKeys = parseInterfaceKeys(readEdgeSource("intent-schema.ts"), "ExtractedEntities");

    // Built from a typed empty value rather than a hand-written list, so adding a
    // field to the browser-side interface without adding it here cannot pass.
    const browserEntities: ExtractedEntities = {
      courseName: null,
      mentorName: null,
      price: null,
      email: null,
      phone: null,
      name: null,
      city: null,
      country: null,
      experienceYears: null,
      education: null,
      budget: null,
      timeline: null,
      careerGoal: null,
      learningMode: null,
      company: null,
      profession: null,
    };

    expect(edgeKeys.length).toBeGreaterThan(0);
    expect(Object.keys(browserEntities).sort()).toEqual([...edgeKeys].sort());
  });

  it("keeps the states the structured-output schema can return within the mirrored list", () => {
    // The JSON Schema handed to Gemini carries its own inline enum of states. If that
    // enum gains a value the state machine does not know, the model can legitimately
    // return a state nothing downstream handles.
    const source = readEdgeSource("intent-schema.ts");
    const schemaEnum = /conversationState:\s*\{[\s\S]*?enum:\s*\[([\s\S]*?)\]/.exec(source);
    const enumBody = schemaEnum?.[1];
    expect(enumBody, "conversationState enum not found in AGENT_TURN_RESPONSE_SCHEMA").toBeDefined();

    const schemaStates = captureAll(enumBody ?? "", /"([^"]+)"/g);

    expect(schemaStates.length).toBeGreaterThan(0);
    expect([...schemaStates].sort()).toEqual([...AGENT_CONVERSATION_STATES].sort());
  });
});

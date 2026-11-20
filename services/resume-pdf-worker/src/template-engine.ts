// ============================================================================
// Logic-less template engine for approved LaTeX templates.
// ============================================================================
// Markers use << >> so they never collide with LaTeX braces:
//   <<name>>               escaped text (the ONLY way a value is inserted)
//   (URL fields such as <<linkedinUrl>> are already prepared for \href{} by the view model)
//   <<.>>                  current item when iterating a list of strings
//   <<#key>> ... <</key>>  repeat for each list item / render if truthy
//   <<^key>> ... <</key>>  render if falsy / empty list
// There is deliberately no "raw" marker: student data cannot become LaTeX
// source. Values are pre-escaped by the view model; the engine refuses any
// value that is not a string produced by it (see SafeLatex).
// ============================================================================

const SAFE = Symbol("safe-latex");

/** A string that has already been escaped by latex-escape.ts. */
export type SafeLatex = { readonly [SAFE]: true; readonly value: string };

export function safe(value: string): SafeLatex {
  return { [SAFE]: true, value };
}

export function isSafe(v: unknown): v is SafeLatex {
  return typeof v === "object" && v !== null && (v as Record<symbol, unknown>)[SAFE] === true;
}

export type ViewValue = SafeLatex | boolean | ViewObject | ViewValue[] | null | undefined;
export interface ViewObject {
  [key: string]: ViewValue;
}

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

type Node =
  | { kind: "text"; text: string }
  | { kind: "var"; path: string }
  | { kind: "section"; path: string; inverted: boolean; children: Node[] };

const TOKEN = /<<\s*([#^/]?)\s*([A-Za-z0-9_.]+|\.)\s*>>/g;

export function parseTemplate(source: string): Node[] {
  const root: Node[] = [];
  const stack: { path: string; children: Node[] }[] = [{ path: "", children: root }];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const [whole, sigil, path] = match;
    const index = match.index ?? 0;
    const top = stack[stack.length - 1]!;
    if (index > last) top.children.push({ kind: "text", text: source.slice(last, index) });
    last = index + whole.length;
    if (sigil === "#" || sigil === "^") {
      const node: Node = { kind: "section", path: path!, inverted: sigil === "^", children: [] };
      top.children.push(node);
      stack.push({ path: path!, children: node.children });
    } else if (sigil === "/") {
      if (stack.length === 1 || top.path !== path) throw new TemplateError(`Unexpected closing tag <</${path}>>`);
      stack.pop();
    } else {
      top.children.push({ kind: "var", path: path! });
    }
  }
  if (stack.length > 1) throw new TemplateError(`Unclosed section <<#${stack[stack.length - 1]!.path}>>`);
  if (last < source.length) root.push({ kind: "text", text: source.slice(last) });
  return root;
}

function lookup(contexts: ViewValue[], path: string): ViewValue {
  if (path === ".") return contexts[contexts.length - 1];
  const parts = path.split(".");
  for (let i = contexts.length - 1; i >= 0; i--) {
    const ctx = contexts[i];
    if (ctx && typeof ctx === "object" && !Array.isArray(ctx) && !isSafe(ctx) && parts[0]! in ctx) {
      let value: ViewValue = ctx[parts[0]!];
      for (const part of parts.slice(1)) {
        value = value && typeof value === "object" && !Array.isArray(value) && !isSafe(value) ? value[part] : undefined;
      }
      return value;
    }
  }
  return undefined;
}

function truthy(v: ViewValue): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (isSafe(v)) return v.value.length > 0;
  return !!v;
}

function renderNodes(nodes: Node[], contexts: ViewValue[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "text") {
      out += node.text;
    } else if (node.kind === "var") {
      const value = lookup(contexts, node.path);
      if (value === undefined || value === null || value === false) continue;
      if (!isSafe(value)) throw new TemplateError(`<<${node.path}>> is not an escaped text value`);
      out += value.value;
    } else {
      const value = lookup(contexts, node.path);
      if (node.inverted) {
        if (!truthy(value)) out += renderNodes(node.children, contexts);
      } else if (Array.isArray(value)) {
        for (const item of value) out += renderNodes(node.children, [...contexts, item]);
      } else if (truthy(value)) {
        out += renderNodes(node.children, [...contexts, value]);
      }
    }
  }
  return out;
}

export function renderTemplate(source: string, view: ViewObject): string {
  return renderNodes(parseTemplate(source), [view]);
}

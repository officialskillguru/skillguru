// Editor form model shared by the resume wizard components (no React components here).
import { createContext } from "react";
import type { FieldPath } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { ResumeData } from "../domain/resume-schema";

export type EditorValues = {
  title: string;
  targetRole: string;
  templateId: string | null;
  data: ResumeData;
};
export type EditorPath = FieldPath<EditorValues>;

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive disabled:opacity-60";
export const textareaClass = cn(inputClass, "h-auto min-h-[96px] py-2.5 leading-relaxed");

type ErrorsContextValue = { errors: Record<string, string>; showAll: boolean };
export const FormatErrorsContext = createContext<ErrorsContextValue>({ errors: {}, showAll: false });

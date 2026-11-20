// AI plumbing for the editor: the one-time privacy notice (consent stored per
// student in localStorage as a convenience; declining keeps the builder fully
// usable without AI), saving the latest edits before server-side analysis,
// and a typed caller for the resume-ai Edge Function.
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { dialogMotionClass } from "../feedback";
import { AiContext } from "./ai-context-core";

const consentKey = (uid: string) => `sg-resume-ai-consent:v1:${uid}`;

function readConsent(uid: string): boolean {
  try {
    return localStorage.getItem(consentKey(uid)) === "yes";
  } catch {
    return false;
  }
}

export function ResumeAiProvider({ resumeId, targetRole, ensureSaved, children }: { resumeId: string; targetRole: string; ensureSaved: () => Promise<boolean>; children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? "anonymous";
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const sessionConsent = useRef(false);

  const ensureConsent = useCallback(() => {
    if (sessionConsent.current || readConsent(uid)) return Promise.resolve(true);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, [uid]);

  const decide = (ok: boolean) => {
    if (ok) {
      sessionConsent.current = true;
      try {
        localStorage.setItem(consentKey(uid), "yes");
      } catch {
        /* storage unavailable: consent lasts for this session only */
      }
    }
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  return (
    <AiContext.Provider value={{ resumeId, targetRole, ensureConsent, ensureSaved }}>
      {children}
      <Dialog open={open} onOpenChange={(next) => !next && decide(false)}>
        <DialogContent className={dialogMotionClass}>
          <DialogHeader>
            <DialogTitle>Before you use AI suggestions</DialogTitle>
            <DialogDescription>
              To improve your writing, the text you choose (and, for whole-resume features, your saved resume content such as education, experience, projects and skills) is sent to Google Gemini for processing.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Your contact details (phone, email, links) are not included in AI requests except where they appear in text you choose to improve.</li>
            <li>AI only suggests changes. Nothing in your resume changes until you accept a suggestion.</li>
            <li>AI must not add facts you did not provide. Always check suggestions before accepting them.</li>
            <li>You can build and download your resume without using AI at all.</li>
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => decide(false)}>
              Not now
            </Button>
            <Button onClick={() => decide(true)}>Continue with AI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AiContext.Provider>
  );
}

import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getActiveTemplates } from "../domain/templates";
import { dialogMotionClass } from "./feedback";
import { TemplatePicker } from "./TemplatePicker";

/**
 * "View templates" on My Resumes: browse the active, licence-reviewed templates
 * and start a new resume with one pre-selected. Uses the same gallery as the
 * create flow, so it never shows a template students cannot actually use.
 */
export function TemplateGalleryDialog() {
  const templates = getActiveTemplates();
  const headingId = useId();
  const [selected, setSelected] = useState<string | null>(templates[0]?.id ?? null);
  const selectedName = templates.find((t) => t.id === selected)?.name;

  return (
    // DialogTrigger gives Radix the trigger ref, so focus returns to "View templates" on close
    // and the button exposes aria-haspopup/aria-expanded.
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <LayoutTemplate className="size-4" aria-hidden="true" /> View templates
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`sm:max-w-3xl ${dialogMotionClass}`}
        // Land on the checked radio (the student's current choice), not always the first one.
        onOpenAutoFocus={(e) => {
          const checked = (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input[type="radio"]:checked');
          if (checked) {
            e.preventDefault();
            checked.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Resume templates</DialogTitle>
          <DialogDescription>
            Every template uses the same resume information, so you can switch templates later without losing anything.
          </DialogDescription>
        </DialogHeader>
        <h3 id={headingId} className="text-sm font-black text-foreground">
          Available templates
        </h3>
        <TemplatePicker value={selected} onChange={setSelected} labelledBy={headingId} templates={templates} />
        <DialogFooter className="flex-wrap gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          {templates.length > 0 && (
            <Button asChild>
              <Link to={selected ? `/dashboard/resume-builder/new?template=${encodeURIComponent(selected)}` : "/dashboard/resume-builder/new"}>
                Use this template{selectedName && <span className="sr-only">: {selectedName}</span>}
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMentorCourses } from "@/hooks/useMentorPortal";
import { useAuthorizedRecipients, useCreateAnnouncement, useSendAnnouncement } from "@/hooks/useMentorMessaging";
import type { AnnouncementAudienceType } from "@/services/announcements.service";

const AUDIENCE_OPTIONS: { value: AnnouncementAudienceType; label: string; description: string }[] = [
  { value: "my_students", label: "My Students", description: "Everyone currently enrolled in any of your courses." },
  { value: "course_cohort", label: "Course Cohort", description: "Students enrolled in one specific course." },
  { value: "selected", label: "Selected Students", description: "Choose specific students from your own enrolled students." },
];

interface AnnouncementComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementComposer({ open, onOpenChange }: Readonly<AnnouncementComposerProps>) {
  const [step, setStep] = useState<"compose" | "confirm" | "sent">("compose");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>("my_students");
  const [courseId, setCourseId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const { data: courses = [] } = useMentorCourses();
  const { data: recipients = [] } = useAuthorizedRecipients();
  const students = useMemo(() => recipients.filter((r) => r.role === "student"), [recipients]);

  const createAnnouncement = useCreateAnnouncement();
  const sendAnnouncement = useSendAnnouncement();

  const reset = () => {
    setStep("compose");
    setName("");
    setSubject("");
    setBody("");
    setAudienceType("my_students");
    setCourseId("");
    setSelectedStudentIds([]);
    setRecipientCount(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const canPreview =
    name.trim().length > 0 &&
    body.trim().length > 0 &&
    (audienceType !== "course_cohort" || !!courseId) &&
    (audienceType !== "selected" || selectedStudentIds.length > 0);

  const handlePreview = async () => {
    try {
      const campaign = await createAnnouncement.mutateAsync({
        name: name.trim(),
        body: body.trim(),
        subject: subject.trim() || null,
        audienceType,
        courseId: audienceType === "course_cohort" ? courseId : null,
      });
      const count = await sendAnnouncement.mutateAsync({
        campaignId: campaign.id,
        selectedRecipientIds: audienceType === "selected" ? selectedStudentIds : undefined,
      });
      setRecipientCount(count.recipientCount);
      setStep("sent");
      toast.success(`Announcement sent to ${count.recipientCount} student${count.recipientCount === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send the announcement.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "sent" ? "Announcement Sent" : "New Announcement"}</DialogTitle>
          <DialogDescription>
            {step === "sent"
              ? "Your announcement has been delivered to the resolved audience."
              : "Recipients are always resolved server-side from your real enrollments - never a hand-picked platform-wide list."}
          </DialogDescription>
        </DialogHeader>

        {step === "sent" ? (
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivered to <span className="font-bold text-foreground">{recipientCount}</span> recipient{recipientCount === 1 ? "" : "s"}.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="announcement-name">Title</Label>
              <Input id="announcement-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Upcoming live session" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-subject">Subject (optional)</Label>
              <Input id="announcement-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Shown as the notification title, if different" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea id="announcement-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What do you want to tell them?" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-audience">Audience</Label>
              <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AnnouncementAudienceType)}>
                <SelectTrigger id="announcement-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{AUDIENCE_OPTIONS.find((o) => o.value === audienceType)?.description}</p>
            </div>

            {audienceType === "course_cohort" && (
              <div className="space-y-1.5">
                <Label htmlFor="announcement-course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="announcement-course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {audienceType === "selected" && (
              <div className="space-y-1.5">
                <Label>Students ({selectedStudentIds.length} selected)</Label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  {students.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">You have no enrolled students yet.</p>
                  ) : (
                    students.map((student) => {
                      const checked = selectedStudentIds.includes(student.id);
                      const checkboxId = `announcement-student-${student.id}`;
                      return (
                        <label
                          key={student.id}
                          htmlFor={checkboxId}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedStudentIds((prev) => (e.target.checked ? [...prev, student.id] : prev.filter((id) => id !== student.id)))
                            }
                            className="size-4 rounded border-border"
                          />
                          {student.full_name ?? student.email}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handlePreview()}
                disabled={!canPreview || createAnnouncement.isPending || sendAnnouncement.isPending}
                className="gap-2"
              >
                {createAnnouncement.isPending || sendAnnouncement.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  "Resolve & Send"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

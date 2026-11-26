/** Live class status labels and badge variants shared by student, teacher and counsellor views. */
export const LIVE_CLASS_STATUS: Record<string, { label: string; variant: "success" | "warning" | "muted" | "destructive" }> = {
  scheduled: { label: "Scheduled", variant: "warning" },
  live: { label: "Live now", variant: "success" },
  completed: { label: "Completed", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

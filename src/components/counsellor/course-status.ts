import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge-variants";

/** Course status labels/badge variants shared by the counsellor course screens. */
export const COURSE_STATUS_BADGE: Record<string, { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }> = {
  draft: { label: "Draft", variant: "muted" },
  under_review: { label: "Under Review", variant: "warning" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
};

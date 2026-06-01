import type { SuccessStory } from "@/types/platform";

export function placementStoryId(story: Pick<SuccessStory, "name">) {
  return story.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


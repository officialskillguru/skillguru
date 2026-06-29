export class MentorAnalytics {
  static trackPageView(mentorId: string, slug: string) {
    console.log(`[Analytics] Mentor Page View: ${mentorId} (${slug})`);
    // Example: dataLayer.push({ event: 'mentor_page_view', mentorId, slug });
  }

  static trackScrollDepth(mentorId: string, depthPercent: number) {
    console.log(`[Analytics] Mentor Scroll Depth: ${mentorId} - ${depthPercent}%`);
  }

  static trackVideoPlayed(mentorId: string) {
    console.log(`[Analytics] Mentor Video Played: ${mentorId}`);
  }

  static trackBookClick(mentorId: string, location: "hero" | "sticky_bar" | "widget" | "floating") {
    console.log(`[Analytics] Mentor Book Click: ${mentorId} from ${location}`);
  }

  static trackShareClick(mentorId: string, platform: string) {
    console.log(`[Analytics] Mentor Share Click: ${mentorId} on ${platform}`);
  }

  static trackReviewExpand(mentorId: string, reviewId: string) {
    console.log(`[Analytics] Mentor Review Expand: ${mentorId} - ${reviewId}`);
  }

  static trackFAQExpand(mentorId: string, faqId: string) {
    console.log(`[Analytics] Mentor FAQ Expand: ${mentorId} - ${faqId}`);
  }

  static trackCourseClick(mentorId: string, courseId: string) {
    console.log(`[Analytics] Mentor Course Click: ${mentorId} - ${courseId}`);
  }

  static trackRelatedMentorClick(sourceMentorId: string, targetMentorSlug: string) {
    console.log(`[Analytics] Mentor Related Click: ${sourceMentorId} -> ${targetMentorSlug}`);
  }
}

import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Facebook,
  FileText,
  Globe2,
  GraduationCap,
  Heart,
  Lock,
  Linkedin,
  Loader2,
  Menu as MenuIcon,
  MessageCircle,
  PlayCircle,
  Share2,
  Sparkles,
  Star,
  Twitter,
  Video,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { GsapReveal } from "@/components/motion/gsap-reveal";
import { PublicCourseCard } from "@/components/cards/PublicCourseCard";
import { MentorCard } from "@/components/cards/MentorCard";
import { FAQAccordion } from "@/components/common/FAQAccordion";
import { usePremiumPageMotion } from "@/components/motion/usePremiumPageMotion";
import { usePageMeta } from "@/hooks/usePageMeta";
import { routes } from "@/lib/routes";
import { useCourseBySlug } from "@/hooks/student/useCourseBySlug";
import { useCheckEnrollment } from "@/hooks/student/useCheckEnrollment";
import { learningService } from "@/services/learning.service";
import { resolveFileUrl } from "@/services/storage.service";
import { PageLoader } from "@/components/common/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout, useFreeEnroll } from "@/hooks/student/usePayment";
import { useIsWishlisted, useToggleWishlist } from "@/hooks/student/useWishlist";
import { mentorService } from "@/features/mentor-profile/services/mentor.service";
import {
  listPublishedCourses,
  listCourseMedia,
  listCourseFaqs,
  listCourseTestimonials,
  listCourseSuccessStories,
  getCourseRatingSummary,
} from "@/services/courses.service";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Skeleton } from "@/components/ui/skeleton";

function formatPrice(value: number | null) {
  if (!value) return "Free";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(value);
}

function formatSeconds(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function levelLabel(level: string | null) {
  switch (level) {
    case "beginner": return "Beginner";
    case "intermediate": return "Intermediate";
    case "advanced": return "Advanced";
    case "all_levels": return "All Levels";
    default: return "Self-Paced";
  }
}

async function handleNativeShare(title: string) {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // user cancelled the native share sheet - not an error
    }
    return;
  }
  await navigator.clipboard.writeText(url);
  toast.success("Course link copied to clipboard");
}

const SHARE_TARGETS = [
  { Icon: Facebook, label: "Share on Facebook", urlTemplate: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { Icon: Twitter, label: "Share on Twitter", urlTemplate: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
  { Icon: Linkedin, label: "Share on LinkedIn", urlTemplate: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
] as const;

const CONTENT_ICON = { video: Video, text: FileText, pdf: FileText, quiz: CheckCircle2, assignment: BookOpenCheck } as const;

function useResolvedFileUrl(fileId: string | null | undefined) {
  return useQuery({
    queryKey: ["file-url", fileId],
    queryFn: () => resolveFileUrl(fileId ?? ""),
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000,
  });
}

function CourseHeroMedia({ videoFileId, thumbnailFileId }: { videoFileId: string | null; thumbnailFileId: string | null }) {
  const { data: videoUrl } = useResolvedFileUrl(videoFileId);
  const { data: thumbnailUrl } = useResolvedFileUrl(thumbnailFileId);
  const fallback = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";

  if (videoFileId && videoUrl) {
    return (
      <video
        controls
        preload="none"
        poster={thumbnailUrl ?? fallback}
        className="aspect-video size-full object-cover"
      >
        <source src={videoUrl} />
      </video>
    );
  }

  return <img src={thumbnailUrl ?? fallback} alt="" className="aspect-video size-full object-cover opacity-90" loading="eager" />;
}

function ModuleAccordion({ modules }: { modules: { id: string; title: string; description: string | null; lessons: { id: string; title: string; content_type: string; duration_seconds: number | null; is_free_preview: boolean }[] }[] }) {
  const [openId, setOpenId] = useState<string | null>(modules[0]?.id ?? null);

  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">Curriculum will be published soon.</p>;
  }

  return (
    <div className="space-y-3">
      {modules.map((module, index) => {
        const isOpen = openId === module.id;
        const totalSeconds = module.lessons.reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0);
        return (
          <div key={module.id} className="overflow-hidden rounded-2xl border border-border bg-muted">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : module.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-secondary uppercase">Module {index + 1}</p>
                <h3 className="mt-1 text-lg font-black text-primary">{module.title}</h3>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
                  {totalSeconds > 0 ? ` · ${formatSeconds(totalSeconds)}` : ""}
                </p>
              </div>
              <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="border-t border-border bg-card px-5 py-4">
                {module.description && <p className="mb-3 text-sm text-muted-foreground">{module.description}</p>}
                <div className="space-y-2">
                  {module.lessons.map((lesson) => {
                    const Icon = CONTENT_ICON[lesson.content_type as keyof typeof CONTENT_ICON] ?? FileText;
                    return (
                      <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Icon className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                          <span className="truncate text-sm font-semibold text-foreground">{lesson.title}</span>
                          {lesson.is_free_preview && (
                            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-600">Preview</span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          {!lesson.is_free_preview && <Lock className="size-3.5" aria-hidden="true" />}
                          {formatSeconds(lesson.duration_seconds)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CourseDetailsPage() {
  const pageRef = useRef<HTMLElement>(null);
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const { data: course, isLoading: isCourseLoading } = useCourseBySlug(slug);
  const { mutate: processCheckout, isPending: isCheckingOut } = useCheckout();
  const { mutate: enrollFree, isPending: isEnrollingFree } = useFreeEnroll();
  const { data: enrollmentData, isLoading: isCheckingEnrollment } = useCheckEnrollment(slug ?? "");
  const isEnrolled = !!enrollmentData?.isEnrolled;
  const { isWishlisted } = useIsWishlisted(course?.id);
  const toggleWishlist = useToggleWishlist();

  usePageMeta(course?.title || "Course Details");
  usePremiumPageMotion({ rootRef: pageRef });

  const { data: curriculum = [] } = useQuery({
    queryKey: ["course-curriculum", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await learningService.getCourseModulesWithLessons(course.id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!course?.id,
  });

  const { data: categoryInfo } = useQuery({
    queryKey: ["course-category", course?.id],
    queryFn: async () => {
      if (!course?.id) return null;
      const supabase = getSupabaseClientOrThrow();
      const { data } = await supabase.from("course_categories").select("categories(id, name, slug)").eq("course_id", course.id).limit(1).maybeSingle();
      return data?.categories ?? null;
    },
    enabled: !!course?.id,
  });

  const { data: mentor } = useQuery({
    queryKey: ["course-mentor-summary", course?.mentorId],
    queryFn: () => mentorService.getMentorSummaryById(course!.mentorId),
    enabled: !!course?.mentorId,
  });

  // A course can now have multiple teachers via course_mentors (many-to-many).
  // Falls back to the single legacy `mentor` above only if no active
  // course_mentors rows exist for this course (shouldn't happen post-backfill,
  // but a brand-new admin-created course may not have an assignment yet).
  const { data: courseInstructors } = useQuery({
    queryKey: ["course-instructors", course?.id],
    queryFn: async () => {
      const supabase = getSupabaseClientOrThrow();
      const { data: rows, error } = await supabase
        .from("course_mentors")
        .select("mentor_id, is_primary, sort_order")
        .eq("course_id", course!.id)
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error || !rows || rows.length === 0) return [];
      const summaries = await Promise.all(rows.map((r) => mentorService.getMentorSummaryById(r.mentor_id)));
      return summaries.filter((m): m is NonNullable<typeof m> => m !== null);
    },
    enabled: !!course?.id,
  });

  const instructors = courseInstructors && courseInstructors.length > 0 ? courseInstructors : mentor ? [mentor] : [];

  const { data: gallery = [] } = useQuery({
    queryKey: ["course-media", course?.id, "gallery_image"],
    queryFn: () => listCourseMedia(course!.id, "gallery_image"),
    enabled: !!course?.id,
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ["course-faqs", course?.id],
    queryFn: () => listCourseFaqs(course!.id),
    enabled: !!course?.id,
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ["course-testimonials", course?.id],
    queryFn: () => listCourseTestimonials(course!.id),
    enabled: !!course?.id,
  });

  const { data: ratingSummary } = useQuery({
    queryKey: ["course-rating-summary", course?.id],
    queryFn: () => getCourseRatingSummary(course!.id),
    enabled: !!course?.id,
  });

  const { data: successStories = [] } = useQuery({
    queryKey: ["course-success-stories", course?.id],
    queryFn: () => listCourseSuccessStories(course!.id),
    enabled: !!course?.id,
  });

  const { data: relatedResult } = useQuery({
    queryKey: ["related-courses", course?.id, categoryInfo?.slug],
    queryFn: () => listPublishedCourses({ categorySlug: categoryInfo?.slug, excludeId: course?.id, pageSize: 3 }),
    enabled: !!course?.id && !!categoryInfo?.slug,
  });

  const handleEnroll = () => {
    if (!user) {
      toast.error("Please login to enroll in this course.");
      void navigate(routes.login + "?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!course) return;

    if (!course.price) {
      enrollFree(course.id, {
        onSuccess: () => {
          toast.success("Enrolled! Redirecting to your course...");
          void navigate(`${routes.dashboard}/courses/${course.id}`);
        },
        onError: () => toast.error("Failed to enroll. Please try again."),
      });
      return;
    }

    processCheckout(
      {
        courseId: course.id,
        userInfo: {
          name: String(user.user_metadata?.full_name || user.email || "Student"),
          email: user.email || "",
        },
      },
      {
        onSuccess: () => {
          toast.success("Payment successful!");
          void navigate(routes.dashboard);
        },
        onError: () => toast.error("Payment failed. Please try again."),
      }
    );
  };

  const handleToggleWishlist = () => {
    if (!user) {
      toast.error("Please login to save courses to your wishlist.");
      void navigate(routes.login + "?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!course) return;
    toggleWishlist.mutate(
      { courseId: course.id, isWishlisted },
      {
        onSuccess: () => toast.success(isWishlisted ? "Removed from wishlist." : "Added to wishlist."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update wishlist."),
      }
    );
  };

  if (isCourseLoading) return <PageLoader />;
  if (!course) return <div className="p-10 text-center font-bold">Course not found.</div>;

  const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalSeconds = curriculum.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0), 0);
  const hasDiscount = course.discountPrice != null && course.price != null && course.discountPrice < course.price;
  const effectivePrice = hasDiscount ? course.discountPrice : course.price;

  const enrollCta = isCheckingEnrollment ? null : isEnrolled ? (
    <Link
      to={`${routes.dashboard}/courses/${course.id}`}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-success font-black text-success-foreground hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Continue Learning
    </Link>
  ) : (
    <button
      onClick={handleEnroll}
      disabled={isCheckingOut || isEnrollingFree}
      className="h-12 w-full rounded-xl bg-secondary font-black text-white hover:bg-opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {isCheckingOut || isEnrollingFree ? "Processing..." : course.price ? "Enroll Now" : "Enroll Free"}
    </button>
  );

  return (
    <main ref={pageRef} className="page-shell pb-24 lg:pb-0">
      <section className="bg-white px-4 pt-8 pb-8 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="premium-reveal mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Link to={routes.home} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Home</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <Link to={routes.courses} className="rounded text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Courses
            </Link>
            {categoryInfo && (
              <>
                <ChevronRight className="size-4" aria-hidden="true" />
                <Link to={`${routes.courses}?category=${categoryInfo.slug}`} className="rounded text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {categoryInfo.name}
                </Link>
              </>
            )}
            <ChevronRight className="size-4" aria-hidden="true" />
            <span aria-current="page">{course.title}</span>
          </nav>
          <GsapReveal className="premium-card-motion rounded-[24px] border border-border bg-card p-5 shadow-[0_18px_60px_rgba(10,42,136,0.08)] sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="premium-parallax relative overflow-hidden rounded-[20px] bg-primary">
                <CourseHeroMedia videoFileId={course.promoVideoFileId} thumbnailFileId={course.thumbnailFileId} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 uppercase">
                    {levelLabel(course.level)}
                  </span>
                  {categoryInfo && (
                    <span className="rounded-md bg-secondary/10 px-3 py-1 text-xs font-black text-secondary uppercase">{categoryInfo.name}</span>
                  )}
                  {course.language && (
                    <span className="flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-xs font-black text-muted-foreground">
                      <Globe2 className="size-3.5" aria-hidden="true" />
                      {course.language}
                    </span>
                  )}
                </div>
                <h1 className="mt-5 text-3xl leading-tight font-black text-primary sm:text-5xl">
                  {course.title}
                </h1>
                {course.shortDescription && <p className="mt-4 text-base font-semibold text-foreground/80">{course.shortDescription}</p>}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
                  {instructors.length > 0 && (
                    <span>
                      By{" "}
                      {instructors.map((i, idx) => (
                        <span key={i.slug}>
                          <Link to={`/mentors/${i.slug}`} className="font-black text-secondary hover:underline">{i.name}</Link>
                          {idx < instructors.length - 1 ? (idx === instructors.length - 2 ? " & " : ", ") : ""}
                        </span>
                      ))}
                    </span>
                  )}
                  {ratingSummary && (ratingSummary.review_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1 font-black text-amber-500">
                      <Star className="size-4 fill-current" aria-hidden="true" />
                      {ratingSummary.avg_rating?.toFixed(1)}
                      <span className="font-semibold text-muted-foreground">({ratingSummary.review_count} reviews)</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" aria-hidden="true" />
                    Updated {new Date(course.updatedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Duration", course.duration || "Self-paced"],
                    ["Lessons", totalLessons > 0 ? String(totalLessons) : "TBA"],
                    ["Total Time", formatSeconds(totalSeconds) ?? "TBA"],
                    ["Level", levelLabel(course.level)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] bg-muted p-4">
                      <p className="text-lg font-black text-primary">{value}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 hidden items-center gap-3 lg:flex">
                  <span className="text-3xl font-black text-primary">{formatPrice(effectivePrice)}</span>
                  {hasDiscount && <span className="text-base font-semibold text-muted-foreground line-through">{formatPrice(course.price)}</span>}
                  <div className="ml-auto w-56">{enrollCta}</div>
                </div>
              </div>
            </div>
          </GsapReveal>
        </div>
      </section>

      <section className="bg-muted px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="order-3 min-w-0 space-y-8 lg:order-1">
            <div className="premium-card-motion overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_18px_60px_rgba(10,42,136,0.08)]">
              <nav aria-label="Course sections" className="hide-scrollbar flex overflow-x-auto border-b border-border">
                {[
                  "Overview",
                  "Curriculum",
                  "Media",
                  "Placements",
                  "Instructor",
                  "Requirements",
                  "Reviews",
                  "FAQ",
                ].map((tab, index) => (
                  <a
                    key={tab}
                    href={`#course-${index}`}
                    className="min-w-max border-b-2 border-transparent px-6 py-4 text-sm font-black text-muted-foreground first:border-secondary first:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    {tab}
                  </a>
                ))}
              </nav>
              <div className="p-7 sm:p-9">
                <section id="course-0">
                  <h2 className="text-2xl font-black text-primary">About This Course</h2>
                  <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {course.description || "No description yet."}
                  </p>

                  {course.whatYouWillLearn.length > 0 && (
                    <div className="mt-8">
                      <h3 className="flex items-center gap-2 text-lg font-black text-primary">
                        <Sparkles className="size-4.5 text-secondary" aria-hidden="true" />
                        What You&apos;ll Learn
                      </h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {course.whatYouWillLearn.map((line) => (
                          <p key={line} className="flex items-start gap-2 text-sm font-semibold text-foreground/80">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section id="course-1" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Curriculum</h2>
                  <div className="mt-5">
                    <ModuleAccordion modules={curriculum} />
                  </div>
                </section>

                <section id="course-2" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Course Media</h2>
                  {gallery.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {gallery.map((item) => <GalleryImage key={item.id} fileId={item.file_id} caption={item.caption} />)}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">No gallery images have been added for this course yet.</p>
                  )}
                </section>

                <section id="course-3" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Placement &amp; Career Outcomes</h2>
                  {successStories.length > 0 ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {successStories.map((story) => (
                        <article key={story.id} className="premium-card-motion rounded-2xl border border-border bg-card p-5 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Award className="size-5 text-secondary" aria-hidden="true" />
                            <h3 className="font-black text-primary">{story.title}</h3>
                          </div>
                          {story.company_name && <p className="mt-1 text-xs font-bold text-muted-foreground">{story.company_name}{story.job_role ? ` · ${story.job_role}` : ""}</p>}
                          {story.full_story && <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-4">{story.full_story}</p>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">No placement outcomes have been published for this course yet.</p>
                  )}
                </section>

                <section id="course-4" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">{instructors.length > 1 ? "Teachers for This Course" : "Instructor"}</h2>
                  <div className={instructors.length > 1 ? "mt-5 grid gap-4 sm:grid-cols-2" : "mt-5 max-w-md"}>
                    {instructors.length > 0 ? (
                      instructors.map((i) => <MentorCard key={i.slug} mentor={i} />)
                    ) : (
                      <p className="text-sm text-muted-foreground">Instructor details unavailable.</p>
                    )}
                  </div>
                </section>

                <section id="course-5" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Requirements</h2>
                  {course.requirements.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {course.requirements.map((line) => (
                        <li key={line} className="flex items-start gap-2 text-sm font-semibold text-foreground/80">
                          <GraduationCap className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">No prerequisites - this course is open to everyone.</p>
                  )}
                </section>

                <section id="course-6" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Student Reviews</h2>
                  {testimonials.length > 0 ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {testimonials.map((t) => (
                        <article key={t.id} className="premium-card-motion rounded-2xl border border-border bg-card p-5">
                          <p className="flex text-amber-400" role="img" aria-label={`${t.rating ?? 0} out of 5 stars`}>
                            {Array.from({ length: 5 }, (_, index) => (
                              <Star key={index} className={`size-4 ${index < (t.rating ?? 0) ? "fill-current" : ""}`} aria-hidden="true" />
                            ))}
                          </p>
                          <p className="mt-4 text-sm leading-7 text-muted-foreground">{t.content}</p>
                          <p className="mt-4 text-sm font-black text-primary">- {t.student_name}</p>
                          {t.mentor_reply && (
                            <div className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                              <span className="font-black text-primary">Mentor reply: </span>{t.mentor_reply}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">No reviews yet - be the first to enroll and leave one.</p>
                  )}
                </section>

                <section id="course-7" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Frequently Asked Questions</h2>
                  <div className="mt-5">
                    {faqs.length > 0 ? <FAQAccordion items={faqs} /> : <p className="text-sm text-muted-foreground">No FAQs added for this course yet.</p>}
                  </div>
                </section>
              </div>
            </div>
          </div>

          <aside className="contents lg:order-2 lg:block lg:self-stretch">
            <div className="contents lg:sticky lg:top-[100px] lg:block lg:space-y-6">
              <div className="premium-card-motion order-1">
                <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)] text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-3xl font-black text-primary">{formatPrice(effectivePrice)}</h2>
                    {hasDiscount && <span className="text-sm font-semibold text-muted-foreground line-through">{formatPrice(course.price)}</span>}
                  </div>
                  {isCheckingEnrollment ? <div className="mt-4 h-12 w-full animate-pulse rounded-xl bg-muted" /> : <div className="mt-4">{enrollCta}</div>}
                  <button
                    onClick={handleToggleWishlist}
                    disabled={toggleWishlist.isPending}
                    aria-pressed={isWishlisted}
                    className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${
                      isWishlisted
                        ? "border-destructive/30 bg-destructive/5 text-destructive-text hover:bg-destructive/10"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {toggleWishlist.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Heart className={`size-4 ${isWishlisted ? "fill-destructive-text text-destructive-text" : ""}`} aria-hidden="true" />
                    )}
                    {isWishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
                  </button>
                </div>
              </div>
              <div className="premium-card-motion order-2 rounded-[20px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
                <h2 className="text-xl font-black text-primary">This Course Includes</h2>
                <div className="mt-5 space-y-4">
                  {[
                    ["Modules", String(curriculum.length)],
                    ["Lessons", String(totalLessons)],
                    ["Total Content", formatSeconds(totalSeconds) ?? "TBA"],
                    ["Language", course.language],
                    course.price ? ["Access", "Lifetime"] : ["Price", "Free"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 text-sm">
                      <span className="font-semibold text-muted-foreground">{label}</span>
                      <span className="font-black text-primary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="premium-card-motion order-4 rounded-[20px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-secondary/10 text-secondary" aria-hidden="true">
                    <MessageCircle className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-primary">Expert Support</h2>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Talk to our course expert
                    </p>
                  </div>
                </div>
                <Link
                  to={routes.freeCounselling}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-secondary bg-card px-4 py-3 text-sm font-black text-secondary transition hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Have Questions?
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="premium-card-motion order-5 rounded-[20px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
                <h2 className="text-xl font-black text-primary">Share This Course</h2>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleNativeShare(course.title)}
                    aria-label="Share this course"
                    className="grid size-10 place-items-center rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Share2 className="size-4" aria-hidden="true" />
                  </button>
                  {SHARE_TARGETS.map(({ Icon, label, urlTemplate }) => (
                    <a
                      key={label}
                      href={urlTemplate(window.location.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (opens in a new tab)`}
                      className="grid size-10 place-items-center rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {(relatedResult?.data.length ?? 0) > 0 && (
        <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
          <div className="mx-auto max-w-7xl">
            <h2 className="premium-reveal text-3xl font-black text-primary">Related Courses</h2>
            <GsapReveal stagger className="mt-8 grid gap-6 md:grid-cols-3">
              {relatedResult!.data.map((item) => (
                <PublicCourseCard key={item.id} course={item} />
              ))}
            </GsapReveal>
          </div>
        </section>
      )}

      {/* Mobile bottom enrollment bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-card p-3 shadow-[0_-8px_30px_rgba(10,42,136,0.12)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTocOpen((v) => !v)}
          aria-label="Course sections"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground"
        >
          <MenuIcon className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-primary">{formatPrice(effectivePrice)}</p>
          {hasDiscount && <p className="truncate text-xs font-semibold text-muted-foreground line-through">{formatPrice(course.price)}</p>}
        </div>
        <div className="w-40 shrink-0">{isCheckingEnrollment ? <div className="h-11 animate-pulse rounded-xl bg-muted" /> : enrollCta}</div>
      </div>
      {mobileTocOpen && (
        <nav aria-label="Jump to section" className="fixed inset-x-0 bottom-[68px] z-40 flex flex-wrap gap-2 border-t border-border bg-card p-3 shadow-lg lg:hidden">
          {["Overview", "Curriculum", "Media", "Placements", "Instructor", "Requirements", "Reviews", "FAQ"].map((tab, index) => (
            <a
              key={tab}
              href={`#course-${index}`}
              onClick={() => setMobileTocOpen(false)}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-primary"
            >
              {tab}
            </a>
          ))}
        </nav>
      )}
    </main>
  );
}

function GalleryImage({ fileId, caption }: { fileId: string; caption: string | null }) {
  const { data: url, isLoading } = useResolvedFileUrl(fileId);
  if (isLoading) return <Skeleton className="aspect-video rounded-xl" />;
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted">
      {url ? (
        <img src={url} alt={caption ?? ""} className="aspect-video size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex aspect-video items-center justify-center text-muted-foreground"><PlayCircle className="size-6" /></div>
      )}
      {caption && <figcaption className="p-2 text-xs font-semibold text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

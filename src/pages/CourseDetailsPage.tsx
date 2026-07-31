import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Award,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Facebook,
  Heart,
  Linkedin,
  Loader2,
  MessageCircle,
  Share2,
  Star,
  Twitter,
  Users,
} from "lucide-react";

import { GsapReveal } from "@/components/motion/gsap-reveal";
import { CourseCard } from "@/components/cards/CourseCard";
import { MentorCard } from "@/components/cards/MentorCard";

import { FAQAccordion } from "@/components/common/FAQAccordion";
import { usePremiumPageMotion } from "@/components/motion/usePremiumPageMotion";
import { courses, faqs, mentors, successStories } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { routes } from "@/lib/routes";
import { useCourseBySlug } from "@/hooks/student/useCourseBySlug";
import { useCheckEnrollment } from "@/hooks/student/useCheckEnrollment";
import { useQuery } from "@tanstack/react-query";
import { learningService } from "@/services/learning.service";
import { resolveFileUrl } from "@/services/storage.service";
import { PageLoader } from "@/components/common/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout, useFreeEnroll } from "@/hooks/student/usePayment";
import { useIsWishlisted, useToggleWishlist } from "@/hooks/student/useWishlist";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function formatPrice(value: number | null) {
  if (!value) return "Free";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(value);
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

function CourseThumbnailImage({ fileId }: { fileId: string | null }) {
  const { data: url } = useQuery({
    queryKey: ["file-url", fileId],
    queryFn: () => resolveFileUrl(fileId ?? ""),
    enabled: !!fileId,
  });

  return (
    <img
      src={url ?? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}
      alt=""
      className="aspect-video size-full object-cover opacity-90"
      loading="eager"
    />
  );
}

export default function CourseDetailsPage() {
  const pageRef = useRef<HTMLElement>(null);
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: course, isLoading: isCourseLoading } = useCourseBySlug(slug);
  const { mutate: processCheckout, isPending: isCheckingOut } = useCheckout();
  const { mutate: enrollFree, isPending: isEnrollingFree } = useFreeEnroll();
  const { data: enrollmentData, isLoading: isCheckingEnrollment } = useCheckEnrollment(slug ?? "");
  const isEnrolled = !!enrollmentData?.isEnrolled;
  const { isWishlisted } = useIsWishlisted(course?.id);
  const toggleWishlist = useToggleWishlist();

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

  // Mock fallbacks for missing DB schema features:
  const mentor = mentors[0]!;
  const related = courses.slice(0, 3);
  const projectsBuilt = courses[0]?.projectsBuilt || [];
  const skills = courses[0]?.skills || [];
  const tools = courses[0]?.tools || [];
  const outcomes = courses[0]?.outcomes || [];
  const includes = courses[0]?.includes || [];

  usePageMeta(course?.title || "Course Details");
  usePremiumPageMotion({ rootRef: pageRef });

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

  return (
    <main ref={pageRef} className="page-shell">
      <section className="bg-white px-4 pt-8 pb-8 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="premium-reveal mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Link to={routes.home} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Home</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <Link to={routes.courses} className="rounded text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Courses
            </Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span aria-current="page">{course.title}</span>
          </nav>
          <GsapReveal className="premium-card-motion rounded-[24px] border border-border bg-card p-5 shadow-[0_18px_60px_rgba(10,42,136,0.08)] sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="premium-parallax relative overflow-hidden rounded-[20px] bg-primary">
                <CourseThumbnailImage fileId={course.thumbnailFileId ?? null} />
              </div>
              <div>
                <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 uppercase">
                  {course.level || "Self-Paced"}
                </span>
                <h1 className="mt-5 text-3xl leading-tight font-black text-primary sm:text-5xl">
                  {course.title}
                </h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{course.description}</p>
                <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Duration", "N/A"],
                    ["Projects", "3+"],
                    ["Mentors", "Industry"],
                    ["Support", "100%"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] bg-muted p-4">
                      <p className="text-lg font-black text-primary">{value}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-7 text-sm leading-7 text-foreground/80">{course.description}</p>
              </div>
            </div>
          </GsapReveal>
        </div>
      </section>

      <section className="bg-muted px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="order-3 space-y-8 lg:order-1">
            <div className="premium-card-motion overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_18px_60px_rgba(10,42,136,0.08)]">
              <nav aria-label="Course sections" className="hide-scrollbar flex overflow-x-auto border-b border-border">
                {[
                  "Overview",
                  "Curriculum",
                  "Projects",
                  "Skills You'll Learn",
                  "Placements",
                  "Mentors",
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
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {course.description}
                  </p>
                  <div className="mt-8 grid gap-5 md:grid-cols-4">
                    {[
                      { title: "Industry-Relevant Curriculum", icon: BookOpenCheck },
                      { title: "Hands-on Learning", icon: CheckCircle2 },
                      { title: "Expert Mentors", icon: Users },
                      { title: "Placement Support", icon: Award },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="border-r border-border last:border-r-0">
                          <Icon className="size-9 rounded-md bg-secondary/10 p-2 text-secondary" aria-hidden="true" />
                          <h3 className="mt-3 text-sm font-black text-primary">{item.title}</h3>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section id="course-1" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Curriculum</h2>
                  <div className="mt-5 space-y-4">
                    {curriculum.length > 0 ? curriculum.map((module, index) => (
                      <article
                        key={module.id}
                        className="premium-card-motion rounded-2xl border border-border bg-muted p-5"
                      >
                        <p className="text-xs font-black tracking-[0.18em] text-secondary uppercase">
                          Module {index + 1}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-primary">{module.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {module.lessons.map((lesson) => (
                            <p
                              key={lesson.id}
                              className="flex gap-2 text-sm font-semibold text-foreground/80"
                            >
                              <CheckCircle2 className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                              {lesson.title}
                            </p>
                          ))}
                        </div>
                      </article>
                    )) : (
                      <p className="text-sm text-muted-foreground">Curriculum modules will be added soon.</p>
                    )}
                  </div>
                </section>

                <section id="course-2" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">What You&apos;ll Build</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {projectsBuilt.map((project) => (
                      <article
                        key={project.title}
                        className="premium-card-motion rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-accent/45"
                      >
                        <h3 className="font-black text-primary">{project.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {project.description}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section id="course-3" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Skills You&apos;ll Learn</h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[...skills, ...tools].map((skill) => (
                      <span
                        key={skill}
                        className="premium-magnetic rounded-md bg-secondary/10 px-3 py-2 text-xs font-black text-secondary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                <section id="course-4" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Placement Outcomes</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {outcomes.map((outcome) => (
                      <div
                        key={outcome}
                        className="premium-card-motion rounded-2xl bg-muted p-5 text-sm font-black text-primary"
                      >
                        {outcome}
                      </div>
                    ))}
                  </div>
                </section>

                <section id="course-5" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Top Mentor</h2>
                  <div className="mt-5 max-w-md">
                    <MentorCard mentor={mentor} />
                  </div>
                </section>

                <section id="course-6" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Student Reviews</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {successStories.slice(0, 2).map((story) => (
                      <article
                        key={story.name}
                        className="premium-card-motion rounded-2xl border border-border bg-card p-5"
                      >
                        <p className="flex text-amber-400" role="img" aria-label="5 out of 5 stars">
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star key={index} className="size-4 fill-current" aria-hidden="true" />
                          ))}
                        </p>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">{story.quote}</p>
                        <p className="mt-4 text-sm font-black text-primary">- {story.name}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section id="course-7" className="mt-12">
                  <h2 className="text-2xl font-black text-primary">Frequently Asked Questions</h2>
                  <div className="mt-5">
                    <FAQAccordion items={faqs} />
                  </div>
                </section>
              </div>
            </div>
          </div>

          <aside className="contents lg:order-2 lg:block lg:self-stretch">
            <div className="contents lg:sticky lg:top-[100px] lg:block lg:space-y-6">
              <div className="premium-card-motion order-1">
                {/* Custom Pricing block instead of mocked PricingCard */}
                <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)] text-center">
                  <h2 className="text-3xl font-black text-primary">{formatPrice(course.price)}</h2>
                  {isCheckingEnrollment ? (
                    <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-muted" />
                  ) : isEnrolled ? (
                    <Link
                      to={`${routes.dashboard}/courses/${course.id}`}
                      className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-success font-black text-success-foreground hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Continue Learning
                    </Link>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={isCheckingOut || isEnrollingFree}
                      className="mt-4 w-full h-11 rounded-xl bg-secondary font-black text-white hover:bg-opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      {isCheckingOut || isEnrollingFree ? "Processing..." : course.price ? "Enroll Now" : "Enroll Free"}
                    </button>
                  )}
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
                  {includes.map((item) => (
                    <div key={item.label} className="flex justify-between gap-4 text-sm">
                      <span className="font-semibold text-muted-foreground">{item.label}</span>
                      <span className="font-black text-primary">{item.value}</span>
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
                  <ArrowRight className="size-4" aria-hidden="true" />
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

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto max-w-7xl">
          <h2 className="premium-reveal text-3xl font-black text-primary">Related Courses</h2>
          <GsapReveal stagger className="mt-8 grid gap-6 md:grid-cols-3">
            {(related.length ? related : courses.slice(1, 4)).map((item) => (
              <CourseCard key={item.slug} course={item} />
            ))}
          </GsapReveal>
        </div>
      </section>
    </main>
  );
}

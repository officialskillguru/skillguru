import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, CheckCircle, Archive, Plus, X, Loader2, ChevronUp, ChevronDown, Trash2, Video, FileText, Edit3, Image as ImageIcon, Send, Undo2, ShieldCheck, XCircle, Lock } from "lucide-react";
import { useCourseCurriculum, useCurriculumMutations, mentorQueryKeys, useLessonQuiz, useQuizQuestions, useQuizAuthoringMutations } from "@/hooks/useMentorPortal";
import { updateCourseStatus, updateCourse, getCourseById, notifyAdminsCourseSubmitted } from "@/services/courses.service";
import { uploadFile, type UploadResult } from "@/services/storage.service";
import type { Module, Lesson, LessonInput } from "@/services/curriculum.service";
import { FileUpload } from "@/components/common/FileUpload";
import { useAuth } from "@/hooks/useAuth";
import { notificationsService } from "@/services/notifications.service";
import type { ContentStatus } from "@/types/database";

/**
 * Real module/lesson/quiz curriculum editor for a course. Shared between the
 * Mentor Dashboard's Course Builder and the Admin course editor - one real
 * implementation, not a parallel per-surface reimplementation.
 */
export function CourseCurriculumEditor({ courseId, courseTitle, courseStatus }: { courseId: string; courseTitle: string; courseStatus: string }) {
  const { data: modules, isLoading } = useCourseCurriculum(courseId);
  const mutations = useCurriculumMutations(courseId);
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isAdminViewer = !!auth.authUser?.roles.includes("admin");

  // Owns the getCourseById fetch so mentor_id is available for approve/reject
  // notifications - CourseMediaSection reuses this instead of fetching again.
  const { data: course } = useQuery({
    queryKey: ["course-media", courseId],
    queryFn: () => getCourseById(courseId),
  });

  const publishMutation = useMutation({
    mutationFn: (status: ContentStatus) => updateCourseStatus(courseId, status),
    onSuccess: (_data, status) => {
      toast.success("Course status updated.");
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(courseId) });
      void queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_courses"] });

      if (status === "under_review") {
        void notifyAdminsCourseSubmitted(courseId);
      } else if (status === "published" && isAdminViewer && course?.mentor_id) {
        void notificationsService.sendNotification(
          course.mentor_id,
          "Course published",
          `"${courseTitle}" has been approved and is now live.`,
          { category: "course", actionUrl: "/mentor/dashboard" }
        );
      }
    },
    onError: () => toast.error("Failed to update course status."),
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      await updateCourseStatus(courseId, "draft");
      if (course?.mentor_id) {
        await notificationsService.sendNotification(
          course.mentor_id,
          "Course needs changes",
          `"${courseTitle}" was sent back for changes: ${reason}`,
          { category: "course", actionUrl: "/mentor/dashboard" }
        );
      }
    },
    onSuccess: () => {
      toast.success("Course sent back to the mentor.");
      setRejecting(false);
      setRejectReason("");
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(courseId) });
      void queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
    },
    onError: () => toast.error("Failed to reject course."),
  });

  const isMentorLocked = !isAdminViewer && courseStatus === "under_review";

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    mutations.createModule.mutate(
      { course_id: courseId, title: newModuleTitle.trim() },
      {
        onSuccess: () => {
          setNewModuleTitle("");
          setAddingModule(false);
        },
        onError: () => toast.error("Failed to create module."),
      }
    );
  };

  const moveModule = (modules_: Module[], moduleId: string, direction: -1 | 1) => {
    const ordered = [...modules_].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((m) => m.id === moduleId);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= ordered.length) return;
    const a = ordered[index]!;
    const b = ordered[swapWith]!;
    ordered[index] = b;
    ordered[swapWith] = a;
    mutations.reorderModules.mutate(ordered.map((m) => m.id));
  };

  if (isLoading) return <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading curriculum...</div>;

  const sortedModules = [...(modules ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const statusLabels: Record<string, string> = { under_review: "Under Review" };
  const statusLabel = statusLabels[courseStatus] ?? courseStatus;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="text-lg font-black text-foreground">{courseTitle} - Curriculum</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              courseStatus === "published"
                ? "bg-emerald-100 text-emerald-800"
                : courseStatus === "archived"
                ? "bg-slate-200 text-slate-700"
                : courseStatus === "under_review"
                ? "bg-sky-100 text-sky-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {statusLabel}
          </span>

          {courseStatus === "published" && (
            <button
              onClick={() => publishMutation.mutate("draft")}
              disabled={publishMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-secondary/20 px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:bg-secondary/30 disabled:opacity-50"
            >
              <Settings aria-hidden="true" className="size-3.5" /> Unpublish
            </button>
          )}

          {courseStatus === "under_review" && isAdminViewer && (
            <>
              <button
                onClick={() => publishMutation.mutate("published")}
                disabled={publishMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <ShieldCheck aria-hidden="true" className="size-3.5" /> Approve &amp; Publish
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
              >
                <XCircle aria-hidden="true" className="size-3.5" /> Reject
              </button>
            </>
          )}

          {courseStatus === "under_review" && !isAdminViewer && (
            <button
              onClick={() => publishMutation.mutate("draft")}
              disabled={publishMutation.isPending}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <Undo2 aria-hidden="true" className="size-3.5" /> Withdraw to Draft
            </button>
          )}

          {courseStatus !== "published" && courseStatus !== "under_review" && (
            isAdminViewer ? (
              <button
                onClick={() => publishMutation.mutate("published")}
                disabled={publishMutation.isPending || sortedModules.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                title={sortedModules.length === 0 ? "Add at least one module before publishing" : undefined}
              >
                <CheckCircle aria-hidden="true" className="size-3.5" /> Publish
              </button>
            ) : courseStatus === "archived" ? null : (
              <button
                onClick={() => publishMutation.mutate("under_review")}
                disabled={publishMutation.isPending || sortedModules.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                title={sortedModules.length === 0 ? "Add at least one module before submitting for review" : undefined}
              >
                <Send aria-hidden="true" className="size-3.5" /> Submit for Review
              </button>
            )
          )}

          {courseStatus === "archived" ? (
            <button
              onClick={() => publishMutation.mutate("draft")}
              disabled={publishMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-secondary/20 px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:bg-secondary/30 disabled:opacity-50"
            >
              <Settings aria-hidden="true" className="size-3.5" /> Unarchive
            </button>
          ) : (
            <button
              onClick={() => publishMutation.mutate("archived")}
              disabled={publishMutation.isPending}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <Archive aria-hidden="true" className="size-3.5" /> Archive
            </button>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <label htmlFor="reject-reason" className="text-xs font-black uppercase tracking-wider text-destructive">
            Reason for rejection
          </label>
          <textarea
            id="reject-reason"
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain what the mentor needs to change..."
            rows={3}
            className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => { setRejecting(false); setRejectReason(""); }}
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate(rejectReason.trim())}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-black text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {rejectMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Send Back to Mentor"}
            </button>
          </div>
        </div>
      )}

      {isMentorLocked && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
          <Lock aria-hidden="true" className="size-3.5 shrink-0" />
          This course is awaiting admin review — changes are locked until it is approved or sent back.
        </p>
      )}

      <CourseMediaSection courseId={courseId} course={course} />

      <div className="mt-6 space-y-4">
        {sortedModules.length === 0 && (
          <p className="text-sm font-semibold text-muted-foreground">No modules yet. Add your first module below.</p>
        )}
        {sortedModules.map((mod, i) => (
          <ModuleEditor
            key={mod.id}
            courseId={courseId}
            module={mod}
            index={i}
            isFirst={i === 0}
            isLast={i === sortedModules.length - 1}
            mutations={mutations}
            onMove={(dir) => moveModule(sortedModules, mod.id, dir)}
            locked={isMentorLocked}
          />
        ))}

        {!isMentorLocked && (addingModule ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-2">
            <input
              autoFocus
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
              placeholder="Module title"
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={handleAddModule}
              disabled={mutations.createModule.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutations.createModule.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </button>
            <button
              onClick={() => { setAddingModule(false); setNewModuleTitle(""); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingModule(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-sm font-black text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="size-4" /> Add New Module
          </button>
        ))}
      </div>
    </div>
  );
}

type CourseMediaField = "thumbnail_file_id" | "banner_file_id" | "promo_video_file_id";

const COURSE_MEDIA_FIELDS: { field: CourseMediaField; label: string; accept: string; hint: string }[] = [
  { field: "thumbnail_file_id", label: "Thumbnail", accept: "image/png,image/jpeg,image/webp", hint: "png, jpg, or webp" },
  { field: "banner_file_id", label: "Banner", accept: "image/png,image/jpeg,image/webp", hint: "png, jpg, or webp" },
  { field: "promo_video_file_id", label: "Intro Video", accept: "video/mp4,video/webm,video/quicktime", hint: "mp4, webm, or mov" },
];

/** Course thumbnail/banner/intro-video upload, using the shared FileUpload component
 *  so this looks and behaves like every other upload target in the app. */
function CourseMediaSection({ courseId, course }: { courseId: string; course: Awaited<ReturnType<typeof getCourseById>> | undefined }) {
  const queryClient = useQueryClient();

  const handleUploaded = async (field: CourseMediaField, result: UploadResult) => {
    try {
      await updateCourse(courseId, { [field]: result.fileId });
      toast.success("Course media updated.");
      void queryClient.invalidateQueries({ queryKey: ["course-media", courseId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save course media.");
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
        <ImageIcon aria-hidden="true" className="size-3.5" /> Course Media
      </h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {COURSE_MEDIA_FIELDS.map(({ field, label, accept, hint }) => (
          <FileUpload
            key={field}
            bucket="courses"
            folder={courseId}
            label={label}
            accept={accept}
            hint={hint}
            value={course?.[field] ? "Uploaded" : undefined}
            onUploaded={(result) => void handleUploaded(field, result)}
          />
        ))}
      </div>
    </div>
  );
}

type CurriculumMutations = ReturnType<typeof useCurriculumMutations>;

function ModuleEditor({
  courseId,
  module: mod,
  index,
  isFirst,
  isLast,
  mutations,
  onMove,
  locked,
}: {
  courseId: string;
  module: Module & { lessons: Lesson[] };
  index: number;
  isFirst: boolean;
  isLast: boolean;
  mutations: CurriculumMutations;
  onMove: (direction: -1 | 1) => void;
  locked: boolean;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const [addingLesson, setAddingLesson] = useState(false);

  const sortedLessons = [...mod.lessons].sort((a, b) => a.sort_order - b.sort_order);

  const handleRename = () => {
    if (!title.trim() || title === mod.title) { setEditingTitle(false); return; }
    mutations.updateModule.mutate(
      { id: mod.id, input: { title: title.trim() } },
      { onSuccess: () => setEditingTitle(false), onError: () => toast.error("Failed to rename module.") }
    );
  };

  const handleDeleteModule = () => {
    if (!window.confirm(`Delete module "${mod.title}" and all its lessons?`)) return;
    mutations.deleteModule.mutate(mod.id, { onError: () => toast.error("Failed to delete module.") });
  };

  const moveLesson = (lessonId: string, direction: -1 | 1) => {
    const ordered = [...sortedLessons];
    const idx = ordered.findIndex((l) => l.id === lessonId);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= ordered.length) return;
    const a = ordered[idx]!;
    const b = ordered[swapWith]!;
    ordered[idx] = b;
    ordered[swapWith] = a;
    mutations.reorderLessons.mutate({ moduleId: mod.id, orderedLessonIds: ordered.map((l) => l.id) });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-black uppercase text-muted-foreground shrink-0">Module {index + 1}</span>
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm font-black text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : (
            <button
              onClick={() => !locked && setEditingTitle(true)}
              disabled={locked}
              className="font-black text-sm text-foreground hover:text-primary text-left disabled:cursor-not-allowed disabled:opacity-70"
            >
              {mod.title}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onMove(-1)} disabled={isFirst || locked} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronUp className="size-4" /></button>
          <button onClick={() => onMove(1)} disabled={isLast || locked} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronDown className="size-4" /></button>
          <button onClick={() => setAddingLesson(true)} disabled={locked} className="text-xs font-bold text-primary hover:underline ml-2 disabled:opacity-30 disabled:no-underline">Add Lesson</button>
          <button onClick={handleDeleteModule} disabled={locked} className="text-muted-foreground hover:text-destructive ml-2 disabled:opacity-30"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {sortedLessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            courseId={courseId}
            lesson={lesson}
            index={i}
            isFirst={i === 0}
            isLast={i === sortedLessons.length - 1}
            mutations={mutations}
            onMove={(dir) => moveLesson(lesson.id, dir)}
            locked={locked}
          />
        ))}

        {addingLesson && !locked && (
          <LessonForm
            courseId={courseId}
            moduleId={mod.id}
            mutations={mutations}
            onDone={() => setAddingLesson(false)}
          />
        )}
      </div>
    </div>
  );
}

const contentTypeIcon: Record<Lesson["content_type"], typeof Video> = {
  video: Video,
  text: FileText,
  pdf: FileText,
  quiz: CheckCircle,
  assignment: Edit3,
};

function LessonRow({
  courseId,
  lesson,
  index,
  isFirst,
  isLast,
  mutations,
  onMove,
  locked,
}: {
  courseId: string;
  lesson: Lesson;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  mutations: CurriculumMutations;
  onMove: (direction: -1 | 1) => void;
  locked: boolean;
}) {
  const Icon = contentTypeIcon[lesson.content_type];
  const [managingQuiz, setManagingQuiz] = useState(false);

  const handleDelete = () => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    mutations.deleteLesson.mutate(lesson.id, { onError: () => toast.error("Failed to delete lesson.") });
  };

  return (
    <div className="rounded bg-card shadow-sm border border-border">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-bold text-foreground truncate">{index + 1}. {lesson.title}</span>
          {lesson.is_free_preview && <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-black text-secondary-foreground shrink-0">Free preview</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {lesson.content_type === "quiz" && (
            <button
              onClick={() => setManagingQuiz((v) => !v)}
              className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider text-secondary hover:bg-secondary/10"
            >
              {managingQuiz ? "Close" : "Manage Quiz"}
            </button>
          )}
          <button onClick={() => onMove(-1)} disabled={isFirst || locked} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
          <button onClick={() => onMove(1)} disabled={isLast || locked} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
          <button onClick={handleDelete} disabled={locked} className="text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="size-3.5" /></button>
        </div>
      </div>
      {managingQuiz && <QuizEditorPanel courseId={courseId} lessonId={lesson.id} lessonTitle={lesson.title} locked={locked} />}
    </div>
  );
}

const contentTypes: { value: Lesson["content_type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
];

function LessonForm({ courseId, moduleId, mutations, onDone }: { courseId: string; moduleId: string; mutations: CurriculumMutations; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<Lesson["content_type"]>("text");
  const [textContent, setTextContent] = useState("");
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const needsFile = contentType === "video" || contentType === "pdf";

  const handleSave = async () => {
    if (!title.trim()) return;
    if (needsFile && !file) {
      toast.error("Please choose a file to upload.");
      return;
    }

    const input: LessonInput = {
      module_id: moduleId,
      title: title.trim(),
      content_type: contentType,
      is_free_preview: isFreePreview,
      text_content: contentType === "text" ? textContent.trim() || null : null,
    };

    try {
      if (needsFile && file) {
        setUploading(true);
        const uploaded = await uploadFile("courses", file, courseId);
        input.video_file_id = uploaded.fileId;
      }
    } catch (err) {
      setUploading(false);
      toast.error(err instanceof Error ? err.message : "File upload failed.");
      return;
    }
    setUploading(false);

    mutations.createLesson.mutate(input, {
      onSuccess: () => onDone(),
      onError: () => toast.error("Failed to create lesson."),
    });
  };

  const isBusy = uploading || mutations.createLesson.isPending;

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value as Lesson["content_type"])}
          className="rounded-md border border-border bg-card px-2 py-1.5 text-xs font-bold text-foreground"
        >
          {contentTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
      </div>

      {contentType === "text" && (
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Lesson content..."
          rows={3}
          className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}

      {needsFile && (
        <input
          type="file"
          accept={contentType === "video" ? "video/mp4,video/webm,video/quicktime" : "application/pdf"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs font-semibold text-muted-foreground"
        />
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <input type="checkbox" checked={isFreePreview} onChange={(e) => setIsFreePreview(e.target.checked)} />
          Free preview
        </label>
        <div className="flex items-center gap-2">
          <button onClick={onDone} className="text-xs font-bold text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={isBusy}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : "Save Lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}

const QUESTION_TYPES: { value: "mcq" | "true_false"; label: string }[] = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
];

function QuizEditorPanel({ courseId, lessonId, lessonTitle, locked }: { courseId: string; lessonId: string; lessonTitle: string; locked: boolean }) {
  const { data: quiz, isLoading: isLoadingQuiz } = useLessonQuiz(courseId, lessonId, `${lessonTitle} Quiz`);
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuizQuestions(quiz?.id);
  const mutations = useQuizAuthoringMutations(quiz?.id, lessonId);

  const [adding, setAdding] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"mcq" | "true_false">("mcq");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  if (isLoadingQuiz || !quiz) {
    return <div className="border-t border-border p-4 text-xs font-semibold text-muted-foreground">Loading quiz...</div>;
  }

  const resetForm = () => {
    setAdding(false);
    setQuestionText("");
    setQuestionType("mcq");
    setOptions(["", ""]);
    setCorrectIndex(0);
  };

  const handleAddQuestion = () => {
    if (!questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    const optionTexts = questionType === "true_false" ? ["True", "False"] : options.map((o) => o.trim()).filter(Boolean);
    if (optionTexts.length < 2) {
      toast.error("Add at least 2 options.");
      return;
    }
    mutations.createQuestion.mutate(
      {
        quizId: quiz.id,
        questionText: questionText.trim(),
        questionType,
        options: optionTexts.map((text, i) => ({ text, isCorrect: i === correctIndex })),
      },
      {
        onSuccess: () => { toast.success("Question added."); resetForm(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add question."),
      }
    );
  };

  return (
    <div className="space-y-4 border-t border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-foreground">{quiz.title}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">Passing score: {quiz.passing_score}%</p>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <input
            type="checkbox"
            checked={quiz.is_published}
            onChange={(e) => mutations.updatePublishState.mutate(
              { is_published: e.target.checked },
              {
                onSuccess: () => toast.success(e.target.checked ? "Quiz published - students can now take it." : "Quiz unpublished."),
                onError: () => toast.error("Failed to update quiz."),
              }
            )}
          />
          Published
        </label>
      </div>

      {isLoadingQuestions ? (
        <p className="text-xs font-semibold text-muted-foreground">Loading questions...</p>
      ) : questions.length === 0 && !adding ? (
        <p className="text-xs font-semibold text-muted-foreground">No questions yet.</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-foreground">{i + 1}. {q.question_text}</p>
                <button
                  onClick={() => mutations.deleteQuestion.mutate(q.id, { onError: () => toast.error("Failed to delete question.") })}
                  disabled={locked}
                  className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {q.quiz_options.map((opt) => (
                  <li key={opt.id} className={`text-[11px] font-semibold ${opt.is_correct ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {opt.is_correct ? "✓ " : "— "}{opt.option_text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <input
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Question text"
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={questionType}
            onChange={(e) => { setQuestionType(e.target.value as "mcq" | "true_false"); setCorrectIndex(0); }}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {questionType === "true_false" ? (
            <div className="flex gap-4 text-xs font-semibold text-foreground">
              {["True", "False"].map((label, i) => (
                <label key={label} className="flex items-center gap-1.5">
                  <input type="radio" name="correct-tf" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  {label}
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correct-mcq" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  <input
                    value={opt}
                    onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {options.length > 2 && (
                    <button onClick={() => { setOptions((prev) => prev.filter((_, idx) => idx !== i)); if (correctIndex >= options.length - 1) setCorrectIndex(0); }} className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setOptions((prev) => [...prev, ""])} className="text-[11px] font-bold text-primary hover:underline">
                + Add option
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="text-xs font-bold text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={handleAddQuestion}
              disabled={mutations.createQuestion.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutations.createQuestion.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Add Question"}
            </button>
          </div>
        </div>
      ) : !locked ? (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md border-2 border-dashed border-border px-3 py-1.5 text-xs font-black text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="size-3.5" /> Add Question
        </button>
      ) : null}
    </div>
  );
}

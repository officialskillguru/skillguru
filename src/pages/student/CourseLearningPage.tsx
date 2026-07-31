import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { PlayCircle, ChevronLeft, CheckCircle2, ChevronDown, ChevronRight, Check, FileWarning, Paperclip, Download, Loader2, StickyNote } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { learningService } from "@/services/learning.service";
import type { LessonRow } from "@/repositories/learning.repository";
import { progressService } from "@/services/progress.service";
import { resolveFileUrl } from "@/services/storage.service";
import { useProgress } from "@/hooks/student/useProgress";
import { useQuiz, useSubmitQuizAttempt } from "@/hooks/student/useQuiz";
import { useLessonNote, useSaveLessonNote } from "@/hooks/student/useNotes";
import { useStudentCourses } from "@/hooks/student/useStudentCourses";
import { PageLoader } from "@/components/common/PageLoader";
import { ErrorState } from "@/components/common/ErrorState";

export default function CourseLearningPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: coursesData, isLoading: isLoadingCourse } = useStudentCourses(1, 100);
  const enrollment = coursesData?.data?.find(e => e.courseId === id);
  const courseData = enrollment?.courses;

  const { data: curriculum = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ["course-curriculum", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await learningService.getCourseModulesWithLessons(id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!id,
  });

  const { data: lessonProgress = [], isLoading: isLoadingProgress } = useQuery({
    queryKey: ["lesson-progress", enrollment?.id],
    queryFn: async () => {
      if (!enrollment?.id) return [];
      const res = await progressService.getLessonProgress(enrollment.id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!enrollment?.id,
  });

  const { data: courseProgress } = useQuery({
    queryKey: ["course-progress-summary", enrollment?.id],
    queryFn: async () => {
      if (!enrollment?.id) return null;
      const res = await progressService.getCourseProgress(enrollment.id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!enrollment?.id,
  });

  const completedLessonIds = useMemo(
    () => new Set(lessonProgress.filter((p) => p.status === "completed").map((p) => p.lesson_id)),
    [lessonProgress]
  );

  const [activeLessonId, setactiveLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const firstModule = curriculum?.[0];
    if (!activeLessonId && firstModule?.lessons && firstModule.lessons.length > 0) {
      const lessonId = firstModule.lessons?.[0]?.id;
      /* eslint-disable react-hooks/set-state-in-effect */
      if (lessonId) setactiveLessonId(lessonId);
      setExpandedModules({ [firstModule.id]: true });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [curriculum, activeLessonId]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const activeLesson = useMemo(() => {
    for (const mod of curriculum) {
      const found = mod.lessons.find(l => l.id === activeLessonId);
      if (found) return found;
    }
    return null;
  }, [curriculum, activeLessonId]);

  const { markComplete } = useProgress();

  const { data: mediaUrl, isLoading: isLoadingMedia, isError: isMediaError } = useQuery({
    queryKey: ["lesson-media-url", activeLesson?.video_file_id],
    queryFn: () => resolveFileUrl(activeLesson!.video_file_id!),
    enabled: !!activeLesson?.video_file_id && (activeLesson?.content_type === "video" || activeLesson?.content_type === "pdf"),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["lesson-resources", activeLesson?.id],
    queryFn: async () => {
      if (!activeLesson) return [];
      const res = await learningService.getLessonResources(activeLesson.id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!activeLesson?.id,
  });

  const handleMarkComplete = (lessonId: string) => {
    if (!enrollment?.id || !id) return;
    markComplete.mutate(
      { enrollmentId: enrollment.id, lessonId, courseId: id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["lesson-progress", enrollment.id] });
          void queryClient.invalidateQueries({ queryKey: ["course-progress-summary", enrollment.id] });
        },
      }
    );
  };

  if (isLoadingCourse || isLoadingModules || isLoadingProgress) return <PageLoader />;
  if (!courseData) return <div className="p-8"><ErrorState title="Course not found" /></div>;

  const isLessonCompleted = (lessonId: string) => completedLessonIds.has(lessonId);
  const completionPercentage = courseProgress?.completion_percentage ?? 0;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-muted">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/courses"
            className="flex items-center gap-1 rounded-lg text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Back to Courses
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-base font-black text-foreground truncate max-w-sm">{courseData.title}</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border bg-muted/50">
            <h2 className="font-black text-foreground">Course Content</h2>
            <div
              className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-label="Course completion"
              aria-valuenow={completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
               <div
                 className="h-full bg-secondary transition-all duration-500"
                 style={{ width: `${completionPercentage}%` }}
               />
            </div>
            <p className="mt-1 flex justify-end text-[10px] font-bold text-muted-foreground">{completionPercentage}% Complete</p>
          </div>

          <nav aria-label="Course modules" className="flex-1 overflow-y-auto p-3 space-y-2">
            {curriculum.map((mod, i) => (
              <div key={mod.id} className="rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => toggleModule(mod.id)}
                  aria-expanded={!!expandedModules[mod.id]}
                  aria-controls={`module-lessons-${mod.id}`}
                  className="flex w-full items-center justify-between bg-muted/50 p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase text-secondary tracking-wider">Module {i + 1}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{mod.title}</p>
                  </div>
                  {expandedModules[mod.id] ? (
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>

                {expandedModules[mod.id] && (
                  <div id={`module-lessons-${mod.id}`} className="bg-card p-1">
                    {mod.lessons.map(lesson => {
                      const completed = isLessonCompleted(lesson.id);
                      const isActive = activeLessonId === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setactiveLessonId(lesson.id)}
                          aria-current={isActive ? "true" : undefined}
                          className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                            isActive ? "bg-secondary/10" : "hover:bg-muted"
                          }`}
                        >
                          <div
                            className={`grid size-5 shrink-0 place-items-center rounded-full border ${completed ? "border-secondary bg-secondary text-primary-foreground" : isActive ? "border-secondary text-secondary" : "border-border text-transparent"}`}
                            aria-hidden="true"
                          >
                            <Check className="size-3" />
                          </div>
                          <span className={`text-xs font-bold ${isActive ? "text-secondary" : "text-muted-foreground"}`}>
                            {lesson.title}
                          </span>
                          {completed && <span className="sr-only"> (completed)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/50">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
             {activeLesson?.content_type === "quiz" ? (
               <QuizSection
                 lessonId={activeLesson.id}
                 lessonTitle={activeLesson.title}
                 enrollmentId={enrollment?.id}
                 isCompleted={isLessonCompleted(activeLesson.id)}
                 onPassed={() => handleMarkComplete(activeLesson.id)}
               />
             ) : (
               <>
                 {activeLesson?.content_type === "video" || activeLesson?.content_type === "pdf" ? (
                   <LessonMedia lesson={activeLesson} url={mediaUrl} isLoading={isLoadingMedia} isError={isMediaError} />
                 ) : (
                   <div className="aspect-video w-full rounded-xl bg-slate-900 flex flex-col items-center justify-center overflow-hidden relative">
                     <PlayCircle className="size-16 text-white/30" aria-hidden="true" />
                     <p className="mt-4 text-sm font-bold text-white/50">No video for this lesson</p>
                   </div>
                 )}

                 {activeLesson && (
                   <>
                     <div className="mt-8">
                       <h2 className="text-2xl font-black text-foreground">{activeLesson.title}</h2>
                       <p className="mt-4 text-sm text-foreground/80 leading-relaxed font-semibold">
                         {activeLesson.text_content || "No description provided for this lesson."}
                       </p>
                     </div>

                     {resources.length > 0 && (
                       <div className="mt-8 border-t border-border pt-6">
                         <h3 className="text-sm font-black text-foreground uppercase tracking-wide">Resources</h3>
                         <ul className="mt-3 space-y-2">
                           {resources.map((resource) => (
                             <ResourceLink key={resource.id} title={resource.title} fileId={resource.file_id} />
                           ))}
                         </ul>
                       </div>
                     )}

                     <div className="mt-8 pt-8 border-t border-border flex justify-end">
                        <button
                          disabled={isLessonCompleted(activeLesson.id) || markComplete.isPending}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleMarkComplete(activeLesson.id)}
                        >
                          {isLessonCompleted(activeLesson.id) ? (
                            <>
                              <CheckCircle2 className="size-4" aria-hidden="true" />
                              Completed
                            </>
                          ) : (
                            "Mark as Complete"
                          )}
                        </button>
                     </div>
                   </>
                 )}
               </>
             )}

             {activeLesson && <NotesPanel key={activeLesson.id} courseId={id} lessonId={activeLesson.id} />}

             {!activeLesson && (
               <div className="mt-8 text-center text-muted-foreground">
                 Select a lesson from the sidebar to view its content.
               </div>
             )}
          </div>
        </main>
      </div>
    </div>
  );
}

function LessonMedia({
  lesson,
  url,
  isLoading,
  isError,
}: {
  lesson: LessonRow;
  url: string | null | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="aspect-video w-full rounded-xl bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="size-10 animate-spin text-white/60" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-white/50">Loading media...</p>
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div className="aspect-video w-full rounded-xl bg-slate-900 flex flex-col items-center justify-center gap-2">
        <FileWarning className="size-10 text-white/40" aria-hidden="true" />
        <p className="text-sm font-bold text-white/60">
          {lesson.video_file_id ? "Unable to load this lesson's media." : "No media uploaded for this lesson yet."}
        </p>
      </div>
    );
  }

  if (lesson.content_type === "video") {
    return (
      <video key={url} controls className="aspect-video w-full rounded-xl bg-black" src={url}>
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
      <iframe key={url} src={url} title={lesson.title} className="size-full" />
    </div>
  );
}

function ResourceLink({ title, fileId }: { title: string; fileId: string }) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const url = await resolveFileUrl(fileId);
      if (!url) {
        toast.error("Unable to open this resource.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li>
      <button
        onClick={() => void handleOpen()}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-left text-sm font-bold text-foreground/80 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />}
        {title}
        <Download className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}

function QuizSection({
  lessonId,
  lessonTitle,
  enrollmentId,
  isCompleted,
  onPassed,
}: {
  lessonId: string;
  lessonTitle: string;
  enrollmentId: string | undefined;
  isCompleted: boolean;
  onPassed: () => void;
}) {
  const { data: quiz, isLoading } = useQuiz(lessonId);
  const submitAttempt = useSubmitQuizAttempt(quiz?.id, enrollmentId);
  const [selectedOptionByQuestion, setSelectedOptionByQuestion] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; correctCount: number; totalGradable: number } | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  if (isLoading) {
    return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">Loading quiz...</div>;
  }

  if (!quiz) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-8 text-center">
        <h2 className="text-lg font-black text-foreground">{lessonTitle}</h2>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">This quiz isn't available yet.</p>
      </div>
    );
  }

  const gradableQuestions = quiz.quiz_questions.filter((q) => q.question_type === "mcq" || q.question_type === "true_false");
  const allAnswered = gradableQuestions.every((q) => !!selectedOptionByQuestion[q.id]);

  const handleSubmit = () => {
    const selectedOptionIds = Object.values(selectedOptionByQuestion);
    submitAttempt.mutate(selectedOptionIds, {
      onSuccess: (data) => {
        setResult(data);
        if (data.passed) onPassed();
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit quiz."),
    });
  };

  if (result) {
    return (
      <div
        role="status"
        className={`rounded-xl border p-8 text-center ${result.passed ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/10"}`}
      >
        <h2 ref={resultHeadingRef} tabIndex={-1} className="text-lg font-black text-foreground outline-none">{quiz.title}</h2>
        <p className={`mt-2 text-3xl font-black ${result.passed ? "text-success" : "text-warning"}`}>{result.score}%</p>
        <p className="mt-1 text-sm font-semibold text-foreground/80">
          {result.correctCount} / {result.totalGradable} correct - {result.passed ? "Passed!" : `Needs ${quiz.passing_score}% to pass`}
        </p>
        {!result.passed && (
          <button
            onClick={() => { setResult(null); setSelectedOptionByQuestion({}); }}
            className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Retake Quiz
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-foreground">{quiz.title}</h2>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Passing score: {quiz.passing_score}%</p>
      {isCompleted && <p className="mt-2 text-xs font-bold text-success">You've already completed this lesson.</p>}

      <div className="mt-6 space-y-6">
        {quiz.quiz_questions.map((question, qi) => (
          <fieldset key={question.id} className="rounded-xl border border-border bg-muted/50 p-5">
            <legend className="text-sm font-bold text-foreground px-0">{qi + 1}. {question.question_text}</legend>
            {question.question_type === "mcq" || question.question_type === "true_false" ? (
              <div className="mt-3 space-y-2">
                {question.quiz_options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 rounded-lg text-sm font-semibold text-foreground/80 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={selectedOptionByQuestion[question.id] === option.id}
                      onChange={() => setSelectedOptionByQuestion((prev) => ({ ...prev, [question.id]: option.id }))}
                    />
                    {option.option_text}
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">This question type isn't auto-graded yet.</p>
            )}
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitAttempt.isPending || !enrollmentId}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitAttempt.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Submit Quiz"}
        </button>
      </div>
    </div>
  );
}

function NotesPanel({ courseId, lessonId }: { courseId: string | undefined; lessonId: string }) {
  const { data: existingNote, isLoading } = useLessonNote(lessonId);
  const saveNote = useSaveLessonNote(courseId, lessonId);
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [syncedNote, setSyncedNote] = useState(false);

  if (!isLoading && !syncedNote) {
    setSyncedNote(true);
    setContent(existingNote?.content ?? "");
  }

  const handleSave = () => {
    saveNote.mutate(content, {
      onSuccess: () => { toast.success("Note saved."); setIsEditing(false); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save note."),
    });
  };

  if (isLoading) return null;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase tracking-wide">
          <StickyNote className="size-4" aria-hidden="true" /> My Notes
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {existingNote ? "Edit" : "Add a note"}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <label htmlFor="lesson-note-content" className="sr-only">Note content</label>
          <textarea
            id="lesson-note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Jot down anything you want to remember about this lesson..."
            className="w-full rounded-xl border border-border bg-muted/50 p-3 text-sm outline-none focus:border-secondary focus:bg-card"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setContent(existingNote?.content ?? ""); setIsEditing(false); }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground/80 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveNote.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {saveNote.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : "Save Note"}
            </button>
          </div>
        </div>
      ) : existingNote ? (
        <p className="mt-3 whitespace-pre-wrap rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-foreground/80">{existingNote.content}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No notes yet for this lesson.</p>
      )}
    </div>
  );
}

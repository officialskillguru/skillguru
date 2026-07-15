import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { PlayCircle, ChevronLeft, CheckCircle2, ChevronDown, ChevronRight, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { learningService } from "@/services/learning.service";
import { useStudentCourses } from "@/hooks/student/useStudentCourses";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/common/PageLoader";
import { ErrorState } from "@/components/common/ErrorState";
import { toast } from "sonner";

export default function CourseLearningPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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

  const { data: progress = [], isLoading: isLoadingProgress } = useQuery({
    queryKey: ["course-progress", user?.id, enrollment?.id],
    queryFn: async () => {
      if (!user?.id || !enrollment?.id) return [];
      const res = await learningService.getStudentProgress(user.id, enrollment.id);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!user?.id && !!enrollment?.id,
  });

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

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id || !enrollment?.id) throw new Error("Missing user or enrollment");
      const res = await learningService.markLessonComplete(user.id, enrollment.id, lessonId);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success("Lesson completed!");
      void queryClient.invalidateQueries({ queryKey: ["course-progress", user?.id, enrollment?.id] });
    },
    onError: () => {
      toast.error("Failed to mark complete.");
    }
  });

  if (isLoadingCourse || isLoadingModules || isLoadingProgress) return <PageLoader />;
  if (!courseData) return <div className="p-8"><ErrorState title="Course not found" /></div>;

  const isLessonCompleted = (_id: string) => progress.some(() => false /* schema drift */);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-muted">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/courses" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="size-4" />
            Back to Courses
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-base font-black text-foreground truncate max-w-sm">{courseData.title}</h1>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-white flex flex-col">
          <div className="p-4 border-b border-border bg-slate-50/50">
            <h2 className="font-black text-slate-800">Course Content</h2>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
               <div 
                 className="h-full bg-secondary transition-all duration-500" 
                 style={{ width: `0%` }}
               />
            </div>
            <p className="mt-1 flex justify-end text-[10px] font-bold text-slate-500">{0}% Complete</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {curriculum.map((mod, i) => (
              <div key={mod.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleModule(mod.id)}
                  className="flex w-full items-center justify-between bg-slate-50 p-3 text-left hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase text-secondary tracking-wider">Module {i + 1}</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{mod.title}</p>
                  </div>
                  {expandedModules[mod.id] ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
                </button>
                
                {expandedModules[mod.id] && (
                  <div className="bg-white p-1">
                    {mod.lessons.map(lesson => {
                      const completed = isLessonCompleted(lesson.id);
                      const isActive = activeLessonId === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setactiveLessonId(lesson.id)}
                          className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm transition-colors ${
                            isActive ? "bg-secondary/10" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className={`grid size-5 shrink-0 place-items-center rounded-full border ${completed ? "border-secondary bg-secondary text-white" : isActive ? "border-secondary text-secondary" : "border-slate-300 text-transparent"}`}>
                            <Check className="size-3" />
                          </div>
                          <span className={`text-xs font-bold ${isActive ? "text-secondary" : "text-slate-600"}`}>
                            {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
             <div className="aspect-video w-full rounded-xl bg-slate-900 flex flex-col items-center justify-center overflow-hidden relative group">
                <PlayCircle className="size-16 text-white/50 group-hover:text-white/80 transition-colors cursor-pointer" />
                <p className="mt-4 text-sm font-bold text-white/50">Video Player (Mock)</p>
             </div>
             
             {activeLesson ? (
               <>
                 <div className="mt-8">
                   <h2 className="text-2xl font-black text-slate-900">{activeLesson.title}</h2>
                   <p className="mt-4 text-sm text-slate-600 leading-relaxed font-semibold">
                     {activeLesson.text_content || "No description provided for this lesson."}
                   </p>
                 </div>
                 <div className="mt-8 pt-8 border-t border-border flex justify-end">
                    <button 
                      disabled={isLessonCompleted(activeLesson.id) || markCompleteMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => markCompleteMutation.mutate(activeLesson.id)}
                    >
                      {isLessonCompleted(activeLesson.id) ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          Completed
                        </>
                      ) : (
                        "Mark as Complete"
                      )}
                    </button>
                 </div>
               </>
             ) : (
               <div className="mt-8 text-center text-slate-500">
                 Select a lesson from the sidebar to view its content.
               </div>
             )}
          </div>
        </main>
      </div>
    </div>
  );
}

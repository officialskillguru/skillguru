import { useEffect, useRef, useState } from "react";
import { Edit3 } from "lucide-react";
import { useMentorCourses } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCurriculumEditor } from "@/components/shared/CourseCurriculumEditor";
import { CourseDetailsEditor } from "@/components/shared/CourseDetailsEditor";
import { CreateCourseDialog } from "@/components/mentor/dashboard/CreateCourseDialog";

export function CourseBuilderTab() {
  const { data: courses, isLoading } = useMentorCourses();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [editorSection, setEditorSection] = useState<"details" | "curriculum">("curriculum");
  const viewRef = useRef<HTMLDivElement>(null);

  // Move focus into the newly-shown view on every course-list <-> editor
  // transition, so keyboard/screen-reader users aren't dropped back to <body>.
  useEffect(() => {
    viewRef.current?.focus();
  }, [selectedCourse]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!courses || courses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm font-semibold text-muted-foreground">No courses to build yet.</p>
        <CreateCourseDialog onCreated={setSelectedCourse} />
      </div>
    );
  }

  const activeCourse = (courses as { id: string; title: string; status: string }[]).find((c) => c.id === selectedCourse);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">Course Builder</h2>
        {selectedCourse ? (
          <button
            onClick={() => setSelectedCourse(null)}
            className="rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to Course List
          </button>
        ) : (
          <CreateCourseDialog onCreated={setSelectedCourse} />
        )}
      </div>

      {!selectedCourse ? (
        <div ref={viewRef} tabIndex={-1} role="region" aria-label="Course list" className="grid gap-4 sm:grid-cols-2 outline-none">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course.id)}
              className="flex flex-col items-start text-left rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h3 className="text-lg font-black text-foreground">{course.title}</h3>
              <p className="mt-1 text-xs font-bold text-muted-foreground line-clamp-1">{course.description ?? ""}</p>
              <div className="mt-4 flex items-center gap-2">
                <Edit3 className="size-4 text-primary" aria-hidden="true" />
                <span className="text-xs font-black text-primary uppercase tracking-wider">Edit Curriculum</span>
              </div>
            </button>
          ))}
        </div>
      ) : activeCourse ? (
        <div ref={viewRef} tabIndex={-1} role="region" aria-label={`Editor for ${activeCourse.title}`} className="outline-none">
          <div role="tablist" aria-label="Course editor sections" className="mb-4 flex gap-2 border-b border-border">
            {(["details", "curriculum"] as const).map((section) => (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={editorSection === section}
                onClick={() => setEditorSection(section)}
                className={`px-4 py-2.5 text-sm font-black capitalize transition border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  editorSection === section ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {section === "details" ? "Course Details" : "Curriculum"}
              </button>
            ))}
          </div>
          {editorSection === "details" ? (
            <CourseDetailsEditor courseId={activeCourse.id} viewerRole="mentor" />
          ) : (
            <CourseCurriculumEditor courseId={activeCourse.id} courseTitle={activeCourse.title} courseStatus={activeCourse.status} />
          )}
        </div>
      ) : null}
    </div>
  );
}

import { PlayCircle, BookOpen, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

interface ContinueLearningProps {
  course?: {
    id: string;
    title: string;
    instructor: string;
    progress: number;
    thumbnail: string;
    nextModule: string;
    totalModules: number;
    completedModules: number;
  };
}

export function ContinueLearning({ course }: ContinueLearningProps) {
  if (!course) {
    return (
      <Card className="flex h-full min-h-[300px] flex-col justify-center border-dashed">
        <EmptyState 
          icon={<Compass size={32} aria-hidden="true" />}
          title="No Active Courses"
          description="You haven't enrolled in any courses yet, or you've completed them all. Ready to learn something new?"
          primaryAction={
            <Button asChild>
              <Link to="/dashboard/courses">Explore Courses</Link>
            </Button>
          }
          className="py-12"
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Thumbnail */}
          <div className="relative h-48 w-full shrink-0 md:h-auto md:w-64 lg:w-72">
            <img
              src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop"}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r" />
            <div className="absolute bottom-4 left-4 right-4 text-white md:hidden">
              <span className="rounded-full bg-primary/90 px-2.5 py-1 text-xs font-bold">IN PROGRESS</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-between p-6">
            <div>
              <div className="hidden md:block">
                <span className="mb-3 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  IN PROGRESS
                </span>
              </div>
              <h3 className="line-clamp-1 text-xl font-bold text-foreground md:text-2xl">
                {course.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <BookOpen size={14} aria-hidden="true" /> By {course.instructor}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1 space-y-2 lg:max-w-md">
                <div className="flex justify-between text-sm font-bold">
                  <span>{course.progress}% Complete</span>
                  <span className="text-muted-foreground">
                    {course.completedModules} / {course.totalModules} modules
                  </span>
                </div>
                <Progress value={course.progress} className="h-2.5 w-full bg-muted" />
                <p className="text-xs font-semibold text-muted-foreground mt-2">
                  <span className="text-foreground">Up Next:</span> {course.nextModule}
                </p>
              </div>

              <Button asChild className="w-full shrink-0 rounded-xl font-bold lg:w-auto">
                <Link to={`/dashboard/courses/${course.id}`}>
                  <PlayCircle className="mr-2" size={18} aria-hidden="true" /> Continue Learning
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

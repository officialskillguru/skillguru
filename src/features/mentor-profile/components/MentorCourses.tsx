import { PlayCircle, Users, Star, Award } from "lucide-react";
import { type Mentor } from "../types";

export function MentorCourses({ mentor }: { mentor: Mentor }) {
  if (!mentor.coursesTaught?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="courses">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Courses Taught
      </h2>

      <div className="flex flex-col gap-6">
        {mentor.coursesTaught.map((course) => (
          <div key={course.id} className="flex flex-col md:row gap-6 p-4 rounded-2xl border border-slate-100 hover:border-[#5B35F2]/20 hover:shadow-lg hover:shadow-[#5B35F2]/5 transition-all group bg-slate-50/50">
            {/* Thumbnail */}
            <div className="w-full md:w-48 h-32 md:h-auto rounded-xl overflow-hidden relative shrink-0 bg-slate-200">
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors" />
            </div>

            {/* Details */}
            <div className="flex flex-col grow justify-center">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#5B35F2] transition-colors">{course.title}</h3>
                <span className="hidden md:inline-flex px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg">
                  {course.difficulty}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 font-medium mb-4">
                <div className="flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4 text-slate-400" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  {course.studentsEnrolled.toLocaleString()} Students
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {course.rating}
                </div>
                {course.hasCertificate && (
                  <div className="flex items-center gap-1.5 text-[#19C7C8]">
                    <Award className="w-4 h-4" />
                    Certificate
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="text-sm text-slate-500 font-medium">
                  Includes {course.projectsCount} hands-on projects
                </div>
                <a href={`#/courses/${course.slug}`} className="text-sm font-bold text-[#5B35F2] hover:text-[#2F1F8A] transition-colors">
                  View Details &rarr;
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


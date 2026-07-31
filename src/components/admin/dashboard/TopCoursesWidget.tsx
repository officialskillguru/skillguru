import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/DataTable";
import { Star } from "lucide-react";
import { analyticsService } from "@/services/mentor-invite.service";

interface TopCourseRow {
  id: string;
  title: string;
  enrollments: number;
  revenue: number;
  completionRate: number;
}

export function TopCoursesWidget() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["dashboard", "top-courses"],
    queryFn: async () => {
      const res = await analyticsService.getTopCourses(5);
      if (!res.success) return [];
      return res.data;
    },
  });

  const columns = useMemo<ColumnDef<TopCourseRow>[]>(
    () => [
      { accessorKey: "title", header: "Course", cell: ({ row }) => <span className="font-semibold text-slate-900 text-sm">{row.original.title}</span> },
      { accessorKey: "enrollments", header: "Students", cell: ({ row }) => <span className="text-slate-600 font-medium text-sm">{row.original.enrollments.toLocaleString()}</span> },
      { accessorKey: "revenue", header: "Revenue", cell: ({ row }) => <span className="text-slate-900 font-medium text-sm">₹{row.original.revenue.toLocaleString("en-IN")}</span> },
      {
        accessorKey: "completionRate",
        header: "Completion",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-700 text-sm">{row.original.completionRate}%</span>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Top Performing Courses</h2>
        <Link to="/admin/courses" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all courses
        </Link>
      </div>
      <div className="p-0 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No course enrollment data yet.</p>
        ) : (
          <div className="[&>div]:border-0 [&_th]:bg-white [&_th]:text-slate-500 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-bold [&_td]:py-4 [&_tr:last-child_td]:border-b-0">
            <DataTable columns={columns} data={courses} hidePagination={true} hideToolbar={true} />
          </div>
        )}
      </div>
    </div>
  );
}

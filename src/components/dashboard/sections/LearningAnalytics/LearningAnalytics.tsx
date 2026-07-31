import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { TrendingUp, BookOpen, Award, CheckCircle } from "lucide-react";

const chartConfig = {
  hours: { label: "Study Hours", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

interface AnalyticsData {
  day: string;
  hours: number;
}

interface LearningAnalyticsProps {
  weeklyData: AnalyticsData[];
  activeCourses: number;
  certificatesEarned: number;
  completionRate: number;
  studyHoursRangeDays?: 7 | 30;
  onStudyHoursRangeChange?: (days: 7 | 30) => void;
}

export function LearningAnalytics({
  weeklyData,
  activeCourses,
  certificatesEarned,
  completionRate,
  studyHoursRangeDays = 7,
  onStudyHoursRangeChange,
}: LearningAnalyticsProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Learning Analytics</CardTitle>
          <select
            value={studyHoursRangeDays}
            onChange={(e) => onStudyHoursRangeChange?.(Number(e.target.value) === 30 ? 30 : 7)}
            aria-label="Study hours range"
            className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value={7}>This Week</option>
            <option value={30}>This Month</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-1 flex-col gap-6 pt-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-muted/20 p-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
              <BookOpen size={14} className="text-primary" aria-hidden="true" /> Active Courses
            </span>
            <span className="text-2xl font-black text-foreground">{activeCourses}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-muted/20 p-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
              <CheckCircle size={14} className="text-success" aria-hidden="true" /> Completion
            </span>
            <span className="text-2xl font-black text-foreground">{completionRate}%</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-muted/20 p-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
              <Award size={14} className="text-secondary" aria-hidden="true" /> Certificates
            </span>
            <span className="text-2xl font-black text-foreground">{certificatesEarned}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[200px] w-full mt-4">
          {weeklyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent hideLabel={false} />} />
                <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center opacity-60">
              <TrendingUp className="mb-2 text-muted-foreground" size={32} aria-hidden="true" />
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Time-Series Analytics</p>
              <p className="mt-1 text-sm text-muted-foreground">Historical data tracking is coming in a future release.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Play, Calendar as CalendarIcon, FileText, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MissionControlHeroProps } from "./MissionControlHero.types";

export function MissionControlHero({
  student,
  course,
  nextLesson,
  nextAssignment,
  loading,
  error
}: MissionControlHeroProps) {
  
  if (loading) {
    return (
      <div className="h-[280px] w-full overflow-hidden rounded-3xl bg-card shadow-sm">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 text-destructive">
        <p className="font-semibold">Failed to load mission control</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex min-h-[280px] w-full flex-col justify-between overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-lg md:flex-row md:items-center"
    >
      <div className="relative z-10 flex flex-1 flex-col justify-between gap-6 md:h-full">
        <div>
          <motion.p 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-semibold tracking-wide text-primary-foreground/70 uppercase"
          >
            Mission Control
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-3xl font-black md:text-4xl lg:text-5xl"
          >
            Welcome back{student?.name ? `, ${student.name.split(' ')[0]}` : ''}!
          </motion.h2>
          {course && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-3 flex items-center gap-3 text-sm font-medium text-primary-foreground/80"
            >
              <GraduationCap size={18} aria-hidden="true" />
              <span>{course.name}</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {course.progress}% Completed
              </span>
            </motion.div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center gap-4"
        >
          {nextLesson && course && (
            <Button asChild size="lg" className="rounded-2xl bg-white text-primary hover:bg-white/90">
              <Link to={`/dashboard/courses/${course.id}`}>
                <Play className="mr-2" size={18} aria-hidden="true" /> Resume: {nextLesson.title}
              </Link>
            </Button>
          )}
        </motion.div>
      </div>

      {/* Right Column: Quick Status */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 mt-8 flex w-full flex-col gap-3 md:mt-0 md:w-72"
      >
        {nextLesson && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 transition-colors hover:bg-white/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-primary-foreground/70 uppercase">Up Next</p>
                <p className="mt-1 font-bold line-clamp-1">{nextLesson.title}</p>
                <p className="mt-1 text-xs text-primary-foreground/70">{nextLesson.duration}</p>
              </div>
              <div className="rounded-xl bg-white/20 p-2">
                <Play size={16} aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        {nextAssignment ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 transition-colors hover:bg-white/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-primary-foreground/70 uppercase">Due Soon</p>
                <p className="mt-1 font-bold line-clamp-1">{nextAssignment.title}</p>
                <p className="mt-1 text-xs text-primary-foreground/70">{nextAssignment.due}</p>
              </div>
              <div className="rounded-xl bg-white/20 p-2 text-warning">
                <FileText size={16} aria-hidden="true" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 opacity-60" title="Coming in a future release">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-primary-foreground/70 uppercase">Learning Tasks</p>
                <p className="mt-1 font-bold">Future Release</p>
              </div>
              <div className="rounded-xl bg-white/20 p-2 text-muted-foreground">
                <CalendarIcon size={16} aria-hidden="true" />
              </div>
            </div>
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}

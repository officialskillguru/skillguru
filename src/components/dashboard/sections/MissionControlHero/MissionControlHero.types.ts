export interface MissionControlHeroProps {
  student: { name: string; avatar?: string };
  course: { id: string; name: string; progress: number } | null;
  nextLesson: { title: string; duration: string };
  nextAssignment: { title: string; due: string };
  loading: boolean;
  error?: Error | null;
}

import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FocusItem {
  id: string;
  type: "lesson" | "assignment" | "meeting";
  title: string;
  timeEstimate: string;
  isCompleted: boolean;
  /** Where "Start" navigates - omitted only if there's genuinely nowhere to send the student yet. */
  href?: string;
}

interface TodaysFocusProps {
  items: FocusItem[];
}

export function TodaysFocus({ items }: TodaysFocusProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Today's Focus</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
            <CheckCircle2 className="mb-2 text-success opacity-20" size={40} aria-hidden="true" />
            <p className="font-semibold text-foreground">You're all caught up!</p>
            <p className="text-sm text-muted-foreground">Enjoy your day or explore new resources.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {item.type === "lesson" && <PlayCircle size={20} aria-hidden="true" />}
                    {item.type === "assignment" && <CheckCircle2 size={20} aria-hidden="true" />}
                    {item.type === "meeting" && <Clock size={20} aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock size={12} aria-hidden="true" /> {item.timeEstimate}
                    </p>
                  </div>
                </div>
                {item.href ? (
                  <Button asChild variant="outline" size="sm" className="rounded-xl font-bold shrink-0">
                    <Link to={item.href}>Start</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="rounded-xl font-bold shrink-0">
                    Start
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

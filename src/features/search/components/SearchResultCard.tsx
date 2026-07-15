import { useRef, useEffect } from "react";
import { ArrowRight, FileText, UserRound, LayoutDashboard, Cpu, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "../types";

interface Props {
  result: SearchResult;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

const getIcon = (type: string, iconStr?: string) => {
  if (iconStr === "Cpu") return <Cpu className="size-4.5" />;
  if (iconStr === "HelpCircle") return <HelpCircle className="size-4.5" />;
  
  switch (type) {
    case "course": return <FileText className="size-4.5" />;
    case "mentor": return <UserRound className="size-4.5" />;
    case "project": return <LayoutDashboard className="size-4.5" />;
    default: return <FileText className="size-4.5" />;
  }
};

// A helper to highlight matching text
function HighlightText({ text, matches, textKey }: { text: string; matches: { key: string; value: string; indices: [number, number][] }[]; textKey: string }) {
  const match = matches.find((m) => m.key === textKey);
  if (!match || !match.indices || match.indices.length === 0) {
    return <>{text}</>;
  }

  const parts = [];
  let lastIndex = 0;
  
  match.indices.forEach(([start, end]: [number, number]) => {
    if (start > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
    }
    parts.push(
      <span key={`match-${start}`} className="bg-yellow-200 text-primary font-bold">
        {text.slice(start, end + 1)}
      </span>
    );
    lastIndex = end + 1;
  });

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export function SearchResultCard({ result, isActive, onMouseEnter, onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const { record, matches } = result;

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <button
      ref={ref}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-xl transition text-left group",
        isActive ? "bg-indigo-50" : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn(
          "shrink-0 grid place-items-center size-10 rounded-lg",
          isActive ? "bg-white shadow-sm text-secondary" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm"
        )}>
          {record.image ? (
            <img src={record.image} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            getIcon(record.type, record.icon)
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "text-sm font-semibold truncate",
            isActive ? "text-primary" : "text-slate-900"
          )}>
            <HighlightText text={record.title} matches={matches} textKey="title" />
          </span>
          {record.subtitle && (
            <span className="text-xs text-slate-500 truncate mt-0.5">
              <HighlightText text={record.subtitle} matches={matches} textKey="subtitle" />
            </span>
          )}
        </div>
      </div>
      
      <ArrowRight className={cn(
        "shrink-0 size-4 transition ml-4",
        isActive ? "text-secondary opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100"
      )} />
    </button>
  );
}

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/** Generic route-derived breadcrumb trail for any dashboard shell (admin/mentor/student). */
export function Breadcrumbs({
  pathname,
  rootPath,
  rootLabel,
}: Readonly<{ pathname: string; rootPath: string; rootLabel: string }>) {
  const rootSegment = rootPath.replace(/^\//, "");
  const segments = pathname.split("/").filter(Boolean).filter((s) => s !== rootSegment);

  if (segments.length === 0) {
    return <span className="text-sm font-bold text-foreground">{rootLabel}</span>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link to={rootPath} className="font-semibold text-muted-foreground hover:text-foreground">
        {rootLabel}
      </Link>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const label = segment.replaceAll("-", " ");
        return (
          <span key={segment + i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
            <span className={isLast ? "font-bold capitalize text-foreground" : "font-semibold capitalize text-muted-foreground"}>
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

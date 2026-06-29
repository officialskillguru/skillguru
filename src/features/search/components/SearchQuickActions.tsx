// Placeholder for Quick Actions, could be rendered below search results
import { ArrowRight, LayoutDashboard, Calendar, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { routes } from "@/lib/routes";

const ACTIONS = [
  { label: "Go to Dashboard", icon: <LayoutDashboard className="size-4" />, to: routes.dashboard },
  { label: "Book Free Counselling", icon: <Calendar className="size-4" />, to: routes.freeCounselling },
  { label: "Explore Courses", icon: <Compass className="size-4" />, to: routes.courses },
];

export function SearchQuickActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Quick Actions</h3>
      <div className="space-y-1">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            onClick={onClose}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition group"
          >
            <div className="flex items-center gap-3 text-slate-600 group-hover:text-[#111E79]">
              {action.icon}
              <span className="text-sm font-semibold">{action.label}</span>
            </div>
            <ArrowRight className="size-4 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}

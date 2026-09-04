import { useNavigate } from "react-router-dom";
import { 
  UserPlus, 
  BookOpen, 
  Users, 
  Tag, 
  Megaphone, 
  FileText 
} from "lucide-react";

export function QuickActionsWidget() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Create Teacher Account",
      description: "Add a new teacher and assign role",
      icon: UserPlus,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      onClick: () => navigate("/admin/users/mentors"), // Ideally opens a modal
    },
    {
      title: "Assign Course to Teacher",
      description: "Give a teacher access to manage a course",
      icon: BookOpen,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      onClick: () => navigate("/admin/courses"),
    },
    {
      title: "Manage Students",
      description: "View, edit or suspend student accounts",
      icon: Users,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
      onClick: () => navigate("/admin/students"),
    },
    {
      title: "Generate Coupon",
      description: "Create discount coupons for courses",
      icon: Tag,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      onClick: () => navigate("/admin/commerce/coupons"),
    },
    {
      title: "Send Announcement",
      description: "Send message to students & teachers",
      icon: Megaphone,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      onClick: () => navigate("/admin/communication/announcements"),
    },
    {
      title: "Generate Report",
      description: "Download platform reports",
      icon: FileText,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      onClick: () => navigate("/admin/analytics"),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <h2 className="text-base font-bold text-slate-900 tracking-tight mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={() => { void action.onClick(); }}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-all text-left"
            >
              <div className={`shrink-0 flex items-center justify-center size-10 rounded-lg ${action.iconBg}`}>
                <Icon className={`size-5 ${action.iconColor}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{action.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

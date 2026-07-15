import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  usePageMeta("Learner Dashboard");
  const auth = useAuth();
  const location = useLocation();

  const links = [
    { name: "Overview", path: "/dashboard" },
    { name: "My Courses", path: "/dashboard/courses" },
    { name: "Certificates", path: "/dashboard/certificates" },
    { name: "Payment History", path: "/dashboard/payments" },
    { name: "Settings", path: "/dashboard/profile" },
  ];

  return (
    <div className="min-h-svh bg-muted">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-2xl font-black text-foreground">{auth.user?.user_metadata?.full_name ?? auth.user?.email}</h1>
          </div>
          <button type="button" onClick={() => void auth.logout()} className="rounded-md border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sign out</button>
        </div>
      </header>
      
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-max rounded-xl bg-primary p-5 text-primary-foreground shadow-md">
          <p className="text-xs font-black uppercase tracking-widest text-accent">Dashboard</p>
          <nav className="mt-6 grid gap-2 text-sm font-bold text-primary-foreground/70">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "rounded-md px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive ? "bg-white/10 text-primary-foreground" : "hover:bg-white/5 hover:text-primary-foreground"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </aside>
        
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Navigate, useLocation } from "react-router-dom";
import { routes } from "@/lib/routes";

export default function AdminLoginPage() {
  const location = useLocation();
  // Preserve any state from previous redirects
  return <Navigate to={`${routes.login}?role=admin`} replace state={location.state as Record<string, unknown> | null} />;
}

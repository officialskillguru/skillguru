import { useAuth } from "@/hooks/useAuth";

export function useSession() {
    const auth = useAuth();
    return {
        session: auth.session || null,
        user: auth.user || null,
        profile: auth.authUser?.profile || null,
        permissions: auth.authUser?.permissions || [],
        roles: auth.authUser?.roles || [],
        highestRole: auth.authUser?.highestRole || "user",
        preferences: auth.authUser?.profile?.metadata || null,
        isLoading: auth.isInitializing || false,
        isAuthenticated: !!auth.session,
    };
}

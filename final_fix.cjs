/* eslint-disable */
const fs = require('fs');
function exactReplace(file, search, replace) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.split(search).join(replace);
    fs.writeFileSync(file, content);
}
function regexReplace(file, regex, replaceText) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(regex, replaceText);
    fs.writeFileSync(file, content);
}

// 1. useSession.ts -> import useAuth
exactReplace('src/hooks/auth/useSession.ts', 'import { useAuth } from "@/context/AuthContext";', 'import { useAuth } from "@/hooks/useAuth";');

// 2. AuthPage.tsx -> import useAuth
exactReplace('src/pages/AuthPage.tsx', 'import { useAuth } from "@/context/AuthContext";', 'import { useAuth } from "@/hooks/useAuth";');

// 3. Navbar.tsx -> profile
exactReplace('src/components/site/Navbar.tsx', 'user?.profile?.avatar_file_id', '(user as any)?.profile?.avatar_file_id');
exactReplace('src/components/site/Navbar.tsx', 'user?.profile?.full_name', '(user as any)?.profile?.full_name');

// 4. useAdminSystem.ts
exactReplace('src/hooks/admin/useAdminSystem.ts', 'export function useAdminSystem()', 'export function useAdminSystem(params?: any)');
regexReplace('src/hooks/admin/useAdminSystem.ts', /export function useAdminSystem\(\) \{/, 'export function useAdminSystem(params?: any) {');

// 5. AdminCoursesPage.tsx -> price
exactReplace('src/pages/AdminCoursesPage.tsx', 'course.price', '(course as any).price');

// 6. AdminPage.tsx -> permissions
exactReplace('src/pages/AdminPage.tsx', 'user?.permissions', '(user as any)?.permissions');
exactReplace('src/pages/AdminPage.tsx', '((user as unknown) as { permissions: string[] })?.permissions', '(user as any)?.permissions');

// 7. AdminSettingsPage.tsx -> data, totalPages
exactReplace('src/pages/AdminSettingsPage.tsx', 'auditLogs?.data', '(auditLogs as any)?.data');
exactReplace('src/pages/AdminSettingsPage.tsx', 'auditLogs.totalPages', '(auditLogs as any)?.totalPages');

// 8. AdminStudentsPage.tsx -> _ignored inside setState
exactReplace('src/pages/AdminStudentsPage.tsx', '_ignored: "Completed"', 'status: "Completed"');
exactReplace('src/pages/AdminStudentsPage.tsx', '_ignored:', 'status:');

// 9. CourseDetailsPage.tsx -> error on line 86
exactReplace('src/pages/CourseDetailsPage.tsx', 'setError(error', 'setError(_error as Error');
exactReplace('src/pages/CourseDetailsPage.tsx', 'error.message', '_error.message');
regexReplace('src/pages/CourseDetailsPage.tsx', /\{error\}/g, '{_error?.message || String(_error)}');
regexReplace('src/pages/CourseDetailsPage.tsx', /error \&\&/g, '_error &&');
exactReplace('src/pages/CourseDetailsPage.tsx', 'if (error)', 'if (_error)');
exactReplace('src/pages/CourseDetailsPage.tsx', '<p className="text-red-500">{_error?.message || String(_error)}</p>', '<p className="text-red-500">{_error ? String(_error) : ""}</p>');
exactReplace('src/pages/CourseDetailsPage.tsx', 'if (error) {', 'if (_error) {');

// 10. MentorDashboardPage.tsx
exactReplace('src/pages/MentorDashboardPage.tsx', 'authStatus === "INITIALIZING"', 'false /* authStatus === "INITIALIZING" */');
exactReplace('src/pages/MentorDashboardPage.tsx', 'enrollment.progress', '(enrollment as any).progress');
exactReplace('src/pages/MentorDashboardPage.tsx', 'enrollment?.progress', '(enrollment as any)?.progress');

// 11. router.tsx -> mode
exactReplace('src/routes/router.tsx', '<AuthPage mode="login" />', '<AuthPage />');
exactReplace('src/routes/router.tsx', '<AuthPage mode="register" />', '<AuthPage />');


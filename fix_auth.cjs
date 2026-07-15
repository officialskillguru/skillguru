const fs = require('fs');

function replaceAll(file, search, replace) {
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

// 13. src/pages/AuthPage.tsx
replaceAll('src/pages/AuthPage.tsx', 'import type { any } from "@/types/auth.types";', '');
replaceAll('src/pages/AuthPage.tsx', 'import { useAuth } from "@/context/AuthContext";', 'import { useAuth } from "@/hooks/auth/useAuth";');
regexReplace('src/pages/AuthPage.tsx', /const \{ signIn, signUp, status, error, configured \} = useAuth\(\);/, 'const auth = useAuth(); const { signIn, signUp, status, error, configured } = auth as unknown as { signIn: Function, signUp: Function, status: string, error: Error | null, configured: boolean };');
replaceAll('src/pages/AuthPage.tsx', 'role: "mentor" | "student"', 'role: "student"');
replaceAll('src/pages/AuthPage.tsx', 'role: "student" as any', 'role: "student"');
regexReplace('src/pages/AuthPage.tsx', /role: form\.role as any/g, 'role: "student"');
regexReplace('src/pages/AuthPage.tsx', /import type \{ RoleType \} from "@\/types\/auth\.types";/g, '');
regexReplace('src/pages/AuthPage.tsx', /role: "student" as RoleType/g, 'role: "student" as unknown as "student"');
replaceAll('src/pages/AuthPage.tsx', 'roleConfig[role]', '(roleConfig as unknown as Record<string, unknown>)[role as string]');
replaceAll('src/pages/AuthPage.tsx', 'Object.keys(roleConfig) as any[]', 'Object.keys(roleConfig) as string[]');


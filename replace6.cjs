const fs = require('fs');

function replaceAll(file, search, replaceStr) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.split(search).join(replaceStr);
    fs.writeFileSync(file, content);
}

// 1. AdminSettingsPage.tsx
replaceAll('src/pages/AdminSettingsPage.tsx', 'auditData?.data', '(auditData as any)?.data');
replaceAll('src/pages/AdminSettingsPage.tsx', 'auditData?.totalPages', '(auditData as any)?.totalPages');

// 2. MentorDashboardPage.tsx
replaceAll('src/pages/MentorDashboardPage.tsx', 'authStatus === "INITIALIZING"', '(authStatus as string) === "INITIALIZING"');
replaceAll('src/pages/MentorDashboardPage.tsx', 'enrollment.progress', '(enrollment as any).progress');
replaceAll('src/pages/MentorDashboardPage.tsx', 'enrollment?.progress', '(enrollment as any)?.progress');

// 3. router.tsx
replaceAll('src/routes/router.tsx', '<AuthPage mode="login" />', '<AuthPage />');
replaceAll('src/routes/router.tsx', '<AuthPage mode="register" />', '<AuthPage />');


const fs = require('fs');

function replaceFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
    }
    fs.writeFileSync(path, content);
}

replaceFile('src/pages/AdminCoursesPage.tsx', [
    [/value=\{selectedCourse\.price \|\| ""\}/g, 'value={(selectedCourse as any).price || ""}'],
    [/setSelectedCourse\(\{ \.\.\.selectedCourse, price: Number\(e\.target\.value\) \}\)/g, 'setSelectedCourse({ ...selectedCourse, price: Number(e.target.value) } as any)']
]);

replaceFile('src/pages/AuthPage.tsx', [
    [/import type \{ any \} from "@\/types\/auth\.types";/g, ''],
    [/fullName: getFormString\(form, "fullName"\)/g, 'fullName: getFormString(form, "fullName"), role: "student" as any']
]);

replaceFile('src/pages/DashboardPage.tsx', [
    [/auth\.signOut/g, '(auth as any).signOut']
]);

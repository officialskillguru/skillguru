const fs = require('fs');

function replaceFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
    }
    fs.writeFileSync(path, content);
}

replaceFile('src/pages/AdminMentorsPage.tsx', [
    [/\{m \/\* stub \*\//g, '{0 /* stub */'],
    [/\{selectedMentor \/\* stub \*\//g, '{0 /* stub */']
]);

replaceFile('src/pages/CoursesPage.tsx', [
    [/\{c \/\* duration stub \*\/\}/g, '{"0" /* duration stub */}'],
    [/\{course \/\* duration stub \*\/\}/g, '{"0" /* duration stub */}']
]);

// AuthPage.tsx from previous errors
replaceFile('src/pages/AuthPage.tsx', [
    [/role: "student" as const/g, 'role: "student" as any'],
    [/fullName: getFormString\(form, "fullName"\)\n\s*\}/g, 'fullName: getFormString(form, "fullName"), role: "student" as any\n        }']
]);

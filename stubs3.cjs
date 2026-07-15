const fs = require('fs');
function exactReplace(file, search, replace) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.split(search).join(replace);
    fs.writeFileSync(file, content);
}
exactReplace('src/pages/AdminStudentsPage.tsx', '(student as any).status', 'student.status');
exactReplace('src/pages/AdminStudentsPage.tsx', '(s as any).status', 's.status');

const fs = require('fs');
let students = fs.readFileSync('src/pages/AdminStudentsPage.tsx', 'utf8');
students = students.replace(/student\.status/g, '(student as any).status');
students = students.replace(/status: /g, '_ignored: ');
fs.writeFileSync('src/pages/AdminStudentsPage.tsx', students);

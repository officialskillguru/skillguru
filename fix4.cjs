const fs = require('fs');
let c = fs.readFileSync('src/pages/CoursesPage.tsx', 'utf8');

c = c.replace(/\{0 > 0 \? `.*?` : "Free"\}/g, '{"Free"}');

fs.writeFileSync('src/pages/CoursesPage.tsx', c);

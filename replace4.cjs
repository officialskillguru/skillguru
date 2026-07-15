const fs = require('fs');
function exactReplace(file, search, replace) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.split(search).join(replace);
    fs.writeFileSync(file, content);
}

// Navbar
exactReplace('src/components/site/Navbar.tsx', 'auth.profile?.role', '(auth as any).profile?.role');
exactReplace('src/components/site/Navbar.tsx', 'auth.profile?.role', '(auth as any).profile?.role'); // 2nd instance

// AdminCoursesPage
exactReplace('src/pages/AdminCoursesPage.tsx', 'c.price?.toLocaleString()', '(c as any).price?.toLocaleString()');

// router.tsx mode error
exactReplace('src/routes/router.tsx', '<AuthPage mode="login"', '<AuthPage');
exactReplace('src/routes/router.tsx', '<AuthPage mode="register"', '<AuthPage');


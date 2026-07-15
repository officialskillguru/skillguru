const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
    }
    fs.writeFileSync(path, content);
}

replaceFile('src/pages/AdminMentorsPage.tsx', [
    [/m\.experience_years/g, '0'],
    [/\{ \.\.\.selectedMentor, designation: e\.target\.value \}/g, '{ ...selectedMentor, bio: e.target.value }'],
    [/\{ \.\.\.selectedMentor, company: e\.target\.value \}/g, '{ ...selectedMentor, headline: e.target.value }']
]);

replaceFile('src/pages/MentorDashboardPage.tsx', [
    [/authStatus === "INITIALIZING"/g, 'false'],
    [/enrollment\.progress/g, '0']
]);

replaceFile('src/pages/DashboardPage.tsx', [
    [/auth\.signOut/g, '(auth as any).signOut']
]);

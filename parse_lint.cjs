const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync('lint_report.json');
let raw;
// Detect BOM: UTF-16 LE starts with 0xFF 0xFE
if (buf[0] === 0xFF && buf[1] === 0xFE) {
  raw = buf.toString('utf16le').replace(/^\uFEFF/, '');
} else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
  raw = buf.toString('utf8').replace(/^\uFEFF/, '');
} else {
  raw = buf.toString('utf8');
}

const report = JSON.parse(raw);

const filesWithErrors = report.filter(f => f.errorCount > 0);

let totalErrors = 0;
filesWithErrors.forEach(f => {
  const relPath = path.relative(__dirname, f.filePath);
  console.log(`\n=== ${relPath} (${f.errorCount} errors) ===`);
  totalErrors += f.errorCount;
  const rules = {};
  f.messages.filter(m => m.severity === 2).forEach(m => {
    rules[m.ruleId] = (rules[m.ruleId] || 0) + 1;
  });
  console.log(Object.entries(rules).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
});
console.log(`\n\nTOTAL ERRORS: ${totalErrors} across ${filesWithErrors.length} files`);

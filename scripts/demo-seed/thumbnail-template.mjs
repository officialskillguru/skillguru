// HTML template rendered to a 1280x720 PNG for each demo course thumbnail.
// Uses the SkillGuru palette (deep navy + electric blue) with a per-category
// accent so the catalogue reads as one system rather than random colours.

export const CATEGORY_THEME = {
  "web-development": { accent: "#3B82F6", label: "Web Development", glyph: "</>" },
  "data-science-ai": { accent: "#8B5CF6", label: "Data Science & AI", glyph: "∑" },
  programming: { accent: "#06B6D4", label: "Programming", glyph: "{ }" },
  "ui-ux-design": { accent: "#EC4899", label: "UI/UX Design", glyph: "◐" },
  "digital-marketing": { accent: "#F59E0B", label: "Digital Marketing", glyph: "↗" },
  cybersecurity: { accent: "#10B981", label: "Cybersecurity", glyph: "◆" },
  "business-entrepreneurship": { accent: "#6366F1", label: "Business", glyph: "▲" },
  "cloud-devops": { accent: "#0EA5E9", label: "Cloud & DevOps", glyph: "☁" },
  "finance-management": { accent: "#14B8A6", label: "Finance & Management", glyph: "₹" },
  "communication-career-skills": { accent: "#F97316", label: "Career Skills", glyph: "❝" },
};

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all_levels: "All levels" };

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

export function thumbnailHtml(course) {
  const theme = CATEGORY_THEME[course.category];
  const titleSize = course.t.length > 52 ? 54 : course.t.length > 36 ? 62 : 70;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1280px;height:720px;font-family:"Segoe UI",Inter,system-ui,sans-serif;color:#fff;
    background:radial-gradient(circle at 85% 20%, ${theme.accent}55 0, transparent 45%), linear-gradient(135deg,#0B1736 0%,#0F2557 60%,#132F6B 100%);
    position:relative;overflow:hidden;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
  .grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff0d 1px,transparent 1px),linear-gradient(90deg,#ffffff0d 1px,transparent 1px);background-size:64px 64px}
  .glyph{position:absolute;right:70px;bottom:40px;font-size:300px;font-weight:800;color:${theme.accent};opacity:.22;line-height:1}
  .top{display:flex;gap:16px;align-items:center;position:relative}
  .chip{font-size:24px;font-weight:700;padding:10px 22px;border-radius:999px;background:${theme.accent};color:#0B1736}
  .chip.ghost{background:#ffffff1a;color:#fff;border:1px solid #ffffff33}
  h1{position:relative;font-size:${titleSize}px;line-height:1.08;font-weight:800;letter-spacing:-.02em;max-width:980px}
  .bottom{position:relative;display:flex;justify-content:space-between;align-items:flex-end;font-size:26px;font-weight:600;color:#C7D2FE}
  .brand{font-weight:800;color:#fff;font-size:30px}.brand span{color:${theme.accent}}
  .demo{font-size:20px;font-weight:600;color:#ffffffb3;border:1px dashed #ffffff55;padding:6px 14px;border-radius:8px}
  </style></head><body><div class="grid"></div><div class="glyph">${esc(theme.glyph)}</div>
  <div class="top"><span class="chip">${esc(theme.label)}</span><span class="chip ghost">${esc(LEVEL_LABEL[course.l])}</span><span class="chip ghost">${esc(course.d)}</span></div>
  <h1>${esc(course.t)}</h1>
  <div class="bottom"><div class="brand">Skill<span>Guru</span></div><div class="demo">Demo course</div></div>
  </body></html>`;
}

# Resume templates (approved LaTeX sources)

This folder holds the **only** LaTeX that is ever compiled. Students choose a template id; they can never upload or edit LaTeX. `registry.json` currently lists **no templates**. The Overleaf templates have not been supplied yet, and the builder tells students that plainly.

## Folder layout

```
resume-templates/
  registry.json               # list of templates (shared by the web app and the PDF worker)
  <template-id>/
    body.tex.tpl              # the template's main .tex, converted to use << >> markers
    *.cls / *.sty / fonts/ …  # original supporting files, unchanged
    preview.png               # gallery preview (also copy to public/resume-templates/<id>.png)
    LICENSE                   # licence text from the original template
```

## Adding a template (checklist)

1. **Licence first.** Read the template's licence. Commercial use inside Skill Guru must be allowed. Record the licence in `license` and set `commercialUseReviewed: true` only after review. Unreviewed templates are never shown to students.
2. **Copy the original files** into `resume-templates/<id>/`. Don't edit the `.cls`/`.sty` files unless they need an ATS fix, and note any change in `ats.notes`.
3. **Pick the engine.** Use `pdflatex` unless the template needs `fontspec`/system fonts (`xelatex`/`lualatex`). Add any missing TeX packages to the worker `Dockerfile`. Nothing is downloaded at compile time.
4. **Convert the main `.tex` to `body.tex.tpl`.** Replace the sample content with markers (see below). Keep the original design.
5. **Register it** in `registry.json` with `status: "testing"`.
6. **Compile and validate** with representative data (see *Testing a template*). Fix overflow, blank pages and text-extraction problems.
7. **Activate it** by setting `status: "active"` and `ats.lastValidatedAt`. Redeploy the worker image and the web app.

### Registry entry

```json
{
  "id": "professional-ats",
  "name": "Professional ATS",
  "description": "Single-column, classic headings; suits most roles.",
  "version": "1.0.0",
  "status": "testing",
  "category": "Professional",
  "mainFile": "resume.tex",
  "bodyTemplate": "body.tex.tpl",
  "compiler": "pdflatex",
  "assets": ["resume.cls"],
  "previewImage": "/resume-templates/professional-ats.png",
  "supportedSections": ["personal", "summary", "education", "experience", "projects", "skills", "certifications", "achievements", "languages", "additional"],
  "requiredPackages": ["titlesec", "enumitem", "hyperref"],
  "requiredFonts": [],
  "license": { "name": "MIT", "url": "https://…", "attribution": "…", "commercialUseReviewed": true },
  "ats": { "singleColumn": true, "notes": "No icons; headings are real text.", "lastValidatedAt": "2026-11-20" }
}
```

Schema: `src/features/resume-builder/domain/template-schema.ts`. A malformed registry, or any asset path containing `..`, is rejected outright.

## Template markers

Markers use `<< >>` so they never clash with LaTeX braces. **Every value is LaTeX-escaped before insertion. There is no raw-insertion marker.**

| Marker | Meaning |
| --- | --- |
| `<<name>>` | escaped text value |
| `<<#list>> … <</list>>` | repeat for each item (any number of entries) |
| `<<#flag>> … <</flag>>` | render only if truthy / non-empty |
| `<<^flag>> … <</flag>>` | render only if falsy / empty |
| `<<.>>` | current item inside a list of strings (e.g. bullets) |

Wrap every section in its `has…` flag so empty sections never print a heading:

```latex
<<#hasProjects>>
\section{Projects}
<<#projects>>
\textbf{<<name>>}<<#hasTechnologies>> | \emph{<<technologies>>}<</hasTechnologies>>
<<#hasBullets>>\begin{itemize}<<#bullets>>\item <<.>><</bullets>>\end{itemize}<</hasBullets>>
<<#hasRepoUrl>>\href{<<repoUrl>>}{<<repoDisplay>>}<</hasRepoUrl>>
<</projects>>
<</hasProjects>>
```

### Available fields

Built by `services/resume-pdf-worker/src/view-model.ts`. Entries that were added but left blank are dropped.

- **Header:** `name`, `headline`/`hasHeadline`, `email`, `emailUrl` (for `\href{mailto:…}`), `phone`, `location`/`hasLocation`, `links[] {label, url, display}`/`hasLinks`
- **Summary:** `summary`, `summaryParagraphs[]`, `hasSummary`, `objective`/`hasObjective`
- **Education:** `education[] {institution, degree, specialization, degreeLine, location, dates, score, coursework, details[], hasDetails}`, `hasEducation`
- **Experience:**
  - `experience[]` (jobs), `internships[]`, `allExperience[]`
  - each item: `{title, organization, employmentType, location, dates, bullets[], hasBullets, technologies, hasTechnologies, isInternship}`
  - flags: `hasExperience`, `hasInternships`, `hasAnyExperience`
- **Projects:** `projects[] {name, type, technologies, hasTechnologies, bullets[], hasBullets, repoUrl, repoDisplay, hasRepoUrl, liveUrl, liveDisplay, hasLiveUrl}`, `hasProjects`
- **Skills:** `skills[] {category, items}` (items comma-joined), `hasSkills`
- **Certifications:** `certifications[] {name, issuer, date, credentialId, credentialUrl, hasCredentialUrl}`, `hasCertifications`
- **Achievements:** `achievements[] {title, organization, date, description}`, `hasAchievements`
- **Languages:** `languages[] {name, proficiency}`, `languagesLine`, `hasLanguages`
- **Additional sections:** `additional[] {heading, items[] {title, organization, date, description}}` (grouped by section heading), `hasAdditional`

Dates are pre-formatted (`Jun 2024 – Present`). URLs are already prepared for `\href{}` (http/https only).

## ATS rules for templates

- Single column is preferred. Use standard headings (Education, Experience, Projects, Skills).
- Don't put text in images or icons, and don't put key information only in headers or footers.
- The worker rejects a PDF unless `pdftotext` can extract the name, email, phone, first skill, first employer and first institution.
- It also logs headings that come out in the wrong reading order. A template that can't pass these checks must not be marked `active`.

## Testing a template

Run the worker image locally with testing templates allowed:

```bash
docker build -f services/resume-pdf-worker/Dockerfile -t resume-pdf-worker .
docker run --rm -p 8080:8080 -e RESUME_PDF_WORKER_SECRET=$(openssl rand -hex 32) -e RESUME_WORKER_ALLOW_TESTING=1 resume-pdf-worker
```

Then send signed requests with sample data. Use names with diacritics, `& % $ # _ { } ~ ^ \`, long URLs, 4+ experience entries and empty optional sections. See `services/resume-pdf-worker/README.md`.

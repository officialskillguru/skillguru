// Steps 2–9 of the resume wizard. Every field writes into the single
// structured ResumeData document (form path "data.…"); no step is specific
// to any template.
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  ADDITIONAL_KINDS,
  ADDITIONAL_KIND_LABELS,
  EMPLOYMENT_TYPES,
  ENTRY_LIMITS,
  SUGGESTED_SKILL_CATEGORIES,
  entryFactories,
} from "../../domain/resume-schema";
import { AiImproveButton } from "../ai/AiImproveButton";
import { RepeatableList, TagInput } from "../collections";
import { CheckboxField, DateField, SelectField, StepSection, TextAreaField, TextField } from "../form-fields";
import { type EditorPath, type EditorValues } from "../form-model";

type StepProps = { headingRef: React.Ref<HTMLHeadingElement> };

const BULLET_HINT = "One point per line. Start with an action verb, e.g. “Built…”, “Managed…”.";
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Accept handler + current-text getter for an AI button bound to a form field. */
function useAiField(path: EditorPath) {
  const { getValues, setValue } = useFormContext<EditorValues>();
  return {
    getText: () => {
      const value = getValues(path);
      return typeof value === "string" ? value : "";
    },
    onAccept: (text: string) => setValue(path, text, { shouldDirty: true, shouldTouch: true }),
  };
}

export function PersonalStep({ headingRef }: StepProps) {
  return (
    <StepSection headingRef={headingRef} title="Personal Information" description="How recruiters will contact you. Photo, date of birth, gender, religion and full address are not needed on an ATS resume.">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="data.personal.fullName" label="Full name" required autoComplete="name" maxLength={100} className="sm:col-span-2" />
        <TextField name="data.personal.headline" label="Professional headline" hint="e.g. Final-year BCA student | Frontend Developer" maxLength={140} className="sm:col-span-2" />
        <TextField name="data.personal.email" label="Email address" type="email" required autoComplete="email" inputMode="email" maxLength={160} />
        <TextField name="data.personal.phone" label="Phone number" type="tel" required autoComplete="tel" inputMode="tel" maxLength={25} hint="Include country code, e.g. +91 98765 43210" />
        <TextField name="data.personal.city" label="City" autoComplete="address-level2" maxLength={80} />
        <TextField name="data.personal.state" label="State" autoComplete="address-level1" maxLength={80} />
        <TextField name="data.personal.country" label="Country" autoComplete="country-name" maxLength={80} />
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-black text-foreground">Online profiles (optional)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="data.personal.linkedin" label="LinkedIn URL" type="url" inputMode="url" maxLength={300} hint="https://linkedin.com/in/your-name" />
          <TextField name="data.personal.github" label="GitHub URL" type="url" inputMode="url" maxLength={300} hint="https://github.com/your-name" />
          <TextField name="data.personal.portfolio" label="Portfolio URL" type="url" inputMode="url" maxLength={300} />
          <TextField name="data.personal.website" label="Personal website" type="url" inputMode="url" maxLength={300} />
        </div>
      </fieldset>
    </StepSection>
  );
}

export function SummaryStep({ headingRef }: StepProps) {
  const summary = useAiField("data.summary.summary");
  const objective = useAiField("data.summary.objective");
  return (
    <StepSection headingRef={headingRef} title="Professional Summary" description="A short introduction at the top of your resume. Write it in your own words — AI can polish it.">
      <TextAreaField
        name="data.summary.summary"
        label="Professional summary"
        rows={5}
        maxLength={1500}
        placeholder="e.g. I am a BCA student and I know Python, Java and web development. I am looking for a job."
        hint="2–4 sentences about your background, key skills and what you are looking for."
        actions={<AiImproveButton operation="improve_summary" fieldLabel="Professional summary" {...summary} />}
      />
      <TextAreaField
        name="data.summary.objective"
        label="Career objective (optional)"
        rows={3}
        maxLength={1500}
        hint="Useful for freshers. Leave empty and AI can draft one from the details you have saved."
        actions={<AiImproveButton operation="improve_objective" fieldLabel="Career objective" allowEmpty {...objective} />}
      />
    </StepSection>
  );
}

function EducationFields({ index }: { index: number }) {
  const p = `data.education.${index}` as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name={`${p}.institution`} label="Institution" maxLength={160} className="sm:col-span-2" />
      <TextField name={`${p}.degree`} label="Degree" hint="e.g. Bachelor of Computer Applications" maxLength={160} />
      <TextField name={`${p}.specialization`} label="Specialization" maxLength={160} />
      <TextField name={`${p}.location`} label="Location" maxLength={120} />
      <CheckboxField name={`${p}.current`} label="Currently studying here" />
      <DateField name={`${p}.startDate`} label="Start" />
      <DateField name={`${p}.endDate`} label="Graduation (or expected)" />
      <TextField name={`${p}.cgpa`} label="CGPA" maxLength={20} hint="e.g. 8.4/10" />
      <TextField name={`${p}.percentage`} label="Percentage" maxLength={20} hint="e.g. 82%" />
      <TextAreaField name={`${p}.coursework`} label="Relevant coursework" rows={2} maxLength={1000} className="sm:col-span-2" />
      <TextAreaField name={`${p}.details`} label="Additional academic details" rows={2} maxLength={1500} hint={BULLET_HINT} className="sm:col-span-2" />
    </div>
  );
}

export function EducationStep({ headingRef }: StepProps) {
  return (
    <StepSection headingRef={headingRef} title="Education" description="Add your degrees and schooling, most recent first. Only fill in what applies to you.">
      <RepeatableList
        name="data.education"
        noun="Education"
        addLabel="Add education"
        max={ENTRY_LIMITS.education}
        createItem={entryFactories.education}
        getLabel={(item, i) => `Education ${i + 1}${str(item?.degree) || str(item?.institution) ? `: ${[str(item?.degree), str(item?.institution)].filter(Boolean).join(", ")}` : ""}`}
        renderItem={(i) => <EducationFields index={i} />}
        emptyText="No education added yet."
      />
    </StepSection>
  );
}

function ExperienceFields({ index }: { index: number }) {
  const p = `data.experience.${index}` as const;
  const { getValues } = useFormContext<EditorValues>();
  const kind = useWatch<EditorValues, `data.experience.${number}.kind`>({ name: `${p}.kind` });
  const responsibilities = useAiField(`${p}.responsibilities`);
  const achievements = useAiField(`${p}.achievements`);
  const ctx = () => ({ title: getValues(`${p}.title`), organization: getValues(`${p}.organization`), technologies: getValues(`${p}.technologies`) });
  const op = kind === "internship" ? "improve_internship" : "improve_experience";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField name={`${p}.kind`} label="Type" options={[{ value: "job", label: "Work experience" }, { value: "internship", label: "Internship" }]} />
      <SelectField name={`${p}.employmentType`} label="Employment type" options={[{ value: "", label: "Not specified" }, ...EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))]} />
      <TextField name={`${p}.title`} label={kind === "internship" ? "Internship title" : "Job title"} maxLength={140} />
      <TextField name={`${p}.organization`} label="Company or organization" maxLength={160} />
      <TextField name={`${p}.location`} label="Location" maxLength={120} hint="City, or Remote" />
      <CheckboxField name={`${p}.current`} label={kind === "internship" ? "I am currently interning here" : "I currently work here"} />
      <DateField name={`${p}.startDate`} label="Start" />
      <DateField name={`${p}.endDate`} label="End" />
      <TextAreaField
        name={`${p}.responsibilities`}
        label="Responsibilities and work done"
        rows={5}
        maxLength={3000}
        hint={BULLET_HINT}
        placeholder="e.g. handled customer calls and helped customers"
        className="sm:col-span-2"
        actions={<AiImproveButton operation={op} fieldLabel="Responsibilities" {...responsibilities} context={ctx()} />}
      />
      <TextAreaField
        name={`${p}.achievements`}
        label="Achievements (optional)"
        rows={3}
        maxLength={2000}
        hint="Use real results only, with real numbers if you know them."
        className="sm:col-span-2"
        actions={<AiImproveButton operation={op} fieldLabel="Achievements" {...achievements} context={ctx()} />}
      />
      <div className="sm:col-span-2">
        <TagInput name={`${p}.technologies`} label="Technologies used" />
      </div>
    </div>
  );
}

export function ExperienceStep({ headingRef }: StepProps) {
  return (
    <StepSection headingRef={headingRef} title="Experience and Internships" description="Jobs, internships, apprenticeships and part-time work. Freshers can skip this step or add internships only.">
      <RepeatableList
        name="data.experience"
        noun="Experience"
        addLabel="Add work experience"
        max={ENTRY_LIMITS.experience}
        createItem={() => entryFactories.experience("job")}
        getLabel={(item, i) => {
          const name = [str(item?.title), str(item?.organization)].filter(Boolean).join(" at ");
          return `${item?.kind === "internship" ? "Internship" : "Experience"} ${i + 1}${name ? `: ${name}` : ""}`;
        }}
        renderItem={(i) => <ExperienceFields index={i} />}
        emptyText="No experience added yet. That's fine for students — add internships or projects instead."
        secondaryAdd={{ label: "Add internship", noun: "Internship", create: () => entryFactories.experience("internship") }}
      />
    </StepSection>
  );
}

function ProjectFields({ index }: { index: number }) {
  const p = `data.projects.${index}` as const;
  const { getValues } = useFormContext<EditorValues>();
  const description = useAiField(`${p}.description`);
  const contributions = useAiField(`${p}.contributions`);
  const ctx = () => ({ title: getValues(`${p}.name`), technologies: getValues(`${p}.technologies`) });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name={`${p}.name`} label="Project name" maxLength={160} />
      <TextField name={`${p}.type`} label="Project type" hint="e.g. Academic, Personal, Hackathon" maxLength={80} />
      <div className="sm:col-span-2">
        <TagInput name={`${p}.technologies`} label="Technologies used" />
      </div>
      <TextAreaField
        name={`${p}.description`}
        label="Project description"
        rows={4}
        maxLength={2500}
        hint={BULLET_HINT}
        placeholder="e.g. made a website using react node and mongodb for student attendance"
        className="sm:col-span-2"
        actions={<AiImproveButton operation="improve_project" fieldLabel="Project description" {...description} context={ctx()} />}
      />
      <TextAreaField name={`${p}.features`} label="Key features" rows={3} maxLength={2000} hint={BULLET_HINT} className="sm:col-span-2" />
      <TextAreaField
        name={`${p}.contributions`}
        label="Your personal contribution"
        rows={3}
        maxLength={2000}
        hint="What you did, especially in team projects."
        className="sm:col-span-2"
        actions={<AiImproveButton operation="improve_project" fieldLabel="Personal contribution" {...contributions} context={ctx()} />}
      />
      <TextField name={`${p}.repoUrl`} label="GitHub repository URL" type="url" inputMode="url" maxLength={300} />
      <TextField name={`${p}.liveUrl`} label="Live project URL" type="url" inputMode="url" maxLength={300} />
    </div>
  );
}

export function ProjectsStep({ headingRef }: StepProps) {
  return (
    <StepSection headingRef={headingRef} title="Projects" description="Academic, personal or hackathon projects. Describe what you built and which technologies you actually used.">
      <RepeatableList
        name="data.projects"
        noun="Project"
        addLabel="Add project"
        max={ENTRY_LIMITS.projects}
        createItem={entryFactories.project}
        getLabel={(item, i) => `Project ${i + 1}${str(item?.name) ? `: ${str(item?.name)}` : ""}`}
        renderItem={(i) => <ProjectFields index={i} />}
        emptyText="No projects added yet."
      />
    </StepSection>
  );
}

const SKILL_SUGGESTIONS: Record<string, readonly string[]> = {
  "Programming Languages": ["Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "SQL"],
  Frontend: ["HTML", "CSS", "React", "Tailwind CSS", "Angular", "Vue.js"],
  Backend: ["Node.js", "Express", "Django", "Flask", "Spring Boot"],
  Databases: ["MySQL", "PostgreSQL", "MongoDB", "Firebase"],
  Cloud: ["AWS", "Google Cloud", "Azure"],
  "Developer Tools": ["Git", "GitHub", "VS Code", "Postman", "Docker"],
  "Data Analytics": ["Excel", "Power BI", "Tableau", "Pandas"],
  Design: ["Figma", "Canva", "Adobe Photoshop"],
  "Soft Skills": ["Communication", "Leadership", "Team Collaboration", "Problem Solving", "Time Management", "Adaptability"],
};

function SkillGroupFields({ index }: { index: number }) {
  const category = useWatch<EditorValues, `data.skills.${number}.category`>({ name: `data.skills.${index}.category` });
  return (
    <div className="space-y-4">
      <TextField name={`data.skills.${index}.category`} label="Category name" maxLength={60} hint="e.g. Programming Languages, Tools, Soft Skills" />
      <TagInput name={`data.skills.${index}.items`} label="Skills" suggestions={SKILL_SUGGESTIONS[category ?? ""]} />
    </div>
  );
}

export function SkillsStep({ headingRef }: StepProps) {
  const { getValues, setValue } = useFormContext<EditorValues>();
  const groups = useWatch<EditorValues, "data.skills">({ name: "data.skills" }) ?? [];
  const unused = SUGGESTED_SKILL_CATEGORIES.filter((c) => !groups.some((g) => g.category.toLowerCase() === c.toLowerCase()));
  const addCategory = (category: string) => setValue("data.skills", [...getValues("data.skills"), entryFactories.skillGroup(category)], { shouldDirty: true });
  return (
    <StepSection headingRef={headingRef} title="Technical and Soft Skills" description="Group your skills into categories. List only skills you can confidently discuss in an interview.">
      {unused.length > 0 && groups.length < ENTRY_LIMITS.skills && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Quick add category:</span>
          {unused.map((c) => (
            <Button key={c} type="button" size="sm" variant="outline" onClick={() => addCategory(c)} aria-label={`Add ${c} category`}>
              + {c}
            </Button>
          ))}
        </div>
      )}
      <RepeatableList
        name="data.skills"
        noun="Skill category"
        addLabel="Add custom category"
        max={ENTRY_LIMITS.skills}
        createItem={() => entryFactories.skillGroup("")}
        getLabel={(item, i) => (str(item?.category) ? `${str(item?.category)} skills` : `Skill category ${i + 1}`)}
        renderItem={(i) => <SkillGroupFields index={i} />}
        emptyText="No skills yet. Use a quick-add category above or add a custom one."
      />
    </StepSection>
  );
}

export function CertificationsStep({ headingRef }: StepProps) {
  return (
    <StepSection headingRef={headingRef} title="Certifications" description="Courses and certificates you have completed, including Skill Guru certificates.">
      <RepeatableList
        name="data.certifications"
        noun="Certification"
        addLabel="Add certification"
        max={ENTRY_LIMITS.certifications}
        createItem={entryFactories.certification}
        getLabel={(item, i) => `Certification ${i + 1}${str(item?.name) ? `: ${str(item?.name)}` : ""}`}
        renderItem={(i) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name={`data.certifications.${i}.name`} label="Certification name" maxLength={160} className="sm:col-span-2" />
            <TextField name={`data.certifications.${i}.issuer`} label="Issuing organization" maxLength={160} />
            <DateField name={`data.certifications.${i}.issueDate`} label="Issue date" />
            <TextField name={`data.certifications.${i}.credentialId`} label="Credential ID" maxLength={100} />
            <TextField name={`data.certifications.${i}.credentialUrl`} label="Credential URL" type="url" inputMode="url" maxLength={300} />
          </div>
        )}
        emptyText="No certifications added yet."
      />
    </StepSection>
  );
}

export function AdditionalStep({ headingRef }: StepProps) {
  return (
    <StepSection headingRef={headingRef} title="Achievements and Additional Information" description="Awards, hackathons, languages, volunteering and anything else worth showing. Empty sections never appear on your resume.">
      <div className="space-y-3">
        <h3 className="text-base font-black text-foreground">Achievements</h3>
        <RepeatableList
          name="data.achievements"
          noun="Achievement"
          addLabel="Add achievement"
          max={ENTRY_LIMITS.achievements}
          createItem={entryFactories.achievement}
          getLabel={(item, i) => `Achievement ${i + 1}${str(item?.title) ? `: ${str(item?.title)}` : ""}`}
          renderItem={(i) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name={`data.achievements.${i}.title`} label="Title" maxLength={160} hint="e.g. Winner, Smart India Hackathon" />
              <TextField name={`data.achievements.${i}.organization`} label="Organization" maxLength={160} />
              <DateField name={`data.achievements.${i}.date`} label="Date" />
              <TextAreaField name={`data.achievements.${i}.description`} label="Description" rows={2} maxLength={1500} className="sm:col-span-2" />
            </div>
          )}
          emptyText="No achievements added yet."
        />
      </div>
      <div className="space-y-3">
        <h3 className="text-base font-black text-foreground">Languages</h3>
        <RepeatableList
          name="data.languages"
          noun="Language"
          addLabel="Add language"
          max={ENTRY_LIMITS.languages}
          createItem={entryFactories.language}
          getLabel={(item, i) => (str(item?.name) ? `Language: ${str(item?.name)}` : `Language ${i + 1}`)}
          renderItem={(i) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name={`data.languages.${i}.name`} label="Language" maxLength={60} />
              <TextField name={`data.languages.${i}.proficiency`} label="Proficiency" maxLength={60} hint="e.g. Native, Fluent, Conversational" />
            </div>
          )}
          emptyText="No languages added yet."
        />
      </div>
      <div className="space-y-3">
        <h3 className="text-base font-black text-foreground">Other sections</h3>
        <RepeatableList
          name="data.additional"
          noun="Entry"
          addLabel="Add entry"
          max={ENTRY_LIMITS.additional}
          createItem={() => entryFactories.additional("volunteering")}
          getLabel={(item, i) => {
            const kind = (ADDITIONAL_KINDS as readonly string[]).includes(String(item?.kind)) ? ADDITIONAL_KIND_LABELS[item?.kind as keyof typeof ADDITIONAL_KIND_LABELS] : "Entry";
            return `${kind} ${i + 1}${str(item?.title) ? `: ${str(item?.title)}` : ""}`;
          }}
          renderItem={(i) => <AdditionalFields index={i} />}
          emptyText="Volunteering, leadership, publications, extracurricular activities, awards or a custom section."
        />
      </div>
    </StepSection>
  );
}

function AdditionalFields({ index }: { index: number }) {
  const kind = useWatch<EditorValues, `data.additional.${number}.kind`>({ name: `data.additional.${index}.kind` });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField name={`data.additional.${index}.kind`} label="Section" options={ADDITIONAL_KINDS.map((k) => ({ value: k, label: ADDITIONAL_KIND_LABELS[k] }))} />
      {kind === "custom" ? <TextField name={`data.additional.${index}.heading`} label="Custom section heading" maxLength={60} /> : <div aria-hidden="true" />}
      <TextField name={`data.additional.${index}.title`} label="Title or role" maxLength={160} />
      <TextField name={`data.additional.${index}.organization`} label="Organization" maxLength={160} />
      <DateField name={`data.additional.${index}.date`} label="Date" />
      <TextAreaField name={`data.additional.${index}.description`} label="Description" rows={2} maxLength={1500} className="sm:col-span-2" />
    </div>
  );
}

// A small toggle-button toolbar for narrowing an in-place list (e.g. "All /
// Jobs / Internships"). Uses role="group" + aria-pressed per the WAI-ARIA APG
// "segmented filter" pattern - not role="tablist" (this isn't navigation
// between separate views) and not role="radiogroup" (no roving-tabindex/
// arrow-key requirement needed for a 3-item set).
export type QuickFilterOption<T extends string> = { value: T; label: string };

export function QuickFilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: Readonly<{
  label: string;
  options: readonly QuickFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "h-9 rounded-full border px-3.5 text-xs font-bold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function initials(name: string | null | undefined, fallback: string) {
  const source = name?.trim();
  if (!source) return fallback;
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || fallback;
}

export function formatRole(highestRole: string | undefined) {
  if (!highestRole) return "Admin";
  return highestRole
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

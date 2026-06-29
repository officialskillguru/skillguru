import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  inverse = false,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  inverse?: boolean;
}>) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className={cn("text-xs font-bold uppercase tracking-[0.22em]", inverse ? "text-[#19C7C8]" : "text-[#5B35F2]")}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn("mt-4 text-3xl font-black tracking-tight sm:text-5xl", inverse ? "text-white" : "text-[#111E79]")}>
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-5 text-base leading-8 sm:text-lg", inverse ? "text-white/70" : "text-[#64748B]")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

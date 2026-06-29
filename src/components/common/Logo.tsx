import { Link } from "react-router-dom";

import { siteConfig } from "@/config/site";
import { assetUrl } from "@/lib/asset-url";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  imageClassName,
  onDark = false,
  src,
}: Readonly<{ className?: string; imageClassName?: string; onDark?: boolean; src?: string }>) {
  return (
    <Link to={routes.home} className={cn("inline-flex items-center shrink-0", className)} aria-label="SkillGuru home">
      <img
        src={src ?? siteConfig.logoPath}
        alt="SkillGuru"
        className={cn(
          "h-10 md:h-12 w-auto object-contain",
          onDark && "brightness-0 invert",
          imageClassName,
        )}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={(event) => {
          event.currentTarget.src = siteConfig.logoFallbacks[0] ?? assetUrl("/assets/logo/company-logo-placeholder.svg");
        }}
      />
    </Link>
  );
}


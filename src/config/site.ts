import { clientEnv } from "@/lib/env";
import { assetUrl } from "@/lib/asset-url";

export const siteConfig = {
  name: "SkillGuru",
  shortName: "SkillGuru",
  url: clientEnv.VITE_SITE_URL,
  locale: "en_IN",
  description:
    "Learn • Build • Master • Achieve",
  logoPath: assetUrl("/assets/logo/official-skill-guru-icon.png"),
  logoWordmarkPath: assetUrl("/assets/logo/official-skill-guru-navbar.png"),
  // company-logo-placeholder.svg never existed on disk (dead reference) -
  // the real fallback is the small icon mark, which does exist.
  logoFallbacks: [assetUrl("/assets/logo/official-skill-guru-icon.png"), assetUrl("/assets/logo/skillguru-icon-mark.png")],
  contactEmail: "info@skillguru.com",
  contactPhone: "+91 91090 72316",
  whatsapp: "https://wa.me/919109072316",
} as const;

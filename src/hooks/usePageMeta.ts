import { useEffect } from "react";

import { siteConfig } from "@/config/site";

function upsertMeta(property: string, content: string, attr: "name" | "property" = "property") {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attr}="${property}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, property);
    document.head.append(meta);
  }
  meta.content = content;
}

export function usePageMeta(title: string, description = siteConfig.description) {
  useEffect(() => {
    document.title = title === siteConfig.name ? title : `${title} | ${siteConfig.shortName}`;

    upsertMeta("description", description, "name");
    upsertMeta("og:title", document.title);
    upsertMeta("og:description", description);
    upsertMeta("og:site_name", siteConfig.name);
    upsertMeta("twitter:title", document.title);
    upsertMeta("twitter:description", description);
  }, [description, title]);
}

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

function upsertCanonical(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.append(link);
  }
  link.href = href;
}

export function usePageMeta(title: string, description = siteConfig.description, canonicalPath?: string) {
  useEffect(() => {
    document.title = title === siteConfig.name ? title : `${title} | ${siteConfig.shortName}`;

    upsertMeta("description", description, "name");
    upsertMeta("og:title", document.title);
    upsertMeta("og:description", description);
    upsertMeta("og:site_name", siteConfig.name);
    upsertMeta("twitter:title", document.title);
    upsertMeta("twitter:description", description);

    if (canonicalPath) {
      upsertCanonical(`${siteConfig.url}${canonicalPath}`);
    }
  }, [description, title, canonicalPath]);
}

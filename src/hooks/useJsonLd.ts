import { useEffect } from "react";

/** Injects a `<script type="application/ld+json">` structured-data block into the document head for the lifetime of the component. Pass `null` to skip (e.g. while data is still loading). */
export function useJsonLd(data: object | null) {
  useEffect(() => {
    if (!data) return;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.append(script);

    return () => {
      script.remove();
    };
  }, [data]);
}

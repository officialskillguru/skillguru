import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { FAQItem } from "@/types/platform";
import { cn } from "@/lib/utils";

export function FAQAccordion({ items }: Readonly<{ items: FAQItem[] }>) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      {items.map((item, index) => (
        <div key={item.question}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-bold text-foreground"
            onClick={() => setOpenIndex(index === openIndex ? -1 : index)}
          >
            {item.question}
            <ChevronDown className={cn("size-5 shrink-0 text-primary transition", index === openIndex && "rotate-180")} />
          </button>
          {index === openIndex ? <p className="px-6 pb-6 text-sm leading-7 text-muted-foreground">{item.answer}</p> : null}
        </div>
      ))}
    </div>
  );
}

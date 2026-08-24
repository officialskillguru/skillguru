import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentCitation } from "@/services/ai-conversation.service";

interface AgentCitationsProps {
  citations: AgentCitation[];
}

/**
 * The knowledge sources a grounded answer relied on, behind a disclosure.
 *
 * Collapsed by default so a screen reader encounters one node per message rather
 * than N source titles inline. The trigger label carries the count and the word
 * "sources" so it is self-describing when read out of context.
 */
export function AgentCitations({ citations }: Readonly<AgentCitationsProps>) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (citations.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={listId}
        className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
            expanded && "rotate-180"
          )}
        />
        {citations.length} {citations.length === 1 ? "source" : "sources"}
      </button>

      <ul id={listId} hidden={!expanded} className="mt-1.5 space-y-1 border-l-2 border-border pl-2.5">
        {citations.map((citation) => (
          <li key={`${citation.title}-${citation.category}`} className="text-xs leading-snug">
            <span className="text-foreground">{citation.title}</span>{" "}
            <span className="text-muted-foreground">
              <span className="sr-only">Category: </span>
              {citation.category}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

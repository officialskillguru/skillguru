import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { type Mentor } from "../types";

export function MentorFAQ({ mentor }: { mentor: Mentor }) {
  const [openId, setOpenId] = useState<string | null>(mentor.faqs?.[0]?.id || null);

  if (!mentor.faqs?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="faq">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Frequently Asked Questions
      </h2>

      <div className="flex flex-col gap-3">
        {mentor.faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div 
              key={faq.id} 
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-secondary/20 bg-muted' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <button
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 rounded-2xl"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${faq.id}`}
                id={`faq-trigger-${faq.id}`}
              >
                <span className={`font-semibold text-lg transition-colors ${isOpen ? 'text-primary' : 'text-slate-800'}`}>
                  {faq.question}
                </span>
                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-secondary/10 text-secondary rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                  <ChevronDown className="w-5 h-5" aria-hidden="true" />
                </span>
              </button>

              <div
                id={`faq-panel-${faq.id}`}
                role="region"
                aria-labelledby={`faq-trigger-${faq.id}`}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? '500px' : '0px', opacity: isOpen ? 1 : 0 }}
              >
                <div className="p-5 pt-0 text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


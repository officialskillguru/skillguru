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
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-[#5B35F2]/20 bg-[#F8FAFC]' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <button
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
              >
                <span className={`font-semibold text-lg transition-colors ${isOpen ? 'text-[#111E79]' : 'text-slate-800'}`}>
                  {faq.question}
                </span>
                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-[#5B35F2]/10 text-[#5B35F2] rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                  <ChevronDown className="w-5 h-5" />
                </span>
              </button>
              
              <div 
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


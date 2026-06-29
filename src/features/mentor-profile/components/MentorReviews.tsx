import { Star, CheckCircle } from "lucide-react";
import { type Mentor } from "../types";

export function MentorReviews({ mentor }: { mentor: Mentor }) {
  if (!mentor.reviews?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="reviews">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Student Reviews
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mentor.reviews.map((review) => (
          <div key={review.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={review.studentAvatar} alt={review.studentName} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {review.studentName}
                    {review.isVerified && <CheckCircle className="w-3.5 h-3.5 text-[#19C7C8]" />}
                  </h3>
                  <div className="text-xs font-medium text-slate-500">{review.courseName}</div>
                </div>
              </div>
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-amber-400" : "fill-slate-200 text-slate-200"}`} />
                ))}
              </div>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed grow">
              {review.content}
            </p>
            
            <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs text-slate-400 font-medium">
              Posted in {review.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


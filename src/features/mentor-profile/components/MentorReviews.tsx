import { Star, CheckCircle } from "lucide-react";
import { type Mentor } from "../types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

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
                {review.studentAvatar ? (
                  <img src={review.studentAvatar} alt={review.studentName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {initials(review.studentName)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {review.studentName}
                    {review.isVerified && (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                        <span className="sr-only">(Verified student)</span>
                      </>
                    )}
                  </h3>
                  <div className="text-xs font-medium text-slate-500">{review.courseName}</div>
                </div>
              </div>
              <div className="flex items-center text-amber-400" role="img" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} aria-hidden="true" className={`w-4 h-4 ${i < review.rating ? "fill-amber-400" : "fill-slate-200 text-slate-200"}`} />
                ))}
              </div>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed grow">
              {review.content}
            </p>

            {review.mentorReply && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-secondary">Mentor's reply</p>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{review.mentorReply}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs text-slate-400 font-medium">
              Posted in {review.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


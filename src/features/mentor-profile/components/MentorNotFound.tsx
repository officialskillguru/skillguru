import { Link } from "react-router-dom";
import { SearchX, ArrowLeft } from "lucide-react";

export function MentorNotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-12 h-12 text-slate-400" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-3 text-center">Mentor Not Found</h1>
      <p className="text-slate-600 text-center max-w-md mb-8">
        We couldn't find the mentor you're looking for. They might have changed their URL, or they are no longer mentoring with us.
      </p>
      
      <Link 
        to="/mentors" 
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-lg shadow-primary/20"
      >
        <ArrowLeft className="w-5 h-5" />
        Explore All Mentors
      </Link>
    </div>
  );
}

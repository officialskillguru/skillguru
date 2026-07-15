import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { studentService } from "@/services/student.service";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfileCompletionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    city: "",
    state: "",
    education: "",
    skills: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    const skillsArray = formData.skills.split(",").map(s => s.trim()).filter(Boolean);
    const educationArray = formData.education.split(",").map(e => e.trim()).filter(Boolean);
    
    const updates = {
      full_name: formData.fullName,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      metadata: {
        education: educationArray,
        skills: skillsArray,
      }
    };

    const res = await studentService.updateProfile(user.id, updates);
    setIsLoading(false);

    if (res.success) {
      toast.success("Profile updated successfully!");
      void navigate(routes.dashboard);
    } else {
      toast.error(res.error.message || "Failed to update profile");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome to SkillGuru! Tell us a bit about yourself so we can personalize your experience.
          </p>
        </div>
        
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-bold text-slate-700">Full Name</label>
              <input
                id="fullName"
                required
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-bold text-slate-700">Phone Number</label>
              <input
                id="phone"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-bold text-slate-700">City</label>
              <input
                id="city"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="San Francisco"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="state" className="text-sm font-bold text-slate-700">State / Province</label>
              <input
                id="state"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="California"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="education" className="text-sm font-bold text-slate-700">Education (comma separated)</label>
            <input
              id="education"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="B.Sc Computer Science, MIT"
              value={formData.education}
              onChange={e => setFormData({ ...formData, education: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="skills" className="text-sm font-bold text-slate-700">Skills (comma separated)</label>
            <input
              id="skills"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="React, TypeScript, Node.js"
              value={formData.skills}
              onChange={e => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>
          
          <div className="pt-4 border-t border-border">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="mr-2 size-5 animate-spin" />
              ) : (
                "Save & Continue to Dashboard"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

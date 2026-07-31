import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { studentService } from "@/services/student.service";
import { updateResumeEducation } from "@/services/resume.service";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

    // Contact fields go on `profiles`; education/skills go through the
    // upsert_my_student_profile RPC onto `student_profiles` (the table the
    // Resume Builder and AI Career Guidance actually read from) - a prior
    // version of this form wrote education/skills into `profiles.metadata`,
    // a location nothing in the app ever reads back from.
    const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);

    const [profileRes] = await Promise.all([
      studentService.updateProfile(user.id, {
        full_name: formData.fullName,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
      }),
      updateResumeEducation(user.id, {
        education: formData.education || null,
        skills: skillsArray,
      }),
    ]);

    setIsLoading(false);

    if (profileRes.success) {
      toast.success("Profile updated successfully!");
      void navigate(routes.dashboard);
    } else {
      toast.error(profileRes.error.message || "Failed to update profile");
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
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                required
                className="h-11 rounded-xl"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                className="h-11 rounded-xl"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                autoComplete="address-level2"
                className="h-11 rounded-xl"
                placeholder="San Francisco"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                autoComplete="address-level1"
                className="h-11 rounded-xl"
                placeholder="California"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education</Label>
            <Input
              id="education"
              className="h-11 rounded-xl"
              placeholder="B.Sc Computer Science, MIT"
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma separated)</Label>
            <Input
              id="skills"
              className="h-11 rounded-xl"
              placeholder="React, TypeScript, Node.js"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>

          <div className="border-t border-border pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
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

import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMentor } from "@/features/mentor-profile/hooks/useMentor";

import { MentorProfileLayout } from "@/features/mentor-profile/components/layout/MentorProfileLayout";
import { MentorProfileHeader } from "@/features/mentor-profile/components/layout/MentorProfileHeader";
import { MentorProfileContent } from "@/features/mentor-profile/components/layout/MentorProfileContent";
import { MentorProfileSidebar } from "@/features/mentor-profile/components/layout/MentorProfileSidebar";

import { MentorProfilePageSkeleton } from "@/features/mentor-profile/components/MentorProfileSkeleton";
import { MentorNotFound } from "@/features/mentor-profile/components/MentorNotFound";
import { MentorBookingModal } from "@/features/mentor-profile/components/MentorBookingModal";

import { MentorAbout } from "@/features/mentor-profile/components/MentorAbout";
import { MentorCompanies } from "@/features/mentor-profile/components/MentorCompanies";
import { MentorTools } from "@/features/mentor-profile/components/MentorTools";
import { MentorSkills } from "@/features/mentor-profile/components/MentorSkills";
import { MentorExperience } from "@/features/mentor-profile/components/MentorExperience";
import { MentorProjects } from "@/features/mentor-profile/components/MentorProjects";
import { MentorCourses } from "@/features/mentor-profile/components/MentorCourses";
import { MentorCertifications } from "@/features/mentor-profile/components/MentorCertifications";
import { MentorAchievements } from "@/features/mentor-profile/components/MentorAchievements";
import { MentorMentorshipProcess } from "@/features/mentor-profile/components/MentorMentorshipProcess";
import { MentorStudentOutcomes } from "@/features/mentor-profile/components/MentorStudentOutcomes";
import { MentorReviews } from "@/features/mentor-profile/components/MentorReviews";
import { MentorFAQ } from "@/features/mentor-profile/components/MentorFAQ";
import { RelatedMentors } from "@/features/mentor-profile/components/RelatedMentors";

import { MentorBookingWidget } from "@/features/mentor-profile/components/MentorBookingWidget";

export default function MentorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { hash } = useLocation();
  const { mentor, loading, error } = useMentor(slug);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Deep linking for hash navigation
  useEffect(() => {
    if (hash && mentor) {
      setTimeout(() => {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [hash, mentor]);

  if (loading) {
    return <MentorProfilePageSkeleton />;
  }

  if (error || !mentor) {
    return (
      <MentorProfileLayout>
        <MentorNotFound />
      </MentorProfileLayout>
    );
  }

  return (
    <MentorProfileLayout>
      <Helmet>
        <title>{mentor.name} - {mentor.role} Mentor | Skill Guru</title>
        <meta name="description" content={mentor.about.slice(0, 160)} />
        <meta property="og:title" content={`${mentor.name} - ${mentor.role} Mentor | Skill Guru`} />
        <meta property="og:description" content={mentor.about.slice(0, 160)} />
        <meta property="og:image" content={mentor.avatar} />
      </Helmet>

      <MentorProfileHeader mentor={mentor} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <MentorProfileContent>
          <MentorAbout mentor={mentor} />
          <MentorCompanies mentor={mentor} />
          <MentorTools mentor={mentor} />
          <MentorSkills mentor={mentor} />
          <MentorExperience mentor={mentor} />
          <MentorProjects mentor={mentor} />
          <MentorCourses mentor={mentor} />
          <MentorCertifications mentor={mentor} />
          <MentorAchievements mentor={mentor} />
          <MentorMentorshipProcess mentor={mentor} />
          <MentorStudentOutcomes mentor={mentor} />
          <MentorReviews mentor={mentor} />
          <MentorFAQ mentor={mentor} />
          <RelatedMentors currentMentor={mentor} />
        </MentorProfileContent>
        
        <MentorProfileSidebar>
          <div className="hidden lg:block sticky top-24">
            <MentorBookingWidget mentor={mentor} />
          </div>
        </MentorProfileSidebar>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] lg:hidden z-50">
        <button 
          onClick={() => setIsBookingModalOpen(true)}
          className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          Book Free Counselling
        </button>
      </div>

      <MentorBookingModal 
        mentor={mentor} 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
      />
    </MentorProfileLayout>
  );
}

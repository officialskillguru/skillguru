import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMentor } from "@/features/mentor-profile/hooks/useMentor";
import { siteConfig } from "@/config/site";
import { mentorProfileRoute } from "@/lib/routes";

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
import { MentorReviews } from "@/features/mentor-profile/components/MentorReviews";
import { MentorFAQ } from "@/features/mentor-profile/components/MentorFAQ";
import { RelatedMentors } from "@/features/mentor-profile/components/RelatedMentors";

import { MentorBookingWidget } from "@/features/mentor-profile/components/MentorBookingWidget";

export default function MentorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { hash } = useLocation();
  const { mentor, loading, notFound, error } = useMentor(slug);
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

  if (error) {
    return (
      <MentorProfileLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-3">Couldn&apos;t load this mentor</h1>
          <p className="text-slate-600 max-w-md mb-6">
            Something went wrong while loading this profile. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/20 hover:bg-blue-800"
          >
            Retry
          </button>
        </div>
      </MentorProfileLayout>
    );
  }

  if (notFound || !mentor) {
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
        <meta property="og:image" content={mentor.avatar || siteConfig.logoPath} />
        <link rel="canonical" href={`${siteConfig.url}${mentorProfileRoute(mentor.slug)}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: mentor.name,
            jobTitle: mentor.role,
            description: mentor.about,
            image: mentor.avatar || undefined,
            worksFor: mentor.company ? { "@type": "Organization", name: mentor.company } : undefined,
            url: `${siteConfig.url}${mentorProfileRoute(mentor.slug)}`,
          })}
        </script>
      </Helmet>

      <MentorProfileHeader mentor={mentor} onBookClick={() => setIsBookingModalOpen(true)} />

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

import type { Mentor as BaseMentor } from "@/types/platform";
import type { Mentor as CompleteMentor } from "../types";

export function createMentorProfile(baseMentor: BaseMentor): CompleteMentor {
  // Use a pseudo-random seed based on the mentor's name length to keep mock data stable
  const seed = baseMentor.name.length;

  return {
    id: `mentor_${seed}`,
    slug: baseMentor.slug,
    name: baseMentor.name,
    avatar: baseMentor.avatar,
    verified: true,
    role: baseMentor.role,
    company: baseMentor.company,
    companyLogo: baseMentor.companyLogo,
    location: baseMentor.location,
    about: baseMentor.bio + " " + "With a strong focus on practical problem solving and industry-standard practices, I believe in empowering students to not just learn syntax, but to master the underlying engineering principles.",
    teachingPhilosophy: "I believe in hands-on, project-based learning. My goal is to make complex concepts intuitive through real-world examples and rigorous architectural thinking.",
    languages: baseMentor.language.split(", "),
    expertise: baseMentor.expertise,
    tools: ["Docker", "AWS", "Figma", "Git", "Jira", "VS Code"].slice(0, 3 + (seed % 3)),
    companiesWorkedWith: baseMentor.workedWith.map(company => ({
      name: company,
      logo: `https://logo.clearbit.com/${company.toLowerCase().replace(/\s/g, '')}.com`
    })),
    mentorshipProcess: [
      { step: 1, title: "Initial Assessment", description: "We evaluate your current skills, career goals, and identify gaps in your knowledge." },
      { step: 2, title: "Personalized Roadmap", description: "I design a step-by-step curriculum tailored specifically to your target role." },
      { step: 3, title: "Project Building", description: "We build 2-3 production-grade projects together to make your portfolio stand out." },
      { step: 4, title: "Mock Interviews", description: "Rigorous technical and behavioral interview preparation until you are completely confident." }
    ],
    socialLinks: {
      linkedin: `https://linkedin.com/in/${baseMentor.slug}`,
      github: `https://github.com/${baseMentor.slug}`,
    },
    
    stats: [
      { label: "Students", value: `${baseMentor.studentsMentored}+`, icon: "Users" },
      { label: "Experience", value: `${baseMentor.experienceYears} Years`, icon: "Briefcase" },
      { label: "Rating", value: baseMentor.rating, icon: "Star" },
      { label: "Sessions", value: `${Math.floor(baseMentor.studentsMentored * 2.5)}+`, icon: "Video" },
    ],
    
    experience: [
      {
        id: `exp_1_${seed}`,
        company: baseMentor.company,
        companyLogo: baseMentor.companyLogo,
        role: baseMentor.role,
        startDate: "Jan 2020",
        duration: "4 Years 6 Months",
        responsibilities: [
          "Led a team of cross-functional engineers to deliver scalable enterprise solutions.",
          "Architected high-throughput microservices reducing latency by 40%.",
          "Mentored junior developers and established code-quality guidelines."
        ],
        achievements: ["Promoted to Senior role within 18 months", "Awarded 'Innovator of the Year' in 2022"]
      },
      {
        id: `exp_2_${seed}`,
        company: baseMentor.workedWith[1] || "Previous Company",
        companyLogo: `https://logo.clearbit.com/${(baseMentor.workedWith[1] || "TechCorp").toLowerCase().replace(/\s/g, '')}.com`,
        role: "Software Engineer",
        startDate: "Jun 2016",
        endDate: "Dec 2019",
        duration: "3 Years 6 Months",
        responsibilities: [
          "Developed core features for the main customer-facing portal.",
          "Optimized database queries leading to a 20% reduction in cloud costs."
        ],
        achievements: []
      }
    ],
    
    education: [
      {
        id: `edu_1_${seed}`,
        institution: "Indian Institute of Technology (IIT)",
        degree: "Bachelor of Technology",
        branch: "Computer Science",
        graduationYear: 2016,
      }
    ],
    
    certifications: [
      {
        id: `cert_1_${seed}`,
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        issuerLogo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
        issueDate: "2021"
      }
    ],
    
    skills: baseMentor.expertise.map((skill, i) => ({
      id: `skill_${i}`,
      name: skill,
      proficiency: 80 + (i * 5) > 100 ? 98 : 80 + (i * 5),
      category: "Technical"
    })),
    
    coursesTaught: [
      {
        id: `course_1_${seed}`,
        slug: `${baseMentor.slug}-masterclass`,
        title: `Advanced ${baseMentor.expertise[0]} Masterclass`,
        thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop",
        duration: "12 Weeks",
        studentsEnrolled: baseMentor.studentsMentored,
        rating: baseMentor.rating,
        difficulty: "Advanced",
        hasCertificate: true,
        projectsCount: 4
      }
    ],
    
    projects: [
      {
        id: `proj_1_${seed}`,
        title: "Enterprise E-commerce Platform",
        description: "A highly scalable microservices based e-commerce backend handling 10k+ requests per second.",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop",
        techStack: baseMentor.expertise.slice(0, 3),
        industry: "E-Commerce",
        difficulty: "Advanced",
        githubUrl: "https://github.com",
        liveUrl: "https://example.com"
      },
      {
        id: `proj_2_${seed}`,
        title: "Real-time Analytics Dashboard",
        description: "Dashboard processing millions of events to display real-time user metrics.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop",
        techStack: [...baseMentor.expertise.slice(0, 2), "React", "Node.js"],
        industry: "Analytics",
        difficulty: "Intermediate"
      }
    ],
    
    achievements: [
      {
        id: `ach_1_${seed}`,
        title: "Top Rated Mentor 2023",
        description: "Recognized for maintaining a 4.9/5 average rating across 100+ sessions.",
        date: "Dec 2023",
        icon: "Trophy"
      },
      {
        id: `ach_2_${seed}`,
        title: "Open Source Contributor",
        description: "Core contributor to major open source libraries used by millions.",
        date: "2021 - Present",
        icon: "Star"
      }
    ],
    
    reviews: [
      {
        id: `rev_1_${seed}`,
        studentName: "Priya Singh",
        studentAvatar: "https://i.pravatar.cc/150?u=priya",
        courseName: "Placement Guarantee Program",
        rating: 5,
        date: "2 weeks ago",
        content: "An incredible mentor! The mock interviews were tougher than the actual interviews, which made the real thing a breeze.",
        companyJoined: "Amazon",
        isVerified: true
      },
      {
        id: `rev_2_${seed}`,
        studentName: "Aditya Kumar",
        studentAvatar: "https://i.pravatar.cc/150?u=aditya",
        courseName: "Advanced Engineering",
        rating: 5,
        date: "1 month ago",
        content: `${baseMentor.name} is extremely patient and explains deep architectural concepts with ease. Highly recommended.`,
        salaryAfter: "14 LPA",
        isVerified: true
      }
    ],
    
    testimonials: [
      {
        id: `test_1_${seed}`,
        studentName: "Arjun Mehta",
        studentAvatar: "https://i.pravatar.cc/150?u=arjun",
        studentRole: "Software Engineer",
        quote: `${baseMentor.name}'s guidance completely transformed how I approach system design.`,
        companyLogo: "https://logo.clearbit.com/amazon.com",
        companyName: "Amazon",
        previousRole: "Fresher",
        currentRole: "SDE-1",
        mentorshipDuration: "6 Months"
      }
    ],
    
    faqs: [
      {
        id: `faq_1_${seed}`,
        question: "How do your 1-on-1 sessions work?",
        answer: "Sessions are conducted via Google Meet. I usually ask you to share your agenda 24 hours prior so we make the most of our 45 minutes together."
      },
      {
        id: `faq_2_${seed}`,
        question: "Do you help with resume reviews?",
        answer: "Yes, resume reviews are a core part of the mentorship process. We will optimize your resume to pass ATS systems and catch recruiters' attention."
      }
    ],
    
    availability: {
      timezone: "Asia/Kolkata",
      availableDays: ["Saturday", "Sunday"],
      sessionDurationMinutes: 45,
      status: "Limited Slots",
      slots: {
        "2026-07-01": [
          { id: "slot_1", startTime: "10:00 AM", endTime: "10:45 AM", isAvailable: true },
          { id: "slot_2", startTime: "11:00 AM", endTime: "11:45 AM", isAvailable: false }
        ]
      }
    }
  };
}

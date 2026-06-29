import { type Mentor } from "../types";

export const MOCK_MENTOR: Mentor = {
  id: "m-101",
  slug: "rahul-sharma",
  name: "Rahul Sharma",
  avatar: "/assets/mentors/rahul-sharma.jpg", // placeholder, will fall back or need to be added
  verified: true,
  role: "Senior Data Scientist",
  company: "Microsoft",
  companyLogo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  location: "Bengaluru, India",
  about:
    "Results-driven Data Scientist with over 8 years of experience in building scalable machine learning models and data-driven solutions. Currently working at Microsoft, where I focus on leveraging data to solve real-world problems and drive business impact.\n\nI enjoy mentoring aspiring data professionals and breaking down complex topics into simple, practical concepts.",
  teachingPhilosophy: "I believe in learning by doing. Theory is important, but applying it to real-world datasets is where true mastery happens.",
  languages: ["English", "Hindi"],
  expertise: ["Data Science", "Machine Learning", "Python", "SQL", "Deep Learning", "Big Data", "Statistics", "Data Visualization"],
  tools: ["Python", "TensorFlow", "PyTorch", "AWS", "SQL", "Docker", "Power BI", "Spark"],
  companiesWorkedWith: [
    { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
    { name: "Flipkart", logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.svg" },
    { name: "Mu Sigma", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Mu_Sigma_logo.svg/1200px-Mu_Sigma_logo.svg.png" }
  ],
  mentorshipProcess: [
    { step: 1, title: "Initial Assessment", description: "Understanding your current skill level, goals, and career aspirations." },
    { step: 2, title: "Custom Roadmap", description: "Creating a personalized learning path with specific milestones and resources." },
    { step: 3, title: "Project Building", description: "Working hands-on on industry-relevant projects to build a strong portfolio." },
    { step: 4, title: "Interview Prep", description: "Mock interviews, resume reviews, and behavioral prep for top tech companies." }
  ],
  socialLinks: {
    email: "rahul.sharma@example.com",
    linkedin: "https://linkedin.com/in/rahulsharma",
    github: "https://github.com/rahulsharma",
  },
  
  stats: [
    { label: "Years Exp.", value: "8+", icon: "Briefcase" },
    { label: "Students Mentored", value: "500+", icon: "Users" },
    { label: "Rating", value: "4.8", icon: "Star" },
    { label: "Reviews", value: "120+", icon: "MessageSquare" }
  ],
  
  experience: [
    {
      id: "exp-1",
      company: "Microsoft",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      role: "Senior Data Scientist",
      startDate: "2021",
      duration: "3+ Years",
      responsibilities: [
        "Leading the development of predictive models for enterprise customers.",
        "Optimizing data pipelines processing over 50TB of data daily.",
        "Mentoring junior data scientists and engineers."
      ],
      achievements: ["Improved model accuracy by 15%", "Reduced inference latency by 40%"]
    },
    {
      id: "exp-2",
      company: "Flipkart",
      companyLogo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.svg",
      role: "Data Scientist",
      startDate: "2018",
      endDate: "2021",
      duration: "3 Years",
      responsibilities: [
        "Built recommendation systems for e-commerce products.",
        "Analyzed user behavior to improve conversion rates."
      ],
      achievements: ["Increased CTR by 22%"]
    },
    {
      id: "exp-3",
      company: "Mu Sigma",
      companyLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Mu_Sigma_logo.svg/1200px-Mu_Sigma_logo.svg.png",
      role: "Decision Scientist",
      startDate: "2016",
      endDate: "2018",
      duration: "2 Years",
      responsibilities: [
        "Delivered data-driven insights for Fortune 500 clients.",
        "Developed dashboards and reporting tools."
      ],
      achievements: []
    }
  ],
  
  education: [
    {
      id: "edu-1",
      institution: "IIT Bombay",
      degree: "M.Tech",
      branch: "Computer Science",
      graduationYear: 2016,
      cgpa: "9.2/10"
    },
    {
      id: "edu-2",
      institution: "NIT Trichy",
      degree: "B.Tech",
      branch: "Information Technology",
      graduationYear: 2014,
      cgpa: "8.9/10"
    }
  ],
  
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Machine Learning – Specialty",
      issuer: "Amazon Web Services",
      issuerLogo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
      issueDate: "2022"
    },
    {
      id: "cert-2",
      name: "TensorFlow Developer Certificate",
      issuer: "Google",
      issuerLogo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
      issueDate: "2021"
    }
  ],
  
  skills: [
    { id: "s-1", name: "Data Science", proficiency: 95, category: "Technical" },
    { id: "s-2", name: "Machine Learning", proficiency: 90, category: "Technical" },
    { id: "s-3", name: "Python", proficiency: 95, category: "Technical" },
    { id: "s-4", name: "SQL", proficiency: 85, category: "Technical" },
    { id: "s-5", name: "Deep Learning", proficiency: 80, category: "Technical" },
  ],
  
  coursesTaught: [
    {
      id: "c-1",
      slug: "applied-data-science",
      title: "Applied Data Science with Python",
      thumbnail: "/assets/courses/data-science.jpg",
      duration: "12 Weeks",
      studentsEnrolled: 2500,
      rating: 4.8,
      difficulty: "Intermediate",
      hasCertificate: true,
      projectsCount: 4
    },
    {
      id: "c-2",
      slug: "machine-learning-engineering",
      title: "Machine Learning Engineering",
      thumbnail: "/assets/courses/machine-learning.jpg",
      duration: "16 Weeks",
      studentsEnrolled: 1800,
      rating: 4.9,
      difficulty: "Advanced",
      hasCertificate: true,
      projectsCount: 5
    }
  ],
  
  projects: [
    {
      id: "p-1",
      title: "Customer Churn Prediction",
      description: "End-to-end ML pipeline to predict customer churn using telecom data.",
      image: "/assets/projects/churn.jpg",
      techStack: ["Python", "Scikit-Learn", "FastAPI", "Docker"],
      industry: "Telecom",
      difficulty: "Intermediate",
      githubUrl: "https://github.com"
    }
  ],
  
  achievements: [
    {
      id: "ach-1",
      title: "Top Rated Mentor 2023",
      description: "Recognized as the top-rated mentor in the Data Science category with a 99% satisfaction score.",
      date: "2023",
      icon: "Award"
    },
    {
      id: "ach-2",
      title: "Kaggle Master",
      description: "Achieved Kaggle Master tier by consistently ranking in the top 1% of competitions.",
      date: "2021",
      icon: "Trophy"
    }
  ],
  
  reviews: [
    {
      id: "rev-1",
      studentName: "Amit Kumar",
      studentAvatar: "/assets/avatars/amit.jpg",
      courseName: "Applied Data Science",
      rating: 5,
      date: "Oct 2023",
      content: "Rahul's mentorship was a game changer for me. His focus on real-world projects helped me clear the interviews.",
      companyJoined: "Amazon",
      isVerified: true
    },
    {
      id: "rev-2",
      studentName: "Priya Singh",
      studentAvatar: "/assets/avatars/priya.jpg",
      courseName: "Machine Learning Engineering",
      rating: 5,
      date: "Aug 2023",
      content: "Excellent explanations of complex ML algorithms. The mock interviews were incredibly helpful.",
      isVerified: true
    }
  ],
  
  testimonials: [
    {
      id: "test-1",
      studentName: "Rohit Verma",
      studentAvatar: "/assets/avatars/rohit.jpg",
      studentRole: "Data Analyst -> Data Scientist",
      quote: "Thanks to Rahul's tailored roadmap and rigorous project reviews, I was able to transition to a core ML role with a 120% hike.",
      companyLogo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.svg",
      companyName: "Flipkart",
      previousRole: "Data Analyst at TCS",
      currentRole: "Data Scientist at Flipkart",
      previousSalary: "8 LPA",
      currentSalary: "18 LPA",
      mentorshipDuration: "4 Months"
    }
  ],
  
  faqs: [
    {
      id: "faq-1",
      question: "What is your teaching style?",
      answer: "I focus on practical application rather than pure theory. We will spend 30% of our time on concepts and 70% on coding and building projects."
    },
    {
      id: "faq-2",
      question: "Do you provide resume reviews?",
      answer: "Yes, resume optimization is a core part of the mentorship process, specifically tailored for ATS systems in top tech companies."
    },
    {
      id: "faq-3",
      question: "What kind of projects will we build?",
      answer: "We build end-to-end industry projects, not just Jupyter notebooks. Think deploying models via APIs, building dashboards, and writing production-ready code."
    }
  ],
  
  availability: {
    timezone: "Asia/Kolkata (IST)",
    availableDays: ["Saturday", "Sunday"],
    sessionDurationMinutes: 45,
    status: "Limited Slots",
    slots: {
      "2026-07-04": [
        { id: "slot-1", startTime: "10:00 AM", endTime: "10:45 AM", isAvailable: true },
        { id: "slot-2", startTime: "11:00 AM", endTime: "11:45 AM", isAvailable: false },
      ],
      "2026-07-05": [
        { id: "slot-3", startTime: "04:00 PM", endTime: "04:45 PM", isAvailable: true },
      ]
    }
  }
};

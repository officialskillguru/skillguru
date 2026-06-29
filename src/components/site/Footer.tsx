import { Link } from "react-router-dom";
import { Clock3, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { siteConfig } from "@/config/site";
import { routes } from "@/lib/routes";

const socialLinks = [
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
] as const;

const columns = [
  {
    title: "Courses",
    links: [
      ["Development", routes.courses],
      ["Data Science", routes.courses],
      ["Cloud Computing", routes.courses],
      ["Design", routes.courses],
      ["Business", routes.courses],
    ],
  },
  {
    title: "Learning Paths",
    links: [
      ["Career Tracks", routes.courses],
      ["Skill Training", routes.courses],
      ["Certification", routes.courses],
      ["Placement Assistance", routes.placements],
      ["Corporate Training", routes.contact],
    ],
  },
  {
    title: "Guidance",
    links: [
      ["Career Assessment", routes.guidance],
      ["AI Guidance Preview", routes.guidance],
      ["Recommended Courses", routes.guidance],
      ["Career Roadmap", routes.guidance],
      ["FAQs", routes.faq],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", routes.about],
      ["Our Mentors", routes.mentors],
      ["Careers", routes.contact],
      ["Contact Us", routes.contact],
    ],
  },
  {
    title: "Support",
    links: [
      ["Help Center", routes.contact],
      ["Contact Support", routes.contact],
      ["Privacy Policy", routes.privacyPolicy],
      ["Terms & Conditions", routes.terms],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="bg-[#111E79] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.25fr_repeat(5,0.75fr)_1.15fr]">
          <div>
            <Logo onDark imageClassName="h-10 md:h-12" />
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/68">
              Empowering India&apos;s learners with industry-relevant skills, mentorship and placement opportunities.
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-9 place-items-center rounded-full bg-white/10 text-white/85 transition hover:bg-[#19C7C8] hover:text-[#111E79]">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-black">{column.title}</h3>
              <ul className="mt-5 space-y-3">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-sm font-medium text-white/62 transition hover:text-[#19C7C8]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-sm font-black">Contact Us</h3>
            <div className="mt-5 space-y-4 text-sm text-white/70">
              <a href={`tel:${siteConfig.contactPhone.replaceAll(" ", "")}`} className="flex gap-3 hover:text-[#19C7C8]">
                <Phone className="mt-0.5 size-4 shrink-0 text-[#19C7C8]" />
                {siteConfig.contactPhone}
              </a>
              <a href={`mailto:${siteConfig.contactEmail}`} className="flex gap-3 hover:text-[#19C7C8]">
                <Mail className="mt-0.5 size-4 shrink-0 text-[#19C7C8]" />
                {siteConfig.contactEmail}
              </a>
              <p className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#19C7C8]" />
                1st Floor, ZR Tower, Civil Lines, Vadodara, Gujarat - 390002
              </p>
              <p className="flex gap-3">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-[#19C7C8]" />
                Mon - Sat: 9:00 AM - 7:00 PM
              </p>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-7 text-center text-sm text-white/62">
          © {new Date().getFullYear()} SkillGuru. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

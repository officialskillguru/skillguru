import { useState, type FormEvent } from "react";
import { CalendarCheck2, LockKeyhole, Mail, MapPin, MessageCircle, Navigation, Phone, Send, Star } from "lucide-react";

import { FAQAccordion } from "@/components/common/FAQAccordion";
import { CTAButton } from "@/components/common/CTAButton";
import { CTABanner } from "@/components/site/CTABanner";
import { faqs, officeLocations, supportOptions, successStories } from "@/data/platform";
import { siteConfig } from "@/config/site";
import { usePageMeta } from "@/hooks/usePageMeta";
import { routes } from "@/lib/routes";
import { submitLead } from "@/services/leads";

function getFormString(form: FormData, key: string, fallback = "") {
  const value = form.get(key);
  return typeof value === "string" ? value : fallback;
}

export default function ContactPage() {
  usePageMeta("Contact");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("Submitting...");

    try {
      await submitLead("contact", {
        fullName: getFormString(data, "fullName"),
        email: getFormString(data, "email"),
        phone: getFormString(data, "phone"),
        subject: getFormString(data, "subject", "Career counselling"),
        message: getFormString(data, "message"),
        consent: data.get("consent") === "on",
        website: "",
      });
      form.reset();
      setStatus("Request submitted. Our counselling team will contact you shortly.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit request.");
    }
  }

  return (
    <main className="page-shell">
      <section className="relative overflow-hidden bg-[#061B5C] px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(25,217,255,0.18),transparent_26rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#19D9FF]">Contact Us</p>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">Let&apos;s Start Your Career Transformation</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/76">
              Talk to our counselling team about course fit, demos, placement support, and learner guidance.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { title: "Call Us", value: siteConfig.contactPhone, icon: Phone },
                { title: "Email Us", value: siteConfig.contactEmail, icon: Mail },
                { title: "Working Hours", value: "Mon - Sat, 9:00 AM - 7:00 PM", icon: CalendarCheck2 },
                { title: "Live Chat", value: "Instant Support", icon: MessageCircle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-lg border border-white/15 bg-white/8 p-5">
                    <Icon className="size-7 text-[#19D9FF]" />
                    <p className="mt-4 text-sm font-black">{item.value}</p>
                    <p className="mt-1 text-xs text-white/65">{item.title}</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-8 flex max-w-xl items-center justify-between rounded-lg bg-white p-5 text-[#061B5C] shadow-[0_20px_70px_rgba(2,8,23,0.16)]">
              <div className="flex -space-x-3">
                {successStories.slice(0, 4).map((story) => (
                  <img key={story.name} src={story.avatar} alt="" className="size-11 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <div className="text-sm font-black">
                10,000+ students
                <span className="block text-xs font-semibold text-[#64748B]">already connected with us</span>
              </div>
              <div className="text-sm font-black">
                4.8/5
                <span className="mt-1 flex text-amber-400">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4 fill-current" />)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={(event) => void onSubmit(event)} className="rounded-lg border border-[#E5EAF5] bg-white p-6 text-[#061B5C] shadow-[0_24px_80px_rgba(2,8,23,0.18)] sm:p-8">
            <h2 className="text-2xl font-black">Send Message</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input name="fullName" required placeholder="Full Name" className="h-12 rounded-md border border-[#E5EAF5] px-4 text-sm outline-none focus:border-[#1147FF]" />
              <input name="phone" required placeholder="Phone Number" className="h-12 rounded-md border border-[#E5EAF5] px-4 text-sm outline-none focus:border-[#1147FF]" />
              <input name="email" required type="email" placeholder="Email Address" className="h-12 rounded-md border border-[#E5EAF5] px-4 text-sm outline-none focus:border-[#1147FF]" />
              <select name="subject" required className="h-12 rounded-md border border-[#E5EAF5] px-4 text-sm outline-none focus:border-[#1147FF]">
                <option>Career Counselling</option>
                <option>Course Enquiry</option>
                <option>Placement Support</option>
                <option>Corporate Training</option>
              </select>
            </div>
            <textarea name="message" required rows={5} placeholder="How can we help you?" className="mt-4 w-full rounded-md border border-[#E5EAF5] px-4 py-3 text-sm outline-none focus:border-[#1147FF]" />
            <label className="mt-4 flex gap-3 text-sm text-[#64748B]">
              <input name="consent" type="checkbox" required className="mt-1 accent-[#1147FF]" />
              I agree to be contacted by HR Remedy India Education.
            </label>
            <button type="submit" className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1147FF] text-sm font-black text-white transition hover:-translate-y-1 hover:bg-[#0A2A88]">
              Send Message <Send className="size-4" />
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#64748B]">
              <LockKeyhole className="size-4" />
              Your information is safe and secure with us.
            </p>
            {status ? <p className="mt-4 rounded-md bg-[#F1F5FF] p-3 text-sm font-semibold text-[#1147FF]">{status}</p> : null}
          </form>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-black text-[#061B5C]">Our Offices</h2>
            <p className="mt-2 text-sm text-[#64748B]">We have offices across India to serve you better.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {officeLocations.map((office) => (
                <article key={office.city} className="rounded-lg border border-[#E5EAF5] bg-white p-5 shadow-[0_16px_50px_rgba(10,42,136,0.08)]">
                  <MapPin className="size-10 rounded-full bg-[#E8F9FF] p-2 text-[#1147FF]" />
                  <h3 className="mt-5 font-black text-[#061B5C]">{office.city} <span className="text-xs text-[#64748B]">({office.label})</span></h3>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">{office.address}</p>
                  <p className="mt-4 text-xs font-black text-[#061B5C]">{office.phone}</p>
                  <p className="mt-2 text-xs font-black text-[#061B5C]">{office.email}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="relative min-h-90 overflow-hidden rounded-lg border border-[#E5EAF5] bg-[linear-gradient(135deg,#DFF4FF,#F8FAFF)] shadow-[0_18px_60px_rgba(10,42,136,0.08)]">
            <div className="absolute inset-0 opacity-70 bg-[linear-gradient(#BBD7FF_1px,transparent_1px),linear-gradient(90deg,#BBD7FF_1px,transparent_1px)] bg-size-[36px_36px]" />
            {officeLocations.map((office, index) => (
              <div key={office.city} className="absolute rounded-[12px] bg-white px-4 py-2 text-sm font-black text-[#061B5C] shadow-[0_12px_30px_rgba(10,42,136,0.16)]" style={{ left: `${20 + index * 24}%`, top: `${22 + index * 18}%` }}>
                <MapPin className="mr-2 inline size-4 text-[#1147FF]" />
                {office.city}
              </div>
            ))}
            <Navigation className="absolute bottom-8 right-8 size-12 text-[#1147FF]" />
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
          {supportOptions.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-[#E5EAF5] bg-white p-6 shadow-[0_16px_45px_rgba(10,42,136,0.07)]">
                <Icon className="size-12 rounded-full bg-[#F1F5FF] p-3 text-[#1147FF]" />
                <h3 className="mt-5 font-black text-[#061B5C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{item.description}</p>
                <a href={item.title.includes("WhatsApp") ? siteConfig.whatsapp : routes.contact} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#1147FF]">
                  {item.action} -&gt;
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-lg border border-[#E5EAF5] bg-[#F8FAFF] p-7">
            <h2 className="text-3xl font-black text-[#061B5C]">Frequently Asked Questions</h2>
            <p className="mt-4 text-sm leading-7 text-[#64748B]">Find quick answers to common questions.</p>
            <CTAButton to={routes.faq} variant="secondary" className="mt-6">View All FAQs</CTAButton>
          </div>
          <FAQAccordion items={faqs} />
        </div>
      </section>

      <CTABanner />
    </main>
  );
}

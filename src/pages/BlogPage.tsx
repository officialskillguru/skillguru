import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, FileText, Newspaper, Search, Send } from "lucide-react";

import { blogs } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { blogDetailRoute } from "@/lib/routes";

const resourceCategories = ["Career Guide", "Interview Preparation", "Resume Tips", "Industry News", "Webinars", "Announcements"];

export default function BlogPage() {
  usePageMeta("Resources");
  const [featured, ...rest] = blogs;

  return (
    <main className="page-shell">
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#5B35F2]">Resources</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-[#111E79] sm:text-6xl">Insights, Trends & Career Growth</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#64748B]">Blogs, career guides, interview preparation, resume tips, industry news, and webinars for job-ready learners.</p>
          <label className="mt-8 flex h-14 max-w-2xl items-center gap-3 rounded-md border border-[#E5EAF5] bg-white px-5 shadow-[0_14px_40px_rgba(10,42,136,0.07)]">
            <Search className="size-5 text-[#5B35F2]" />
            <input placeholder="Search resources..." className="w-full bg-transparent outline-none" />
          </label>
        </div>
      </section>

      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            {featured ? (
              <Link to={blogDetailRoute(featured.slug)} className="grid overflow-hidden rounded-lg border border-[#E5EAF5] bg-white shadow-[0_24px_80px_rgba(10,42,136,0.10)] lg:grid-cols-[1.05fr_.95fr]">
                <div className="p-7 sm:p-9">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#5B35F2]">Featured Article</p>
                  <h2 className="mt-5 text-3xl font-black leading-tight text-[#111E79] sm:text-4xl">{featured.title}</h2>
                  <p className="mt-5 text-sm leading-7 text-[#64748B]">{featured.excerpt}</p>
                  <p className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#5B35F2]">
                    Read Article <ArrowRight className="size-4" />
                  </p>
                </div>
                <img src={featured.image} alt="" className="h-72 w-full object-cover lg:h-full" />
              </Link>
            ) : null}
            <h2 className="mt-12 text-3xl font-black text-[#111E79]">Latest Blogs</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.slug} to={blogDetailRoute(post.slug)} className="overflow-hidden rounded-lg border border-[#E5EAF5] bg-white shadow-[0_18px_55px_rgba(10,42,136,0.08)] transition hover:-translate-y-1">
                  <img src={post.image} alt="" className="h-40 w-full object-cover" />
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5B35F2]">{post.category}</p>
                    <h3 className="mt-3 text-xl font-black leading-tight text-[#111E79]">{post.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#64748B]">{post.excerpt}</p>
                    <p className="mt-5 text-xs font-bold text-[#94A3B8]">{post.date} • {post.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-[#E5EAF5] bg-white p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
              <h2 className="text-xl font-black text-[#111E79]">Categories</h2>
              <div className="mt-5 space-y-3">
                {resourceCategories.map((category, index) => (
                  <button key={category} type="button" className="flex w-full justify-between rounded-[12px] bg-[#F8FAFF] px-4 py-3 text-sm font-black text-[#111E79]">
                    {category}
                    <span className="text-[#64748B]">{12 - index}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-[#E5EAF5] bg-white p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
              <h2 className="text-xl font-black text-[#111E79]">Popular Posts</h2>
              <div className="mt-5 space-y-4">
                {blogs.slice(0, 3).map((post) => (
                  <Link key={post.slug} to={blogDetailRoute(post.slug)} className="flex gap-3">
                    <img src={post.image} alt="" className="size-14 rounded-[12px] object-cover" />
                    <span>
                      <span className="block text-sm font-black leading-tight text-[#111E79]">{post.title}</span>
                      <span className="mt-1 block text-xs text-[#64748B]">{post.readTime}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            { title: "Career Guides", body: "Step-by-step learning roadmaps and career clarity.", icon: FileText },
            { title: "Interview Preparation", body: "Mock-ready advice, answers, and project explanation tips.", icon: Newspaper },
            { title: "Webinars", body: "Live sessions with mentors, recruiters, and industry experts.", icon: CalendarCheck2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-[#E5EAF5] bg-white p-7 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
                <Icon className="size-10 rounded-md bg-[#F1F5FF] p-2 text-[#5B35F2]" />
                <h2 className="mt-6 text-2xl font-black text-[#111E79]">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#64748B]">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8">
        <div className="brand-gradient mx-auto max-w-7xl rounded-lg p-8 text-white shadow-[0_24px_80px_rgba(10,42,136,0.22)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">Get career resources in your inbox</h2>
              <p className="mt-4 text-sm leading-7 text-white/74">Join our newsletter for interview tips, course updates, and placement insights.</p>
            </div>
            <label className="flex min-h-14 overflow-hidden rounded-md bg-white p-1">
              <input placeholder="Enter your email" className="min-w-0 flex-1 px-4 text-sm text-[#111E79] outline-none" />
              <button type="button" className="inline-flex items-center gap-2 rounded-[12px] bg-[#19C7C8] px-5 text-sm font-black text-[#111E79]">
                Subscribe <Send className="size-4" />
              </button>
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}

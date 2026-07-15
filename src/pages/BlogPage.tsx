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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Resources</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-primary sm:text-6xl">Insights, Trends & Career Growth</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">Blogs, career guides, interview preparation, resume tips, industry news, and webinars for job-ready learners.</p>
          <label className="mt-8 flex h-14 max-w-2xl items-center gap-3 rounded-md border border-border bg-card px-5 shadow-sm">
            <Search className="size-5 text-secondary" />
            <input placeholder="Search resources..." className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
          </label>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            {featured ? (
              <Link to={blogDetailRoute(featured.slug)} className="grid overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:grid-cols-[1.05fr_.95fr]">
                <div className="p-7 sm:p-9">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Featured Article</p>
                  <h2 className="mt-5 text-3xl font-black leading-tight text-primary sm:text-4xl">{featured.title}</h2>
                  <p className="mt-5 text-sm leading-7 text-muted-foreground">{featured.excerpt}</p>
                  <p className="mt-6 inline-flex items-center gap-2 text-sm font-black text-secondary">
                    Read Article <ArrowRight className="size-4" />
                  </p>
                </div>
                <img src={featured.image} alt="" className="h-72 w-full object-cover lg:h-full" />
              </Link>
            ) : null}
            <h2 className="mt-12 text-3xl font-black text-primary">Latest Blogs</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.slug} to={blogDetailRoute(post.slug)} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-1">
                  <img src={post.image} alt="" className="h-40 w-full object-cover" />
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary">{post.category}</p>
                    <h3 className="mt-3 text-xl font-black leading-tight text-primary">{post.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                    <p className="mt-5 text-xs font-bold text-muted-foreground">{post.date} • {post.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-primary">Categories</h2>
              <div className="mt-5 space-y-3">
                {resourceCategories.map((category, index) => (
                  <button key={category} type="button" className="flex w-full justify-between rounded-[12px] bg-muted px-4 py-3 text-sm font-black text-primary hover:bg-muted/80 transition-colors">
                    {category}
                    <span className="text-muted-foreground">{12 - index}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-primary">Popular Posts</h2>
              <div className="mt-5 space-y-4">
                {blogs.slice(0, 3).map((post) => (
                  <Link key={post.slug} to={blogDetailRoute(post.slug)} className="flex gap-3 group">
                    <img src={post.image} alt="" className="size-14 rounded-[12px] object-cover group-hover:opacity-90 transition-opacity" />
                    <span>
                      <span className="block text-sm font-black leading-tight text-primary group-hover:text-secondary transition-colors">{post.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{post.readTime}</span>
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
              <article key={item.title} className="rounded-lg border border-border bg-card p-7 shadow-sm">
                <Icon className="size-10 rounded-md bg-secondary/10 p-2 text-secondary" />
                <h2 className="mt-6 text-2xl font-black text-primary">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
        <div className="brand-gradient mx-auto max-w-7xl rounded-lg p-8 text-white shadow-[0_24px_80px_rgba(10,42,136,0.22)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">Get career resources in your inbox</h2>
              <p className="mt-4 text-sm leading-7 text-white/74">Join our newsletter for interview tips, course updates, and placement insights.</p>
            </div>
            <label className="flex min-h-14 overflow-hidden rounded-md bg-white p-1">
              <input placeholder="Enter your email" className="min-w-0 flex-1 px-4 text-sm text-primary outline-none" />
              <button type="button" className="inline-flex items-center gap-2 rounded-[12px] bg-accent px-5 text-sm font-black text-primary hover:bg-accent/90 transition-colors">
                Subscribe <Send className="size-4" />
              </button>
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}

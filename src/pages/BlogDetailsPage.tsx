import { Link, useParams } from "react-router-dom";

import { blogs } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { routes } from "@/lib/routes";

export default function BlogDetailsPage() {
  const { slug } = useParams();
  const post = blogs.find((item) => item.slug === slug) ?? blogs[0];
  usePageMeta(post?.title ?? "Resources");

  if (!post) {
    return null;
  }

  return (
    <main className="page-shell">
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-225">
          <Link to={routes.guidance} className="text-sm font-black text-secondary">Resources</Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-secondary">{post.category}</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-primary sm:text-6xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>
          <p className="mt-5 text-sm font-semibold text-slate-400">{post.date} • {post.readTime}</p>
        </div>
      </section>
      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <article className="mx-auto max-w-225 overflow-hidden rounded-lg border border-border bg-white shadow-[0_24px_80px_rgba(10,42,136,0.10)]">
          <img src={post.image} alt="" className="h-80 w-full object-cover" />
          <div className="p-7 text-base leading-8 text-slate-600 sm:p-10">
            <p>
              Career transformation works best when learners combine structured skills, practical projects, interview feedback, and role-specific positioning.
            </p>
            <p className="mt-5">
              SkillGuru builds every track around these operating principles so students can move from information overload to a clear career roadmap.
            </p>
            <p className="mt-5">
              The strongest learners show evidence: projects, clear communication, confidence in fundamentals, and readiness to learn inside real teams.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}

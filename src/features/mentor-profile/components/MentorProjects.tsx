import { FolderGit2, ExternalLink, Github } from "lucide-react";
import { type Mentor } from "../types";

export function MentorProjects({ mentor }: { mentor: Mentor }) {
  if (!mentor.projects?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 scroll-mt-24" id="projects">
      <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
        Portfolio Projects
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mentor.projects.map((project) => (
          <div key={project.id} className="group rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col bg-slate-50">
            {project.image ? (
              <div className="h-48 overflow-hidden relative">
                <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-xs font-semibold text-white border border-white/20">
                    {project.difficulty}
                  </span>
                  <span className="px-2 py-1 bg-accent/90 rounded-md text-xs font-semibold text-white">
                    {project.industry}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-40 bg-slate-100 flex items-center justify-center">
                <FolderGit2 className="w-12 h-12 text-slate-300" />
              </div>
            )}
            
            <div className="p-6 flex flex-col grow bg-white">
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">{project.title}</h3>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed line-clamp-3">{project.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                {project.techStack.map((tech, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">
                    {tech}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                {project.githubUrl && (
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary transition-colors">
                    <Github className="w-4 h-4" />
                    Source
                  </a>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80 transition-colors ml-auto">
                    Live Demo
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


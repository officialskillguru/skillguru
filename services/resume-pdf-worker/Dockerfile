# syntax=docker/dockerfile:1.7
# ============================================================================
# Skill Guru resume PDF worker (Google Cloud Run)
# Build from the REPOSITORY ROOT so the shared schema and templates are included:
#   docker build -f services/resume-pdf-worker/Dockerfile -t resume-pdf-worker .
# ============================================================================
FROM node:24-bookworm-slim

# TeX Live from Debian: every package a template needs is installed at build
# time; nothing is downloaded during a compilation (Tectonic is deliberately
# not used because it fetches bundles over the network on demand).
# Adjust this list once the supplied Overleaf templates' requirements are known
# (registry.json -> requiredPackages / requiredFonts).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      texlive-latex-base texlive-latex-recommended texlive-latex-extra \
      texlive-fonts-recommended texlive-xetex texlive-luatex lmodern \
      poppler-utils util-linux fontconfig ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 # Belt and braces: disable shell escape globally, not only via the -no-shell-escape flag.
 && sed -i 's/^shell_escape = .*/shell_escape = f/' /usr/share/texlive/texmf-dist/web2c/texmf.cnf || true

WORKDIR /app
COPY services/resume-pdf-worker/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Same relative layout as the repository, so imports resolve identically.
COPY services/resume-pdf-worker/src ./services/resume-pdf-worker/src
COPY src/features/resume-builder/domain/resume-schema.ts src/features/resume-builder/domain/template-schema.ts ./src/features/resume-builder/domain/
COPY resume-templates ./resume-templates

# Non-root, read-only application files; only /tmp is writable at runtime.
RUN useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin worker \
 && chown -R root:root /app && chmod -R a-w /app
USER 10001

ENV NODE_ENV=production \
    PORT=8080 \
    RESUME_TEMPLATES_DIR=/app/resume-templates
EXPOSE 8080
CMD ["node", "services/resume-pdf-worker/src/server.ts"]

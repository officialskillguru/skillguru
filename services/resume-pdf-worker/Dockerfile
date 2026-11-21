# syntax=docker/dockerfile:1.7
# ============================================================================
# Skill Guru resume PDF worker (Google Cloud Run)
# Build from the REPOSITORY ROOT so the shared schema and templates are included:
#   docker build -f services/resume-pdf-worker/Dockerfile -t resume-pdf-worker .
#
# Base: the official TeX Live image (Island of TeX / TeX Live team), pinned by
# digest, with perl + tlmgr + util-linux (prlimit). No apt-get at build or run
# time; Node 24 is copied from the official Node image; PDF text validation is
# done in Node with pdf.js, so no system PDF tools are needed.
# To update TeX Live: pull texlive/texlive:latest-basic, take its digest, rebuild,
# and let the smoke-compile gate below prove every template still compiles.
# ============================================================================
FROM node:24-bookworm-slim AS node

FROM texlive/texlive@sha256:e930edb4e2ef4ed70de1374b262e0ae15fe55ae1e6a10ea7c52e82618f42ad77

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && node --version && npm --version

# Only the TeX packages the approved templates need (resume-templates/registry.json ->
# requiredPackages), installed at BUILD time. Nothing is downloaded during a compilation.
RUN tlmgr install \
      preprint titlesec marvosym enumitem fancyhdr babel-english tools xcolor hyperref \
      geometry parskip multirow etoolbox \
      lato mweights fontawesome5 lm \
      newtx tex-gyre fontaxes xkeyval xstring xpatch kastrup txfonts carlisle \
 && tlmgr conf texmf shell_escape f \
 && tlmgr conf texmf openout_any p \
 && tlmgr conf texmf openin_any p \
 && (rm -rf /usr/local/texlive/*/tlpkg/backups/* 2>/dev/null || true)

WORKDIR /app
COPY services/resume-pdf-worker/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Same relative layout as the repository, so imports resolve identically.
COPY src/features/resume-builder/domain/resume-schema.ts src/features/resume-builder/domain/template-schema.ts ./src/features/resume-builder/domain/
COPY resume-templates ./resume-templates
COPY services/resume-pdf-worker/src ./services/resume-pdf-worker/src
COPY services/resume-pdf-worker/scripts ./services/resume-pdf-worker/scripts

# Build gate: every registered template must compile with each fixture and pass
# the PDF text-extraction check. A failing template fails the image build.
RUN RESUME_TEMPLATES_DIR=/app/resume-templates node services/resume-pdf-worker/scripts/smoke-compile.ts

# Non-root, read-only application files; only /tmp is writable at runtime.
RUN useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin worker \
 && chown -R root:root /app && chmod -R a-w /app
USER 10001

ENV NODE_ENV=production \
    PORT=8080 \
    RESUME_TEMPLATES_DIR=/app/resume-templates
EXPOSE 8080
CMD ["node", "services/resume-pdf-worker/src/server.ts"]

# Skill Guru India Education

Production scaffold for the Skill Guru India Education platform.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript with strict mode
- Tailwind CSS and ShadCN-compatible primitives
- TanStack Query
- Supabase client setup
- Zod validation
- Secure headers, sanitization, CSRF, and rate-limit utilities
- Analytics abstraction for GA4, GTM, and Meta Pixel
- Docker and Docker Compose

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`.

## Environment

Create `.env.local` from `.env.example` and fill the values used by the environment:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
JWT_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
GOOGLE_ANALYTICS_ID=
GOOGLE_TAG_MANAGER_ID=
META_PIXEL_ID=
```

`JWT_SECRET` must be at least 32 characters when CSRF helpers are used.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run format
npm run test
npm run test:e2e
```

## Docker

```bash
docker compose up --build
```

The production server is exposed on `http://localhost:3000`.

## Project Layout

```txt
src/
  app/                 App Router shell, global layout, providers
  components/          UI primitives and shared components
  config/              Site constants and brand configuration
  lib/                 Env, Supabase, analytics, security, validation, utilities
public/
  assets/logo/         Replaceable company logo placeholder
```

## Phase Boundary

This phase contains only the foundation infrastructure. Business pages, database migrations,
server actions, admin workflows, and tests are intentionally added in the next approved phases.

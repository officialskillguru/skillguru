# Deployment

## Required Production Environment

- `VITE_SITE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` as a Supabase Edge Function secret

Optional integrations:

- `LEAD_NOTIFICATION_WEBHOOK_URL` for lead notifications from the Edge Function
- `GOOGLE_ANALYTICS_ID`
- `GOOGLE_TAG_MANAGER_ID`
- `META_PIXEL_ID`

## Supabase Auth URL configuration (required)

Email links (signup confirmation, resend, password reset) are generated with an
explicit `redirect_to` built from the origin serving the app:

- confirmation → `<origin>/auth/callback`
- password reset → `<origin>/reset-password`

Supabase only honours a `redirect_to` that is on the project's allow-list;
otherwise it falls back to the **Site URL**. If the Site URL is
`http://localhost:3000`, users get `ERR_CONNECTION_REFUSED`.

In Supabase Dashboard → Authentication → URL Configuration set:

- **Site URL**: `https://skillguru-india.vercel.app`
- **Redirect URLs**:
  - `https://skillguru-india.vercel.app/**`
  - `http://localhost:5173/**` (local development)
  - optionally `https://*-<your-vercel-team>.vercel.app/**` for preview deployments

In Vercel → Project → Settings → Environment Variables (Production) set
`VITE_SITE_URL=https://skillguru-india.vercel.app`.

Keep "Confirm email" enabled (Authentication → Providers → Email).

## Verification

Run these before release:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Apply Supabase migrations from `supabase/migrations` and seed `supabase/seed.sql`.
Deploy `supabase/functions/leads` and set its secrets before enabling production lead capture.

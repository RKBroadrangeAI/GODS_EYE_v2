# GOD'S EYE — Production Analytics Platform

Modern web replacement for TEST GOD'S EYE.xlsx with role-based dashboards, server-side formula parity, realtime updates, and Grok-powered AI intelligence.

## Core Stack
- Next.js App Router + TypeScript
- Tailwind CSS + custom shadcn-style UI primitives
- Supabase PostgreSQL + Auth + RLS
- Recharts + TanStack Table
- Grok API (`/api/ai/advanced`) for intelligence layer
- PWA manifest + service worker install support

## Environment Setup
1. Copy env template:

```bash
cp .env.example .env.local
```

2. Fill required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `XAI_GROK_API_KEY`
- `XAI_GROK_MODEL`

## Database Setup
Run migrations in Supabase SQL editor in order:
- `supabase/migrations/20260403144000_initial_schema.sql`
- `supabase/migrations/20260403183000_budget_finalization_lock.sql`

## Local Development
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Validation
```bash
npm run lint
npm run build
```

## Route Highlights
- `/app` dashboard home with daily insights + executive PDF export
- `/app/enter-sale`, `/app/sales-detail`
- All 12 dashboard routes under `/app/...`
- Admin tools under `/app/admin/...`
- AI endpoints: `/api/ai/advanced`, `/api/ai/recommendations`, `/api/ai/executive-summary`

## One-Click Vercel Deployment
1. Push repo to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Set all environment variables from `.env.example`.
4. Deploy (Framework auto-detects Next.js).
5. In Supabase Auth settings, add Vercel domain to redirect URLs.

## Documentation
- User guide: `docs/user-guide.md`
- Training script: `docs/training-video-script.md`

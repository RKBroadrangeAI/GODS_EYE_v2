# GOD'S EYE — Sales Intelligence Platform

Web-based replacement for `TEST GOD'S EYE.xlsx` — role-based dashboards, server-side formula parity with the original Excel workbook (including business-day pacing via NETWORKDAYS equivalent), and Grok-powered AI intelligence.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 App Router + TypeScript |
| Styling | Tailwind CSS v4 — dark sidebar, orange accent (`#ea580c`) |
| Database | **Plain PostgreSQL** via `node-postgres` (`pg`) pool |
| Auth | Custom session cookie (JWT signed with `SESSION_SECRET`) |
| AI | xAI Grok API (`/api/ai/advanced`) |
| PWA | Web app manifest + install prompt |

> No Supabase. No Prisma. Direct PostgreSQL with a connection pool.

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=your-long-random-secret-here
XAI_GROK_API_KEY=your-xai-api-key
XAI_GROK_MODEL=grok-3-mini          # optional, defaults to grok-3-mini
```

## Database Setup

Run the migration against your PostgreSQL instance:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_schema.sql
```

The migration creates all tables, lookup tables, triggers (auto-computes `profit`, `margin`, `age_days`, `month_number`), and indexes.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Sign in with credentials stored in the `employees` table.

## Build & Lint

```bash
npm run lint
npm run build
```

Both must pass before deploying (38 routes, all server-rendered on demand).

## Deployment — Railway

The app is deployed on [Railway](https://railway.app) with a PostgreSQL addon.

1. Create a Railway project and add a **PostgreSQL** plugin.
2. Copy the `DATABASE_URL` from Railway → add to environment variables.
3. Add `SESSION_SECRET`, `XAI_GROK_API_KEY`, `XAI_GROK_MODEL`.
4. Deploy — Railway auto-detects Next.js and builds with `npm run build`.
5. Run the migration once via the Railway shell or a one-off command:
   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_initial_schema.sql
   ```

## Route Map

| Path | Description | Access |
|------|-------------|--------|
| `/login` | Sign-in page | Public |
| `/app` | Dashboard home | All |
| `/app/enter-sale` | Log a new sale | All |
| `/app/sales-detail` | Full sales ledger with cash-out | Management+ |
| `/app/sales-performance` | Per-associate monthly pacing | All |
| `/app/overall-sales` | YTD per-associate summary | All |
| `/app/in-person-vs-remote` | Channel split metrics | All |
| `/app/lead-performance-monthly` | Lead source monthly pacing | All |
| `/app/lead-performance` | Lead source annual | All |
| `/app/lead-perf-m2m` | Lead source month-over-month | All |
| `/app/inventory-tiers` | Price-tier breakdown (rolling 90 days) | All |
| `/app/inventory-mix` | Condition-type monthly pacing | All |
| `/app/inventory-mix-per-sales-person` | Condition mix by associate | All |
| `/app/brand-performance` | Brand × Condition annual | All |
| `/app/brand-perf-m2m` | Brand × Condition monthly | All |
| `/app/budget-2026` | Budget vs actuals tracker | Management+ |
| `/app/admin/*` | Employee & dropdown management | Admin |

## Key Business Logic

- **Pacing** — mirrors Excel's `NETWORKDAYS` (Mon–Fri only). See `lib/analytics.ts → countBusinessDays`.
- **Closed GP vs Cashed GP** — separate columns; cashed requires `is_cashed = true`.
- **BY field** — cash-out stores `"LB 03/30"` format (initials + date) in `by_label`.
- **Brand Performance** — rows are Brand × Condition combos with both `margin` and `markup` (GP / cost).
- **Budget lock** — `is_finalized = true` is one-way; budgets cannot be un-finalized via the UI.
- **Role restrictions** — `sales_associate` sees only their own sales; cannot edit cost/sold price.

## Documentation

- Excel spec & gap analysis: `docs/excel-spec-and-gap-analysis.md`
- User guide: `docs/user-guide.md`
- Training script: `docs/training-video-script.md`

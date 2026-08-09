# SRM KTR Classroom Finder

Find free classrooms at SRM Kattankulathur (UB / TP1 / TP2) between periods. Anonymous crowd reports — no login.

> **Status:** Phase 11 complete — PWA, error/loading/404, SEO/OG, Zod env validation, API rate limiting, structured logging.

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Animation:** Framer Motion
- **Toasts:** sonner
- **Database:** PostgreSQL + Prisma
- **Deploy target:** Vercel + Neon/Supabase

## Local setup

```bash
git clone <repo-url>
cd SRM-Classroom-Finder
npm install
cp .env.example .env
```

### Database (Phase 2+)

**Option A — Docker Postgres (recommended):**

```bash
docker compose up -d
# .env should already have:
# DATABASE_URL="postgresql://srm:srm@localhost:5432/srm_classroom_finder"
npx prisma migrate deploy
npx prisma db seed          # or: npm run db:seed
# optional browse: npx prisma studio
# or during local iteration:
npx prisma migrate dev
```

**Option B — Neon / Supabase:** put your connection string in `.env` as `DATABASE_URL`, then run `npx prisma migrate deploy`.

```bash
npm run db:generate   # prisma generate (also runs after migrate)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Auto-expiry cron (Phase 8)

Past-due free reports are marked `status = 'expired'` (rows kept for Stats history; excluded by `active_free_classrooms`).

- **Production:** `vercel.json` schedules `GET /api/cron/expire` every 5 minutes. Set `CRON_SECRET` in the Vercel project env — Vercel sends `Authorization: Bearer <CRON_SECRET>`.
- **Local manual run:**

```bash
# CRON_SECRET must match .env (see .env.example)
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/expire
```

Unauthorized calls return `401`. Missing `CRON_SECRET` / `DATABASE_URL` fail clearly at startup via Zod (`lib/env.ts`).

### PWA / hardening (Phase 11)

- Manifest: `/manifest.webmanifest` · icons in `/public/icons` · service worker `/sw.js`
- Optional public URL: `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)
- `/api/*` rate-limited in middleware (429 + `Retry-After`)

```bash
npx tsx scripts/test-phase11.ts   # Phase 11 smoke (dev server for HTTP checks)
npm run db:verify-migration       # embedded Postgres migration check
npm run db:seed
```

| Entity | Count | Notes |
|--------|-------|-------|
| Buildings | 3 | UB, TP1, TP2 |
| Floors | 35 | UB 5–12, TP1 1–15, TP2 2–13 |
| Time slots | 10 | 08:00–16:50 campus periods |

## Theme

- Primary: deep navy `#0F2C59`
- Accent: amber `#F59E0B`
- Font: Inter
- Dark mode via `next-themes` (system preference)

## Schema overview (Phase 2)

| Table | Role |
|-------|------|
| `buildings` | Campus buildings (UB / TP1 / TP2 as rows, not enums) |
| `floors` | Floors per building |
| `time_slots` | Period start/end times |
| `classrooms` | Rooms — unique `(building, floor, room_number)` |
| `free_reports` | Anonymous free-room claims |
| `occupied_reports` | Strike reports against a free claim |

Also in migration SQL: CHECK constraints, composite FK (classroom floor ∈ building), index on `free_reports(report_date, time_slot_id, status)`, and view `active_free_classrooms`.

### Stats aggregates (Phase 10)

`/stats` reads history via `prisma.$queryRaw` (`GROUP BY`, `COUNT`, `AVG`, `HAVING`, `FILTER`, `LEFT JOIN`). Optional local seed for demos:

```bash
npx tsx scripts/seed-stats-data.ts
```

## DBMS Concepts Used

Full write-up in `/docs` after Phase 13 (ER diagram, `schema.sql`, normalization notes). Schema comments live in `prisma/schema.prisma`.

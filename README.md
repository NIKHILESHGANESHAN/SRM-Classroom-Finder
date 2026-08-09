# SRM KTR Classroom Finder

Find free classrooms at SRM Kattankulathur (UB / TP1 / TP2) between periods. Anonymous crowd reports — no login.

> **Status:** Phase 1 scaffold complete (Next.js 14 + Tailwind + shadcn/ui + Framer Motion + sonner). Database and features land in later phases.

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Animation:** Framer Motion
- **Toasts:** sonner
- **Database (upcoming):** PostgreSQL + Prisma
- **Deploy target:** Vercel + Neon/Supabase

## Local setup (Phase 1)

```bash
git clone <repo-url>
cd SRM-Classroom-Finder
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Test toast** on the landing page to verify sonner.

Database env vars and seed commands arrive in Phase 2+.

## Theme

- Primary: deep navy `#0F2C59`
- Accent: amber `#F59E0B`
- Font: Inter
- Dark mode via `next-themes` (system preference)

## DBMS Concepts Used

Documented in `/docs` after Phase 13 (schema, ER diagram, normalization notes).

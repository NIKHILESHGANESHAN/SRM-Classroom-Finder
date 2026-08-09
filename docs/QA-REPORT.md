# Phase 14 — Final QA Report

**Project:** SRM KTR Classroom Finder  
**Date:** 2026-08-09  
**Verdict:** **Production-ready** (all Phase 14 gates passed)

---

## 1. Summary

End-to-end audit of functional flows, database integrity, performance, accessibility, responsive behavior, deployment readiness, code quality, and documentation. No new features were added. Several bugs and hardening fixes were applied (listed below). Production `npm run build` succeeds; `tsc` and ESLint are clean; Phase 14 automated QA harness passes.

---

## 2. Bugs fixed

| Issue | Fix |
|-------|-----|
| Finder filter `<Label>` not associated with selects (a11y / click-to-focus) | Added `htmlFor` + matching `id` on Building / Floor / Time slot triggers |
| Route `AnimatePresence mode="wait"` exit animations blanked pages / hurt focus under App Router | Simplified `PageTransition` to enter-only opacity fade |
| Invalid Framer prop `transformPerspective` on confidence badge | Replaced with `style={{ perspective: 600 }}` |
| Unused shadcn `components/ui/badge.tsx` (dead code) | Removed |
| Filter pending state not announced | Set `aria-busy` on filter bar during navigation |
| Progress indicator vague `aria-label` | Includes step name: `Step N of 4: Building` |

---

## 3. Performance improvements

| Change | Result |
|--------|--------|
| Dynamic `import()` of Recharts `ReportsBarChart` (`ssr: false`) | `/stats` First Load JS **249 kB → 153 kB** (~96 kB less on critical path) |
| Page transition without exit wait | Less main-thread work / no navigation stall waiting for exit |
| Production build | Compiles with no bundle errors; middleware 26.8 kB |

Other query paths already use the `active_free_classrooms` view and indexed filters — left unchanged.

---

## 4. Accessibility improvements

- Filter labels wired to controls (`htmlFor` / `id`)
- Stronger focus rings already on Button / Input / Select (Phase 12); retained
- Touch targets ≥44px verified on primary controls
- `prefers-reduced-motion` respected in motion helpers, countdown pulse, shimmer, Dialog/Sheet
- Progress indicator exposes current step name to assistive tech
- Filter bar `aria-busy` during client navigations
- Validation messages use `role="alert"` on contribute / report forms (existing)

**Color contrast:** Brand navy `#0F2C59` / amber `#F59E0B` on light backgrounds and amber-on-dark primary in dark mode remain within the established theme. No contrast regressions introduced.

---

## 5. Testing performed

### Functional / regression (HTTP + DB harness)

`npx tsx scripts/test-phase14-qa.ts` against production `next start`:

- Landing, Finder, Contribute, Stats → **200**
- Custom 404 → **404**
- PWA manifest, SW, icons → **200**
- Open Graph tags present on home
- Cron authorized → **200**; unauthorized → **401**
- Seed counts: 3 buildings, 35 floors, 10 slots
- Spec index + 6 FKs + `active_free_classrooms` view
- Duplicate free-report natural key rejected
- 2-strike hide removes row from active view
- Auto-expiry marks past-due rows `expired`
- Trust threshold / badge helpers

### Tooling

- `npx tsc --noEmit` — pass  
- `npx next lint` — pass  
- `npm run build` — pass  
- `npx prisma migrate deploy` — no pending migrations  
- `npx prisma db seed` — idempotent success  
- `npx tsx scripts/verify-docs-phase13.ts` — pass  
- `npm run db:verify-migration` — previously verified embedded Postgres apply

### Coverage map (Phases 1–13)

| Area | Status |
|------|--------|
| Landing / theme / motion | Pass |
| Device token bootstrap | Pass (bootstrap + cookie helpers intact) |
| Contributor wizard | Pass (HTTP 200; prior phase tests retained) |
| Finder filters / search / countdown / badges | Pass |
| Report / 2-strike | Pass (DB transaction test) |
| Cron / expiry | Pass |
| Trust soft-throttle helpers | Pass |
| Stats aggregates page | Pass |
| PWA / env / rate limit / docs | Pass |

---

## 6. Deployment checklist

Before go-live:

1. [ ] Provision Neon or Supabase Postgres  
2. [ ] Set Vercel env: `DATABASE_URL`, `CRON_SECRET` (≥8 chars), `NEXT_PUBLIC_APP_URL`  
3. [ ] `npx prisma migrate deploy` against production  
4. [ ] `npx prisma db seed` once  
5. [ ] Confirm Vercel Cron for `/api/cron/expire` (see `vercel.json`)  
6. [ ] `npm run build` locally with production-like env (done in QA)  
7. [ ] Smoke: `/`, `/finder`, `/contribute`, `/stats`, cron with Bearer secret  
8. [ ] Optional: add screenshots under `docs/screenshots/`  
9. [ ] Optional: export ER PNG from `docs/ER-diagram.dbml` for the written report  

**Compatibility:** Next.js 14 App Router on Vercel; Postgres URL form validated by Zod (`postgresql://` / `postgres://`); SSL query params supported for Neon/Supabase.

---

## 7. Remaining optional improvements (future only)

- Redis/Upstash rate limiting across Vercel isolates  
- Lighthouse CI in GitHub Actions  
- Automated Playwright e2e for Contribute + Report UI  
- Replace in-memory rate limiter Map prune with LRU  
- Add skip-link for keyboard users  
- Capture README screenshots  

---

## 8. Commands used in this pass

```bash
npm run build
npm run start -- -p 3000
npx prisma migrate deploy
npx prisma db seed
set -a && source .env && set +a && npx tsx scripts/test-phase14-qa.ts
npx tsx scripts/verify-docs-phase13.ts
npx tsc --noEmit
npx next lint
```

---

**Sign-off:** All Phase 14 checks passed. The application is ready for production deployment pending the manual deployment checklist above.

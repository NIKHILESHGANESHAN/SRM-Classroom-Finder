# V2.7 FINAL QA REPORT

**Project:** SRM KTR Classroom Finder
**Date:** 2026-08-15
**Overall Status:** Production Ready With Known Limitations

Version 2 is frozen after this pass. No V3 work was started. Schema/ER/normalization files were already accurate; they were not rewritten.

---

## Bugs Found

| Severity | Root cause | Fix | Test |
|----------|------------|-----|------|
| High | Chat called `getFinderRefreshData({ timeSlotId: "all" })` while Finder defaults to the current campus slot | `liveFinderFilters()` omits `timeSlotId` unless the user asks for all slots | `scripts/test-v2-7-final-qa.ts`; browser: “Is UB 1205 free?” → “not currently reported free” matching Finder |
| High | Service worker `CACHE_VERSION` stayed `v1` and treated `/sw.js` as cache-first | Version `srm-classroom-finder-v2.7`; never cache `/sw.js`; network-first navigations; activate deletes other cache keys | Source assertions in V2.7 test; `GET /sw.js` on production server |
| Medium | Cron Bearer compare was not timing-safe | `secretsMatch` / `authorizeCronRequest` | HTTP: missing 401, wrong 401, valid 200 |
| Low | Skip link listed as future work but missing from shell | Skip link → `#main-content` in `app/layout.tsx` | HTML grep; a11y tree on Finder/Contact |
| Low | Local DB had leftover `V22-` / `V23-` / `P7` / `P8` fixture classrooms | Localhost-only `scripts/cleanup-local-test-fixtures.ts` (already run with `--yes` on this machine) | Script refuses non-localhost / production |

Finder SQL: `EXPLAIN ANALYZE` on `active_free_classrooms` was ~3–5 ms at current scale. **No query rewrite. No new indexes.**

---

## Tests

| Test | Result |
|------|--------|
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint (`npm run lint`) | PASS |
| Build (`npm run build`) | PASS |
| V2.1 | PASS |
| V2.2 | PASS |
| V2.3 | PASS |
| V2.4 | PASS |
| V2.5 | PASS |
| V2.6 | PASS |
| V2.7 (`scripts/test-v2-7-final-qa.ts`) | PASS |
| Database (migration/docs verify; local cleanup; EXPLAIN) | PASS |
| HTTP (`next start` :3017 routes, cron, mailto, skip link, `/sw.js`) | PASS |
| PWA (manifest 200, icons 200, cache version, SW strategy in source) | PASS (install prompt not re-verified) |
| Accessibility (skip link in DOM/a11y tree; existing V2.5 keyboard tests) | PASS (NVDA/VoiceOver not run) |
| Security (ADMIN_SECRET server-only; admin 307; cron 401/200; login HTML no secret leak) | PASS |

Phase 11 / Phase 14 harnesses PASS; their built-in HTTP probes were skipped when no server was running. HTTP was verified separately against `next start`.

---

## Documentation

Changed:

- `README.md`
- `docs/QA-REPORT.md`
- `docs/dbms-report-notes.md` (`report_events` PK row)

Unchanged (already matched implementation): `docs/schema.sql`, `docs/ER-diagram.mmd`, `docs/ER-diagram.dbml`, `docs/normalization-notes.md`.

---

## Known Limitations

- In-memory rate limits are per Vercel isolate.
- `mailto:` depends on the OS mail handler; this pass did not open Mail.app.
- Local V2 tests recreate `V22-…` fixtures; cleanup is localhost-only.
- Chat and Finder agree on the **current slot** by default; they differ if the user asks “all slots” or Finder is set to All slots.
- Add-to-Home-Screen / installability was not re-verified in a mobile browser.
- Screen-reader (NVDA/VoiceOver) pass was not run.
- Skip-link mouse click is intercepted while the link is `sr-only`; it is intended for keyboard focus (`focus:not-sr-only`).
- Historical Git `Co-authored-by: Cursor` entries were left untouched. V2.7 changes are **uncommitted**.

---

## V3 Recommendations (do not implement)

- TP1 classroom inventory
- Redis/Upstash rate limiting across isolates
- Optional campus map
- Push notifications / watched buildings
- Public accounts / OTP (explicitly out of scope for this product)
- WebSockets / SSE for Finder (polling is sufficient at campus scale)
- Lighthouse CI / Playwright e2e
- Extra README screenshots (contact/chat/admin)

---

# Phase 14 — Final QA Report

**Project:** SRM KTR Classroom Finder
**Date:** 2026-08-09
**Verdict:** **Production-ready** (all Phase 14 gates passed)

---


## V2.6 addendum (Admin, live help data, demo-seed hygiene)

- Finder still reads only `active_free_classrooms` (active, unexpired, non-hidden, `classrooms.is_active`).
- Stats still aggregate real `free_reports`. Empty week → honest empty state. `scripts/seed-stats-data.ts` is **DEVELOPMENT/DEMO ONLY** and is not part of `npm run db:seed`.
- Help chat can answer current Finder questions via the existing query layer (no LLM). Unrelated questions and secret probes are refused.
- Contact overflow menu is pathname-aware. Feedback `mailto:` leaves `@` unencoded in the address.
- `/admin` uses `ADMIN_SECRET` + HttpOnly session cookie. Middleware redirects unauthenticated `/admin` (except `/admin/login`). Pages also call `requireAdmin()` before loading data. Raw device tokens are never shown.
- No Prisma migration in V2.6.

---

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
2. [ ] Set Vercel env: `DATABASE_URL`, `CRON_SECRET` (≥8 chars), `ADMIN_SECRET` (≥16 chars, **not** `CRON_SECRET`, never `NEXT_PUBLIC_`), `NEXT_PUBLIC_APP_URL`
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
- Capture README screenshots
- (Skip link shipped in V2.7)

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

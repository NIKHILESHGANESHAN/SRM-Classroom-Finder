# QA Report — SRM KTR Classroom Finder

**Project:** SRM KTR Classroom Finder

This file collects QA records and sign-off notes across the project lifecycle. The **current release track is Version 5** (`v5-final`, per [README.md](../README.md)).

Confirmed major-version phase counts: **V1 = 13**, **V2 = 6**, **V3 = 8**, **V4 = 12**, **V5 = 13**.

---

## V5 — QA status

**Date:** *not recorded in this repository*

**Overall status:** **No formal V5 final QA sign-off is documented in this file yet.**

Repository evidence that Version 5 shipped:

| Evidence | Source |
| -------- | ------ |
| `feat: complete V5 release` | git commit |
| `V5 Phase 1 - Add admin operations center` | git commit |
| Branch `v5-final` | README status |
| Netlify deployment | README (exact site URL and cron schedule are **not** checked into this repository) |

README documents V5 scope (Operations center, TP1 inventory, sounds, XO Easter Egg, brand integration). See [README.md — Version history](../README.md#version-history) for confirmed **V5 = 13 phases** and which sub-phases are *undocumented*.

### Regression scripts present (results not recorded here)

The repository contains targeted test scripts. **This document does not record pass/fail results for a completed V5 QA pass.** Scripts are listed by what their headers document — not as a confirmed V5 phase checklist.

| Script | Header / documented scope |
| ------ | ------------------------- |
| `scripts/test-xo-easter-egg.ts` | V5 Phase 3 / 3.1 — XO Easter Egg game logic + unlock |
| `scripts/test-sound-effects.ts` | V5 Phase 4 — sound system |
| `scripts/test-v5-phase-6.ts` | V5 Phase 6 — Easter Egg entry actions, XO close navigation, rounded UI polish |
| `scripts/test-v5-phase-6-1.ts` | V5 Phase 6.1 — remove X+O test trigger; brand links home |
| `scripts/test-v5-phase-6-2.ts` | V5 Phase 6.2 — fair XO AI, computer-move reliability, rounded tiles |
| `scripts/test-easter-egg-windows.ts` | V4 Easter Egg windows + daily reporting cycle |
| `scripts/test-phase11-v4-bugs.ts` | Phase 11 V4 bug regression tests |
| `scripts/test-help-launcher-mount.ts` | Phase 10.3 — global Help launcher mount/visibility |
| `scripts/test-contribute-reportable-periods.ts` | Contributor reportable-period regression |
| `scripts/measure-phase8.mjs` | Phase 8 / V3 final performance baseline — local TTFB + transfer sizes (measurement tool only; not a V5 sign-off artifact) |

V5 phases **2, 5, 7, 8, 9, 10, 11, 12, and 13** have no dedicated scripts named in this repository (*undocumented*).

Older harnesses (`scripts/test-phase14-qa.ts`, `scripts/test-v2-7-final-qa.ts`, V2.1–V2.6 scripts) remain for regression but were authored for earlier surfaces. The Phase 14 HTTP probe list does **not** include V3–V5 routes such as `/how-it-works`, `/contact`, `/admin/operations`, or Easter Egg flows.

### Deployment checklist (Netlify — from README; not verified here)

1. [ ] Provision Neon or Supabase Postgres
2. [ ] Set Netlify env: `DATABASE_URL`, `CRON_SECRET` (≥8 chars), `ADMIN_SECRET` (≥16 chars, **not** `CRON_SECRET`, never `NEXT_PUBLIC_`), `NEXT_PUBLIC_APP_URL`
3. [ ] `npx prisma migrate deploy` against production
4. [ ] `npx prisma db seed` once (243 classrooms: UB 77 + TP1 88 + TP2 78)
5. [ ] Configure scheduled HTTP `GET /api/cron/expire` every 5 minutes with `Authorization: Bearer <CRON_SECRET>` (legacy `vercel.json` schedule is not the Netlify source of truth)
6. [ ] `npm run build` with production-like env
7. [ ] Smoke: `/`, `/finder`, `/contribute`, `/stats`, `/how-it-works`, `/contact`, `/admin/login`, cron with Bearer secret

**Compatibility:** Next.js 14 App Router; PostgreSQL URL validated by Zod (`postgresql://` / `postgres://`); SSL query params supported for Neon/Supabase.

### Known codebase notes (not from a completed V5 QA pass)

- PWA service worker cache name remains `srm-classroom-finder-v2.7` in `public/sw.js`
- `package.json` version is `4.0.0` at the time of this documentation pass
- In-memory rate limits are per serverless isolate (`lib/rate-limit.ts`)
- `mailto:` feedback depends on the OS mail handler
- Formal mobile installability, screen-reader (NVDA/VoiceOver), and production Netlify cron verification are **not recorded** in this repository for V5

### Pending

- [ ] Run and record a formal V5 final QA pass (tooling, HTTP smoke, security, accessibility as needed)
- [ ] Extend or supplement HTTP regression coverage for V3–V5 routes and admin Operations
- [ ] Record results for the V5-named scripts above
- [ ] Update README future-improvement items when PWA cache / `package.json` version are bumped

---

## Archive — V2.7 final QA (2026-08-15)

> **Historical.** This section records the Version 2.7 freeze only. **V3, V4, and V5 shipped after this pass.** Statements below (including deployment target and limitation notes) reflect August 2026 V2.7 context unless explicitly marked otherwise.

# V2.7 FINAL QA REPORT

**Project:** SRM KTR Classroom Finder
**Date:** 2026-08-15
**Overall Status:** Production Ready With Known Limitations (V2.7 era)

Version 2 was frozen after this pass. Schema/ER/normalization files were already accurate at the time; they were not rewritten in V2.7.

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

- In-memory rate limits are per Vercel isolate (historical wording; app tier is now documented on Netlify in README).
- `mailto:` depends on the OS mail handler; this pass did not open Mail.app.
- Local V2 tests recreate `V22-…` fixtures; cleanup is localhost-only.
- Chat and Finder agree on the **current slot** by default; they differ if the user asks “all slots” or Finder is set to All slots.
- Add-to-Home-Screen / installability was not re-verified in a mobile browser.
- Screen-reader (NVDA/VoiceOver) pass was not run.
- Skip-link mouse click is intercepted while the link is `sr-only`; it is intended for keyboard focus (`focus:not-sr-only`).
- Historical Git `Co-authored-by: Cursor` entries were left untouched. V2.7 changes were **uncommitted** at the time of this report.

---

## V2.7-era recommendations (historical — superseded)

> Several items below were open at V2.7. **TP1 classroom inventory shipped in V5** (`prisma/data/classroom-inventory.ts`). Other items may still apply as future work — see [README.md](../README.md).

- TP1 classroom inventory *(shipped in V5)*
- Redis/Upstash rate limiting across isolates
- Optional campus map
- Push notifications / watched buildings
- Public accounts / OTP (explicitly out of scope for this product)
- WebSockets / SSE for Finder (polling is sufficient at campus scale)
- Lighthouse CI / Playwright e2e
- Extra README screenshots (contact/chat/admin)

---

## Archive — Phase 14 final QA (2026-08-09)

> **Historical V1 final verification artifact.** Git commit: “Phase 14 - Final QA and production readiness”. This is **not** an additional V1 development phase. **V1 = 13 phases.**

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

> **Historical.** Superseded for current production by the Netlify checklist in the [V5 section](#v5--qa-status) and [README.md](../README.md).

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

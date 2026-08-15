# DBMS Report Notes

**Course project:** SRM KTR Classroom Finder  
**Authors:** NikhileshGaneshan & Sabrina  
**Stack:** PostgreSQL + Prisma + Next.js 14

Use this document as a viva / written-report companion. Concrete DDL lives in [`schema.sql`](./schema.sql); the live app applies the same objects via Prisma migrations.

---

## 1. Primary Keys

Every base table has a surrogate primary key `id` (`TEXT`, application-generated `cuid`):

| Table | Primary key |
|-------|-------------|
| `buildings` | `id` |
| `floors` | `id` |
| `time_slots` | `id` |
| `classrooms` | `id` |
| `free_reports` | `id` |
| `occupied_reports` | `id` |
| `report_events` | `id` |

Surrogate keys keep joins stable when natural attributes change (for example renaming a building code is rare, but slot times can be updated without rewriting FKs on historical reports).

---

## 2. Foreign Keys

| Child | Column(s) | Parent | ON DELETE | ON UPDATE |
|-------|-----------|--------|-----------|-----------|
| `floors` | `building_id` | `buildings.id` | RESTRICT | CASCADE |
| `classrooms` | `building_id` | `buildings.id` | RESTRICT | CASCADE |
| `classrooms` | `(floor_id, building_id)` | `floors(id, building_id)` | RESTRICT | CASCADE |
| `free_reports` | `classroom_id` | `classrooms.id` | CASCADE | CASCADE |
| `free_reports` | `time_slot_id` | `time_slots.id` | RESTRICT | CASCADE |
| `occupied_reports` | `free_report_id` | `free_reports.id` | CASCADE | CASCADE |
| `report_events` | `free_report_id` | `free_reports.id` | CASCADE | CASCADE |

**Design notes**

- Deleting a building is blocked while floors/classrooms exist (`RESTRICT`) — protects reference data.
- Deleting a classroom cascades free reports (and then occupied reports) — physical room gone ⇒ claims go with it.
- Deleting a time slot is restricted while reports reference it — preserves history integrity.

---

## 3. Composite Keys

| Kind | Columns | Purpose |
|------|---------|---------|
| Unique (natural) | `floors (building_id, floor_number)` | No duplicate floor numbers in one building |
| Unique (supporting FK) | `floors (id, building_id)` | Target of classrooms composite FK |
| Composite FK | `classrooms (floor_id, building_id)` → `floors` | Floor must belong to the classroom’s building |
| Unique (natural) | `classrooms (building_id, floor_id, room_number)` | One physical room identity |
| Unique (natural) | `free_reports (classroom_id, time_slot_id, report_date)` | One claim per room/slot/day |
| Unique (anti-abuse) | `occupied_reports (free_report_id, reporter_token)` | One strike per device per claim |

The composite FK is a deliberate DBMS showcase: it prevents a classroom from pointing at TP1’s floor row while `building_id` says UB.

---

## 4. Candidate Keys

Besides the primary key, these attributes uniquely identify a row and could serve as alternate keys:

| Table | Candidate key |
|-------|----------------|
| `buildings` | `code` |
| `floors` | `(building_id, floor_number)` |
| `time_slots` | `slot_order` |
| `classrooms` | `(building_id, floor_id, room_number)` |
| `free_reports` | `(classroom_id, time_slot_id, report_date)` |
| `occupied_reports` | `(free_report_id, reporter_token)` |

---

## 5. Constraints

### Domain / CHECK (SQL migration)

- `floors.floor_number > 0`
- `time_slots.slot_order > 0`
- `time_slots.end_time > start_time`
- `LENGTH(TRIM(classrooms.room_number)) > 0`
- `free_reports.confirmation_count >= 1`
- Non-blank `contributor_token` / `reporter_token`

### Enumerations

- `FreeReportStatus`: `unverified`, `confirmed`, `hidden`, `expired`
- `OccupiedReason`: `occupied`, `class_in_progress`, `wrong_info`, `duplicate`

### Application-level (alongside DB)

- Daily contribution soft cap (~15 / token / day)
- Soft-throttle: tokens with ≥3 hidden reports today need a higher confirmation threshold
- API / action rate limits (Phase 11)

---

## 6. Transactions

Two critical write paths use `prisma.$transaction`:

1. **Contribute (free report)** — look up an **active** `classrooms` inventory row (no find-or-create), then create or upsert `free_reports`. Independent confirmations insert `report_events` (unique per device) then bump `confirmation_count`. Unknown or wrong-floor rooms are rejected.
2. **Occupied report** — insert `occupied_reports`; if `COUNT(*)` for that free report reaches 2, set `free_reports.status = 'hidden'` in the **same** transaction. Prevents race conditions where two strikes both see count = 1.
3. **Still Free** — insert `report_events` (`still_free`); unique `(free_report_id, actor_token)` makes retries idempotent and blocks confirmation spam.

---

## 7. Aggregate Queries

The `/stats` page uses `prisma.$queryRaw` so SQL remains visible for evaluation:

| Question | SQL concepts |
|----------|--------------|
| Busiest building today | `JOIN`, `GROUP BY`, `COUNT(*)`, `ORDER BY DESC`, `LIMIT 1` |
| Most active slot this week | Week-range `WHERE`, `GROUP BY` time slot, `COUNT` |
| Totals today / week | `COUNT(*) FILTER (WHERE …)` in one scan |
| Reports per building | `LEFT JOIN buildings`, `GROUP BY` (zeros for chart) |
| Average confirmations | `AVG(confirmation_count)` |
| Status mix | `GROUP BY status`, `COUNT` |
| Top classrooms | `HAVING COUNT(*) >= 2`, `ORDER BY`, `LIMIT 5` |

Implementation: `lib/stats-data.ts`.

---

## 8. Views

```sql
CREATE OR REPLACE VIEW active_free_classrooms AS
SELECT … -- free_reports ⋈ classrooms ⋈ buildings ⋈ floors ⋈ time_slots
WHERE status NOT IN ('hidden', 'expired')
  AND expires_at > NOW();
```

Class Finder reads this view instead of repeating joins. Hidden/expired history remains in the base table for Stats.

---

## 9. Indexes

| Index | Supports |
|-------|----------|
| `free_reports (report_date, time_slot_id, status)` | Finder filters / day+slot scans |
| `free_reports (expires_at, status)` | Cron expiry updates |
| `free_reports (contributor_token, report_date)` | Daily caps / trust queries |
| `occupied_reports (reporter_token, created_at)` | Per-device history |
| Uniques listed above | Integrity + upsert targets |

---

## 10. Anonymous token system

| Property | Detail |
|----------|--------|
| Generation | UUID on first visit |
| Storage | HTTP cookie + `localStorage` key `classroomfinder_token` |
| Persistence | Long-lived; synced across cookie/storage helpers |
| Usage | Written on contribute / occupied report; never a login |
| Abuse controls | Unique strike key, daily soft cap, soft-throttle threshold, rate limits |

There is intentionally **no** `users` / OTP schema — tracking is device-scoped and opaque.

---

## 11. Why this design is scalable

1. **Normalized dimensions** — buildings/floors/slots grow by INSERT, not ALTER TABLE.
2. **Indexed fact table** — Finder and cron hit composite indexes instead of full scans.
3. **View as read model** — application queries stay simple; optimizer can expand the view.
4. **Retention without bloat in the UI** — expired rows stay for analytics but leave the view.
5. **Horizontal-friendly app tier** — Next.js on Vercel; Postgres on Neon/Supabase connection pooling.
6. **Idempotent writes** — natural unique keys + transactions make retries safe under concurrency.
7. **No auth bottleneck** — anonymous tokens avoid session stores for the common path.

For multi-region rate limiting at very large scale, an external store (Redis/Upstash) would complement the in-memory limiter; the relational core remains unchanged.

---

## Quick viva map

| Examiner asks… | Point them to… |
|----------------|----------------|
| Show PKs / FKs | `docs/schema.sql`, Prisma `schema.prisma` |
| Show composite FK | `classrooms_floor_id_building_id_fkey` |
| Show view | `active_free_classrooms` |
| Show transaction | `lib/actions/contribute.ts`, `lib/actions/report.ts` |
| Show aggregates | `lib/stats-data.ts`, `/stats` |
| Show 3NF reasoning | `docs/normalization-notes.md` |
| Show ER | `docs/ER-diagram.mmd` or `docs/ER-diagram.dbml` |

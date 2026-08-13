# Normalization Notes

**Project:** SRM KTR Classroom Finder  
**DBMS:** PostgreSQL  
**Target normal form:** Third Normal Form (3NF)

This document explains how the relational schema reaches 3NF and why certain attributes are **not** stored redundantly.

---

## 1NF — First Normal Form

**Rule:** Every attribute is atomic; no repeating groups or nested tables in a cell.

| Decision | Rationale |
|----------|-----------|
| One floor per `floors` row | Floor numbers are not a CSV list on `buildings` |
| One time slot per `time_slots` row | Periods are not an array on reports |
| One room number string per `classrooms` row | No multi-valued room fields |
| Enums for status/reason | Single discrete value per row |

All tables store scalar columns only → **1NF**.

---

## 2NF — Second Normal Form

**Rule:** 1NF + every non-key attribute fully depends on the **whole** primary key (no partial dependency on part of a composite key).

Surrogate `id` PKs are used for most tables. Natural / composite **candidate keys** still drive uniqueness:

| Relation | Candidate / unique key | Non-key attributes depend on |
|----------|------------------------|------------------------------|
| `buildings` | `code` | `name` → full key |
| `floors` | `(building_id, floor_number)` | `floor_number` is part of the natural key; no attributes depend only on `building_id` alone |
| `time_slots` | `slot_order` | `start_time`, `end_time` → full key |
| `classrooms` | `(building_id, floor_id, room_number)` | Room identity is the whole triple |
| `free_reports` | `(classroom_id, time_slot_id, report_date)` | Status, counts, tokens describe that full claim |
| `occupied_reports` | `(free_report_id, reporter_token)` | `reason` / `created_at` describe that strike |

No attribute like `building_name` is stored on `classrooms` or `free_reports` (that would depend only on `building_id`) → **2NF**.

From V2.1, `classrooms` is **master inventory** (seeded, `is_active` for soft-retire). Students do not create classroom rows. `is_active` depends on the classroom entity key, not on reports — still 3NF.

---

## 3NF — Third Normal Form

**Rule:** 2NF + no transitive dependencies (non-key → non-key).

### Why `buildings`, `floors`, and `time_slots` are separate tables

| If we denormalized… | Problem |
|---------------------|---------|
| `building_code` + `building_name` on every classroom | Updating “Tech Park 1” would require many row updates; risk of inconsistency |
| Floor ranges as columns on `buildings` (`floor_min`, `floor_max` only) | Cannot attach classroom FKs to a concrete floor entity; harder CHECK per building |
| Slot times copied onto every `free_reports` row | Changing a period boundary would orphan historical meaning; redundancy |

**Separate tables** keep non-key attributes (`name`, `start_time`, `end_time`) dependent only on their own entity keys. Classrooms and reports reference them by FK → **3NF**.

Adding building #4 or adjusting slot 7’s end time is a data change, not a schema redesign.

### Why confidence is derived (not duplicated)

UI badges show **Unverified** vs **Confirmed**.

- Source of truth: `free_reports.status` (`unverified` \| `confirmed` \| `hidden` \| `expired`)
- `confirmation_count` records how many distinct contributors reinforced the claim
- Transition to `confirmed` uses a **trust-weighted threshold** (Phase 9): most tokens need 2 confirmations; soft-throttled tokens need 3

We do **not** store a separate `confidence` or `is_confirmed` boolean that could disagree with `status`. The badge reads `status` only. That avoids:

- Update anomalies (count bumped but flag forgotten)
- Redundant predicates (`is_confirmed = true` AND `status = 'unverified'`)

Derived presentation ≠ stored transitive dependency.

### Why contributor tokens are anonymous

There is **no `users` table**.

- On first visit the client stores a UUID in a cookie and `localStorage` (`classroomfinder_token`)
- `contributor_token` / `reporter_token` are plain strings, not FKs to accounts

This is a product constraint (open campus tool, no login) and a modeling choice: identity for anti-abuse is a **device-scoped opaque token**, not a person entity. We still enforce:

- Unique `(free_report_id, reporter_token)`
- Soft daily contribution caps keyed by token
- Soft-throttle when a token’s reports are hidden repeatedly

Normalization is preserved: tokens are attributes of fact rows, not a half-built user dimension.

### Why the design avoids redundancy

| Avoided redundancy | Mechanism |
|--------------------|-----------|
| Building name on every room/report | FK → `buildings` |
| Floor number without building context | FK + composite FK `(floor_id, building_id)` |
| Slot labels copied onto reports | FK → `time_slots`; labels formatted in app |
| Duplicate free claims same day/slot/room | `UNIQUE (classroom_id, time_slot_id, report_date)` + transactional upsert |
| Multiple strikes per device | `UNIQUE (free_report_id, reporter_token)` |
| Finder multi-join boilerplate | `VIEW active_free_classrooms` (virtual, not a base table copy) |

Historical rows (`expired` / `hidden`) stay in `free_reports` for Stats aggregates — that is intentional retention, not denormalization.

---

## Summary

The schema is in **3NF**: atomic attributes, full key dependence, no transitive non-key dependencies, and referential integrity (including a composite FK) that prevents cross-building floor mistakes. Confidence and Finder projections are derived from normalized facts rather than duplicated columns.

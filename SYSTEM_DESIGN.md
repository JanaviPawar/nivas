# System Design Write-up — Nivas

## Complaint History Model

Every complaint's lifecycle is tracked through a dedicated `ComplaintStatusHistory` table, not a single mutable `status` column. The `Complaint` model holds only the *current* state (status, priority, isOverdue), while `ComplaintStatusHistory` holds one row per transition — status, timestamp, the admin who made the change, and an optional note. Crucially, rows in this table are **append-only**: application code never updates or deletes an existing history row, only inserts new ones. A complaint's history is therefore a permanent, tamper-evident audit log rather than a value that can silently be overwritten.

The first history row is created in the same database write as the complaint itself (status `OPEN`, note "Complaint raised"), so a complaint's history is never empty — from the moment it exists, it has a complete, unbroken timeline. Every subsequent status change, made through the admin's `PATCH /api/complaints/:id` endpoint, inserts one more row, attributing the change to the specific admin and optionally recording their reasoning. This directly satisfies the requirement to record "timestamp, actor, and note" per change, and additionally makes it possible to reconstruct exactly what a complaint looked like at any point in time — useful both for residents tracking their own complaint's journey and for any future dispute resolution.

## Overdue Detection

Overdue status is a stored boolean (`isOverdue`) on the `Complaint` model, recalculated by a single shared function (`refreshOverdueStatuses`) rather than scattered inline logic. Each `Society` has its own configurable `overdueDays` threshold (default 7), satisfying the requirement for a genuinely configurable — not hardcoded — threshold; because it's per-society, a multi-society deployment could run different SLAs side by side.

Recalculation happens two ways: live, whenever an admin loads their complaints list or dashboard (throttled to once per minute per society to avoid redundant writes on rapid reloads), and via a real scheduled job — a Vercel Cron hitting `/api/cron/check-overdue` daily, authenticated with a bearer secret so it can't be triggered externally. The function runs two `updateMany` queries: one flags newly-qualifying complaints, the other un-flags any that no longer qualify — handling the case where an admin raises the threshold after complaints were already flagged. Resolved complaints are always excluded and immediately un-flagged on resolution, since "overdue" is only meaningful for open work.

Admin panel sorting relies on an incidental but useful property of PostgreSQL enums: they sort by declared order, not alphabetically. Since `Priority` is declared `LOW, MEDIUM, HIGH` and `ComplaintStatus` as `OPEN, IN_PROGRESS, RESOLVED`, ordering by `[isOverdue desc, priority desc, status asc, createdAt asc]` produces correct urgency-first ordering with zero extra application logic.

## Photo Handling

Photos upload directly to Cloudinary from an in-memory buffer — the API route reads the file into a `Buffer` and streams it via `upload_stream`, never touching local disk. This matters specifically because Vercel's serverless functions have no persistent filesystem; writing to disk would silently fail or lose data between invocations. Only the resulting permanent HTTPS URL is stored in `Complaint.photoUrl` — the database never holds binary data. Server-side validation checks file size (5MB cap) and declared MIME type before upload; since photos are optional per the spec, a missing file simply skips this step without failing the request.

## Notification Flow

Two triggers send email via Resend: a complaint status change (to the resident who raised it) and an important notice post (to every resident in the society). Both are wrapped in try/catch blocks that log failures without throwing — a transient email-provider issue should never roll back or block the actual state change it's reporting on. Email is treated as a side effect, not a transaction participant, which keeps the core complaint/notice logic reliable even if the email provider is temporarily unavailable.

## Beyond the Explicit Spec

Several additions weren't required but follow directly from the brief's own framing:

- **Recurring issue detection** — the brief observes that admins have "no way to see... which issues keep coming back." Nivas flags a complaint when the same flat raises 2+ complaints in the same category within 60 days, surfacing exactly this pattern with a visible badge on the admin panel.
- **True multi-tenancy** — the schema supports unlimited independent societies with data isolation enforced server-side on every admin query and mutation, rather than a single hardcoded society. This was no harder to design correctly from the outset.
- **Extended reporting** — beyond the required totals by status/category/overdue-count, the dashboard adds resolution rate, average time-to-resolve, a 30-day complaint trend, priority breakdown, and a "longest-waiting open complaints" list — turning the dashboard into an actual triage tool rather than a static summary.
- **Proportional access control** — admin registration requires a shared secret code, since an admin account has society-wide visibility and control; resident registration is left open, since a resident's actions are scoped only to their own data. Access control here is proportional to privilege, not applied uniformly.
- **Rate limiting** on login (10/min) and registration (5/min) per IP address, to slow scripted brute-force attempts and spam account creation.
- **Email enumeration prevention** — registration failures return a generic message rather than confirming whether a given email is already registered.

## Known, Deliberate Limitations

Some gaps were consciously scoped out rather than overlooked, and are worth naming honestly:

- **Resident signup is self-attested** — flat number and society membership aren't independently verified. Production would warrant either admin-approval-gated resident accounts or a building-specific invite code; this was scoped out here to keep the app frictionless to evaluate.
- **`ADMIN_SIGNUP_CODE` is a single shared secret**, not per-admin invites — adequate for this scope, but not how a real multi-society SaaS product would gate admin onboarding at scale.
- **Rate limiting is in-memory**, so it resets on server restart and doesn't share state across multiple server instances — a production deployment at scale would use a shared store such as Redis.
- **Neon's free tier suspends when idle**, so the first request after inactivity can take a few seconds while the database wakes — a free-tier characteristic, not an application defect.

Each of these represents a specific, considered trade-off given the assignment's scope and timeline, not an unnoticed gap.
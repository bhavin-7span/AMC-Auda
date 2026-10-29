# AUDA FieldTrack Admin Panel — RFP Gap Analysis

Source: *AUDA FieldTrack RFP* (Tender AUDA/MOBILEAPP/2026-27/FTMS), §9 Detailed Scope,
§10 Minimum Functional Requirements, §17 General Technical Requirements, §21 PoC scenarios.

Scope of this review: the **web administration / dashboard / MIS portal** in this repo.
Mobile-app behaviour (evidence capture, selfie/liveness, offline sync, geofence validation
at punch time) is owned by the mobile team and is only assessed where the web panel must
surface its results.

Legend: **Fixed** = changed in this pass · **Open** = gap remains (reason given).

---

## 1. Defects (incorrect behaviour)

| # | Finding | RFP ref | Status | Files |
|---|---|---|---|---|
| D1 | `getAssignableStaff` read `user_id`, but `get_assignable_staff` returns `id`. Every staff `<option>` had `value=undefined`, so the browser posted the label text ("Name (EMP55)") as the user id. **Inspection assign/reassign and the Travel report staff picker could not work**; React also logged duplicate-key warnings. | 9.1 assignment/reassignment, travel report | **Fixed**: normalized in the data layer | `src/lib/data/inspections.ts` |
| D2 | `getTeamLocations` cast the RPC result to an array, but `get_team_locations` returns `{ members: [...], server_time }`. Any caller would crash. | 9.1 last-known staff location | **Fixed**: unwraps `members` | `src/lib/data/inspections.ts` |
| D3 | PDF report export and challan PDF **throw** (`WinAnsi cannot encode`) whenever a value has non-Latin text (Gujarati/Hindi names, ₹). The whole export then fails with HTTP 500. | 9.4 export PDF, 10 Unicode/Gujarati | **Fixed** (stopgap): unencodable characters are replaced so the PDF always renders. **Open:** real Gujarati glyphs need an embedded Unicode font (fontkit + Noto Sans Gujarati). | `src/lib/export/generate.ts` |
| D4 | CSV export had no UTF-8 BOM, so Excel shows Gujarati/Hindi text as mojibake. | 9.4 export CSV, 10 Unicode | **Fixed** | `src/lib/export/generate.ts` |
| D5 | Dashboard status drill-down links to `/inspections?status=…&department=…`, but the list page ignored `department`, so the drill-down silently lost the department scope. | 9.4 drill-down / dept-wise | **Fixed** (see F1) | `src/app/(dashboard)/inspections/page.tsx` |
| D6 | Dashboard attendance card labelled `total − exceptions` as **"On time"**. Exceptions are geofence/mock/clock flags, not punctuality, and the figure is today-only regardless of the date filter. | 9.2 punctuality vs exception reports | **Fixed**: relabelled "Valid punches", title "Attendance (today)" | `src/app/(dashboard)/dashboard/dashboard-charts.tsx` |
| D7 | M-Challan nav was `admin`-only, but challan RLS lets `dept_head` write. Department heads had no way into the module. | 9.3, 9.4 RBAC | **Fixed**: nav roles `admin`, `dept_head` | `src/lib/nav/navigation.ts` |

## 2. Missing features / UI gaps (fixed)

| # | Finding | RFP ref | Files |
|---|---|---|---|
| F1 | Inspection list had **no filter UI**, even though `admin_list_inspections` supports search, status, department, type, assignee and date range. | 9.4 advanced search/filter, 17 report filters, PoC-1 | `inspections/page.tsx`, new `inspections/InspectionFilters.tsx` |
| F2 | Travel/activity report (`/inspections/travel`) was **orphaned**: no link anywhere. | 9.1 travel/activity reports | `inspections/page.tsx` (header link) |
| F3 | Inspection detail did not show the captured **observations / remarks / action taken / follow-up / closure** (`form_data`), or the submitted/completed/closed timestamps and offline-capture flag. Supervisors reviewed without seeing the field findings. | 9.1 observation fields, PoC-1 supervisor review | `inspections/[id]/page.tsx` |
| F4 | Workflow transitions could not carry a note. **Rework** could be sent with no explanation to field staff. | 9.1 workflow (Rework), PoC-1 rework/closure | `inspections/[id]/InspectionActions.tsx` (remarks box; required for rework) |
| F5 | Attendance log had only an "exceptions" toggle. There was no employee or date-range filter, though the RPC supports both. | 9.2 attendance history / exception reports | `attendance/page.tsx`, new `attendance/AttendanceFilters.tsx` |
| F6 | Attendance log did not show the punch location or site. The RFP asks to "retain actual location for authorized reporting" on out-of-fence punches. | 9.2 | `attendance/AttendanceTable.tsx` |
| F7 | Challan list had no search, status or department filters (the page already parsed `status`/`q`). | 9.3 history/status, dept-wise | `challan/page.tsx`, new `challan/ChallanFilters.tsx` |
| F8 | Choosing a challan type did not apply the master's **rule/section** or department. | 9.3 configurable master-driven selection | `challan/CreateChallan.tsx`, `lib/data/challans.ts` |
| F9 | MIS Reports passed a `status` filter through, but the UI had no control for it. | 17 report status filter | `reports/ReportViewer.tsx` |
| F10 | Users page supported `?q=` search with no input to use it. | 9.4 advanced search | `users/page.tsx` |
| F11 | Geo-fence map in Master Data always showed "no location data". Fences were never plotted. | 9.2 / 9.4 geo-fence config | `masters/page.tsx` |
| F12 | Dashboard "Field activity map" was always an empty placeholder. | 9.1 last-known location, GIS dashboard | `dashboard/page.tsx` (role-scoped staff locations) |

## 3. Open gaps (not fixed here: backend, mobile or AUDA input needed)

| # | Gap | RFP ref | Why not fixed / owner |
|---|---|---|---|
| O1 | **No web creation of inspection tasks.** Inspections can only be created on mobile; supervisors cannot raise or assign a new task from the portal. | 9.1 "Create inspection/task records by department…", PoC-1 | Needs a web form over `save_inspection` (mobile-owned RPC, offline-op semantics). Coordinate with the mobile team. |
| O2 | **Challan evidence photo** is never captured or shown. `challans.evidence_path` exists, but there is no upload and no storage bucket. | 9.3 incident photograph(s) | Needs storage bucket + policy (DB migration). Mobile has no challan module yet. |
| O3 | **Challan SMS/link notification and payment** integration. | 9.3 | Deferred until AUDA approves a gateway (`notified_at`/`paid_at` seams exist). |
| O4 | **Challan reports** (officer-wise/department-wise MIS) are not in MIS Reports. | 9.3 reports & MIS | `admin_report` whitelists only `inspections`/`attendance`. Needs an RPC change. |
| O5 | **Attendance selfie not viewable** by supervisors (`selfie_path` returned, not rendered). | 9.2 selfie/live image, PoC-2 | Selfie bucket and read policy are mobile-owned; confirm bucket and RLS first. |
| O6 | **Punctuality and shift reports.** Only a raw punch log and exceptions exist. | 9.2 punctuality/shift reports | Needs a server-side aggregation RPC against `shifts`/`attendance_rules`. |
| O7 | **Correct / Rules controls show for every role that can open Attendance.** Writes are admin-only and correctly rejected server-side, but non-admins see buttons that fail. | 9.4 RBAC (UX) | Low risk. Hide by role if non-admins get read access to the log. |
| O8 | **Designations master** missing. Challan-type master cannot set a department. | 9.4 masters list | Needs table/RPC support in `admin_upsert_master`. |
| O9 | **Multilingual UI (English + Gujarati)**. No i18n, though `next-intl` is installed. | 10 Unicode/multilingual | Explicitly deprioritised by AUDA (see RELEASE-READINESS.md 12.1). Still a §10 *minimum* requirement. |
| O10 | **Proper Unicode PDF output** (follow-up to D3). | 10 | Embed a Unicode TTF via `@pdf-lib/fontkit`. |
| O11 | **Audit "user activity" report by user**: `admin_audit_search` supports `actor`, but the viewer has no user filter. Failed logins are only in Supabase Auth logs. | 9.4 audit / user login-activity reports | Small UI follow-up (needs a user picker). |
| O12 | **MFA, password policy, lockout, session timeout.** | 10, 11.4 | Supabase dashboard configuration (Ops), not code. |
| O13 | **Every route logs `Date.now()` during prerender** (Next 16 cacheComponents warning). This was already happening before this pass. | — | Investigate the shell/session code; not caused by these changes. |

## 4. Verified as meeting the requirement

- Role-based nav plus server-side RPC/RLS authorization (9.4, 10).
- Inspection workflow statuses New → … → Closed, DB-driven transitions, comments thread,
  event timeline, geo-tagged evidence with mock/clock-suspect flags, and an OSM map (9.1).
- Attendance exceptions with geofence distance, mock/offline/clock flags, audited
  corrections with mandatory reason, and rules config (9.2).
- Challan draft → issue → pay/cancel with unique `CHL-YYYY-NNNNNN` ref and PDF (9.3).
- Master data CRUD + soft delete + bulk CSV upload, users and roles, bulk user upload,
  notification templates and escalation rules, system health / sync monitoring, audit trail,
  and CSV/Excel/PDF export with audit of each export (9.4).

## 5. Verification

- `npm run typecheck` and `eslint`: clean.
- Playwright (read-only specs against the seeded admin): dashboard, inspections, attendance,
  travel, reports (incl. CSV download), masters, challan, map-evidence all pass. The challan
  create/pay lifecycle, the "add department" spec and the users role-change spec were
  **not** run, to avoid writing to the shared DB.
- `e2e/masters.spec.ts` was updated: the geo-fence map is now a real Leaflet map, not the
  placeholder.
- Confirmed against the live RPCs: staff `<option>` values are now user UUIDs, PDF export
  returns 200, and the dashboard map renders staff markers.
